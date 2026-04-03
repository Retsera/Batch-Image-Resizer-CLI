#!/usr/bin/env node
// =============================================================
// DEMO 4.1.2 (1) — Phân tích tham số thủ công qua process.argv
// Minh họa: cấu trúc mảng process.argv, slice(2),
//           destructuring và vòng lặp parse flag thủ công
// Chạy:  node 02-demo-process-argv.js compress --input ./images --quality 80 --verbose
// =============================================================

console.log('╔══════════════════════════════════════════════╗');
console.log('║       Demo: process.argv — Phân tích thô     ║');
console.log('╚══════════════════════════════════════════════╝\n');

// ── 1. Hiển thị toàn bộ mảng process.argv thô ────────────────
console.log('📋 [process.argv] — Mảng đầy đủ (raw):');
process.argv.forEach((val, index) => {
  let label = '';
  if (index === 0) label = '← index[0]: đường dẫn node.exe';
  if (index === 1) label = '← index[1]: đường dẫn script (Entry Point)';
  if (index >= 2) label = `← index[${index}]: tham số người dùng`;
  console.log(`   [${index}] "${val}"  ${label}`);
});

// ── 2. Cắt bỏ 2 phần tử hệ thống, lấy args người dùng ───────
const userArgs = process.argv.slice(2);
//               └─ Phương pháp slice(2): loại bỏ node + script path
console.log('\n✂️  [process.argv.slice(2)] — Tham số người dùng:');
console.log('  ', userArgs);

// ── 3. Destructuring lấy sub-command ─────────────────────────
const [subCommand, ...restArgs] = userArgs;
console.log('\n🎯 Sub-command (lệnh con):', subCommand || '(không có)');

// ── 4. Vòng lặp parse flag thủ công ──────────────────────────
const flags = {};
for (let i = 0; i < restArgs.length; i++) {
  const token = restArgs[i];
  if (token.startsWith('--')) {
    const key = token.slice(2);           // Bỏ dấu "--"
    const nextToken = restArgs[i + 1];
    if (nextToken && !nextToken.startsWith('--')) {
      // Tham số có giá trị: --quality 80
      flags[key] = nextToken;
      i++; // Bỏ qua token tiếp theo vì đã dùng làm giá trị
    } else {
      // Cờ boolean: --verbose (không có giá trị kèm theo)
      flags[key] = true;
    }
  }
}

console.log('\n🚩 Flags đã parse (thủ công):');
console.table(flags);

// ── 5. Vấn đề của cách parse thủ công ────────────────────────
console.log('⚠️  Vấn đề với parse thủ công:');
console.log('   - "--quality 80": quality nhận giá trị kiểu STRING "80"');
console.log('   - Chưa hỗ trợ alias: -i thay cho --input');
console.log('   - Không tự sinh --help, không validate bắt buộc');
console.log('   → Giải pháp: dùng thư viện commander (xem demo tiếp theo)\n');
