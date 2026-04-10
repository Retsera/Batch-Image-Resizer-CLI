#!/usr/bin/env node
'use strict';
const { program } = require('commander');
const chalk = require('./_colors');
function parsePositiveInt(value, label) {
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1) {
    console.error(chalk.red(`  ✗ Lỗi: "${label}" phải là số nguyên dương, nhận được: ${value}`));
    process.exit(1);
  }
  return n;
}
console.log(chalk.bold.cyan('\n╔══════════════════════════════════════════════╗'));
console.log(chalk.bold.cyan('║  Demo 4.1.2 — process.argv & Commander.js   ║'));
console.log(chalk.bold.cyan('╚══════════════════════════════════════════════╝'));
console.log(chalk.yellow('\n── PHẦN A: Thủ công phân tích process.argv ──'));
console.log(chalk.gray('  Mảng process.argv đầy đủ:'));
process.argv.forEach((val, idx) => {
  const label = idx === 0 ? '(node bin)' : idx === 1 ? '(script)' : `(arg[${idx}])`;
  console.log(chalk.white(`    [${idx}] ${label}`) + ' → ' + chalk.green(val));
});
const rawArgs = process.argv.slice(2);
console.log(chalk.gray('\n  Sau khi slice(2):'));
console.log(chalk.green('  ' + JSON.stringify(rawArgs)));
const manualOpts = { input: null, output: null, quality: 85, verbose: false };
for (let i = 0; i < rawArgs.length; i++) {
  const t = rawArgs[i];
  if (t === '-i' || t === '--input')   manualOpts.input   = rawArgs[++i] ?? null;
  if (t === '-o' || t === '--output')  manualOpts.output  = rawArgs[++i] ?? null;
  if (t === '--quality')               manualOpts.quality = Number(rawArgs[++i]);
  if (t === '--verbose' || t === '-v') manualOpts.verbose = true;
}
console.log(chalk.yellow('\n  Kết quả parse THỦ CÔNG:'));
console.table(manualOpts);
console.log(chalk.red('  ⚠ Hạn chế: không validate, không ép kiểu, không sinh --help tự động!'));
console.log(chalk.yellow('\n── PHẦN B: Commander.js — Declarative Parsing ──'));
program
  .name('demo02')
  .description('Demo 4.1.2 — Phân tích arguments với Commander.js')
  .version('1.0.0', '-V, --version', 'Hiển thị phiên bản');
program
  .command('resize')
  .description('Thay đổi kích thước ảnh')
  .option('-i, --input <path>',   'Thư mục ảnh nguồn',  './images')
  .option('-o, --output <path>',  'Thư mục ảnh đích',   './resized')
  .option('--width <number>',     'Chiều rộng (px)',     (v) => parsePositiveInt(v, 'width'),   1024)
  .option('--quality <number>',   'Chất lượng 1-100',   (v) => parsePositiveInt(v, 'quality'),  85)
  .option('-v, --verbose',        'In log chi tiết',    false)
  .action((opts) => {
    console.log(chalk.green('\n  ✓ Sub-command "resize" — Configuration Object sau parse:'));
    console.table({ input: opts.input, output: opts.output, width: opts.width, quality: opts.quality, verbose: opts.verbose });
    console.log(chalk.gray('  → Commander tự động: validate kiểu, gán default, sinh --help'));
  });
program
  .option('-i, --input <path>',   'Thư mục ảnh nguồn',  './images')
  .option('-o, --output <path>',  'Thư mục ảnh đích',   './resized')
  .option('--quality <number>',   'Chất lượng 1-100',   (v) => parsePositiveInt(v, 'quality'),  85)
  .action((opts) => {
    console.log(chalk.green('\n  ✓ Default command — Configuration Object sau parse:'));
    console.table({ input: opts.input, output: opts.output, quality: opts.quality });
    console.log(chalk.gray('  → process.argv đã được Commander ánh xạ thành object cấu hình.'));
  });
program.parse();
console.log(chalk.bold.cyan('\n✓ Demo 4.1.2 hoàn tất!\n'));
