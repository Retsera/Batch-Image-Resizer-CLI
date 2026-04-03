#!/usr/bin/env node
// =============================================================
// DEMO 4.2.3 — Quản lý I/O với fs.promises + async/await
// Minh họa: async function, await, try/catch tập trung,
//           kiểm tra thư mục tồn tại, tạo output an toàn
// Chạy:  node 07-demo-async-await.js
// =============================================================

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('╔══════════════════════════════════════════════════╗');
console.log('║   Demo: async/await + fs.promises — Chương 4.2.3 ║');
console.log('╚══════════════════════════════════════════════════╝\n');

// ── BƯỚC 1: Hàm kiểm tra thư mục đầu vào tồn tại không ──────
async function checkInputDirectory(inputDir) {
  console.log(`🔍 Kiểm tra thư mục đầu vào: "${inputDir}"`);
  try {
    // fs.promises.access: kiểm tra quyền truy cập (không đọc nội dung)
    await fs.promises.access(inputDir, fs.constants.R_OK);
    const stat = await fs.promises.stat(inputDir);

    if (!stat.isDirectory()) {
      throw new Error(`"${inputDir}" tồn tại nhưng không phải thư mục!`);
    }
    console.log(`   ✅ Thư mục hợp lệ — Kích thước: (thư mục, không có size)`);
    return true;
  } catch (err) {
    // try/catch TẬP TRUNG: 1 chỗ xử lý mọi lỗi fs
    if (err.code === 'ENOENT') {
      console.log(`   ❌ Lỗi: Thư mục không tồn tại (ENOENT)`);
    } else if (err.code === 'EACCES') {
      console.log(`   ❌ Lỗi: Không có quyền đọc thư mục (EACCES)`);
    } else {
      console.log(`   ❌ Lỗi: ${err.message}`);
    }
    return false;
  }
}

// ── BƯỚC 2: Hàm tạo thư mục output an toàn ───────────────────
async function ensureOutputDirectory(outputDir) {
  console.log(`\n📂 Chuẩn bị thư mục đầu ra: "${outputDir}"`);
  try {
    // recursive: true → không ném lỗi nếu thư mục đã tồn tại
    //                 → tự tạo cả chuỗi thư mục cha
    await fs.promises.mkdir(outputDir, { recursive: true });
    console.log(`   ✅ Thư mục output sẵn sàng (mới tạo hoặc đã tồn tại)`);
    return true;
  } catch (err) {
    if (err.code === 'EACCES') {
      console.log(`   ❌ Lỗi EACCES: Không đủ quyền tạo thư mục tại "${outputDir}"`);
    } else {
      console.log(`   ❌ Lỗi không xác định: ${err.message}`);
    }
    return false;
  }
}

// ── BƯỚC 3: Pipeline xử lý async chính ───────────────────────
async function processImageBatch(inputDir, outputDir) {
  console.log('\n─── Pipeline async/await — Tuần tự nhưng không chặn ───\n');

  // Bước 3a: Kiểm tra input
  const inputOk = await checkInputDirectory(inputDir);
  if (!inputOk) {
    console.log('\n⛔ Dừng pipeline: thư mục đầu vào không hợp lệ.');
    return;
  }

  // Bước 3b: Chuẩn bị output
  const outputOk = await ensureOutputDirectory(outputDir);
  if (!outputOk) {
    console.log('\n⛔ Dừng pipeline: không thể tạo thư mục đầu ra.');
    return;
  }

  // Bước 3c: Quét danh sách file ảnh          
  console.log(`\n📋 Quét danh sách file trong: "${inputDir}"`);
  try {
    const entries = await fs.promises.readdir(inputDir, { withFileTypes: true });
    const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
    const imageFiles = entries.filter(
      (e) => e.isFile() && imageExts.includes(path.extname(e.name).toLowerCase())
    );

    if (imageFiles.length === 0) {
      console.log('   ⚠️  Không tìm thấy file ảnh hợp lệ!');
      return;
    }
    console.log(`   ✅ Tìm thấy ${imageFiles.length} file ảnh:`);
    imageFiles.forEach((f) => console.log(`      - ${f.name}`));

    // Bước 3d: Xử lý từng ảnh (giả lập async)
    console.log('\n⚙️  Bắt đầu xử lý từng ảnh (await trong vòng lặp):');
    for (const file of imageFiles) {
      const srcPath  = path.join(inputDir, file.name);
      const stat     = await fs.promises.stat(srcPath);
      const sizeKB   = (stat.size / 1024).toFixed(1);
      // Giả lập: đọc buffer, nén, ghi ra output
      await new Promise((r) => setTimeout(r, 50)); // Giả lập 50ms nén
      console.log(`   ✔ ${file.name} (${sizeKB}KB) → output xong`);
    }

    console.log(`\n✅ Pipeline hoàn tất! ${imageFiles.length} ảnh đã xử lý.\n`);
  } catch (err) {
    console.log(`\n❌ Lỗi khi đọc thư mục: ${err.message}`);
  }
}

// ── Chạy demo với thư mục thực của project ───────────────────
const INPUT_DIR  = path.join(__dirname, '..', 'images');  // Thư mục images thực
const OUTPUT_DIR = path.join(__dirname, '_temp_output');  // Thư mục output demo

await processImageBatch(INPUT_DIR, OUTPUT_DIR);

// Test thêm: thư mục KHÔNG TỒN TẠI
console.log('\n─── Test với thư mục KHÔNG tồn tại ───\n');
await processImageBatch('/duong/dan/khong/ton/tai', OUTPUT_DIR);

// Dọn dẹp
await fs.promises.rm(OUTPUT_DIR, { recursive: true, force: true }).catch(() => {});
console.log('🧹 Đã xóa thư mục output tạm.\n');
