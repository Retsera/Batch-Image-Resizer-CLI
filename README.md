# Node.js Core - Batch Image Resizer CLI

Một công cụ CLI đơn giản để thay đổi kích thước hàng loạt ảnh bằng Node.js (Core) sử dụng:

- Streams & Buffers (không load toàn bộ file vào RAM)
- Worker Threads (xử lý song song theo số core)
- File System (quét thư mục, preserve folder structure)

Project structure (tại thư mục gốc):

- [src/index.js](src/index.js) - entry CLI, Worker Threads, Commander
- [src/worker.js](src/worker.js) - worker xử lý ảnh (Streams & Buffers + sharp)
- [src/utils/fsUtils.js](src/utils/fsUtils.js) - các tiện ích FS (getAllImages, buildOutputPath)
- images/ - input sample images
- resized/ - output folder

Yêu cầu tối thiểu

- Node.js 16+ (khuyến nghị Node 18+ LTS)
- npm (hoặc yarn)

Cài đặt

1. Clone hoặc copy repository về máy.
2. Trong thư mục project, cài dependencies:

```bash
npm install
```

Lưu ý cho Windows: `sharp` cung cấp binaries cho nhiều nền tảng. Nếu cài thất bại, cài thêm build tools theo hướng dẫn chính thức của sharp.

Chạy CLI (cơ bản)

```bash
# chạy với cấu hình mặc định (input: ./images, output: ./resized)
node src/index.js

# hoặc dùng script npm
npm run dev
```

Các option CLI

```bash
--input, -i <path>       Thư mục input (mặc định: ./images)
--output, -o <path>      Thư mục output (mặc định: ./resized)
--width <number>         Chiều rộng mục tiêu px (mặc định: 1024)
--quality <number>       Chất lượng (1-100, mặc định: 85)
--format <jpeg|webp|avif> Định dạng output (mặc định: jpeg)
--workers <number>       Số worker song song (mặc định: số CPU)
--help                   Hiển thị help
```

Ví dụ sử dụng

1) Resize toàn bộ ảnh trong `images` với width 800px, format webp:

```bash
node src/index.js --input ./images --output ./resized --width 800 --format webp
```

2) Chạy với 4 worker song song:

```bash
node src/index.js --workers 4
```

Giải thích ngắn về kỹ thuật

- Streams & Buffers: `src/worker.js` sử dụng `fs.createReadStream()` và `fs.createWriteStream()` kết hợp với pipeline của `sharp()` để xử lý ảnh theo luồng. Điều này quan trọng khi xử lý file lớn (giữ bộ nhớ thấp) — tránh dùng `sharp().toFile()` nếu bạn cần stream-based pipeline.
- Worker Threads: `src/index.js` khởi nhiều `Worker` để xử lý các task song song, tối ưu hóa theo số cores. Mỗi worker nhận task via `parentPort.postMessage`, gửi kết quả hoặc lỗi và `terminate()` sau khi hoàn thành.

Output và preserve folder structure

Hàm `buildOutputPath` trong [src/utils/fsUtils.js](src/utils/fsUtils.js) giữ nguyên cây thư mục con khi ghi vào `resized/`, ví dụ `images/vacation/sea.jpg` -> `resized/vacation/sea.jpg`. Nếu bạn chỉ muốn một size riêng, có thể thêm subfolder như `resized/1024/vacation/sea.jpg`.

Thư mục `resized/` nên có sẵn hoặc sẽ được tạo lúc runtime. Bạn có thể tạo file .gitkeep nếu muốn commit folder rỗng:

```bash
mkdir resized\somewhere
type nul > resized/.gitkeep
```

Troubleshooting

- Nếu `sharp` cài không được: kiểm tra Node version, quyền mạng (để tải binary), hoặc cài build-tools theo docs sharp.
- Nếu gặp lỗi permission khi ghi file: kiểm tra quyền của thư mục output.
- Nếu thấy out-of-memory: đảm bảo project dùng streams (worker dùng stream pipeline), và giới hạn số worker bằng `--workers` nếu máy có ít RAM.

Các bước tiếp theo / gợi ý

- Thêm tính năng resize nhiều kích cỡ (multi-size) và tạo cấu hình presets.
- Thêm logging chi tiết và progress bar (ví dụ `ora` hoặc `cli-progress`).
- Viết tests nhỏ cho `getAllImages` và `buildOutputPath`.

Nếu bạn muốn, tôi có thể chạy thử lệnh cài đặt hoặc kiểm tra các file `src/*` để chắc chắn CLI hoạt động trên máy bạn.

---
Phiên bản hiện tại: 1.0.0
