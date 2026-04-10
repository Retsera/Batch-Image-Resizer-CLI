# Benchmark Results - Node.js Core Image Resizer

Ngày đo: 10/04/2026  
Môi trường: Windows  
Dataset: 20 ảnh mẫu (`images/sample`)  
Lệnh đo: `npm run benchmark`

## 1) Single File: Stream Pipeline vs Sharp toFile

| Phương pháp | Thời gian (s) | RAM trước (MB) | RAM sau (MB) | Peak Memory |
|---|---:|---:|---:|---:|
| Stream Pipeline (hiện tại) | 0.102 | 65 | 67 | +2 MB |
| Sharp toFile (truyền thống) | 0.081 | 67 | 67 | +0 MB |

Nhận xét:

- Với ảnh benchmark hiện tại (kích thước nhỏ-vừa), chênh lệch RAM chưa lớn.
- Stream pipeline vẫn là phương án bền vững hơn cho file lớn và tải batch kéo dài.

## 2) Batch Processing theo số workers

| Số workers | Tổng thời gian (s) | Peak RAM (MB) | Trung bình/ảnh (s) |
|---:|---:|---:|---:|
| 4 | 2.44 | 76 | 0.122 |
| 8 | 2.31 | 98 | 0.116 |
| 12 | 1.76 | 115 | 0.088 |

## 3) So sánh hiệu năng

- Tăng worker từ 4 -> 12 cải thiện tốc độ xử lý batch khoảng **27.87%**.
- Đổi lại, peak RAM tăng từ 76 MB lên 115 MB.
- Cân bằng đề xuất khi demo lớp học:
  - Máy RAM thấp: 4-6 workers.
  - Máy cấu hình khá: 8-12 workers.

## 4) Kết quả chạy thực tế CLI với `--with-stats`

Lệnh demo:

```bash
node src/index.js -i ./images -o ./resized --width 1024 --format webp --quality 82 -w 4 --overwrite --with-stats
```

Kết quả chính:

| Chỉ số | Giá trị |
|---|---:|
| Quét thư mục (ms) | 4 |
| Xử lý resize (ms) | 1376 |
| Throughput (task/s) | 14.53 |
| Đầu vào tổng (MB) | 0.44 |
| Đầu ra tổng (MB) | 0.02 |
| Tỉ lệ giảm dung lượng ước lượng | 94.46% |

## 5) Kết luận benchmark

- Worker Threads cho thấy hiệu quả rõ ở bài toán batch.
- Streams giúp kiến trúc an toàn bộ nhớ và ổn định hơn khi mở rộng dữ liệu.
- Bộ thông số (`workers`, `quality`, `format`) cần tinh chỉnh theo tài nguyên máy để đạt tỉ lệ tốt nhất giữa tốc độ và RAM.
