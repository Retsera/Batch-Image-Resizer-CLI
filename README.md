# Node.js Core Image Resizer CLI

## 1) Giới thiệu đồ án

Đây là đồ án môn học xây dựng công cụ CLI xử lý ảnh hàng loạt bằng **Node.js Core**, tập trung vào các kỹ thuật nền tảng:

- **Streams & Buffers** để xử lý file theo dòng dữ liệu, tránh nạp toàn bộ vào RAM.
- **Worker Threads** để resize song song, tận dụng CPU đa nhân.
- **File System (`fs`)** để quét đệ quy thư mục ảnh, tạo output và ghi log JSON.

Ứng dụng hỗ trợ 2 chế độ sử dụng:

- **Command mode**: chạy trực tiếp bằng tham số CLI.
- **Interactive mode**: wizard hỏi đáp từng bước (không cần truyền tham số).

## 2) Công nghệ sử dụng

- **Node.js Core** (`fs`, `path`, `os`, `worker_threads`, `stream/promises`)
- **sharp**: xử lý ảnh (resize + encode jpeg/webp/avif)
- **commander**: parse CLI arguments
- **inquirer**: interactive wizard
- **cli-progress**: progress bar terminal
- **ora** và **chalk**: spinner + màu sắc output

## 3) Yêu cầu bắt buộc môn học và cách đáp ứng

### 3.1 Streams & Buffers

- Worker sử dụng `fs.createReadStream()` + `sharp()` + `fs.createWriteStream()` với `pipeline(...)` trong `src/worker.js`.
- Áp dụng `highWaterMark` để giới hạn buffer/chunk, ổn định RAM khi xử lý batch.
- Có benchmark so sánh Stream Pipeline và `sharp().toFile()` trong `src/utils/benchmark.js`.

### 3.2 Worker Threads

- `src/workerPool.js` tự quản lý pool worker (queue, idle/busy workers, closeAll).
- `src/index.js` tạo task và phân phối qua `WorkerPool`, theo cấu hình `--workers`.
- Có benchmark batch 4/8/12 workers để đánh giá tốc độ theo mức song song.

### 3.3 File System (`fs`)

- Quét thư mục đệ quy ảnh đầu vào bằng `getAllImages(...)` trong `src/utils/fsUtils.js`.
- Tự tạo thư mục đích khi cần, giữ nguyên cấu trúc thư mục con bằng `buildOutputPath(...)`.
- Ghi báo cáo chạy vào `resize-log.json` sau mỗi lần xử lý.

## 4) Tính năng đã triển khai

- Resize ảnh hàng loạt theo **1 kích thước** (`--width`) hoặc **nhiều kích thước** (`--sizes 640,1024,1920`).
- Chọn định dạng đầu ra: `jpeg`, `webp`, `avif`.
- Cấu hình chất lượng nén (`--quality 1..100`).
- Xử lý song song theo số worker (`--workers`).
- Chế độ `--dry-run` để xem task trước khi chạy thật.
- Tùy chọn `--overwrite` / `--skip-existing` để kiểm soát file trùng.
- In tổng hợp dung lượng trước/sau và tỉ lệ giảm dung lượng.
- Ghi log chi tiết JSON phục vụ demo và báo cáo.
- Chế độ benchmark (`--benchmark`) cho phần trình bày hiệu năng.

## 5) Cài đặt và sử dụng

### 5.1 Yêu cầu môi trường

- Node.js 18+ (khuyến nghị LTS)
- npm

### 5.2 Cài đặt

```bash
npm install
```

### 5.3 Chạy ở command mode

```bash
# Mặc định: input ./images, output ./resized
node src/index.js

# Ví dụ resize 1 kích thước
node src/index.js -i ./images -o ./resized --width 1024 --format webp --quality 82 -w 4

# Ví dụ nhiều kích thước
node src/index.js -i ./images -o ./resized --sizes 640,1024,1920 --format jpeg --quality 85

# Dry-run, không ghi file
node src/index.js --dry-run --sizes 800,1200

# Benchmark
node src/index.js --benchmark -i ./images -o ./resized
```

### 5.4 Chạy ở interactive mode

```bash
node src/index.js
```

Wizard sẽ lần lượt hỏi:

1. Thư mục input
2. Thư mục output
3. Chế độ 1 kích thước / nhiều kích thước
4. Width hoặc danh sách sizes
5. Quality, format
6. Số worker
7. Overwrite hay skip file trùng

## 6) Kết quả benchmark

Điều kiện đo (ngày 10/04/2026):

- Dataset: 20 ảnh sample trong `images/sample`
- Máy chạy: Windows
- Lệnh: `npm run benchmark`

### 6.1 Single file benchmark

| Phương pháp | Thời gian (s) | RAM trước (MB) | RAM sau (MB) | Peak Memory |
|---|---:|---:|---:|---:|
| Stream Pipeline | 0.102 | 65 | 67 | +2 MB |
| Sharp toFile | 0.081 | 67 | 67 | +0 MB |

Nhận xét: với dataset nhỏ, chênh lệch RAM chưa rõ rệt; lợi ích streams sẽ rõ hơn khi file lớn hoặc batch dài.

### 6.2 Batch benchmark theo số worker

| Workers | Tổng thời gian (s) | Peak RAM (MB) | Trung bình/ảnh (s) |
|---:|---:|---:|---:|
| 4 | 2.44 | 76 | 0.122 |
| 8 | 2.31 | 98 | 0.116 |
| 12 | 1.76 | 115 | 0.088 |

Kết luận: tăng từ 4 lên 12 worker cải thiện tốc độ khoảng **27.87%**, đánh đổi bằng mức RAM cao hơn.

Chi tiết xem thêm tại `docs/benchmark-results.md`.

## 7) Phân công công việc (4 thành viên)

> Thay tên theo danh sách nhóm thực tế.

| Thành viên | Vai trò chính | Công việc chi tiết | Kết quả bàn giao |
|---|---|---|---|
| Thành viên 1 (Nhóm trưởng) | Kiến trúc & điều phối | Thiết kế luồng Main → WorkerPool → Worker, phân rã task, tích hợp CLI tổng | Khung hệ thống hoàn chỉnh, flow xử lý chuẩn |
| Thành viên 2 | Worker & Streams | Viết `worker.js`, stream pipeline, retry mechanism, format encode jpeg/webp/avif | Worker ổn định, xử lý ảnh theo stream |
| Thành viên 3 | WorkerPool & FS | Viết `workerPool.js`, queue/idle/busy lifecycle, `fsUtils.js` quét ảnh + giữ cấu trúc thư mục | Quản lý song song và output path đúng cấu trúc |
| Thành viên 4 | UI CLI & Benchmark & Tài liệu | Interactive wizard, progress bar, summary, benchmark script, hoàn thiện README/docs/slide outline | Demo mượt, có số liệu đo lường, tài liệu đầy đủ |

## 8) Hình ảnh minh họa

### 8.1 Progress bar khi chạy batch

```text
⚡ ██████████████████████| 100% | 20/20 | img-20.jpg             | 26.8 KB | 10s
```

### 8.2 Output log và summary

```text
✓ Hoàn tất: 20 task trong 1376 ms · workers=4
✓ Đã ghi log: resized\resize-log.json
```

### 8.3 Cấu trúc thư mục dự án

```text
Batch-Image-Resizer-CLI/
├─ images/
│  └─ sample/
├─ resized/
├─ src/
│  ├─ index.js
│  ├─ worker.js
│  ├─ workerPool.js
│  └─ utils/
│     ├─ benchmark.js
│     └─ fsUtils.js
├─ docs/
│  ├─ architecture.md
│  └─ benchmark-results.md
└─ README.md
```

## 9) Tài liệu bổ sung

- Kiến trúc hệ thống: `docs/architecture.md`
- Bảng benchmark chi tiết: `docs/benchmark-results.md`

## 10) Định hướng mở rộng

- Hỗ trợ nhiều preset resize theo profile (thumbnail, social, web).
- Thêm unit test cho `fsUtils` và integration test cho worker pool.
- Thêm xuất báo cáo benchmark ra file CSV/JSON tự động.

## 11) Outline slide trình bày (12-15 slide)

### Slide 1 - Tiêu đề

- Tên đề tài: Node.js Core Image Resizer CLI
- Tên nhóm, lớp, môn học, giảng viên
- Tagline: Resize hàng loạt bằng Streams + Worker Threads

### Slide 2 - Yêu cầu môn học

- Bắt buộc dùng Node.js Core APIs
- Bắt buộc thể hiện Streams & Buffers
- Bắt buộc có Worker Threads
- Bắt buộc thao tác File System (`fs`)

### Slide 3 - Mục tiêu đồ án

- Xây dựng CLI thực tế, dùng được ngay
- Tối ưu tốc độ xử lý batch
- Giữ RAM ổn định khi xử lý nhiều file
- Tạo benchmark và log để đánh giá

### Slide 4 - Tổng quan kiến trúc

- Sơ đồ Main -> WorkerPool -> Worker -> Stream Pipeline
- Trách nhiệm từng thành phần
- Luồng dữ liệu input/output

### Slide 5 - Streams & Buffers

- Pipeline: `ReadStream -> sharp transform -> WriteStream`
- Ý nghĩa `highWaterMark` và xử lý theo chunk
- Lý do chọn stream thay vì xử lý nguyên khối

### Slide 6 - Worker Threads & WorkerPool

- Cơ chế queue task và worker idle/busy
- Khả năng scale theo `--workers`
- Xử lý lỗi/retry và đóng pool an toàn

### Slide 7 - Demo tính năng 1: Command mode

- Demo lệnh resize 1 kích thước
- Demo nhiều kích thước (`--sizes`)
- Demo `--overwrite` / `--dry-run`

### Slide 8 - Demo tính năng 2: Interactive mode

- Chạy `node src/index.js` không tham số
- Wizard cấu hình từng bước
- Trải nghiệm CLI thân thiện

### Slide 9 - Demo tính năng 3: Output & Logging

- Progress bar theo thời gian thực
- Bảng summary (success/fail, dung lượng trước/sau)
- File `resize-log.json` phục vụ báo cáo

### Slide 10 - Benchmark single file

- So sánh Stream Pipeline vs Sharp toFile
- Bảng thời gian + memory usage
- Nhận xét theo từng kiểu dataset

### Slide 11 - Benchmark batch theo workers

- Bảng 4/8/12 workers
- Tốc độ tăng bao nhiêu % khi tăng worker
- Trade-off: tốc độ và RAM

### Slide 12 - Phân công công việc

- Vai trò 4 thành viên
- Công việc chính và đầu ra mỗi người
- Mức độ phối hợp giữa các phần

### Slide 13 - Khó khăn gặp phải

- Cân bằng workers và memory peak
- Xử lý file lỗi/locked file
- Bài học khi benchmark và đọc số liệu

### Slide 14 - Kết luận

- Mức độ hoàn thành yêu cầu môn học
- Kết quả chính đạt được
- Giá trị thực tiễn của dự án CLI

### Slide 15 - Bài học rút ra & Hướng phát triển

- Bài học kỹ thuật (streaming, parallelism, fs)
- Bài học teamwork và tổ chức module
- Hướng mở rộng bản sản phẩm

---
Phiên bản: 1.0.0
