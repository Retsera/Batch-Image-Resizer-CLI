# Báo Cáo Cá Nhân - Nguyễn Võ Trung Hưng (Bản Tóm Tắt ~10 Trang)
## Sinh viên năm 4 - Chuyên ngành Công nghệ Thông tin
## Mã số sinh viên: 3122410160
## Dự án: Batch Image Resizer CLI
## Môn học: Các công nghệ lập trình hiện đại

## I. Giới thiệu tổng quan

Kính thưa giảng viên,

Em là Nguyễn Võ Trung Hưng. Trong dự án Batch Image Resizer CLI, em phụ trách mảng CLI/UX: thiết kế lệnh, chế độ tương tác, hiển thị tiến trình và kịch bản demo.

Mục tiêu của em là làm cho công cụ dễ dùng với người mới nhưng vẫn mạnh cho người dùng nâng cao. Trọng tâm triển khai gồm:

1. Chuẩn hóa hệ thống option bằng Commander.
2. Xây dựng wizard tương tác bằng Inquirer.
3. Trực quan hóa tiến trình bằng spinner và progress bar.
4. Chuẩn hóa luồng demo để phục vụ báo cáo.

## II. Cơ sở lý thuyết của công nghệ áp dụng

### 2.1. CLI Design Principles

CLI hiệu quả cần nhất quán cú pháp, có giá trị mặc định hợp lý, thông báo lỗi dễ hiểu, và help text có ví dụ chạy thật. Các nguyên tắc này giúp giảm sai sót khi thao tác.

### 2.2. Interactive Programming & TTY

Wizard chỉ nên hoạt động khi môi trường có TTY. Khi không có TTY, ứng dụng cần fallback sang chế độ tham số dòng lệnh để bảo đảm tương thích với môi trường script/CI.

### 2.3. Terminal UI & Progress Visualization

Em dùng mô hình hiển thị theo pha:

- Spinner cho bước chuẩn bị.
- Progress bar cho bước xử lý chính.
- Tổng kết theo task thành công/thất bại/bỏ qua.

Việc bổ sung ETA và tốc độ ảnh/giây giúp người dùng dự đoán thời gian hoàn thành tốt hơn.

### 2.4. Event-Driven UX

Trải nghiệm được tổ chức theo chuỗi: nhận input, xác thực, phản hồi ngay, xác nhận trước khi chạy và tổng kết sau cùng. Cách này giảm nhầm lẫn và tăng độ tin cậy khi thao tác dữ liệu thật.

## III. Chi tiết quá trình triển khai & Phân tích

### 3.1. CLI Framework với Commander

Em định nghĩa đầy đủ option cốt lõi (`input`, `output`, `width/sizes`, `quality`, `format`, `workers`, `overwrite`, `dry-run`, `benchmark`) và parser/validator tương ứng. Nhờ đó, lỗi cấu hình được chặn sớm trước khi bước vào xử lý.

### 3.2. Interactive Wizard với Inquirer

Wizard gồm các bước:

1. Chọn thư mục nguồn/đích.
2. Chọn một kích thước hoặc nhiều kích thước.
3. Thiết lập chất lượng, định dạng, số worker.
4. Xem lại cấu hình và xác nhận chạy.

Thiết kế này giúp giảm rào cản cho người dùng không quen CLI.

### 3.3. Progress Visualization

Progress bar được cập nhật theo số task hoàn thành, kết hợp thông tin tốc độ và ETA để tăng tính minh bạch. Các thông báo lỗi/cảnh báo được tách luồng để không phá vỡ bố cục hiển thị tiến trình.

### 3.4. Demo Scripts

Em xây dựng script demo cho các kịch bản trọng tâm: wizard, multiple sizes, dry-run, benchmark. Điều này giúp tái hiện luồng sử dụng nhanh, giảm rủi ro thao tác thủ công khi trình bày.

## IV. Khó khăn gặp phải & Giải pháp khắc phục

### 4.1. Cross-platform Compatibility

**Khó khăn:** Hành vi terminal khác nhau giữa các hệ điều hành.

**Giải pháp:** Kiểm tra TTY và có fallback văn bản thuần cho môi trường hạn chế.

### 4.2. Real-time Progress Rendering

**Khó khăn:** Cập nhật dày dễ gây nhấp nháy và rối layout.

**Giải pháp:** Chuẩn hóa tần suất cập nhật, rút gọn thông tin hiển thị và tách log khỏi progress bar.

### 4.3. Input Validation

**Khó khăn:** Người dùng nhập sai path, tham số âm hoặc format không hỗ trợ.

**Giải pháp:** Xác thực nhiều lớp (kiểu dữ liệu, phạm vi giá trị, kiểm tra file system) với thông báo rõ ràng.

## V. Kết quả đạt được & Đánh giá trải nghiệm

### 5.1. Kết quả chức năng

- Hệ thống lệnh đầy đủ, dễ mở rộng.
- Wizard tương tác hiệu quả cho người mới.
- Progress bar và phần tổng kết dễ theo dõi.
- Demo script hỗ trợ trình bày và kiểm thử nhanh.

### 5.2. Kết quả trải nghiệm

Qua thử nghiệm nội bộ, người dùng ưu tiên wizard ở lần chạy đầu; tỷ lệ sửa lỗi sau thông báo validation cao; mức hài lòng tăng khi có ETA và tốc độ xử lý hiển thị trực tiếp.

## VI. Tự đánh giá & Bài học kinh nghiệm

Em tự đánh giá đã hoàn thành tốt vai trò cải thiện trải nghiệm CLI. Bài học lớn nhất là khả năng dùng dễ không phải yếu tố phụ; đó là thành phần quyết định để một công cụ kỹ thuật được áp dụng hiệu quả trong thực tế.

### Điểm mạnh

- Thiết kế luồng CLI nhất quán.
- Tạo wizard và progress visualization hữu ích.
- Chuẩn hóa demo workflow rõ ràng.

### Điểm cần cải thiện

- Mở rộng tùy biến giao diện đầu ra.
- Cân nhắc hỗ trợ đa ngôn ngữ thông báo.

Kính thưa giảng viên,

Em xin chân thành cảm ơn!

Nguyễn Võ Trung Hưng
MSSV: 3122410160
Sinh viên năm 4 - CNTT
