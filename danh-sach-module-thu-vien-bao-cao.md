# Danh sách module Node.js và thư viện npm — Batch Image Resizer CLI

Tài liệu phục vụ báo cáo: **Node.js Core (công cụ / xử lý hệ thống, không dùng framework làm Web API)** — ưu tiên **module gốc** cho tác vụ hệ thống (file, stream, đa luồng), kết hợp thư viện npm khi cần (CLI, xử lý ảnh).

---

## 1. Module gốc (built-in) của Node.js được sử dụng

Các module sau là **có sẵn trong Node.js**, không cần khai báo trong `dependencies` của `package.json` (trừ khi ghi chú đặc biệt).

| Module | Vai trò trong đồ án |
|--------|----------------------|
| **`fs`** | Đọc/ghi file, duyệt thư mục: dùng `fs.promises` (API bất đồng bộ) ở luồng chính; trong worker dùng `fs` kết hợp stream. |
| **`path`** | Ghép và chuẩn hóa đường dẫn file/thư mục (`join`, `dirname`, …), độc lập hệ điều hành. |
| **`os`** | Thông tin hệ thống, ví dụ `os.cpus().length` để gợi ý số worker / luồng xử lý. |
| **`worker_threads`** | **`Worker`**: pool worker xử lý song song ảnh; **`parentPort`**: giao tiếp giữa worker và luồng chính. Đáp ứng yêu cầu **đa luồng** (xử lý CPU-bound như resize). |
| **`stream` / `stream/promises`** | **`pipeline`** (từ `stream/promises`): nối `fs.createReadStream` → xử lý ảnh (sharp dạng transform) → `fs.createWriteStream`. Đọc/ghi **theo chunk**, không cần nạp cả file vào RAM — phù hợp **file rất lớn (ví dụ vài GB)** như yêu cầu bắt buộc. |
| **`Buffer` (toàn cục)** | Trong luồng stream, dữ liệu đi qua từng **chunk** kiểu `Buffer` (nhị phân). Không phải `require('buffer')` riêng trong code nhưng là **phần cốt lõi** của mô hình Streams & Buffers trong Node.js. |

**Ghi chú:** File `package.json` được `require` để lấy `version` — đây là JSON của dự án, không phải module API của Node.

**Worker Threads và Cluster (theo `yeucaubatbuoc.md`):** Yêu cầu ghi **Worker Threads / Cluster** — đồ án **dùng `worker_threads`** (`Worker`, `parentPort`) để xử lý **đa luồng** (resize song song, giải phóng main thread). Module **`cluster`** (đa **process**, thường gắn với chia tải nhiều tiến trình) **không được sử dụng** trong project; vẫn đáp ứng mặt bắt buộc vì phần “Worker Threads” đã được triển khai (ví dụ tác vụ nặng kiểu nén/xử lý ảnh).

---

## 2. Thư viện npm (`dependencies` trong `package.json`)

Các gói cài qua `npm install`, khai báo trong `package.json`:

| Gói | Phiên bản khai báo (semver) | Vai trò |
|-----|-----------------------------|---------|
| **`commander`** | `^14.0.3` | Khai báo lệnh CLI, tùy chọn (`--input`, `--sizes`, …), không phải web server. |
| **`cli-progress`** | `^3.12.0` | Thanh tiến trình trên terminal khi xử lý hàng loạt. |
| **`chalk`** | `^5.6.2` | Tô màu chữ trên terminal (log, thông báo). |
| **`ora`** | `^9.3.0` | Spinner / trạng thái “đang xử lý” trên CLI. |
| **`inquirer`** | `^13.3.2` | Prompt tương tác (chế độ wizard) trên terminal. |
| **`sharp`** | `^0.34.5` | Thư viện xử lý ảnh (resize, pipeline stream); chạy trong **worker thread** để không chặn event loop. |

**Lưu ý cho báo cáo:** `sharp` là native addon (libvips) — vẫn là **thư viện npm**, không phải module core; phần “module gốc Node” tập trung vào `fs`, `stream`, `worker_threads`, v.v.

---

## 3. Module nội bộ của dự án (không phải npm)

| File / module | Nội dung chính |
|---------------|----------------|
| `./utils/fsUtils` | Tiện ích quanh filesystem (lọc ảnh, ghi JSON, đường dẫn output). |
| `./workerPool` | Quản lý pool `Worker`. |
| `./worker` | Logic resize trong worker (sharp + stream). |

---

## 4. Đối chiếu đầy đủ với từng ý trong `yeucaubatbuoc.md`

| # | Nội dung yêu cầu (trích ý chính) | Đáp ứng trong đồ án / tài liệu này |
|---|----------------------------------|-------------------------------------|
| **A** | **Node.js Core (System/Tooling — không làm Web API)** | Tool **CLI** resize ảnh; không dùng Express/Fastify hay HTTP API server. |
| **B** | **Đặc thù: dùng module gốc Node cho tác vụ hệ thống** | **Phần 1** liệt kê `fs`, `path`, `os`, `worker_threads`, `stream`/`stream/promises`, `Buffer`; **phần 2** chỉ là npm bổ trợ (CLI, ảnh). |
| **C** | **Streams & Buffers — file lớn (vài GB), không tràn RAM** | `pipeline` + read/write stream trong `worker.js`; đọc theo chunk vào **Buffer** từng phần; có thể bổ sung `highWaterMark` để kiểm soát bộ đệm (trong code worker). |
| **D** | **Worker Threads / Cluster — đa luồng (vd. nén ảnh, convert video)** | **`worker_threads`**: pool trong `workerPool.js`, logic trong `worker.js`. **`cluster`**: không dùng (xem ghi chú dưới bảng phần 1). |
| **E** | **File System (`fs`) — tương tác file mạnh** | `fs.promises` (main), `fs.createReadStream` / `createWriteStream` (worker), `fsUtils` (quét ảnh, ghi log JSON, đường dẫn). |
| **F** | **Đồ án: tool CLI resize ảnh hàng loạt** | `commander` (CLI), vòng lặp task + worker pool, tùy chọn tương tác `inquirer`. |

### Tóm tắt một dòng (để chèn báo cáo)

- **Streams & Buffers** → stream + `pipeline` + chunk/`Buffer`, tránh OOM file lớn.  
- **Worker Threads / Cluster** → có **Worker Threads**; **Cluster** không dùng.  
- **`fs`** → dùng xuyên suốt main và worker.

---

*Bảng phiên bản lấy theo `package.json` tại thời điểm lập danh sách; khi báo cáo nên chạy `npm list --depth=0` để in phiên bản đã cài thực tế nếu cần chính xác tuyệt đối.*
