const { program, Option } = require('commander');
const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const cliProgress = require('cli-progress');
const { version } = require('../package.json');

// Import CLI modules
const { parsePositiveInt, parseQuality, parseSizes, parseTimeoutSeconds } = require('./cli/parsers');
const { ICON, printSummaryTable, formatBytesHuman } = require('./cli/ui');
const { runInteractiveWizard } = require('./cli/wizard');

// Import core business logic
const { generateTasks } = require('./core/tasks');
const { processBatchConcurrent } = require('./core/batch');

// Import worker pool
const { WorkerPool } = require('./workers/pool');

// Import utilities
const { getAllImages, shouldOverwrite, writeJsonFile } = require('./utils/fs');
const { runBenchmark } = require('./utils/benchmark');

const numCPUs = os.cpus().length;
const ERROR_LOG_PATH = path.join(__dirname, '..', 'error.log');
let activePool = null;
let handlingFatalError = false;

// ============================================================================
// HELP TEXT & PROGRAM SETUP
// ============================================================================

const HELP_AFTER = `
${ICON.bolt} VÍ DỤ SỬ DỤNG

  ${ICON.ok} Chế độ tương tác (wizard — không tham số):
      node src/index.js

  ${ICON.ok} Một kích thước, thư mục tùy chỉnh:
      node src/index.js -i ./images -o ./resized --width 800 --format webp

  ${ICON.ok} Nhiều kích thước (mỗi size một thư mục con trong --output):
      node src/index.js --sizes 640,1024,1920 -o ./out --quality 90

  ${ICON.ok} Dry-run (chỉ liệt kê, không ghi file):
      node src/index.js --dry-run --sizes 800,1200

  ${ICON.ok} Ghi đè file đích, 6 worker:
      node src/index.js --overwrite -w 6

  ${ICON.bolt} Benchmark Stream vs Buffer + so sánh số worker:
      node src/index.js --benchmark -i ./images -o ./resized

  ${ICON.ok} Sau resize, in thêm bảng hiệu năng thô (${ICON.bolt} throughput):
      node src/index.js --overwrite --with-stats

${ICON.warn} Mặc định bỏ qua file đích đã tồn tại — dùng --overwrite để ghi đè.
${ICON.info} Định dạng đầu ra: jpeg | webp | avif
`;

program
  .name('resize-cli')
  .description(
    `${ICON.bolt} Batch Image Resizer — CLI Node.js (Sharp + Worker Threads + Streams).\n` +
      `${ICON.ok} Quét --input, resize theo --width hoặc --sizes, ghi --output (giữ cấu trúc thư mục con).\n` +
      `${ICON.info} Không tham số → wizard tương tác. Dùng -h để xem đầy đủ tùy chọn và ví dụ.`
  )
  .version(version, '-V, --version', 'hiển thị phiên bản')
  .helpOption('-h, --help', 'trợ giúp chi tiết + ví dụ');

program.configureHelp({
  sortOptions: true,
  subcommandTerm: (cmd) => cmd.name(),
});

program.addHelpText('after', HELP_AFTER);

program
  .option('-i, --input <path>', 'thư mục chứa ảnh nguồn', './images')
  .option('-o, --output <path>', 'thư mục ghi ảnh đã resize', './resized')
  .option(
    '--width <number>',
    'chiều rộng đích đơn lẻ (pixel), bị bỏ qua nếu có --sizes',
    (value) => parsePositiveInt(value, 'width'),
    1024
  )
  .option(
    '--sizes <list>',
    'nhiều chiều rộng đích, cách nhau dấu phẩy. Ví dụ: 800,1200,1920',
    (value) => parseSizes(value)
  )
  .option(
    '--quality <number>',
    'chất lượng nén (1–100)',
    (value) => parseQuality(value),
    85
  )
  .addOption(
    new Option('--format <type>', 'định dạng ảnh đầu ra')
      .choices(['jpeg', 'webp', 'avif'])
      .default('jpeg')
  )
  .option(
    '-w, --workers <number>',
    'số worker xử lý song song (mặc định: số lõi CPU - 1)',
    (value) => parsePositiveInt(value, 'workers')
  )
  .option(
    '--timeout <seconds>',
    'timeout cho mỗi task worker (giây, mặc định: 60)',
    (value) => parseTimeoutSeconds(value),
    60
  )
  .option('--dry-run', 'chỉ liệt kê task sẽ xử lý, không resize thật', false)
  .option('--overwrite', 'ghi đè nếu file đích đã tồn tại', false)
  .option('--skip-existing', 'bỏ qua nếu file đích đã tồn tại (mặc định)', true)
  .option(
    '--benchmark',
    'chế độ benchmark: so sánh Stream vs Buffer + batch với 4/8/12 workers (không chạy resize CLI thường)',
    false
  )
  .option(
    '--with-stats',
    'sau khi resize xong, in thêm bảng throughput / dung lượng (demo hiệu năng)',
    false
  );

// ============================================================================
// MAIN PROCESSING LOGIC
// ============================================================================

/**
 * Main batch processing function
 */
async function main(options, ui) {
  process.env.RESIZE_CLI_QUIET_WORKER = '1';

  const chalk = ui.chalk;
  const ora = ui.ora;
  const workers = Math.max(1, options.workers ?? Math.max(1, numCPUs - 1));
  const timeoutSeconds = Math.max(1, options.timeout ?? 60);
  const overwrite = options.overwrite === true;
  const withStats = Boolean(options.withStats);

  const spinner = ora({
    text: chalk.cyan('⚡ Đang quét thư mục ảnh…'),
    color: 'cyan',
  }).start();

  let images;
  const tScan0 = Date.now();
  try {
    images = await getAllImages(options.input);
  } catch (err) {
    spinner.fail(chalk.red(`✕ Lỗi khi quét thư mục: ${err.message}`));
    throw err;
  }
  const scanMs = Date.now() - tScan0;

  if (images.length === 0) {
    spinner.warn(chalk.yellow(`… Không tìm thấy ảnh nào trong: ${options.input}`));
    return;
  }

  spinner.succeed(
    chalk.green(`✓ Đã quét xong — ${images.length} ảnh`) +
      (withStats ? chalk.gray(` (${scanMs} ms)`) : '')
  );

  const allTasks = generateTasks(images, options);

  const tasks = [];
  const skipped = [];
  for (const task of allTasks) {
    if (await shouldOverwrite(task.outputPath, overwrite)) {
      tasks.push(task);
    } else {
      skipped.push(task);
    }
  }

  if (options.dryRun) {
    console.log(
      chalk.bold.cyan('\n╔══════════════════════════════════════════════════════════╗')
    );
    console.log(
      chalk.bold.cyan('║') +
        chalk.bold.white('  ◆ DRY-RUN — không ghi file, chỉ liệt kê task  ') +
        chalk.bold.cyan('       ║')
    );
    console.log(
      chalk.bold.cyan('╚══════════════════════════════════════════════════════════╝')
    );
    tasks.forEach((task) => {
      console.log(
        chalk.gray('  · ') +
          chalk.white(`[${task.size}px] `) +
          chalk.cyan(path.basename(task.inputPath)) +
          chalk.gray(' → ') +
          task.outputPath
      );
    });
    console.log(
      chalk.cyan(
        `\n  ${ICON.ok} Sẽ xử lý: ${chalk.bold.white(tasks.length)} task  |  ` +
          `${ICON.warn} Bỏ qua: ${chalk.bold.yellow(skipped.length)} task\n`
      )
    );
    printSummaryTable(chalk, {
      ok: 0,
      fail: 0,
      skippedTasks: skipped.length,
      inputBytes: 0,
      outputBytes: 0,
      taskCount: tasks.length,
    });
    console.log(
      chalk.dim(
        `  ${ICON.info} Dry-run: chưa ghi file — cột dung lượng hiển thị 0 (ước lượng sau khi chạy thật).\n`
      )
    );
    return;
  }

  if (tasks.length === 0) {
    console.log(
      chalk.yellow('… Tất cả file đích đã tồn tại — không có gì để xử lý (skip).')
    );
    return;
  }

  if (skipped.length > 0) {
    console.log(
      chalk.yellow(
        `… Cảnh báo: ${skipped.length} task bị bỏ qua do file đích đã tồn tại.`
      )
    );
  }

  const pool = new WorkerPool({
    workers,
    taskTimeoutMs: timeoutSeconds * 1000,
    maxRetries: 2,
    logger: () => {},
  });
  activePool = pool;

  const onShutdown = async (reason) => {
    try {
      if (reason) console.error(chalk.red(`✕ ${reason}`));
      await pool.closeAll();
    } catch {
      // ignore
    }
  };

  const handleSigInt = () => {
    onShutdown('Nhận SIGINT, đang đóng worker pool…').finally(() => process.exit(130));
  };
  const handleSigTerm = () => {
    onShutdown('Nhận SIGTERM, đang đóng worker pool…').finally(() => process.exit(143));
  };

  process.once('SIGINT', handleSigInt);
  process.once('SIGTERM', handleSigTerm);
  await Promise.all(
    tasks.map((t) => fs.mkdir(path.dirname(t.outputPath), { recursive: true }))
  );

  let results = [];
  /** Không dùng mã màu trong chuỗi progress (tránh lệch độ rộng terminal). */
  let barCurrentPlain = '— chờ —';
  const bar = new cliProgress.SingleBar(
    {
      clearOnComplete: false,
      hideCursor: true,
      format: `${ICON.bolt} {bar}| {percentage}% | {value}/{total} | {current} | {imgPerSec} img/s | {duration_formatted} | ETA {eta_formatted}`,
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      barsize: 22,
    },
    cliProgress.Presets.shades_classic
  );

  const processStart = Date.now();
  let lastBarValue = 0;
  bar.start(tasks.length, 0, {
    imgPerSec: '0.00',
    current: barCurrentPlain,
  });

  try {
    results = await processBatchConcurrent(pool, tasks, workers, {
      onTaskStart: (task, inputSizeHuman) => {
        const base = path.basename(task.inputPath);
        const short =
          base.length > 22 ? `${base.slice(0, 19)}...` : base.padEnd(22, ' ');
        barCurrentPlain = `${short} | ${inputSizeHuman} | ${task.size}px`;
        const elapsedSec = (Date.now() - processStart) / 1000;
        const imgPerSec =
          elapsedSec > 0 ? (lastBarValue / elapsedSec).toFixed(2) : '0.00';
        bar.update(lastBarValue, { current: barCurrentPlain, imgPerSec });
      },
      onProgress: (completed) => {
        lastBarValue = completed;
        const elapsedSec = (Date.now() - processStart) / 1000;
        const imgPerSec =
          elapsedSec > 0 ? (completed / elapsedSec).toFixed(2) : '0.00';
        bar.update(completed, { current: barCurrentPlain, imgPerSec });
      },
    });
  } finally {
    process.removeListener('SIGINT', handleSigInt);
    process.removeListener('SIGTERM', handleSigTerm);
    bar.stop();
    await pool.closeAll();
    if (activePool === pool) activePool = null;
  }

  const endTime = Date.now();
  const totalMs = endTime - processStart;

  console.log(
    chalk.green.bold(
      `\n✓ Hoàn tất: ${tasks.length} task trong ${totalMs} ms · workers=${workers} · timeout=${timeoutSeconds}s`
    )
  );
  if (skipped.length > 0) {
    console.log(
      chalk.gray(`  … Đã bỏ qua ${skipped.length} task do trùng file đích.`)
    );
  }

  const okRows = results
    .filter((r) => r && r.status === 'done')
    .map((r) => ({
      file: path.basename(r.inputPath),
      size: `${r.size}px`,
      before: formatBytesHuman(r.beforeBytes),
      after: formatBytesHuman(r.afterBytes),
      reduced: r.reduction,
      time: `${r.durationMs} ms`,
    }));

  let inputBytesSum = 0;
  let outputBytesSum = 0;
  for (const r of results) {
    if (!r) continue;
    inputBytesSum += Number(r.beforeBytes) || 0;
    if (r.status === 'done') outputBytesSum += Number(r.afterBytes) || 0;
  }

  printSummaryTable(chalk, {
    ok: okRows.length,
    fail: results.filter((r) => r && r.status === 'error').length,
    skippedTasks: skipped.length,
    inputBytes: inputBytesSum,
    outputBytes: outputBytesSum,
    taskCount: tasks.length,
  });

  if (okRows.length > 0) {
    console.log(chalk.green.bold('\n✓ Chi tiết từng file (thành công):'));
    console.table(okRows);
  }

  const errors = results.filter((r) => r && r.status === 'error');
  if (errors.length > 0) {
    console.error(
      chalk.red.bold(`\n✕ Lỗi ${errors.length}/${results.length} task:`)
    );
    errors.forEach((e) =>
      console.error(
        chalk.red(`  ✕ ${e.input || path.basename(e.inputPath || '')}: ${e.error}`)
      )
    );
    process.exitCode = 1;
  }

  if (withStats) {
    const thr = totalMs > 0 ? ((tasks.length / totalMs) * 1000).toFixed(2) : '0';
    const mbIn = inputBytesSum / (1024 * 1024);
    const mbOut = outputBytesSum / (1024 * 1024);
    const mbps = totalMs > 0 ? ((mbIn / totalMs) * 1000).toFixed(2) : '0';
    console.log(chalk.magenta.bold('\n⚡ Benchmark (hiệu năng thô)'));
    console.table({
      'Quét thư mục (ms)': scanMs,
      'Xử lý resize (ms)': totalMs,
      'Throughput (task/s)': thr,
      'Đầu vào tổng (MB)': mbIn.toFixed(2),
      'Đầu ra tổng (MB)': mbOut.toFixed(2),
      'Workers': workers,
      'MB đầu vào / giây (ước lượng)': mbps,
    });
  }

  const logPayload = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalImages: images.length,
      totalTasks: allTasks.length,
      processed: tasks.length,
      skipped: skipped.length,
      success: okRows.length,
      failed: errors.length,
      totalTimeMs: totalMs,
      scanMs,
      workers,
      inputBytesSum,
      outputBytesSum,
      withStats,
    },
    results,
  };

  await fs.mkdir(options.output, { recursive: true });
  const logPath = path.join(options.output, 'resize-log.json');
  await writeJsonFile(logPath, logPayload);
  console.log(chalk.green.bold(`\n✓ Đã ghi log: ${logPath}`));
}

// ============================================================================
// CLI VALIDATION & BOOTSTRAP
// ============================================================================

async function validateCliInputDir(inputPath) {
  const resolved = path.resolve(inputPath);
  const st = await fs.stat(resolved);
  if (!st.isDirectory()) {
    throw new Error('Tham số --input phải trỏ tới thư mục tồn tại');
  }
}

async function bootstrap() {
  const chalk = (await import('chalk')).default;
  const ora = (await import('ora')).default;
  const inquirer = (await import('inquirer')).default;

  const raw = process.argv.slice(2);
  const interactive = raw.length === 0;

  let options;
  if (interactive) {
    console.log(
      chalk.cyan.bold(`\n${ICON.bolt} resize-cli — chế độ tương tác\n`)
    );
    try {
      options = await runInteractiveWizard({ inquirer, chalk, numCPUs });
    } catch (e) {
      if (e && e.code === 'USER_CANCELLED') {
        console.log(chalk.yellow(`\n${ICON.warn} Đã hủy — không thực hiện resize.\n`));
        process.exit(0);
      }
      throw e;
    }
  } else {
    program.parse(process.argv);
    const opts = program.opts();
    try {
      await validateCliInputDir(opts.input);
    } catch (e) {
      console.error(chalk.red(`${ICON.fail} ${e.message}`));
      process.exit(1);
    }
    options = {
      input: path.normalize(opts.input),
      output: path.normalize(opts.output),
      sizes: opts.sizes,
      width: opts.width,
      quality: opts.quality,
      format: opts.format,
      workers: opts.workers ?? Math.max(1, numCPUs - 1),
      timeout: opts.timeout,
      dryRun: Boolean(opts.dryRun),
      overwrite: Boolean(opts.overwrite),
      skipExisting: Boolean(opts.skipExisting),
      benchmark: Boolean(opts.benchmark),
      withStats: Boolean(opts.withStats),
    };
  }

  if (options.benchmark) {
    await runBenchmark(options);
  } else {
    await main(options, { chalk, ora });
  }
}

// ============================================================================
// ERROR HANDLING & PROCESS LIFECYCLE
// ============================================================================

async function closeActivePoolSafely() {
  if (!activePool) return;
  try {
    await activePool.closeAll();
  } catch {
    // ignore shutdown errors
  } finally {
    activePool = null;
  }
}

function appendSevereErrorLog(source, err) {
  const msg = err instanceof Error ? `${err.stack || err.message}` : String(err);
  const line = `[${new Date().toISOString()}] ${source}\n${msg}\n\n`;
  try {
    fsSync.appendFileSync(ERROR_LOG_PATH, line, 'utf8');
  } catch {
    // ignore file system write errors during fatal handling
  }
}

function installGlobalErrorHandlers() {
  process.on('unhandledRejection', async (reason) => {
    if (handlingFatalError) return;
    handlingFatalError = true;
    appendSevereErrorLog('unhandledRejection', reason);
    console.error(
      `${ICON.fail} Đã xảy ra lỗi hệ thống không mong muốn. Chi tiết đã được ghi vào error.log.`
    );
    await closeActivePoolSafely();
    process.exit(1);
  });

  process.on('uncaughtException', async (err) => {
    if (handlingFatalError) return;
    handlingFatalError = true;
    appendSevereErrorLog('uncaughtException', err);
    console.error(
      `${ICON.fail} Đã xảy ra lỗi nghiêm trọng. Hệ thống sẽ dừng an toàn và ghi log vào error.log.`
    );
    await closeActivePoolSafely();
    process.exit(1);
  });
}

installGlobalErrorHandlers();
bootstrap().catch((err) => {
  appendSevereErrorLog('bootstrap', err);
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`${ICON.fail} Không thể khởi động ứng dụng: ${msg}`);
  process.exit(1);
});
