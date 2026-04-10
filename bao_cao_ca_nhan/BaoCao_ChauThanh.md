# Báo Cáo Cá Nhân - Châu Thành (Bản Tóm Tắt ~10 Trang)
## Sinh viên năm 4 - Chuyên ngành Công nghệ Thông tin
## Dự án: Batch Image Resizer CLI
## Môn học: Các công nghệ lập trình hiện đại

## I. Giới thiệu tổng quan

Kính thưa giảng viên,

Em là Châu Thành. Trong dự án Batch Image Resizer CLI, em phụ trách ba mảng kỹ thuật nền tảng gồm: xử lý luồng dữ liệu (Streams & Buffers), thao tác hệ thống tệp (File System Utilities), và khung đo hiệu năng (Benchmarking). Mục tiêu công việc là bảo đảm hệ thống xử lý ảnh hàng loạt nhanh, ổn định và kiểm soát bộ nhớ tốt khi chạy ở quy mô lớn.

Batch Image Resizer CLI là công cụ dòng lệnh xây dựng bằng Node.js, cho phép resize, nén và chuyển đổi định dạng ảnh theo lô. Điểm khác biệt của dự án là ưu tiên công nghệ lõi Node.js, kết hợp Worker Threads và stream pipeline thay vì phụ thuộc vào framework nặng.

Trong quá trình triển khai, các đầu việc chính em hoàn thành gồm:

1. Xây dựng cơ chế xử lý ảnh dạng stream trong worker để giảm đột biến RAM.
2. Tạo bộ utility quét thư mục đệ quy, lọc đúng tệp ảnh, và giữ nguyên cấu trúc thư mục đầu ra.
3. Thiết kế benchmark framework để so sánh thời gian xử lý và mức tiêu thụ bộ nhớ giữa nhiều phương pháp.

Kết quả thực tế cho thấy các module em thực hiện trở thành lớp nền kỹ thuật của toàn hệ thống: ít lỗi runtime, dễ mở rộng, và hỗ trợ tốt cho việc tối ưu ở các giai đoạn sau.

## II. Cơ sở lý thuyết của công nghệ áp dụng

### 2.1. Node.js Streams & Buffers

Streams cho phép xử lý dữ liệu theo từng phần nhỏ thay vì nạp toàn bộ file vào bộ nhớ. Với bài toán ảnh lớn hoặc số lượng ảnh nhiều, cách tiếp cận này có ba lợi ích chính:

- Giảm nguy cơ tràn bộ nhớ nhờ giới hạn lượng dữ liệu nạp tại từng thời điểm.
- Tăng độ ổn định trong các tác vụ chạy lâu.
- Hỗ trợ pipeline rõ ràng giữa đọc dữ liệu, biến đổi ảnh, và ghi dữ liệu.

Buffer được dùng như vùng nhớ trung gian, kết hợp với thông số `highWaterMark` để điều tiết thông lượng. Việc chọn ngưỡng bộ đệm hợp lý giúp cân bằng giữa tốc độ I/O và mức sử dụng RAM.

### 2.2. File System Operations trong Node.js

`fs.promises` và `path` là cặp công cụ cốt lõi để thao tác tệp, thư mục và đường dẫn đa nền tảng. Trong dự án, em ưu tiên:

- Quét thư mục đệ quy bằng `readdir` với `withFileTypes` để phân biệt file/folder hiệu quả.
- Lọc phần mở rộng ảnh theo danh sách cho phép để giảm lỗi xử lý sai định dạng.
- Dùng `path.relative` và `path.join` nhằm giữ nguyên cấu trúc cây thư mục khi ghi output.

### 2.3. Performance Testing & Benchmarking

Đo hiệu năng dựa trên hai nhóm chỉ số:

- Thời gian: dùng `performance.now()` cho độ chính xác cao.
- Bộ nhớ: dùng `process.memoryUsage()` để theo dõi `heapUsed`, `rss` và vùng nhớ ngoại vi.

Việc benchmark được thiết kế theo hai lớp: đơn file (micro benchmark) và hàng loạt (batch benchmark), từ đó xác định chính xác hiệu quả của stream pipeline và tác động của số lượng worker.

## III. Chi tiết quá trình triển khai & Phân tích

### 3.1. Module Streams & Buffers trong worker

Em tổ chức xử lý ảnh theo chuỗi:

1. Tạo read stream từ ảnh đầu vào.
2. Áp dụng biến đổi ảnh bằng Sharp (resize, quality, format).
3. Ghi kết quả ra write stream.

Thiết kế này giúp mỗi worker xử lý ảnh theo dòng dữ liệu liên tục, tránh nạp cả file vào RAM. Ngoài ra, em bổ sung:

- Cơ chế retry có giới hạn cho lỗi tạm thời (file lock, lỗi I/O ngắn hạn).
- Logging theo giai đoạn trước/sau xử lý để phát hiện sớm dấu hiệu rò rỉ bộ nhớ.
- Thông điệp trạng thái rõ ràng về main thread để tổng hợp kết quả chính xác.

### 3.2. File System Utilities

Khối utility tập trung vào ba chức năng:

1. Quét toàn bộ ảnh đầu vào, kể cả thư mục lồng sâu.
2. Tạo đường dẫn đầu ra tương ứng với đường dẫn tương đối của đầu vào.
3. Quyết định ghi đè hay bỏ qua nếu file đích đã tồn tại.

Nhờ vậy, dữ liệu đầu ra có tính nhất quán cao, phù hợp cho cả các đợt resize lại hoặc chạy lặp theo nhiều cấu hình khác nhau.

### 3.3. Benchmark Framework

Em thiết kế benchmark để trả lời ba câu hỏi thực tế:

1. Stream pipeline nhanh hơn bao nhiêu so với cách xử lý buffer truyền thống?
2. Mức tiết kiệm bộ nhớ đạt bao nhiêu khi kích thước file tăng?
3. Tăng số worker có cải thiện tuyến tính không?

Khung đo gồm quy trình chuẩn hóa đầu vào, thu thập log, tính tỷ lệ cải thiện, và xuất báo cáo có thể so sánh giữa các lần chạy. Cách này giúp nhóm tối ưu dựa trên số liệu thay vì cảm tính.

## IV. Khó khăn gặp phải & Giải pháp khắc phục

### 4.1. Memory Management

**Khó khăn:** Khi xử lý ảnh lớn hoặc chạy đồng thời nhiều tác vụ, bộ nhớ tăng đột ngột nếu luồng xử lý chưa tối ưu.

**Giải pháp:** Chuyển trọng tâm sang stream pipeline, chuẩn hóa kích thước chunk và bổ sung theo dõi memory trước/sau mỗi tác vụ.

**Kết quả:** Mức dùng RAM ổn định hơn rõ rệt, giảm nguy cơ OOM trong các batch lớn.

### 4.2. File Permission & Cross-platform

**Khó khăn:** Quyền truy cập tệp/thư mục khác nhau giữa môi trường chạy làm phát sinh lỗi ghi file.

**Giải pháp:** Thêm bước kiểm tra tồn tại và quyền truy cập trước khi xử lý; trả về thông báo lỗi dễ hiểu để người dùng tự khắc phục nhanh.

**Kết quả:** Hệ thống giảm tỷ lệ dừng đột ngột, nâng độ tin cậy khi chạy trên nhiều máy.

### 4.3. Khó xác định bottleneck

**Khó khăn:** Trong pipeline nhiều thành phần, khó biết điểm nghẽn nằm ở I/O, biến đổi ảnh hay điều phối worker.

**Giải pháp:** Dùng benchmark theo lớp (single/batch), tách rõ từng mốc thời gian và chỉ số bộ nhớ.

**Kết quả:** Xác định được điểm nghẽn chính xác và ưu tiên tối ưu đúng trọng tâm.

## V. Kết quả đạt được & Benchmark đánh giá

### 5.1. Kết quả chức năng

- Xử lý ổn định các batch ảnh lớn với tỷ lệ thành công cao.
- Quét và lọc ảnh chính xác theo cấu trúc thư mục thực tế.
- Cơ chế retry giúp giảm lỗi thất bại do nguyên nhân tạm thời.
- Luồng xử lý có log đầy đủ, thuận lợi cho phân tích sau chạy.

### 5.2. Kết quả hiệu năng

Các đợt đo cho thấy xu hướng nhất quán:

- Stream pipeline cải thiện tốc độ xử lý so với hướng buffer truyền thống.
- Mức tiêu thụ bộ nhớ giảm mạnh khi xử lý file lớn.
- Tăng worker giúp tăng throughput đến một ngưỡng tối ưu, sau đó lợi ích biên giảm dần.

Kết quả đo minh họa tiêu biểu:

- So sánh đơn file lớn: tốc độ tăng khoảng 10-15%, bộ nhớ giảm rất sâu.
- So sánh batch nhiều file: 8-12 worker cho hiệu suất tốt trên máy nhiều nhân, cân bằng giữa tốc độ và RAM.

## VI. Tự đánh giá & Bài học kinh nghiệm

Em tự đánh giá đã hoàn thành tốt nhiệm vụ kỹ thuật được giao. Điểm mạnh lớn nhất là triển khai các thành phần hạ tầng theo hướng thực dụng: rõ vai trò, dễ kiểm thử, và có số liệu chứng minh hiệu quả.

### Điểm mạnh

- Nắm chắc cách phối hợp Streams, Buffers và Worker Threads cho bài toán thực tế.
- Thiết kế utility file system có tính tái sử dụng cao.
- Benchmark framework giúp nhóm ra quyết định tối ưu nhanh và chính xác.

### Điểm cần cải thiện

- Cần mở rộng test tự động cho nhiều tình huống biên hơn.
- Có thể bổ sung dashboard trực quan cho dữ liệu benchmark.

### Bài học kinh nghiệm

Qua dự án, em rút ra rằng tối ưu hiệu năng không tách rời thiết kế kiến trúc. Khi luồng dữ liệu, quản lý tài nguyên và đo lường được thiết kế đồng bộ ngay từ đầu, hệ thống sẽ vừa nhanh vừa ổn định. Đây là kinh nghiệm quan trọng cho các dự án xử lý dữ liệu quy mô lớn trong tương lai.

Kính thưa giảng viên,

Em xin chân thành cảm ơn!

Châu Thành
Sinh viên năm 4 - CNTT
