#!/usr/bin/env node
// =============================================================
// DEMO 4.2.1 — So sánh Blocking vs Non-blocking I/O
// Minh họa: fs.readFileSync (chặn luồng) vs fs.promises.readFile
//           + Promise.all (song song). Đo thời gian chênh lệch.
// Chạy:  node 05-demo-blocking-vs-nonblocking.js
// =============================================================

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Tạo 5 file giả lập dữ liệu ảnh lớn ──────────────────────
const TEMP_DIR  = path.join(__dirname, '_temp_demo');
const NUM_FILES = 5;
const FILE_SIZE_KB = 500; // Mỗi file ~500KB

console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║   Demo: Blocking vs Non-blocking I/O — Chương 4.2.1  ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

// Chuẩn bị: tạo thư mục và file test tạm thời
fs.mkdirSync(TEMP_DIR, { recursive: true });
const filePaths = [];
for (let i = 1; i <= NUM_FILES; i++) {
  const fp = path.join(TEMP_DIR, `test_image_${i}.dat`);
  if (!fs.existsSync(fp)) {
    // Ghi dữ liệu ngẫu nhiên ~500KB để giả lập file ảnh
    fs.writeFileSync(fp, Buffer.alloc(FILE_SIZE_KB * 1024, i));
  }
  filePaths.push(fp);
}
console.log(`📁 Đã tạo ${NUM_FILES} file giả lập (~${FILE_SIZE_KB}KB mỗi file)\n`);

// ═══════════════════════════════════════════════════════════════
// MÔ HÌNH 1: BLOCKING — fs.readFileSync (đồng bộ)
//   CPU dừng chờ từng file xong mới đọc file tiếp theo
// ═══════════════════════════════════════════════════════════════
console.log('─── MÔ HÌNH 1: Blocking (fs.readFileSync) ───');
console.log('   → Đọc tuần tự, luồng JS bị CHẶN sau mỗi file\n');

const t1Start = performance.now();

for (const fp of filePaths) {
  const data = fs.readFileSync(fp); // ← CHẶN luồng tại đây
  console.log(`   📖 Đọc xong: ${path.basename(fp)} (${(data.length / 1024).toFixed(0)} KB)`);
}

const t1End     = performance.now();
const blocking  = (t1End - t1Start).toFixed(2);
console.log(`\n   ⏱ Tổng thời gian BLOCKING  : ${blocking} ms\n`);

// ═══════════════════════════════════════════════════════════════
// MÔ HÌNH 2: NON-BLOCKING — fs.promises.readFile + Promise.all
//   Tất cả 5 yêu cầu đọc được gửi CÙNG LÚC, Libuv xử lý song song
// ═══════════════════════════════════════════════════════════════
console.log('─── MÔ HÌNH 2: Non-blocking (fs.promises + Promise.all) ───');
console.log('   → Gửi TẤT CẢ yêu cầu đọc cùng lúc, không chặn luồng JS\n');

const t2Start = performance.now();

// Tạo mảng Promise — tất cả I/O khởi động ĐỒNG THỜI
const readPromises = filePaths.map((fp) =>
  fs.promises.readFile(fp).then((data) => {
    console.log(`   📖 Đọc xong: ${path.basename(fp)} (${(data.length / 1024).toFixed(0)} KB)`);
    return data;
  })
);

await Promise.all(readPromises); // Chờ TẤT CẢ hoàn thành

const t2End        = performance.now();
const nonBlocking  = (t2End - t2Start).toFixed(2);
console.log(`\n   ⏱ Tổng thời gian NON-BLOCKING: ${nonBlocking} ms`);

// ═══════════════════════════════════════════════════════════════
// KẾT QUẢ SO SÁNH
// ═══════════════════════════════════════════════════════════════
const speedup = (parseFloat(blocking) / parseFloat(nonBlocking)).toFixed(2);
console.log('\n══════════════════════════════════════════════');
console.log('📊 KẾT QUẢ SO SÁNH:');
console.log(`   Blocking     : ${blocking} ms (tuần tự, 1 luồng, CPU chờ từng file)`);
console.log(`   Non-blocking : ${nonBlocking} ms (song song, Libuv Thread Pool)`);
console.log(`   🚀 Non-blocking nhanh hơn ~${speedup}x với ${NUM_FILES} file`);
console.log(`   → Khi xử lý 1000 ảnh: tiết kiệm vài phút thực thi!\n`);

// Dọn dẹp file tạm
fs.rmSync(TEMP_DIR, { recursive: true, force: true });
console.log('🧹 Đã xóa file tạm. Demo hoàn tất.\n');
