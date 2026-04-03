#!/usr/bin/env node
// =============================================================
// DEMO 4.3.1 — Module path: basename, extname, dirname, sep, delimiter
// Minh họa: các hàm cắt/phân tích đường dẫn bất kể OS,
//           path.sep và path.delimiter thích ứng nền tảng
// Chạy:  node 08-demo-path-basics.js
// =============================================================

import path from 'path';
import os   from 'os';

console.log('╔══════════════════════════════════════════════════════╗');
console.log('║   Demo: Node.js path module cơ bản — Chương 4.3.1   ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

// ── Thông tin OS hiện tại ─────────────────────────────────────
console.log(`🖥️  Nền tảng hiện tại : ${os.platform()} (${process.platform})`);
console.log(`   path.sep          : "${path.sep}"   ← Ký tự phân cách thư mục`);
console.log(`   path.delimiter    : "${path.delimiter}"  ← Ký tự phân cách chuỗi PATH\n`);

// ── Đường dẫn mẫu sử dụng trong demo ─────────────────────────
const samplePaths = [
  '/home/admin/projects/batch-resizer/images/raw/photo_001.jpg',
  'C:\\Users\\Admin\\Desktop\\project\\images\\thumbnail.png',
  '/var/app/output/2024/banner.webp',
  './relative/path/to/icon.svg',
];

// ── Bảng phân tích từng hàm ───────────────────────────────────
const funcs = [
  { label: 'path.basename(p)',         fn: (p) => path.basename(p) },
  { label: 'path.basename(p, ext)',    fn: (p) => path.basename(p, path.extname(p)) },
  { label: 'path.extname(p)',          fn: (p) => path.extname(p) },
  { label: 'path.dirname(p)',          fn: (p) => path.dirname(p) },
];

console.log('📋 Phân tích chi tiết từng hàm path:\n');

samplePaths.forEach((p, idx) => {
  console.log(`  [${idx + 1}] Đường dẫn: "${p}"`);
  funcs.forEach(({ label, fn }) => {
    const result = fn(p);
    console.log(`       ${label.padEnd(30)} → "${result}"`);
  });
  console.log('');
});

// ── path.sep và path.delimiter ────────────────────────────────
console.log('──────────────────────────────────────────────────────');
console.log('🔍 path.sep — Ký tự phân cách thư mục (OS-aware):');
console.log(`   Linux/macOS : path.posix.sep   = "${path.posix.sep}"`);
console.log(`   Windows     : path.win32.sep   = "${path.win32.sep}"`);
console.log(`   Hiện tại    : path.sep         = "${path.sep}"  ← Tự động theo OS\n`);

console.log('🔍 path.delimiter — Ký tự phân cách biến PATH:');
console.log(`   Linux/macOS : path.posix.delimiter = "${path.posix.delimiter}"`);
console.log(`   Windows     : path.win32.delimiter = "${path.win32.delimiter}"`);
console.log(`   Hiện tại    : path.delimiter       = "${path.delimiter}"\n`);

// ── Ví dụ thực tế: lấy ảnh, đổi extension ────────────────────
console.log('──────────────────────────────────────────────────────');
console.log('💡 Ví dụ thực tế trong đồ án CLI:');
console.log('   Bài toán: Nhận ảnh .jpg, lưu output thành .webp\n');

const inputFile  = '/home/admin/images/raw/photo_holiday.jpg';
const outputDir  = '/home/admin/images/output';

const baseName   = path.basename(inputFile, path.extname(inputFile));
//                     └─ "photo_holiday"  (tên không có extension)
const newExt     = '.webp';
const outputFile = path.join(outputDir, baseName + newExt);

console.log(`   Input       : "${inputFile}"`);
console.log(`   basename    : "${baseName}"`);
console.log(`   extname     : "${path.extname(inputFile)}"`);
console.log(`   Output path : "${outputFile}"`);
console.log(`\n   → path.join tự dùng "${path.sep}" phân cách, an toàn đa nền tảng!\n`);
