#!/usr/bin/env node
// =============================================================
// DEMO 4.1.2 (2) — Parse cấu hình đầu vào với commander
// Minh họa: Declarative API, requiredOption, alias, type coercion
//           tự sinh --help, sub-command action
// Chạy:  node 03-demo-commander-config.js compress -i ./images -o ./output -q 80
// Hoặc:  node 03-demo-commander-config.js --help
// =============================================================

import { Command } from 'commander';

const program = new Command();

// ── 1. Metadata của CLI tool ──────────────────────────────────
program
  .name('resize-img')
  .description('Batch Image Resizer — CLI Tool (Node.js Core Demo)')
  .version('1.0.0', '-v, --version', 'Hiển thị phiên bản');

// ── 2. Định nghĩa sub-command "compress" ─────────────────────
program
  .command('compress')
  .description('Nén và resize hình ảnh hàng loạt trong thư mục')
  // requiredOption: bắt buộc, ném lỗi nếu người dùng bỏ qua
  .requiredOption(
    '-i, --input <directory>',
    'Đường dẫn thư mục chứa ảnh gốc (bắt buộc)'
  )
  // Option có giá trị mặc định
  .option(
    '-o, --output <directory>',
    'Đường dẫn thư mục lưu ảnh đã nén',
    './output'
  )
  // Option với ép kiểu: chuỗi "80" → số 80 qua hàm parseInt
  .option(
    '-q, --quality <number>',
    'Chất lượng JPEG (1–100)',
    (val) => {
      const num = parseInt(val, 10);
      if (isNaN(num) || num < 1 || num > 100)
        throw new Error('Quality phải là số nguyên từ 1 đến 100');
      return num;
    },
    80  // Giá trị mặc định
  )
  // Option với alias -W / --width
  .option('-W, --width <pixels>', 'Chiều rộng đích (pixels)', parseInt)
  .option('-H, --height <pixels>', 'Chiều cao đích (pixels)', parseInt)
  // Cờ boolean
  .option('--verbose', 'Hiển thị log chi tiết từng file', false)
  // Action: hàm được gọi khi sub-command khớp
  .action((options) => {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║     Demo: commander — Configuration Object   ║');
    console.log('╚══════════════════════════════════════════════╝\n');

    console.log('✅ Configuration Object đã parse (commander):');
    console.log({
      input:   options.input,
      output:  options.output,
      quality: options.quality,   // ← Đã là NUMBER, không phải string
      width:   options.width  || null,
      height:  options.height || null,
      verbose: options.verbose,
    });

    console.log('\n📌 So sánh với parse thủ công:');
    console.log('   quality (commander) :', typeof options.quality, '→', options.quality);
    console.log('   → Ép kiểu tự động! Không cần parseInt thủ công\n');
    console.log('   Alias hoạt động: -i ↔ --input | -o ↔ --output | -q ↔ --quality');
    console.log('   Thử: node 03-demo-commander-config.js --help\n');
  });

// ── 3. Kích hoạt parser ───────────────────────────────────────
program.parse(process.argv);
