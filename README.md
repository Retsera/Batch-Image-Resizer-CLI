# ⚡ Node.js Core - Batch Image Resizer CLI

Một công cụ CLI mạnh mẽ để thay đổi kích thước hàng loạt ảnh bằng Node.js sử dụng:

- **Streams & Buffers** - Không load toàn bộ file vào RAM, xử lý dòng dữ liệu liên tục
- **Worker Threads** - Xử lý đa luồng tối ưu theo số core CPU
- **Sharp Image Library** - Thư viện xử lý ảnh hiệu suất cao
- **CLI Progress Bar** - Hiển thị thanh tiến độ chi tiết với tốc độ xử lý
- **Modular Architecture** - Cấu trúc mô-đun sạch, dễ bảo trì

## 📁 Cấu Trúc Dự Án

```
src/
├── index.js              # Entry point, lệnh CLI chính
├── cli/                  # Modúl CLI & giao diện
│   ├── parsers.js        # Các hàm parse & validate tham số
│   ├── ui.js             # Hiển thị UI (icon, formatting, summary table)
│   └── wizard.js         # Interactive CLI wizard
├── core/                 # Logic nghiệp vụ chính
│   ├── tasks.js          # Tạo task xử lý ảnh
│   └── batch.js          # Xử lý batch song song & metrics
├── workers/              # Worker Threads management
│   ├── worker.js         # Logic xử lý ảnh của từng worker
│   └── pool.js           # Pool quản lý worker threads
└── utils/                # Các hàm tiện ích chung
    ├── fs.js             # Filesystem utilities
    └── benchmark.js      # Benchmark so sánh hiệu năng
```

## 📋 Yêu Cầu Tối Thiểu

- **Node.js**: 16+ (khuyến nghị 18+ LTS trở lên)
- **npm**: 7+ hoặc **yarn** 1.22+
- **RAM**: Tối thiểu 512MB (khuyến nghị 2GB+ cho xử lý file lớn)
- **CPU**: Đa nhân (1+ core)

## 🚀 Cài Đặt

### 1. Clone hoặc Copy Repository

```bash
# Nếu có git
git clone <your-repo-url>
cd CLI-Image-Resizer-Node.js-Core

# Hoặc copy thủ công
cd your/project/folder
```

### 2. Cài Đặt Dependencies

```bash
# Với npm
npm install

# Hoặc với yarn
yarn install
```

#### Lưu Ý cho Windows

Sharp cung cấp prebuilt binaries cho nhiều nền tảng. Nếu cài đặt thất bại trên Windows:

1. **Cài Build Tools** (Visual Studio Build Tools hoặc chọn Desktop development with C++):
   ```
   https://visualstudio.microsoft.com/visual-cpp-build-tools/
   ```

2. **Hoặc cài Node-gyp toàn cục**:
   ```bash
   npm install -g node-gyp
   npm rebuild sharp
   ```

3. **Kiểm tra Node version**:
   ```bash
   node --version  # Phải là v16+
   npm --version   # Phải là 7+
   ```

### 3. Tạo Thư Mục Dữ Liệu

```bash
# Tạo thư mục chứa ảnh mẫu (nếu chưa có)
mkdir images
mkdir resized

# Hoặc trên Windows PowerShell
New-Item -ItemType Directory -Path images -Force
New-Item -ItemType Directory -Path resized -Force
```

## 💻 Chạy CLI

### Chế Độ Tương Tác (Recommended)

Chạy mà không có tham số để vào wizard tương tác:

```bash
npm run dev
# Hoặc
node src/index.js
```

Wizard sẽ hỏi bạn từng bước:
- Thư mục chứa ảnh nguồn
- Thư mục đích
- Chiều rộng resize (single hoặc multiple)
- Chất lượng nén (1-100)
- Định dạng output (JPEG, WebP, AVIF)
- Số worker song song
- Ghi đè file nếu tồn tại

### Chế Độ Command Line (Nâng Cao)

```bash
node src/index.js [OPTIONS]
```

## 🔧 Các Tùy Chọn CLI

### Tham Số Input/Output

| Tùy Chọn | Kiểu | Mặc Định | Mô Tả |
|----------|------|---------|-------|
| `-i, --input <path>` | string | `./images` | Thư mục chứa ảnh nguồn |
| `-o, --output <path>` | string | `./resized` | Thư mục ghi ảnh đã resize |

### Tham Số Kích Thước

| Tùy Chọn | Kiểu | Mặc Định | Mô Tả |
|----------|------|---------|-------|
| `--width <number>` | number | `1024` | Chiều rộng đích (pixel), bị bỏ qua nếu có `--sizes` |
| `--sizes <list>` | string | không | Nhiều kích thước, cách nhau dấu phẩy. Ví dụ: `800,1200,1920` |

### Tham Số Chất Lượng & Định Dạng

| Tùy Chọn | Kiểu | Mặc Định | Mô Tả |
|----------|------|---------|-------|
| `--quality <number>` | number | `85` | Chất lượng nén (1-100) |
| `--format <type>` | string | `jpeg` | Định dạng output: `jpeg`, `webp`, `avif` |

### Tham Số Performance & Behavior

| Tùy Chọn | Kiểu | Mặc Định | Mô Tả |
|----------|------|---------|-------|
| `-w, --workers <number>` | number | CPU cores - 1 | Số worker xử lý song song |
| `--timeout <seconds>` | number | `60` | Timeout cho mỗi task (giây) |
| `--overwrite` | boolean | `false` | Ghi đè file đích nếu tồn tại |
| `--dry-run` | boolean | `false` | Chỉ liệt kê task, không thực thi |

### Tham Số Đặc Biệt

| Tùy Chọn | Kiểu | Mô Tả |
|----------|------|-------|
| `--with-stats` | boolean | In bảng throughput & dung lượng sau resize |
| `--benchmark` | boolean | Chế độ benchmark: so sánh hiệu năng Stream vs Buffer |
| `-h, --help` | - | Hiển thị help chi tiết |
| `-V, --version` | - | Hiển thị phiên bản |

## 📚 Ví Dụ Sử Dụng

### 1. Resize Một Size, Format WebP

```bash
node src/index.js -i ./images -o ./resized --width 800 --format webp --quality 90
```

**Kết quả**: Tất cả ảnh trong `images` được resize thành 800px, format WebP, chất lượng 90.

### 2. Resize Nhiều Kích Thước

```bash
node src/index.js --sizes 640,1024,1920 -o ./resized --quality 85
```

**Kết quả**: Mỗi ảnh được resize 3 lần → sẽ có thư mục `resized/640/`, `resized/1024/`, `resized/1920/` với ảnh tương ứng.

### 3. Dry-Run (Liệt Kê Không Thực Thi)

```bash
node src/index.js --dry-run --sizes 800,1200
```

**Kết Quả**: In ra danh sách các task sẽ được xử lý mà không thực sự tạo file.

### 4. Ghi Đè File Đích, 6 Worker

```bash
node src/index.js --overwrite -w 6 --width 1024
```

**Kết Quả**: Xử lý với 6 worker song song, ghi đè file đích nếu tồn tại.

### 5. Benchmark & Hiệu Năng

```bash
node src/index.js --benchmark -i ./images -o ./resized
```

**Kết Quả**: Chạy benchmark để so sánh Stream vs Buffer, test với 4/8/12 workers.

```bash
node src/index.js --overwrite --with-stats
```

**Kết Quả**: Print bảng hiệu năng: throughput (task/s), MB/s, thời gian, v.v.

### 6. Timeout Tùy Chỉnh (Cho File Lớn)

```bash
node src/index.js --timeout 120 --workers 4
```

**Kết Quả**: Mỗi task có timeout 120 giây, dùng 4 worker.

### 7. Format AVIF (Hiện Đại)

```bash
node src/index.js --format avif --quality 50 --width 1024
```

**Kết Quả**: Resize thành AVIF (siêu nhẹ), chất lượng 50%.

## 🎯 Tính Năng Chính

### ✅ Preserve Folder Structure

Hàm `buildOutputPath` giữ nguyên cây thư mục con:

```
images/
  vacation/
    beach.jpg
    mountain.png
  city/
    street.jpg

↓ (sau resize)

resized/
  vacation/
    beach.jpg
    mountain.png
  city/
    street.jpg
```

### ✅ Progress Bar Real-Time

Hiển thị:
- Tổng tiến độ (%)
- Số ảnh đang xử lý / tổng
- Tên file đang xử lý
- Tốc độ (ảnh/giây)
- Thời gian còn lại (ETA)

**Ví dụ:**
```
⚡ ███████████░░░░░░░░░░| 45% | 45/100 | beach.jpg | 800px | 3.50 img/s | 00:00:45 | ETA 00:00:55
```

### ✅ Summary Table

Sau khi hoàn thành, hiển thị bảng tóm tắt:
- Số task thành công
- Số task thất bại
- Dung lượng tiết kiệm (%)
- Chi tiết từng file thành công

### ✅ Error Logging

- Log lỗi tự động vào `error.log`
- Chi tiết lỗi mỗi file trong `resized/resize-log.json`

### ✅ Retry Mechanism

Tự động thử lại tối đa 2 lần nếu xảy ra lỗi tạm thời.

## 🔍 Giải Thích Kỹ Thuật

### Streams & Buffers

Mỗi worker trong `src/workers/worker.js` sử dụng:

```javascript
const readStream = fs.createReadStream(inputPath);
const writeStream = fs.createWriteStream(outputPath);
const transformer = sharp().resize(...);

await pipeline(readStream, transformer, writeStream);
```

**Lợi ích:**
- ✅ RAM luôn ở mức thấp, độc lập với kích thước file
- ✅ Không bị OutOfMemory với file lớn (vài GB)
- ✅ Tự động cleanup streams nếu có lỗi

### Worker Threads Pool

`src/workers/pool.js` quản lý:
- Tạo worker pool tái sử dụng (không create mới mỗi task)
- Queue task khi hết worker
- Timeout & retry tự động
- Graceful shutdown

**Lợi ích:**
- ✅ Tối ưu CPU đa nhân
- ✅ Không tạo/hủy worker liên tục (tốn tài nguyên)
- ✅ Xử lý hàng loạt ảnh hiệu quả

### Modular Architecture

Được chia thành 4 modúl chính:

1. **CLI Modúl** (`src/cli/`) - Xử lý tham số & UI
2. **Core Modúl** (`src/core/`) - Logic nghiệp vụ
3. **Workers Modúl** (`src/workers/`) - Xử lý ảnh đa luồng
4. **Utils Modúl** (`src/utils/`) - Hàm tiện ích chung

**Lợi ích:**
- ✅ Dễ bảo trì & mở rộng
- ✅ Dễ test từng modúl
- ✅ Tái sử dụng code

## ⚠️ Troubleshooting

### ❌ Lỗi: `Cannot find module 'sharp'`

**Giải pháp:**
```bash
npm install
# hoặc rebuild
npm rebuild sharp
```

### ❌ Lỗi: `EACCES: permission denied`

**Giải pháp:**
```bash
# Kiểm tra quyền thư mục
ls -la ./images ./resized

# Hoặc tạo lại với quyền
chmod 755 ./images ./resized
```

### ❌ Lỗi: `Out of Memory` (OOM)

**Giải pháp:**
1. Giảm số worker: `--workers 2`
2. Tăng timeout: `--timeout 120`
3. Kiểm tra file lớn nhất trong images

### ❌ Lỗi: `Worker timeout after Xms`

**Giải pháp:**
```bash
# Tăng timeout
node src/index.js --timeout 120
```

### ❌ Sharp cài không được trên Windows

**Giải pháp:** Xem mục **Lưu Ý cho Windows** ở trên.

### ❌ Ảnh output chất lượng kém

**Giải pháp:**
```bash
# Tăng quality (1-100)
node src/index.js --quality 95
```

## 📊 So Sánh Định Dạng

| Định Dạng | Tỉ Lệ Nén | Tốc Độ | Hỗ Trợ | Ghi Chú |
|-----------|----------|--------|--------|--------|
| **JPEG** | ~60-70% | Nhanh ⚡ | Rộng 🌍 | Tốt cho ảnh, mặc định |
| **WebP** | ~70-80% | Trung Bình | Hiện đại | Google, hỗ trợ tốt |
| **AVIF** | ~80-90% | Chậm | Mới ⭐ | Siêu nhẹ, support còn hạn chế |

**Khuyến nghị:**
- Ảnh sản phẩm bán hàng → **JPEG** (quality 85-90)
- Web modern → **WebP** (quality 80-85)
- Tối ưu file nhất → **AVIF** (quality 50-70)

## 📈 Performance Tips

### 1. Tối ưu Số Worker

```bash
# CPU cores = 8
# Tốt nhất: 7 (cores - 1)
node src/index.js -w 7

# Nếu RAM ít, dùng ít worker hơn
node src/index.js -w 2
```

### 2. Resize Từ Lớn Đến Nhỏ

```bash
# ❌ Không tốt (upscale rồi downscale)
node src/index.js --width 2000

# ✅ Tốt (downscale từ nguồn)
node src/index.js --width 800
```

### 3. Chọn Format Phù Hợp

```bash
# Ảnh sơ khai → JPEG
# Web hiện đại → WebP
# Tối ưu cực → AVIF
```

### 4. Benchmark Trước Thực Thi

```bash
node src/index.js --benchmark -w 4 -w 8 -w 12
# So sánh xem config nào tốt nhất
```

## 🗂️ Cấu Trúc Thư Mục Chi Tiết

```
CLI-Image-Resizer-Node.js-Core/
├── src/
│   ├── index.js                    # Entry point chính
│   │
│   ├── cli/                        # CLI & UI Logic
│   │   ├── parsers.js              # Parse CLI args
│   │   ├── ui.js                   # UI helpers (icons, formatting)
│   │   └── wizard.js               # Interactive wizard
│   │
│   ├── core/                       # Business Logic
│   │   ├── tasks.js                # Task generation
│   │   └── batch.js                # Batch processing
│   │
│   ├── workers/                    # Worker Threads
│   │   ├── worker.js               # Worker process
│   │   └── pool.js                 # Worker pool manager
│   │
│   └── utils/                      # Utilities
│       ├── fs.js                   # Filesystem helpers
│       └── benchmark.js            # Benchmark functions
│
├── images/                         # 📂 Input folder (sample images)
├── resized/                        # 📂 Output folder (resized images)
├── package.json                    # Dependencies & scripts
├── README.md                       # This file
└── error.log                       # Error log (auto-generated)
```

## 📝 File Cấu Hình

### package.json Scripts

```json
{
  "scripts": {
    "dev": "node src/index.js",
    "benchmark": "node src/index.js --benchmark"
  }
}
```

**Sử dụng:**
```bash
npm run dev              # Chạy CLI thường
npm run benchmark        # Chạy benchmark
```

## 🔗 Liên Kết & Tài Liệu

- [Sharp Documentation](https://sharp.pixelplumbing.com/)
- [Node.js Worker Threads](https://nodejs.org/api/worker_threads.html)
- [Node.js Streams](https://nodejs.org/api/stream.html)
- [Commander.js](https://github.com/tj/commander.js)

## 📄 License

ISC - Tự do sử dụng & modify

## 👨‍💻 Phiên Bản

**Hiện tại:** 1.0.0

**Lần cuối update:** 2026-04-10

---

### 💡 Gợi Ý Tiếp Theo

- [ ] Thêm config file (JSON/YAML) cho preset
- [ ] Thêm watch mode để tự động resize khi có file mới
- [ ] Thêm Docker support
- [ ] Thêm Unit tests
- [ ] Thêm API REST wrapper
- [ ] Thêm Web UI dashboard

Nếu bạn gặp vấn đề hoặc có đề xuất, hãy liên hệ hoặc tạo issue. Cảm ơn!
