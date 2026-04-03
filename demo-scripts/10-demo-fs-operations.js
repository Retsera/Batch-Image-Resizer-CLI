#!/usr/bin/env node
// =============================================================
// DEMO 4.3.3 — Thao tác hệ thống tệp cốt lõi với fs.promises
// Minh họa: readdir (quét thư mục), stat (isFile/isDirectory),
//           mkdir recursive, xử lý lỗi quyền truy cập
// Chạy:  node 10-demo-fs-operations.js
// =============================================================

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║   Demo: fs.promises thao tác tệp hệ thống — 4.3.3    ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

// ── Chuẩn bị cấu trúc thư mục mẫu ────────────────────────────
const DEMO_DIR = path.join(__dirname, '_temp_fs_demo');
const SCAN_DIR = path.join(DEMO_DIR, 'batch_input');

// Tạo cấu trúc thư mục và file mẫu để quét
fs.mkdirSync(path.join(SCAN_DIR, 'subfolder'), { recursive: true });
fs.writeFileSync(path.join(SCAN_DIR, 'photo_01.jpg'),  Buffer.alloc(1024 * 200));
fs.writeFileSync(path.join(SCAN_DIR, 'banner.png'),   Buffer.alloc(1024 * 500));
fs.writeFileSync(path.join(SCAN_DIR, 'notes.txt'),    Buffer.from('Ghi chú'));
fs.writeFileSync(path.join(SCAN_DIR, 'icon.svg'),     Buffer.from('<svg/>'));
fs.writeFileSync(path.join(SCAN_DIR, 'thumbnail.jpeg'), Buffer.alloc(1024 * 80));
console.log(`📁 Cấu trúc mẫu đã tạo tại: ${SCAN_DIR}\n`);

// ═══════════════════════════════════════════════════════════════
// BƯỚC 1: fs.promises.readdir — Quét và liệt kê nội dung thư mục
// ═══════════════════════════════════════════════════════════════
console.log('─── BƯỚC 1: fs.promises.readdir ───');
try {
  const entries = await fs.promises.readdir(SCAN_DIR, { withFileTypes: true });
  //                                                 └─ withFileTypes=true → trả về Dirent
  //                                                    (không cần gọi stat thêm để biết loại)
  console.log(`   Tìm thấy ${entries.length} mục trong thư mục:\n`);

  for (const entry of entries) {
    const type = entry.isDirectory() ? '[THƯ MỤC]' : '[FILE]   ';
    console.log(`   ${type}  ${entry.name}`);
  }
  console.log('');
} catch (err) {
  console.log(`   ❌ Lỗi readdir: ${err.message}`);
}

// ═══════════════════════════════════════════════════════════════
// BƯỚC 2: fs.promises.stat — Trích xuất siêu dữ liệu từng file
// ═══════════════════════════════════════════════════════════════
console.log('─── BƯỚC 2: fs.promises.stat — Kiểm tra siêu dữ liệu ───');
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];

try {
  const entries = await fs.promises.readdir(SCAN_DIR, { withFileTypes: true });
  const imageFiles = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue; // Bỏ qua thư mục con

    const fullPath = path.join(SCAN_DIR, entry.name);
    const stat     = await fs.promises.stat(fullPath);
    const ext      = path.extname(entry.name).toLowerCase();
    const isImage  = IMAGE_EXTS.includes(ext);
    const sizeKB   = (stat.size / 1024).toFixed(1);
    const modified = stat.mtime.toLocaleTimeString('vi-VN');

    console.log(`   📄 ${entry.name}`);
    console.log(`      isFile()     : ${stat.isFile()}`);
    console.log(`      isDirectory(): ${stat.isDirectory()}`);
    console.log(`      Kích thước   : ${sizeKB} KB`);
    console.log(`      Sửa đổi lần cuối: ${modified}`);
    console.log(`      Hợp lệ (ảnh): ${isImage ? '✅ Có' : '❌ Không — sẽ bỏ qua'}`);
    console.log('');

    if (isImage) imageFiles.push({ name: entry.name, path: fullPath, sizeKB });
  }

  console.log(`   📊 Tổng kết: ${imageFiles.length} file ảnh hợp lệ / ${entries.length} mục\n`);

  // ═══════════════════════════════════════════════════════════════
  // BƯỚC 3: fs.promises.mkdir — Tạo thư mục output an toàn
  // ═══════════════════════════════════════════════════════════════
  console.log('─── BƯỚC 3: fs.promises.mkdir — Tạo thư mục output ───');
  const OUTPUT_DIR = path.join(DEMO_DIR, 'processed', '2024', 'january');
  //                                     └─ Chuỗi thư mục lồng nhau sâu 3 cấp

  try {
    await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });
    //                                   └─ recursive: true
    //                                      → Tạo cả chuỗi "processed/2024/january"
    //                                      → KHÔNG ném lỗi nếu đã tồn tại sẵn
    console.log(`   ✅ Tạo thành công: "${OUTPUT_DIR}"`);
    console.log('      (recursive: true → tạo cả 3 cấp thư mục lồng nhau)\n');
  } catch (err) {
    if (err.code === 'EACCES') {
      console.log(`   ❌ Lỗi EACCES: Không đủ quyền ghi — ${err.message}`);
    } else {
      console.log(`   ❌ Lỗi: ${err.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // BƯỚC 4: Giả lập xử lý — copy ảnh hợp lệ sang output
  // ═══════════════════════════════════════════════════════════════
  console.log('─── BƯỚC 4: Sao chép ảnh vào thư mục output ───');
  for (const img of imageFiles) {
    const destPath = path.join(OUTPUT_DIR, img.name);
    try {
      await fs.promises.copyFile(img.path, destPath);
      console.log(`   ✅ ${img.name} (${img.sizeKB}KB) → output hoàn tất`);
    } catch (err) {
      console.log(`   ❌ ${img.name} → Lỗi: ${err.message}`);
    }
  }

  console.log('\n✅ Tất cả thao tác fs.promises hoàn tất!\n');
} catch (err) {
  console.log(`❌ Lỗi tổng: ${err.message}`);
}

// ── Dọn dẹp ──────────────────────────────────────────────────
await fs.promises.rm(DEMO_DIR, { recursive: true, force: true });
console.log('🧹 Đã xóa toàn bộ thư mục demo. Kết thúc.\n');
