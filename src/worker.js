const { parentPort } = require('worker_threads');
const sharp = require('sharp');
const fs = require('fs');
const { pipeline } = require('stream/promises');
const path = require('path');

/**
 * Worker Logic: Xử lý hình ảnh sử dụng Node.js Streams & Buffers.
 * 
 * PHẦN GIẢI THÍCH: Streams & Buffers (Tại sao chọn Stream thay vì sharp().toFile()?)
 * 
 * 1. Hiệu suất bộ nhớ (RAM):
 *    - Khi dùng sharp().toFile(), sharp thường cần đọc toàn bộ file vào buffer (RAM) trước khi xử lý. 
 *      Với file lớn (ví dụ vài GB), điều này có thể gây ra lỗi Out of Memory (OOM).
 *    - Sử dụng Streams (fs.createReadStream), Node.js sẽ đọc file theo từng chunks (mảnh nhỏ) vào Buffer. 
 *      Dữ liệu được "chảy" liên tục qua pipeline, sharp xử lý từng phần và đẩy kết quả vào WriteStream ngay lập tức.
 *      Điều này giữ mức RAM sử dụng ổn định, không phụ thuộc vào kích thước file.
 * 
 * 2. Khả năng mở rộng:
 *    - Stream cho phép kết nối nhiều công đoạn xử lý (pipes) lại với nhau một cách linh hoạt.
 *    - Pipeline giúp xử lý lỗi tập trung và tự động dọn dẹp (cleanup) các stream khi có lỗi xảy ra.
 */

const MAX_RETRIES = 2;
const HIGH_WATER_MARK = 64 * 1024; // 64KB - Kiểm soát lượng dữ liệu đệm trong RAM

/**
 * Hàm log thông số bộ nhớ: Giúp theo dõi rò rỉ hoặc quá tải RAM khi xử lý file lớn.
 * @param {string} stage Giai đoạn (Before/After)
 * @param {string} filename Tên file đang xử lý
 */
function logMemoryUsage(stage, filename) {
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`[Worker] Memory ${stage} processing ${filename}: ${Math.round(used * 100) / 100} MB`);
}

parentPort.on('message', async (task) => {
    const { inputPath, outputPath, width, quality, format } = task;
    const filename = path.basename(inputPath);
    let attempts = 0;
    let success = false;

    logMemoryUsage('BEFORE', filename);

    while (attempts <= MAX_RETRIES && !success) {
        try {
            // Kiểm tra file nguồn trước khi bắt đầu stream
            if (!fs.existsSync(inputPath)) {
                throw new Error(`File nguồn không tồn tại: ${inputPath}`);
            }

            /**
             * GIẢI THÍCH VỀ STREAMS & PIPELINE:
             * 
             * 1. Stream Pipeline:
             *    - Tự động kết nối các luồng (Read -> Transform -> Write).
             *    - Tự động đóng tất cả các streams (cleanup) nếu một trong số chúng bị lỗi hoặc kết thúc. 
             *      Điều này ngăn chặn "resource leakage" (rò rỉ tài nguyên).
             * 
             * 2. Xử lý file lớn an toàn (HighWaterMark):
             *    - Bằng cách set HIGH_WATER_MARK = 64KB, chúng ta giới hạn lượng dữ liệu 
             *      mà Node.js giữ trong bộ đệm (internal buffer) tại một thời điểm.
             *    - Giúp bộ nhớ RAM luôn ở mức thấp và ổn định, bất kể file ảnh đầu vào nặng bao nhiêu GB.
             */
            const readStream = fs.createReadStream(inputPath, { highWaterMark: HIGH_WATER_MARK });
            const writeStream = fs.createWriteStream(outputPath, { highWaterMark: HIGH_WATER_MARK });

            let transformer = sharp().resize({ 
                width: parseInt(width) || undefined, 
                withoutEnlargement: true 
            });

            // Cấu hình định dạng output
            switch (format.toLowerCase()) {
                case 'jpeg':
                case 'jpg':
                    transformer = transformer.jpeg({ quality: parseInt(quality) || 80, mozjpeg: true });
                    break;
                case 'webp':
                    transformer = transformer.webp({ quality: parseInt(quality) || 80 });
                    break;
                case 'avif':
                    transformer = transformer.avif({ quality: parseInt(quality) || 50 });
                    break;
            }

            // Thực thi pipeline
            await pipeline(readStream, transformer, writeStream);
            success = true;

            parentPort.postMessage({
                status: 'done',
                input: filename,
                output: outputPath
            });

        } catch (err) {
            attempts++;
            /**
             * RETRY MECHANISM:
             * - Một số lỗi như "File busy/locked" hoặc "Temporary I/O error" có thể xảy ra ngẫu nhiên.
             * - Thử lại tối đa 2 lần giúp tăng tính bền vững (robustness) cho hệ thống batch processing.
             */
            if (attempts <= MAX_RETRIES) {
                console.warn(`[Worker] Lỗi khi xử lý ${filename} (Lần thử ${attempts}): ${err.message}. Đang thử lại...`);
                // Nghỉ một chút trước khi thử lại (backoff nhẹ)
                await new Promise(resolve => setTimeout(resolve, 500)); 
            } else {
                parentPort.postMessage({
                    status: 'error',
                    input: filename,
                    error: `Thất bại sau ${attempts} lần thử. Lỗi cuối: ${err.message}`
                });
            }
        }
    }

    logMemoryUsage('AFTER', filename);
});
