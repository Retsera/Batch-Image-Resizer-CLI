#!/usr/bin/env node
'use strict';
const chalk = require('./_colors');
const cliProgress = require('cli-progress');
const delay = (ms) => new Promise(r => setTimeout(r, ms));
async function main() {
  console.log(chalk.bold.cyan('\n╔══════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║   Demo 4.1.3 — Terminal UX với CLI Tools    ║'));
  console.log(chalk.bold.cyan('╚══════════════════════════════════════════════╝\n'));
  console.log(chalk.yellow('── 1. chalk — Ngữ nghĩa màu sắc ──'));
  console.log(chalk.green  ('  ✓ [SUCCESS] Ảnh đã nén thành công: output/img_001.jpg'));
  console.log(chalk.red    ('  ✗ [ERROR]   Không đọc được file: broken_image.bmp'));
  console.log(chalk.yellow ('  ⚠ [WARN]    Bỏ qua file không phải ảnh: readme.txt'));
  console.log(chalk.blue   ('  ℹ [INFO]    Đang xử lý thư mục: ./images/batch01/'));
  console.log(chalk.gray   ('  · [DEBUG]   fs.readFile() → 2340 bytes'));
  console.log(chalk.bold.magenta('  ★ [DONE]    Hoàn tất 1000 ảnh trong 3.2s\n'));
  console.log(chalk.yellow('── 2. inquirer — Chế độ Wizard/Hội thoại ──'));
  let answers;
  try {
    const { default: inquirer } = await import('inquirer');
    answers = await inquirer.prompt([
      { type: 'list',     name: 'format',    message: chalk.cyan('Chọn định dạng đầu ra:'), choices: ['jpeg','png','webp','avif'], default: 'webp' },
      { type: 'number',   name: 'quality',   message: chalk.cyan('Chất lượng nén (1-100):'), default: 85, validate: v => (v>=1&&v<=100)||'Phải trong khoảng 1-100' },
      { type: 'checkbox', name: 'sizes',     message: chalk.cyan('Chọn các kích thước cần resize:'),
        choices: [
          { name: '2560px (4K)',      value: 2560 },
          { name: '1920px (FHD)',     value: 1920, checked: true },
          { name: '1280px (HD)',      value: 1280, checked: true },
          { name: '640px  (SD)',      value: 640  },
          { name: '320px  (Mobile)', value: 320  },
        ]},
      { type: 'confirm',  name: 'overwrite', message: chalk.cyan('Ghi đè file output nếu đã tồn tại?'), default: false },
    ]);
    console.log(chalk.green('\n  ✓ Cấu hình từ inquirer:'));
    console.table({ format: answers.format, quality: answers.quality, sizes: answers.sizes.join(', '), overwrite: answers.overwrite });
  } catch {
    console.log(chalk.gray('  (inquirer không khả dụng — bỏ qua bước hội thoại)'));
    answers = { format: 'webp', quality: 85, sizes: [1920,1280], overwrite: false };
  }
  console.log(chalk.yellow('\n── 3. ora — Spinner (Unknown Duration) ──'));
  try {
    const { default: ora } = await import('ora');
    const spinner = ora({ text: chalk.cyan('Đang quét thư mục ảnh nguồn...'), color: 'cyan' }).start();
    await delay(400); spinner.text = chalk.cyan('Đang đọc metadata EXIF...');
    await delay(400); spinner.text = chalk.cyan('Khởi tạo Worker Pool (4 threads)...');
    await delay(400); spinner.text = chalk.cyan('Chuẩn bị pipeline Sharp...');
    await delay(300);
    spinner.succeed(chalk.green('Khởi tạo hoàn tất! Tìm thấy 1.247 file ảnh.'));
  } catch {
    console.log(chalk.gray('  [Spinner] Đang quét thư mục... ✓ Hoàn tất!'));
  }
  console.log(chalk.yellow('\n── 4. cli-progress — Progress Bar (Known Duration) ──'));
  const TOTAL = 50;
  const bar = new cliProgress.SingleBar({
    format: chalk.cyan('{bar}') + ' {percentage}% | {value}/{total} ảnh | ETA: {eta}s | Speed: {speed} ảnh/s',
    barCompleteChar: '█', barIncompleteChar: '░', hideCursor: true,
  }, cliProgress.Presets.shades_classic);
  bar.start(TOTAL, 0, { speed: 'N/A' });
  let processed = 0;
  const interval = setInterval(() => {
    const batch = Math.min(Math.ceil(Math.random() * 5), TOTAL - processed);
    processed += batch;
    bar.update(processed, { speed: (Math.random() * 10 + 5).toFixed(1) });
    if (processed >= TOTAL) {
      clearInterval(interval);
      bar.stop();
      console.log(chalk.green('\n  ✓ Đã xử lý xong 50 ảnh!'));
      console.log(chalk.green  ('  ✓ Thành công: 48 ảnh'));
      console.log(chalk.yellow ('  ⚠ Bỏ qua:      1 file (không phải ảnh)'));
      console.log(chalk.red    ('  ✗ Lỗi:          1 file (quyền truy cập)'));
      console.log(chalk.bold.cyan('\n✓ Demo 4.1.3 hoàn tất!\n'));
    }
  }, 80);
}
main().catch(err => { console.error(chalk.red('\n✗ ' + err.message)); process.exit(1); });
