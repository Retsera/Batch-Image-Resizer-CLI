const { program, Option } = require('commander');
const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const { version } = require('../package.json');
const {
  getAllImages,
  shouldOverwrite,
  buildOutputPath,
  writeJsonFile,
} = require('./utils/fsUtils');
const { WorkerPool } = require('./workerPool');

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

async function processBatch(pool, tasks, concurrency) {
  const limit = Math.max(1, concurrency);
  const all = [];
  for (let i = 0; i < tasks.length; i += limit) {
    const chunk = tasks.slice(i, i + limit);
    const batchResults = await Promise.all(chunk.map((t) => runTaskWithMetrics(pool, t)));
    all.push(...batchResults);
  }
  return all;
}

async function main(options) {
  const workers = Math.max(1, options.workers ?? (numCPUs - 1));
  // Mặc định skip existing. Khi có --overwrite thì ưu tiên ghi đè.
  const overwrite = options.overwrite === true;

  const images = await getAllImages(options.input);
  if (images.length === 0) {
    console.log('Không tìm thấy ảnh nào trong:', options.input);
    return;
  }

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
    console.log('\n[DRY-RUN] Danh sách file sẽ xử lý:');
    tasks.forEach((task) => {
      console.log(`- [${task.size}px] ${task.inputPath} -> ${task.outputPath}`);
    });
    console.log(`\n[DRY-RUN] Tổng task: ${tasks.length}, bỏ qua: ${skipped.length}`);
    return;
  }

  if (tasks.length === 0) {
    console.log('Tất cả file đã tồn tại hoặc không có gì để xử lý (skip existing).');
    return;
  }

  const pool = new WorkerPool({ workers, logger: () => {} });
  await Promise.all(
    tasks.map((t) => fs.mkdir(path.dirname(t.outputPath), { recursive: true }))
  );

  let results = [];
  const startTime = Date.now();
  try {
    results = await processBatch(pool, tasks, workers);
  } finally {
    await pool.closeAll();
  }
  const endTime = Date.now();

  console.log(`Thời gian xử lý: ${endTime - startTime} ms (workers=${workers}, task=${tasks.length})`);
  console.log(`Đã bỏ qua ${skipped.length} task do file đích đã tồn tại.`);

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
    console.log('\nChi tiết resize:');
    console.table(okRows);
  }

  const errors = results.filter((r) => r && r.status === 'error');
  if (errors.length > 0) {
    console.error(`Lỗi ${errors.length}/${results.length} file:`);
    errors.forEach((e) => console.error(`  - ${e.input}: ${e.error}`));
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
      totalTimeMs: endTime - startTime,
      workers,
    },
    results,
  };

  await fs.mkdir(options.output, { recursive: true });
  const logPath = path.join(options.output, 'resize-log.json');
  await writeJsonFile(logPath, logPayload);
  console.log(`Đã ghi log: ${logPath}`);
}

program
  .name('resize-cli')
  .description(
    `Công cụ dòng lệnh resize ảnh hàng loạt (batch) bằng Sharp.\n` +
      `Đọc ảnh từ thư mục --input, ghi ảnh đã resize ra --output.\n` +
      `Hỗ trợ multi-size (--sizes), dry-run, và skip/overwrite file đích.`
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
  .option('--skip-existing', 'bỏ qua nếu file đích đã tồn tại (mặc định)', true);

program.parse(process.argv);

const opts = program.opts();

main({
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
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
