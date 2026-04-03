#!/usr/bin/env node
// =============================================================
// DEMO 4.3.2 — path.join vs path.resolve: so sánh cơ chế
// Minh họa: nối từ vựng tuyến tính (join) vs dịch chuyển không
//           gian ngữ cảnh tuyệt đối (resolve), process.cwd()
// Chạy:  node 09-demo-path-join-resolve.js
// =============================================================

import path from 'path';
import { fileURLToPath } from 'url';

// Trong ESM, không có __dirname sẵn — phải tự dựng
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║   Demo: path.join vs path.resolve — Chương 4.3.2      ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('📌 Ngữ cảnh thực thi:');
console.log(`   process.cwd()  = "${process.cwd()}"`);
console.log(`               ↑ Thư mục người dùng ĐANG LÀM VIỆC (Working Directory)`);
console.log(`   __dirname      = "${__dirname}"`);
console.log(`               ↑ Thư mục chứa file script này\n`);

// ── Hàm tiện ích hiển thị so sánh ────────────────────────────
function compare(label, args) {
  const joined   = path.join(...args);
  const resolved = path.resolve(...args);

  console.log(`  📁 Input: [${args.map((a) => `"${a}"`).join(', ')}]`);
  console.log(`     path.join    → "${joined}"`);
  console.log(`     path.resolve → "${resolved}"`);
  const isAbsJoin = path.isAbsolute(joined);
  const isAbsRes  = path.isAbsolute(resolved);
  console.log(`     isAbsolute   join=${isAbsJoin} | resolve=${isAbsRes}`);
  console.log('');
}

// ── TEST CASE 1: Chỉ có đường dẫn tương đối ──────────────────
console.log('─── TEST 1: Tất cả tham số tương đối ───');
compare('relative only', ['images', 'raw', 'img1.jpg']);

// ── TEST CASE 2: Đường dẫn có segment điều hướng ─────────────
console.log('─── TEST 2: Có ký tự điều hướng (..) ───');
compare('navigate up', ['images', '..', 'output', 'result.jpg']);

// ── TEST CASE 3: Tham số đầu tiên là tuyệt đối ───────────────
console.log('─── TEST 3: Tham số đầu có đường dẫn tuyệt đối ───');
const root = process.platform === 'win32' ? 'C:\\Projects' : '/home/admin/project';
compare('first abs', [root, 'images', 'photo.jpg']);

// ── TEST CASE 4: Giữa dãy có đường dẫn tuyệt đối (BẪY!) ─────
console.log('─── TEST 4: ⚠️  Bẫy! Tham số giữa dãy có đường dẫn tuyệt đối ───');
const abs2 = process.platform === 'win32' ? 'C:\\Logs' : '/var/log';
compare('mid abs TRAP', [root, abs2, 'app.log']);
console.log('  ⚠️  Giải thích:');
console.log('     path.join : ghép bình thường, giữ cả hai');
console.log(`     path.resolve: quét NGƯỢC từ phải, gặp "${abs2}" là tuyệt đối → DỪNG ngay!`);
console.log(`     → Bỏ qua "${root}", chỉ giữ từ "${abs2}" trở đi\n`);

// ── TEST CASE 5: Ứng dụng thực trong CLI xử lý ảnh ───────────
console.log('─── TEST 5: Ứng dụng thực — Xây dựng đường dẫn output ───');

const userInput  = './my_photos';       // Tham số người dùng nhập
const outputBase = 'resized';

// ❌ Sai: dùng __dirname — tìm file trong thư mục cài đặt npm
const wrongPath  = path.join(__dirname, userInput, 'photo.jpg');
// ✅ Đúng: dùng process.cwd() — tìm file ở thư mục người dùng đang đứng
const rightPath  = path.resolve(process.cwd(), userInput, 'photo.jpg');
const outputPath = path.resolve(process.cwd(), outputBase, 'photo_resized.jpg');

console.log('  ❌ Dùng __dirname (sai với CLI tool):');
console.log(`     ${wrongPath}`);
console.log('  ✅ Dùng process.cwd() (đúng — theo vị trí người dùng):');
console.log(`     Input  : ${rightPath}`);
console.log(`     Output : ${outputPath}\n`);

console.log('  💡 Quy tắc vàng:');
console.log('     __dirname → File nằm trong package code (ví dụ: đọc template nội bộ)');
console.log('     process.cwd() → File nằm theo ngữ cảnh terminal của người dùng\n');
