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

parentPort.on('message', async (task) => {
    const { inputPath, outputPath, width, quality, format } = task;
    const filename = path.basename(inputPath);

    try {
        // Kiểm tra xem inputPath có tồn tại không
        if (!fs.existsSync(inputPath)) {
          throw new Error(`File nguồn không tồn tại: ${inputPath}`);
        }

        // Khởi tạo Read Stream từ file nguồn
        const readStream = fs.createReadStream(inputPath);

        // Cấu hình Sharp Transform Stream
        let transformer = sharp().resize({ width: parseInt(width) || undefined, withoutEnlargement: true });

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
            default:
                // Nếu format không khớp, giữ nguyên format gốc nhưng tối ưu hóa
                break;
        }

        // Khởi tạo Write Stream tới file đích
        const writeStream = fs.createWriteStream(outputPath);

        // Sử dụng Stream Pipeline để kết hợp các luồng dữ liệu
        // Pipeline tự động xử lý error và dọn dẹp resource (close handles)
        await pipeline(
            readStream,
            transformer,
            writeStream
        );

        // Gửi thông báo thành công về Parent
        parentPort.postMessage({
            status: 'done',
            input: filename,
            output: outputPath
        });

    } catch (err) {
        // Gửi thông báo lỗi về Parent
        parentPort.postMessage({
            status: 'error',
            input: filename,
            error: err.message
        });
    }
});
