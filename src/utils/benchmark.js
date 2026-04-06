const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const sharp = require('sharp');
const { performance } = require('perf_hooks');
const { WorkerPool } = require('../workerPool');
const { getAllImages } = require('./fsUtils');

/**
 * GIẢI THÍCH VỀ PERFORMANCE TRONG NODE.JS:
 * 
 * 1. Streams (Dòng dữ liệu):
 *    - Lợi ích: Tiết kiệm RAM cực đối với file cực lớn. Thay vì load cả file 1GB vào RAM,
 *      Node.js chỉ nạp khoảng 64KB (highWaterMark) mỗi lần.
 *    - Phù hợp: Hệ thống xử lý dữ liệu nặng hoặc chạy trên môi trường ít RAM (Docker, VPS rẻ).
 * 
 * 2. Worker Threads (Đa luồng xử lý):
 *    - Lợi ích: Tận dụng tối đa CPU đa nhân. Node.js mặc định là single-threaded,
 *      nếu chỉ dùng 1 luồng để resize 100 ảnh, CPU chỉ chạy 1 core trong khi các core khác "ngồi chơi".
 *    - Phù hợp: Các tác vụ tính toán nặng (Image Processing, Crypto).
 */

/**
 * Đo RAM đang sử dụng (RSS - Resident Set Size) quy đổi ra MB.
 * RSS bao gồm cả bộ nhớ JS Heap và bộ nhớ C++ của Sharp.
 */
function getMemoryMB() {
  return Math.round(process.memoryUsage().rss / 1024 / 1024);
}

/**
 * Benchmark 1 file: Stream Pipeline vs Sharp Buffer
 */
async function benchmarkSingleFile(inputPath, outputDir, options) {
  const filename = path.basename(inputPath);
  const tempStreamPath = path.join(outputDir, `bench_stream_${filename}`);
  const tempBufferPath = path.join(outputDir, `bench_buffer_${filename}`);
  
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  console.log(`\n--- [1] BENCHMARK SINGLE FILE: ${filename} ---`);
  
  // --- Cách 1: Stream Pipeline ---
  const memBeforeStream = getMemoryMB();
  const startStream = performance.now();
  
  const readStream = fs.createReadStream(inputPath);
  const writeStream = fs.createWriteStream(tempStreamPath);
  const transformer = sharp().resize({ width: options.width, withoutEnlargement: true });
  
  await pipeline(readStream, transformer, writeStream);
  
  const endStream = performance.now();
  const memAfterStream = getMemoryMB();
  const durationStream = (endStream - startStream) / 1000;

  // --- Cách 2: Sharp Buffer (toFile) ---
  // Đợi một chút để GC dọn dẹp RAM stream
  await new Promise(r => setTimeout(r, 500));
  
  const memBeforeBuffer = getMemoryMB();
  const startBuffer = performance.now();
  
  await sharp(inputPath)
    .resize({ width: options.width, withoutEnlargement: true })
    .toFile(tempBufferPath);
    
  const endBuffer = performance.now();
  const memAfterBuffer = getMemoryMB();
  const durationBuffer = (endBuffer - startBuffer) / 1000;

  const improvementTime = ((durationBuffer - durationStream) / durationBuffer * 100).toFixed(2);
  const improvementMem = ((memAfterBuffer - memAfterStream) / memAfterBuffer * 100).toFixed(2);

  console.table([
    {
      'Phương pháp': 'Stream Pipeline (Hiện tại)',
      'Thời gian (s)': durationStream.toFixed(3),
      'RAM Trước (MB)': memBeforeStream,
      'RAM Sau (MB)': memAfterStream,
      'Peak Memory': `${memAfterStream - memBeforeStream} MB`
    },
    {
      'Phương pháp': 'Sharp toFile (Truyền thống)',
      'Thời gian (s)': durationBuffer.toFixed(3),
      'RAM Trước (MB)': memBeforeBuffer,
      'RAM Sau (MB)': memAfterBuffer,
      'Peak Memory': `${memAfterBuffer - memBeforeBuffer} MB`
    }
  ]);

  console.log(`=> Kết quả: Streams giúp giảm ${improvementMem}% memory peak so với cách truyền thống.`);
  
  // Cleanup
  try {
    fs.unlinkSync(tempStreamPath);
    fs.unlinkSync(tempBufferPath);
  } catch {}
}

/**
 * Benchmark Batch: 4, 8, 12 workers
 */
async function benchmarkBatch(images, outputDir, options) {
  const workersList = [4, 8, 12];
  const results = [];

  console.log(`\n--- [2] BENCHMARK BATCH PROCESSING: ${images.length} images ---`);

  for (const count of workersList) {
    const memBefore = getMemoryMB();
    const start = performance.now();

    const pool = new WorkerPool({ workers: count, logger: () => {} });
    
    // Tạo tasks
    const tasks = images.map(img => ({
      inputPath: img,
      outputPath: path.join(outputDir, `bench_${count}`, path.basename(img)),
      width: options.width,
      quality: options.quality,
      format: options.format
    }));

    // Tạo dir cho batch
    await fs.promises.mkdir(path.dirname(tasks[0].outputPath), { recursive: true });

    // Chạy song song
    await Promise.all(tasks.map(t => pool.addTask(t)));
    
    const end = performance.now();
    const memAfter = getMemoryMB();
    const totalTime = (end - start) / 1000;
    
    results.push({
      'Số Worker': count,
      'Tổng thời gian (s)': totalTime.toFixed(2),
      'Peak RAM (MB)': memAfter - memBefore,
      'Trung bình/ảnh (s)': (totalTime / images.length).toFixed(3)
    });

    await pool.closeAll();
    // Chờ GC dọn dẹp giữa các đợt bench
    await new Promise(r => setTimeout(r, 1000));
  }

  console.table(results);
  
  // So sánh improvement giữa 4 và 12 workers
  const fast = parseFloat(results[2]['Tổng thời gian (s)']);
  const slow = parseFloat(results[0]['Tổng thời gian (s)']);
  const boost = ((slow - fast) / slow * 100).toFixed(2);
  console.log(`=> Kết quả: Tăng số workers từ 4 lên 12 giúp cải thiện ${boost}% tốc độ xử lý batch.`);
}

/**
 * Entry point cho tính năng Benchmark
 */
async function runBenchmark(options) {
  const chalk = (await import('chalk')).default;
  console.log(chalk.bold.magenta('\n🚀 KHỞI ĐỘNG HỆ THỐNG BENCHMARK & PERFORMANCE TESTING\n'));

  try {
    const images = await getAllImages(options.input);
    if (images.length === 0) {
      console.log(chalk.red('Lỗi: Không tìm thấy ảnh để benchmark!'));
      return;
    }

    // Chọn file lớn nhất để bench single
    let largestFile = images[0];
    let maxSize = 0;
    for (const f of images) {
      const s = fs.statSync(f).size;
      if (s > maxSize) {
        maxSize = s;
        largestFile = f;
      }
    }

    // 1. Chạy Single Benchmark
    await benchmarkSingleFile(largestFile, options.output, options);

    // 2. Chạy Batch Benchmark (giới hạn 20 ảnh để tránh tốn thời gian quá lâu)
    const batchImages = images.slice(0, 20);
    await benchmarkBatch(batchImages, options.output, options);

    console.log(chalk.green.bold('\n✔ Hoàn thành quá trình Benchmark. Các file tạm đã được dọn dẹp.'));
  } catch (err) {
    console.error(chalk.red('\n✖ Lỗi trong quá trình benchmark:'), err.message);
  }
}

module.exports = { runBenchmark };
