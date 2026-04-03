#!/usr/bin/env node
// =============================================================
// DEMO 4.2.2 — UV_THREADPOOL_SIZE & Libuv Thread Pool
// Minh họa: cấu hình thread pool theo số lõi CPU,
//           chạy nhiều tác vụ fs song song để quan sát hiệu quả
// Chạy:  node 06-demo-threadpool.js
// =============================================================

import os   from 'os';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { performance }   from 'perf_hooks';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── BƯỚC 1: Cấu hình UV_THREADPOOL_SIZE ──────────────────────
//   MẶC ĐỊNH Libuv chỉ có 4 luồng nền (rất bảo thủ)
//   → Cần thiết lập TRƯỚC KHI require/import bất kỳ module fs nào

const cpuCount = os.cpus().length;
process.env.UV_THREADPOOL_SIZE = String(cpuCount);
//           └─ Mở rộng thread pool bằng số lõi logic CPU thực tế

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║   Demo: UV_THREADPOOL_SIZE & Libuv Thread Pool 4.2.2  ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('🖥️  Thông tin hệ thống:');
console.log(`   CPU model   : ${os.cpus()[0].model}`);
console.log(`   Lõi logic   : ${cpuCount} lõi`);
console.log(`   UV_THREADPOOL_SIZE mặc định : 4`);
console.log(`   UV_THREADPOOL_SIZE đã thiết lập: ${process.env.UV_THREADPOOL_SIZE}`);
console.log(`   → Thread Pool mở rộng từ 4 → ${cpuCount} luồng nền\n`);

// ── BƯỚC 2: Chuẩn bị file test ───────────────────────────────
const TEMP_DIR   = path.join(__dirname, '_temp_threadpool');
const BATCH_SIZE = cpuCount * 2; // Gửi gấp đôi số lõi để thấy rõ hiệu quả
const FILE_KB    = 300;

fs.mkdirSync(TEMP_DIR, { recursive: true });
const filePaths = [];
for (let i = 1; i <= BATCH_SIZE; i++) {
  const fp = path.join(TEMP_DIR, `img_batch_${String(i).padStart(3, '0')}.dat`);
  fs.writeFileSync(fp, Buffer.alloc(FILE_KB * 1024, i % 256));
  filePaths.push(fp);
}
console.log(`📁 Đã tạo ${BATCH_SIZE} file test (~${FILE_KB}KB mỗi file)\n`);

// ── BƯỚC 3: Gửi TẤT CẢ yêu cầu đọc đồng thời ────────────────
//   Libuv sẽ phân phối công việc vào Thread Pool
console.log(`⚡ Gửi ${BATCH_SIZE} yêu cầu đọc file đồng thời...`);
console.log(`   Libuv thread pool xử lý song song (tối đa ${cpuCount} luồng cùng lúc)\n`);

const startTime = performance.now();

// Tạo và chạy tất cả Promise song song
const results = await Promise.all(
  filePaths.map(async (fp, idx) => {
    const t0   = performance.now();
    const data  = await fs.promises.readFile(fp);
    const elapsed = (performance.now() - t0).toFixed(1);
    return { idx: idx + 1, name: path.basename(fp), kb: data.length / 1024, elapsed };
  })
);

const totalTime = (performance.now() - startTime).toFixed(2);

// ── BƯỚC 4: Hiển thị kết quả ─────────────────────────────────
console.log('📊 Kết quả từng file:');
results.forEach(({ idx, name, kb, elapsed }) => {
  console.log(
    `   [${String(idx).padStart(2, '0')}] ${name}  — ${kb.toFixed(0)}KB  — hoàn thành sau ${elapsed}ms`
  );
});

console.log(`\n⏱  Tổng thời gian (${BATCH_SIZE} file song song): ${totalTime} ms`);
console.log(`   CPU vật lý không bị chặn — V8 thread tự do trong suốt quá trình`);
console.log(`\n💡 So sánh tư duy:`);
console.log(`   Thread Pool 4 luồng  → bottleneck nếu BATCH_SIZE >> 4`);
console.log(`   Thread Pool ${cpuCount} luồng  → khai thác tối đa phần cứng ${cpuCount} lõi\n`);

// Dọn dẹp
fs.rmSync(TEMP_DIR, { recursive: true, force: true });
console.log('🧹 Đã xóa file tạm. Demo hoàn tất.\n');
