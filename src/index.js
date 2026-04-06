const { program, Option } = require('commander');
const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const cliProgress = require('cli-progress');
const { version } = require('../package.json');
const {
  getAllImages,
  shouldOverwrite,
  buildOutputPath,
  writeJsonFile,
} = require('./utils/fsUtils');
const { WorkerPool } = require('./workerPool');
const { runBenchmark } = require('./utils/benchmark');

const numCPUs = os.cpus().length;

/** Ký hiệu output (demo / báo cáo) */
const ICON = { ok: '✓', fail: '✕', bolt: '⚡', warn: '⚠', dot: '·', info: 'ℹ' };

function parsePositiveInt(value, label) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n < 1) {
    throw new Error(`${label} phải là số nguyên dương`);
  }
  return n;
}

function parseQuality(value) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n < 1 || n > 100) {
    throw new Error('quality phải từ 1 đến 100');
  }
  return n;
}

function parseSizes(value) {
  if (!value || typeof value !== 'string') return [];
  const parts = value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    throw new Error('sizes không hợp lệ. Ví dụ: --sizes 800,1200,1920');
  }

  const sizes = parts.map((item) => parsePositiveInt(item, 'sizes'));
  return [...new Set(sizes)];
}

function parseTimeoutSeconds(value) {
  return parsePositiveInt(value, 'timeout');
}

function formatBytes(num) {
  return `${Number(num || 0).toLocaleString('en-US')} B`;
}

/** Hiển thị dung lượng ngắn gọn (progress bar / tóm tắt). */
function formatBytesHuman(num, decimals = 1) {
  const n = Number(num) || 0;
  if (n < 1024) return `${Math.round(n)} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n;
  let i = -1;
  do {
    v /= 1024;
    i += 1;
  } while (v >= 1024 && i < units.length - 1);
  return `${v.toFixed(decimals)} ${units[i]}`;
}

function calcReduction(before, after) {
  if (!before || before <= 0) return '0.00%';
  const ratio = ((before - after) / before) * 100;
  return `${ratio.toFixed(2)}%`;
}

function generateTasks(images, options) {
  const useSizes = Array.isArray(options.sizes) && options.sizes.length > 0;
  const sizeList = useSizes ? options.sizes : [options.width];
  const tasks = [];

  for (const inputPath of images) {
    for (const size of sizeList) {
      const sizeOutputRoot = path.join(options.output, String(size));
      tasks.push({
        inputPath,
        outputPath: buildOutputPath(inputPath, options.input, sizeOutputRoot),
        width: size,
        quality: options.quality,
        format: options.format,
        size,
      });
    }
  }

  return tasks;
}

async function runTaskWithMetrics(pool, task) {
  const beforeStat = await fs.stat(task.inputPath);
  const start = Date.now();
  const workerResult = await pool.addTask(task);
  const durationMs = Date.now() - start;

  if (!workerResult || workerResult.status === 'error') {
    return {
      ...workerResult,
      inputPath: task.inputPath,
      outputPath: task.outputPath,
      size: task.size,
      beforeBytes: beforeStat.size,
      afterBytes: 0,
      reduction: '0.00%',
      durationMs,
    };
  }

  const afterStat = await fs.stat(task.outputPath);
  return {
    ...workerResult,
    inputPath: task.inputPath,
    outputPath: task.outputPath,
    size: task.size,
    beforeBytes: beforeStat.size,
    afterBytes: afterStat.size,
    reduction: calcReduction(beforeStat.size, afterStat.size),
    durationMs,
  };
}

/**
 * Xử lý song song với giới hạn concurrency.
 * @param {{ onTaskStart?: (task: object, inputSizeHuman: string) => void, onProgress?: (completed: number, total: number, result?: object, task?: object) => void }} hooks
 */
async function processBatchConcurrent(pool, tasks, concurrency, hooks = {}) {
  const { onTaskStart, onProgress } = hooks;
  const total = tasks.length;
  if (total === 0) return [];
  const limit = Math.max(1, concurrency);
  const results = new Array(total);
  let nextTask = 0;
  let completed = 0;

  async function workerFn() {
    while (true) {
      const i = nextTask++;
      if (i >= total) break;
      const task = tasks[i];
      if (onTaskStart) {
        try {
          const st = await fs.stat(task.inputPath);
          onTaskStart(task, formatBytesHuman(st.size));
        } catch {
          onTaskStart(task, '?');
        }
      }
      const r = await runTaskWithMetrics(pool, task);
      results[i] = r;
      completed += 1;
      if (onProgress) onProgress(completed, total, r, task);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, total) }, () => workerFn())
  );
  return results;
}

function printSummaryTable(chalk, summary) {
  const {
    ok,
    fail,
    skippedTasks,
    inputBytes,
    outputBytes,
    taskCount,
  } = summary;
  const savedPct =
    inputBytes > 0
      ? (((inputBytes - outputBytes) / inputBytes) * 100).toFixed(2)
      : '0.00';

  console.log(chalk.bold.magenta('\n╔══════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.magenta('║') + chalk.bold.white('  ⚡ TÓM TẮT KẾT QUẢ ') + chalk.bold.magenta('                                      ║'));
  console.log(chalk.bold.magenta('╠══════════════════════════════════════════════════════════╣'));
  console.log(
    chalk.bold.magenta('║') +
      `  ${chalk.green('✓')} Thành công: ${chalk.white.bold(String(ok).padStart(6))} task                          ${chalk.bold.magenta('║')}`
  );
  console.log(
    chalk.bold.magenta('║') +
      `  ${chalk.red('✕')} Thất bại:   ${chalk.white.bold(String(fail).padStart(6))} task                          ${chalk.bold.magenta('║')}`
  );
  if (skippedTasks > 0) {
    console.log(
      chalk.bold.magenta('║') +
        `  ${chalk.yellow('…')} Bỏ qua:     ${chalk.white.bold(String(skippedTasks).padStart(6))} task (file đích đã có)     ${chalk.bold.magenta('║')}`
    );
  }
  console.log(
    chalk.bold.magenta('║') +
      `  ${chalk.cyan('⚡')} Dung lượng đầu vào (tổng):  ${chalk.white.bold(formatBytesHuman(inputBytes).padStart(10))}                 ${chalk.bold.magenta('║')}`
  );
  console.log(
    chalk.bold.magenta('║') +
      `  ${chalk.cyan('⚡')} Dung lượng đầu ra (đã ghi): ${chalk.white.bold(formatBytesHuman(outputBytes).padStart(10))}                 ${chalk.bold.magenta('║')}`
  );
  console.log(
    chalk.bold.magenta('║') +
      `  ${chalk.blue('▼')} Ước lượng giảm dung lượng:   ${chalk.white.bold((savedPct + '%').padStart(10))}                 ${chalk.bold.magenta('║')}`
  );
  console.log(
    chalk.bold.magenta('║') +
      `  ${chalk.gray('○')} Tổng task đã chạy:         ${chalk.white.bold(String(taskCount).padStart(6))}                          ${chalk.bold.magenta('║')}`
  );
  console.log(chalk.bold.magenta('╚══════════════════════════════════════════════════════════╝'));
}

async function runInteractiveWizard(ctx) {
  const { inquirer, chalk, numCPUs: cpus } = ctx;
  const defaultWorkers = Math.max(1, cpus - 1);

  console.log(
    chalk.cyan.bold('\n  ╔════════════════════════════════════════════════════════╗')
  );
  console.log(
    chalk.cyan.bold('  ║') +
      chalk.white.bold('     resize-cli — Batch Image Resizer (Interactive)     ') +
      chalk.cyan.bold('║')
  );
  console.log(
    chalk.cyan.bold('  ╚════════════════════════════════════════════════════════╝\n')
  );

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'input',
      message: `${chalk.green('?')} Thư mục chứa ảnh nguồn:`,
      default: './images',
      filter: (v) => String(v ?? '').trim(),
      validate: async (inputPath) => {
        const resolved = path.resolve(inputPath || '');
        try {
          const st = await fs.stat(resolved);
          if (!st.isDirectory()) return '✕ Đường dẫn phải là thư mục';
          await fs.access(resolved, fs.constants.R_OK);
          return true;
        } catch {
          return '✕ Thư mục không tồn tại hoặc không đọc được';
        }
      },
    },
    {
      type: 'input',
      name: 'output',
      message: `${chalk.green('?')} Thư mục ghi ảnh đã resize:`,
      default: './resized',
      filter: (v) => String(v ?? '').trim(),
      validate: async (outputPath) => {
        const p = path.resolve(outputPath || './resized');
        const parent = path.dirname(p);
        try {
          await fs.mkdir(parent, { recursive: true });
          await fs.access(parent, fs.constants.W_OK);
          return true;
        } catch {
          return '✕ Không tạo/ghi được thư mục đích (kiểm tra quyền)';
        }
      },
    },
    {
      type: 'list',
      name: 'widthMode',
      message: `${chalk.green('?')} Chiều rộng resize:`,
      choices: [
        { name: 'Một kích thước (width)', value: 'single' },
        { name: 'Nhiều kích thước (sizes)', value: 'multiple' },
      ],
      default: 'single',
    },
    {
      type: 'input',
      name: 'width',
      message: `${chalk.green('?')} Chiều rộng đích (pixel, số nguyên > 0):`,
      default: '1024',
      when: (a) => a.widthMode === 'single',
      filter: (v) => String(v ?? '').trim(),
      validate: (v) => {
        try {
          parsePositiveInt(String(v).trim(), 'width');
          return true;
        } catch (e) {
          return e.message;
        }
      },
    },
    {
      type: 'input',
      name: 'sizesString',
      message: `${chalk.green('?')} Danh sách chiều rộng (phẩy), ví dụ 800,1200,1920:`,
      when: (a) => a.widthMode === 'multiple',
      filter: (v) => String(v ?? '').trim(),
      validate: (v) => {
        try {
          const s = parseSizes(String(v).trim());
          return s.length > 0 ? true : 'Nhập ít nhất một số';
        } catch (e) {
          return e.message;
        }
      },
    },
    {
      type: 'input',
      name: 'quality',
      message: `${chalk.green('?')} Chất lượng nén (1–100):`,
      default: '85',
      filter: (v) => String(v ?? '').trim(),
      validate: (v) => {
        try {
          parseQuality(String(v).trim());
          return true;
        } catch (e) {
          return e.message;
        }
      },
    },
    {
      type: 'list',
      name: 'format',
      message: `${chalk.green('?')} Định dạng đầu ra:`,
      choices: [
        { name: 'JPEG', value: 'jpeg' },
        { name: 'WebP', value: 'webp' },
        { name: 'AVIF', value: 'avif' },
      ],
      default: 'jpeg',
    },
    {
      type: 'input',
      name: 'workers',
      message: `${chalk.green('?')} Số workers (Enter = ${defaultWorkers} theo CPU):`,
      default: String(defaultWorkers),
      filter: (v) => String(v ?? '').trim(),
      validate: (v) => {
        const s = String(v).trim();
        if (s === '') return true;
        try {
          parsePositiveInt(s, 'workers');
          return true;
        } catch (e) {
          return e.message;
        }
      },
    },
    {
      type: 'confirm',
      name: 'overwrite',
      message: `${chalk.green('?')} Ghi đè file đích nếu đã tồn tại? (${chalk.yellow('No')} = bỏ qua file trùng)`,
      default: false,
    },
  ]);

  const workersRaw = String(answers.workers || '').trim();
  const workers = workersRaw === '' ? defaultWorkers : parsePositiveInt(workersRaw, 'workers');

  const sizes =
    answers.widthMode === 'multiple'
      ? parseSizes(String(answers.sizesString).trim())
      : [];

  const width =
    answers.widthMode === 'single'
      ? parsePositiveInt(String(answers.width).trim(), 'width')
      : 1024;

  const previewLines = [
    `  ${chalk.cyan('⚡')} Nguồn:     ${path.resolve(answers.input)}`,
    `  ${chalk.cyan('⚡')} Đích:      ${path.resolve(answers.output)}`,
    `  ${chalk.cyan('⚡')} Kích thước: ${
      answers.widthMode === 'multiple'
        ? parseSizes(String(answers.sizesString).trim()).join(', ') + ' px'
        : `${width} px`
    }`,
    `  ${chalk.cyan('⚡')} Chất lượng: ${parseQuality(String(answers.quality).trim())}`,
    `  ${chalk.cyan('⚡')} Định dạng:  ${answers.format}`,
    `  ${chalk.cyan('⚡')} Workers:    ${workers}`,
    `  ${chalk.cyan('⚡')} Ghi đè:     ${answers.overwrite ? chalk.yellow('Có') : chalk.green('Không (skip)')}`,
  ];
  console.log(chalk.bold.white('\n  ─── Xác nhận cấu hình ───'));
  previewLines.forEach((line) => console.log(line));
  console.log('');

  const { go } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'go',
      message: `${chalk.green('?')} Bắt đầu resize với cấu hình trên?`,
      default: true,
    },
  ]);

  if (!go) {
    const err = new Error('USER_CANCELLED');
    err.code = 'USER_CANCELLED';
    throw err;
  }

  return {
    input: path.normalize(answers.input),
    output: path.normalize(answers.output),
    sizes,
    width,
    quality: parseQuality(String(answers.quality).trim()),
    format: answers.format,
    workers,
    dryRun: false,
    overwrite: Boolean(answers.overwrite),
    skipExisting: !answers.overwrite,
  };
}

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

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
