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

function formatBytes(num) {
  return `${Number(num || 0).toLocaleString('en-US')} B`;
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
 * Xử lý song song với giới hạn concurrency; gọi onProgress(completed, total) sau mỗi task xong.
 */
async function processBatchConcurrent(pool, tasks, concurrency, onProgress) {
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
      const r = await runTaskWithMetrics(pool, tasks[i]);
      results[i] = r;
      completed += 1;
      if (onProgress) onProgress(completed, total);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, total) }, () => workerFn())
  );
  return results;
}

async function runInteractiveWizard(ctx) {
  const { inquirer, chalk, numCPUs: cpus } = ctx;
  const defaultWorkers = Math.max(1, cpus - 1);

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'input',
      message: 'Thư mục chứa ảnh nguồn:',
      default: './images',
      validate: async (inputPath) => {
        const resolved = path.resolve(inputPath || '');
        try {
          const st = await fs.stat(resolved);
          return st.isDirectory() ? true : 'Đường dẫn phải là thư mục';
        } catch {
          return 'Thư mục không tồn tại hoặc không đọc được';
        }
      },
    },
    {
      type: 'input',
      name: 'output',
      message: 'Thư mục ghi ảnh đã resize:',
      default: './resized',
    },
    {
      type: 'list',
      name: 'widthMode',
      message: 'Chiều rộng resize:',
      choices: [
        { name: 'Một kích thước (width)', value: 'single' },
        { name: 'Nhiều kích thước (sizes)', value: 'multiple' },
      ],
      default: 'single',
    },
    {
      type: 'input',
      name: 'width',
      message: 'Chiều rộng đích (pixel):',
      default: '1024',
      when: (a) => a.widthMode === 'single',
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
      message: 'Danh sách chiều rộng (cách nhau bởi dấu phẩy), ví dụ 800,1200,1920:',
      when: (a) => a.widthMode === 'multiple',
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
      message: 'Chất lượng nén (1–100):',
      default: '85',
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
      message: 'Định dạng đầu ra:',
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
      message: `Số workers (Enter = ${defaultWorkers} theo CPU):`,
      default: String(defaultWorkers),
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
      message: 'Ghi đè file đích nếu đã tồn tại? (No = bỏ qua file trùng)',
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
  const chalk = ui.chalk;
  const ora = ui.ora;
  const workers = Math.max(1, options.workers ?? Math.max(1, numCPUs - 1));
  const overwrite = options.overwrite === true;

  const spinner = ora({
    text: chalk.cyan('Đang quét thư mục ảnh…'),
    color: 'cyan',
  }).start();

  let images;
  try {
    images = await getAllImages(options.input);
  } catch (err) {
    spinner.fail(chalk.red(`Lỗi khi quét thư mục: ${err.message}`));
    throw err;
  }

  if (images.length === 0) {
    spinner.warn(chalk.yellow(`Không tìm thấy ảnh nào trong: ${options.input}`));
    return;
  }

  spinner.succeed(chalk.green(`Đã quét xong — ${images.length} ảnh`));

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
    console.log(chalk.cyan('\n[DRY-RUN] Danh sách file sẽ xử lý:'));
    tasks.forEach((task) => {
      console.log(`- [${task.size}px] ${task.inputPath} -> ${task.outputPath}`);
    });
    console.log(
      chalk.cyan(`\n[DRY-RUN] Tổng task: ${tasks.length}, bỏ qua: ${skipped.length}`)
    );
    return;
  }

  if (tasks.length === 0) {
    console.log(
      chalk.yellow('Tất cả file đích đã tồn tại — không có gì để xử lý (skip).')
    );
    return;
  }

  if (skipped.length > 0) {
    console.log(
      chalk.yellow(`Cảnh báo: ${skipped.length} task bị bỏ qua do file đích đã tồn tại.`)
    );
  }

  const pool = new WorkerPool({
    workers,
    logger: () => {},
  });

  const onShutdown = async (reason) => {
    try {
      if (reason) console.error(chalk.red(reason));
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
  const bar = new cliProgress.SingleBar(
    {
      clearOnComplete: false,
      hideCursor: true,
      format:
        'Resize |{bar}| {percentage}% | ảnh {value}/{total} | {imgPerSec} ảnh/giây | đã chạy {duration_formatted} | còn ~{eta_formatted}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
    },
    cliProgress.Presets.shades_classic
  );

  const processStart = Date.now();
  bar.start(tasks.length, 0, { imgPerSec: '0.00' });

  try {
    results = await processBatchConcurrent(pool, tasks, workers, (completed, total) => {
      const elapsedSec = (Date.now() - processStart) / 1000;
      const imgPerSec = elapsedSec > 0 ? (completed / elapsedSec).toFixed(2) : '0.00';
      bar.update(completed, { imgPerSec });
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
    chalk.green(
      `\nHoàn tất: ${tasks.length} task trong ${totalMs} ms (workers=${workers}).`
    )
  );
  console.log(
    chalk.gray(`Đã bỏ qua ${skipped.length} task do trùng file đích (nếu có).`)
  );

  const okRows = results
    .filter((r) => r && r.status === 'done')
    .map((r) => ({
      file: path.basename(r.inputPath),
      size: `${r.size}px`,
      before: formatBytes(r.beforeBytes),
      after: formatBytes(r.afterBytes),
      reduced: r.reduction,
      time: `${r.durationMs} ms`,
    }));

  if (okRows.length > 0) {
    console.log(chalk.green('\nChi tiết resize:'));
    console.table(okRows);
  }

  const errors = results.filter((r) => r && r.status === 'error');
  if (errors.length > 0) {
    console.error(
      chalk.red(`Lỗi ${errors.length}/${results.length} file:`)
    );
    errors.forEach((e) =>
      console.error(chalk.red(`  - ${e.input || e.inputPath}: ${e.error}`))
    );
    process.exitCode = 1;
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
      workers,
    },
    results,
  };

  await fs.mkdir(options.output, { recursive: true });
  const logPath = path.join(options.output, 'resize-log.json');
  await writeJsonFile(logPath, logPayload);
  console.log(chalk.green(`Đã ghi log: ${logPath}`));
}

program
  .name('resize-cli')
  .description(
    `Công cụ dòng lệnh resize ảnh hàng loạt (batch) bằng Sharp.\n` +
      `Đọc ảnh từ thư mục --input, ghi ảnh đã resize ra --output.\n` +
      `Hỗ trợ multi-size (--sizes), dry-run, skip/overwrite, và chế độ tương tác (không tham số).`
  )
  .version(version, '-V, --version', 'hiển thị phiên bản')
  .helpOption('-h, --help', 'hiển thị trợ giúp');

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
  .option('--dry-run', 'chỉ liệt kê task sẽ xử lý, không resize thật', false)
  .option('--overwrite', 'ghi đè nếu file đích đã tồn tại', false)
  .option('--skip-existing', 'bỏ qua nếu file đích đã tồn tại (mặc định)', true)
  .option('--benchmark', 'chạy benchmark hiệu năng (Streams vs Buffer & Workers)', false);

async function bootstrap() {
  const chalk = (await import('chalk')).default;
  const ora = (await import('ora')).default;
  const inquirer = (await import('inquirer')).default;

  const raw = process.argv.slice(2);
  const interactive = raw.length === 0;

  let options;
  if (interactive) {
    console.log(chalk.cyan.bold('\n resize-cli — chế độ tương tác\n'));
    options = await runInteractiveWizard({ inquirer, chalk, numCPUs });
  } else {
    program.parse(process.argv);
    const opts = program.opts();
    options = {
      input: path.normalize(opts.input),
      output: path.normalize(opts.output),
      sizes: opts.sizes,
      width: opts.width,
      quality: opts.quality,
      format: opts.format,
      workers: opts.workers ?? Math.max(1, numCPUs - 1),
      dryRun: Boolean(opts.dryRun),
      overwrite: Boolean(opts.overwrite),
      skipExisting: Boolean(opts.skipExisting),
      benchmark: Boolean(opts.benchmark),
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
