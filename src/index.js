const { program, Option } = require('commander');
const { Worker } = require('worker_threads');
const os = require('os');
const path = require('path');
const { version } = require('../package.json');

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
  // Tuần sau: đọc thư mục input, resize bằng Sharp, ghi output, dùng workers
  console.log('Cấu hình resize:', JSON.stringify(options, null, 2));
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
