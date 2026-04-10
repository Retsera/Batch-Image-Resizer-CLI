# Báo Cáo Cá Nhân - Thế Kiên (Bản Tóm Tắt ~10 Trang)
## Sinh viên năm 4 - Chuyên ngành Công nghệ Thông tin
## Dự án: Batch Image Resizer CLI
## Môn học: Các công nghệ lập trình hiện đại

## I. Giới thiệu tổng quan

Kính thưa giảng viên,

Em là Thế Kiên. Trong dự án Batch Image Resizer CLI, em phụ trách thiết kế hệ thống xử lý song song bằng Worker Threads, gồm quản lý worker pool, phân phối tác vụ và cơ chế phục hồi khi lỗi.

Bài toán thực tế là tận dụng CPU đa nhân để giảm thời gian xử lý hàng loạt ảnh mà vẫn bảo toàn độ ổn định hệ thống. Em chọn hướng tách tác vụ nặng sang worker, giữ main thread cho điều phối.

Các phần việc em thực hiện:

1. Xây dựng WorkerPool để tái sử dụng worker.
2. Tích hợp queue và cơ chế cấp task theo trạng thái rảnh.
3. Bổ sung graceful shutdown khi nhận tín hiệu dừng.

## II. Cơ sở lý thuyết của công nghệ áp dụng

### 2.1. Worker Threads trong Node.js

Worker Threads cho phép chạy JavaScript song song trên nhiều luồng, phù hợp tác vụ CPU-intensive như xử lý ảnh. Lợi ích chính:

- Tăng mức sử dụng CPU đa nhân.
- Cải thiện throughput tổng thể.
- Giảm áp lực cho event loop chính.

### 2.2. Thread Pool Pattern

Em dùng pool cố định thay vì tạo worker cho từng task. Cách này giảm chi phí khởi tạo, kiểm soát tài nguyên tốt hơn và giữ hiệu năng ổn định khi khối lượng công việc tăng.

### 2.3. Inter-Thread Communication

Main thread và worker giao tiếp bằng message passing. Mỗi task và kết quả được truyền thành gói dữ liệu độc lập, giúp tránh chia sẻ trạng thái trực tiếp và giảm rủi ro race condition.

### 2.4. Concurrency Orchestration

Mô hình thực thi:

- Main thread: xếp hàng, phân phối, theo dõi tiến độ.
- Worker threads: xử lý ảnh và trả kết quả.

Mô hình này cân bằng giữa khả năng phản hồi và tốc độ xử lý.

## III. Chi tiết quá trình triển khai & Phân tích

### 3.1. Thiết kế WorkerPool

WorkerPool gồm các trạng thái lõi:

- Danh sách worker đang sống.
- Danh sách worker rảnh.
- Queue tác vụ chờ xử lý.
- Trạng thái đóng pool.

Luồng xử lý:

1. addTask đưa việc vào queue.
2. Bộ điều phối cấp việc ngay khi có worker rảnh.
3. Worker hoàn thành thì trả kết quả về promise tương ứng.
4. Worker quay lại hàng đợi idle.

### 3.2. Tích hợp vào luồng chính

Em triển khai xử lý theo lô với giới hạn đồng thời. Kết quả từng task được lưu theo đúng chỉ mục để dễ tổng hợp báo cáo cuối cùng. Khi có tín hiệu SIGINT hoặc SIGTERM, hệ thống kích hoạt shutdown có kiểm soát để tránh tiến trình treo.

### 3.3. Error Handling & Recovery

Ba lớp bảo vệ chính:

1. Bắt lỗi tại worker và trả trạng thái rõ ràng.
2. Worker lỗi nghiêm trọng sẽ bị loại khỏi pool và thay thế khi cần.
3. Pool đóng sẽ từ chối việc mới và giải phóng tài nguyên sạch.

## IV. Khó khăn gặp phải & Giải pháp khắc phục

### 4.1. Thread Synchronization

**Khó khăn:** Cập nhật trạng thái khi nhiều worker hoàn thành cùng lúc dễ phát sinh xung đột.

**Giải pháp:** Chuẩn hóa theo cơ chế message-driven, hạn chế trạng thái dùng chung.

### 4.2. Resource Management

**Khó khăn:** Worker tốn bộ nhớ, dễ cạn tài nguyên nếu quản lý kém.

**Giải pháp:** Tái sử dụng worker, thay thế có chọn lọc, cleanup đầy đủ khi shutdown.

### 4.3. Load Balancing

**Khó khăn:** Task lớn nhỏ khác nhau làm phân phối tải không đều.

**Giải pháp:** Queue động, worker rảnh nhận việc ngay để cân bằng tải tự nhiên.

## V. Kết quả đạt được & Benchmark đánh giá

### 5.1. Kết quả chức năng

- Worker pool chạy ổn định trên nhiều kịch bản.
- Hỗ trợ song song linh hoạt theo cấu hình phần cứng.
- Có cơ chế phục hồi và dừng an toàn.

### 5.2. Kết quả hiệu năng

Benchmark cho thấy thời gian xử lý giảm rõ khi tăng worker đến ngưỡng tối ưu; mức sử dụng CPU đa nhân cải thiện tốt; hiệu năng tăng dần rồi bão hòa theo đặc thù điều phối và tài nguyên hệ thống.

## VI. Tự đánh giá & Bài học kinh nghiệm

Em tự đánh giá đã hoàn thành tốt mục tiêu xử lý song song. Giá trị lớn nhất là xây dựng được mô hình vận hành ổn định trong điều kiện thực tế, không chỉ đúng về lý thuyết.

### Điểm mạnh

- Tư duy hệ thống trong quản lý worker lifecycle.
- Điều phối queue rõ ràng, dễ mở rộng.
- Xử lý lỗi và shutdown có quy trình cụ thể.

### Điểm cần cải thiện

- Bổ sung thêm metric theo thời gian thực.
- Mở rộng bộ test cho kịch bản biên.

Kính thưa giảng viên,

Em xin chân thành cảm ơn!

Thế Kiên
Sinh viên năm 4 - CNTT
