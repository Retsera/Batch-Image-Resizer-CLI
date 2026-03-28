const { program, Option } = require('commander');
const { Worker } = require('worker_threads');
const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const { version } = require('../package.json');
const { getAllImages } = require('./utils/fsUtils');

const numCPUs = os.cpus().length;

/**
 * Worker Threads: mỗi Worker là một luồng V8 riêng, phù hợp tác vụ CPU-bound (resize).
 * Tránh block event loop của luồng chính khi xử lý nhiều ảnh.
 */
function runInWorker(task) {
  return new Promise((resolve, reject) => {
    const workerPath = path.join(__dirname, 'worker.js');
    const worker = new Worker(workerPath);

    const finish = async (handler) => {
      try {
        await worker.terminate();
      } catch {
        // ignore terminate errors
      }
      handler();
    };

    worker.once('message', (msg) => {
      finish(() => resolve(msg));
    });

    worker.once('error', (err) => {
      finish(() => reject(err));
    });

    worker.postMessage(task);
  });
}

/**
 * Parallel theo batch: trong mỗi batch chạy tối đa `concurrency` worker cùng lúc (Promise.all).
 * Các batch chạy tuần tự để không vượt quá số worker đã cấu hình.
 */
async function processBatch(tasks, concurrency) {
  const limit = Math.max(1, concurrency);
  const all = [];
  for (let i = 0; i < tasks.length; i += limit) {
    const chunk = tasks.slice(i, i + limit);
    const batchResults = await Promise.all(chunk.map((t) => runInWorker(t)));
    all.push(...batchResults);
  }
  return all;
}

/** Giữ cấu trúc thư mục con tương đối so với thư mục input. */
function buildOutputPath(inputPath, inputRoot, outputDir) {
  const rel = path.relative(path.resolve(inputRoot), path.resolve(inputPath));
  return path.join(outputDir, rel);
}

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

async function main(options) {
  const workers = Math.max(1, options.workers ?? numCPUs);

  const images = await getAllImages(options.input);
  if (images.length === 0) {
    console.log('Không tìm thấy ảnh nào trong:', options.input);
    return;
  }

  const tasks = images.map((inputPath) => ({
    inputPath,
    outputPath: buildOutputPath(inputPath, options.input, options.output),
    width: options.width,
    quality: options.quality,
    format: options.format,
  }));

  await Promise.all(
    tasks.map((t) => fs.mkdir(path.dirname(t.outputPath), { recursive: true }))
  );

  const startTime = Date.now();
  const results = await processBatch(tasks, workers);
  const endTime = Date.now();

  console.log(`Thời gian xử lý: ${endTime - startTime} ms (workers=${workers}, ảnh=${tasks.length})`);

  const errors = results.filter((r) => r && r.status === 'error');
  if (errors.length > 0) {
    console.error(`Lỗi ${errors.length}/${results.length} file:`);
    errors.forEach((e) => console.error(`  - ${e.input}: ${e.error}`));
    process.exitCode = 1;
  }
}

program
  .name('resize-cli')
  .description(
    `Công cụ dòng lệnh resize ảnh hàng loạt (batch) bằng Sharp.\n` +
      `Đọc ảnh từ thư mục --input, ghi ảnh đã resize ra --output.\n` +
      `Điều chỉnh chiều rộng đích, chất lượng nén, định dạng đầu ra (JPEG / WebP / AVIF),\n` +
      `và số luồng xử lý song song (--workers, mặc định bằng số lõi CPU).`
  )
  .version(version, '-V, --version', 'hiển thị phiên bản')
  .helpOption('-h, --help', 'hiển thị trợ giúp');

program
  .option('-i, --input <path>', 'thư mục chứa ảnh nguồn', './images')
  .option('-o, --output <path>', 'thư mục ghi ảnh đã resize', './resized')
  .option(
    '--width <number>',
    'chiều rộng đích (pixel)',
    (value) => parsePositiveInt(value, 'width'),
    1024
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
    'số worker xử lý song song (mặc định: số lõi CPU)',
    (value) => parsePositiveInt(value, 'workers')
  );

program.parse(process.argv);

const opts = program.opts();

main({
  input: path.normalize(opts.input),
  output: path.normalize(opts.output),
  width: opts.width,
  quality: opts.quality,
  format: opts.format,
  workers: opts.workers ?? numCPUs,
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
