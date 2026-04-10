# Báo Cáo Cá Nhân - Chí Phong (Bản Tóm Tắt ~10 Trang)
## Sinh viên năm 4 - Chuyên ngành Công nghệ Thông tin
## Dự án: Batch Image Resizer CLI
## Môn học: Các công nghệ lập trình hiện đại

## I. Giới thiệu tổng quan

Kính thưa giảng viên,

Em là Chí Phong. Trong dự án Batch Image Resizer CLI, em phụ trách xây dựng nền tảng dự án, phát triển tính năng multiple sizes, hoàn thiện tài liệu kỹ thuật và chuẩn bị tài nguyên phục vụ trình bày.

Mục tiêu chính của em là tạo một cấu trúc dự án rõ ràng, dễ mở rộng và dễ vận hành nhóm. Em tập trung vào các thành phần nền tảng: tổ chức module, chuẩn hóa tham số CLI, cơ chế dry-run, và hệ thống log có thể kiểm chứng hiệu năng.

Các đầu việc chính:

1. Thiết lập cấu trúc dự án và quy tắc tổ chức mã nguồn.
2. Triển khai tạo tác vụ resize cho nhiều kích thước.
3. Xây dựng chế độ dry-run để kiểm tra trước khi ghi file thật.
4. Biên soạn README theo hướng dùng được ngay.

## II. Cơ sở lý thuyết của công nghệ áp dụng

### 2.1. Project Architecture & Modular Design

Kiến trúc được chia theo trách nhiệm:

- Tầng CLI: nhận lệnh và xác thực đầu vào.
- Tầng điều phối: sinh task và phân phối tác vụ.
- Tầng xử lý: worker thực thi resize.
- Tầng tiện ích: thao tác file, path, logging.

Cách chia này giúp giảm phụ thuộc chéo, dễ bảo trì và hỗ trợ phát triển song song giữa các thành viên.

### 2.2. File System & Path Resolution

Path handling là phần dễ gây lỗi nhất trong xử lý hàng loạt. Em áp dụng quy tắc:

- Quy đổi đường dẫn tuyệt đối trước khi xử lý.
- Tạo output từ đường dẫn tương đối của input.
- Kiểm tra tồn tại và quyền truy cập trước khi chạy.

Nhờ đó, cấu trúc thư mục đầu ra luôn nhất quán với thư mục nguồn.

### 2.3. Configuration Management

Các option CLI được chuẩn hóa với parser/validator để hạn chế lỗi nhập sai. Em hỗ trợ cả chế độ một kích thước và nhiều kích thước, đồng thời tách rõ các tùy chọn ảnh hưởng dữ liệu như overwrite và dry-run.

### 2.4. Documentation Practices

Tài liệu được viết theo luồng thao tác thực tế:

1. Cài đặt.
2. Chạy nhanh.
3. Option chi tiết.
4. Tình huống lỗi thường gặp.

Điều này giúp người dùng mới có thể thao tác nhanh mà vẫn hiểu đúng giới hạn hệ thống.

## III. Chi tiết quá trình triển khai & Phân tích

### 3.1. Thiết lập kiến trúc dự án

Em chuẩn hóa thư mục và naming convention để giảm xung đột khi làm việc nhóm. Việc này cải thiện đáng kể tốc độ tìm mã và hiệu quả review.

### 3.2. File System Utilities

Khối utilities đảm nhận:

1. Quét ảnh đệ quy từ thư mục nguồn.
2. Lọc định dạng hợp lệ.
3. Tạo output path giữ nguyên cấu trúc thư mục.
4. Quyết định skip/overwrite theo cấu hình.

### 3.3. Multiple Sizes

Em áp dụng mô hình ma trận tác vụ:

- Mỗi ảnh kết hợp với mỗi kích thước.
- Mỗi tổ hợp tạo thành một task độc lập.

Ưu điểm là dễ scale, dễ theo dõi tiến độ, và dễ xử lý lỗi cục bộ.

### 3.4. Dry-run Mode

Dry-run cho phép người dùng xem trước toàn bộ task mà không ghi file. Đây là cơ chế giảm rủi ro rất hiệu quả trong môi trường dữ liệu thật.

### 3.5. Logging & Statistics

Log JSON được thiết kế có cấu trúc gồm metadata phiên chạy, thống kê thành công/thất bại/bỏ qua và các chỉ số thời gian, dung lượng vào/ra.

## IV. Khó khăn gặp phải & Giải pháp khắc phục

### 4.1. Path Resolution Complexity

**Khó khăn:** Dễ sai đường dẫn khi vừa tạo thư mục theo size vừa giữ cây thư mục nguồn.

**Giải pháp:** Chuẩn hóa pipeline xử lý path theo thứ tự: resolve tuyệt đối, tính relative, ghép output.

### 4.2. Task Explosion

**Khó khăn:** Số task tăng nhanh theo số ảnh nhân số kích thước.

**Giải pháp:** Điều phối theo lô và giới hạn đồng thời theo số worker.

### 4.3. Documentation Drift

**Khó khăn:** Tài liệu dễ lệch so với code khi tính năng thay đổi nhanh.

**Giải pháp:** Cập nhật tài liệu theo từng mốc tính năng và kiểm tra lại bằng ví dụ chạy thật.

## V. Kết quả đạt được & Benchmark đánh giá

### 5.1. Kết quả chức năng

- Cấu trúc dự án rõ ràng, dễ cộng tác.
- Multiple sizes hoạt động ổn định ở nhiều bộ dữ liệu.
- Dry-run giảm lỗi thao tác trước khi chạy thật.
- Log đủ chi tiết cho phân tích sau chạy.

### 5.2. Kết quả hiệu năng

Xu hướng benchmark cho thấy throughput tăng tốt khi cấu hình worker hợp lý; dry-run chạy rất nhanh ngay cả khi số task lớn; chi phí tài nguyên duy trì trong ngưỡng an toàn cho phần lớn kịch bản thực nghiệm.

## VI. Tự đánh giá & Bài học kinh nghiệm

Em tự đánh giá đã hoàn thành tốt vai trò kiến trúc nền tảng và tài liệu. Kết quả quan trọng nhất là biến yêu cầu kỹ thuật thành một quy trình vận hành mạch lạc từ cấu hình, kiểm tra, thực thi đến thống kê.

### Điểm mạnh

- Tư duy hệ thống tốt ở lớp kiến trúc.
- Thiết kế multiple sizes có tính mở rộng.
- Viết tài liệu bám sát thực tế sử dụng.

### Điểm cần cải thiện

- Bổ sung thêm test tự động cho ma trận input lớn.
- Trực quan hóa log tốt hơn cho người không kỹ thuật.

Kính thưa giảng viên,

Em xin chân thành cảm ơn!

Chí Phong
Sinh viên năm 4 - CNTT
