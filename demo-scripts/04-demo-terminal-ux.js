#!/usr/bin/env node
// =============================================================
// DEMO 4.1.3 — Terminal UX: ora + cli-progress + chalk + inquirer
// Minh họa: spinner không xác định, progress bar có thể đo,
//           màu sắc ngữ nghĩa, menu tương tác inquirer
// Chạy:  node 04-demo-terminal-ux.js              (tự động, không cần nhập)
// Chạy:  node 04-demo-terminal-ux.js --interactive (bật menu inquirer thật)
// =============================================================

import chalk       from 'chalk';
import ora         from 'ora';
import cliProgress from 'cli-progress';
import inquirer    from 'inquirer';

// ── Hàm tiện ích: dừng N mili-giây (giả lập tác vụ) ─────────
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const isInteractive = process.argv.includes('--interactive');

console.log(chalk.bold.cyan('\n╔══════════════════════════════════════════╗'));
console.log(chalk.bold.cyan('║   Demo: Terminal UX — Chương 4.1.3       ║'));
console.log(chalk.bold.cyan('╚══════════════════════════════════════════╝\n'));

// ═══════════════════════════════════════════════════════════════
// BƯỚC 1: inquirer — Menu tương tác (Wizard Mode)
//   Pull Mode: hệ thống CHỦ ĐỘNG hỏi thay vì người dùng phải nhớ flags
// ═══════════════════════════════════════════════════════════════
let answers;
if (isInteractive) {
  // Chế độ thật: hiển thị menu inquirer, người dùng chọn bằng phím mũi tên
  answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'format',
      message: 'Chọn định dạng ảnh đầu ra:',
      choices: ['jpeg', 'png', 'webp', 'avif'],
      default: 'jpeg',
    },
    {
      type: 'number',
      name: 'quality',
      message: 'Nhập chất lượng nén (1–100):',
      default: 80,
      validate: (val) => (val >= 1 && val <= 100) || 'Phải từ 1 đến 100',
    },
    {
      type: 'confirm',
      name: 'verbose',
      message: 'Bật chế độ verbose (log chi tiết)?',
      default: false,
    },
  ]);
  console.log(chalk.green('\n✔ Cấu hình từ inquirer:'), answers);
} else {
  // Chế độ demo tự động: giả lập kết quả inquirer
  answers = { format: 'jpeg', quality: 80, verbose: false };
  console.log(chalk.bold('── BƯỚC 1: inquirer (Wizard Mode) ──'));
  console.log(chalk.blue('   ? Chọn định dạng ảnh đầu ra:'));
  console.log(chalk.cyan('   ❯ jpeg') + '  png  webp  avif');
  console.log(chalk.blue('\n   ? Nhập chất lượng nén (1–100):'));
  console.log(chalk.cyan('   ❯ 80'));
  console.log(chalk.blue('\n   ? Bật chế độ verbose?'));
  console.log(chalk.cyan('   ❯ Không\n'));
  console.log(chalk.green('   ✔ Cấu hình đã nhận:'), answers);
  console.log(chalk.gray('   → Thêm --interactive để dùng menu thật\n'));
}

// ═══════════════════════════════════════════════════════════════
// BƯỚC 2: ora spinner — Tác vụ không đo được thời gian
//   Unknown Duration: hiển thị spinner quay để báo "còn sống"
// ═══════════════════════════════════════════════════════════════
console.log(chalk.bold('── BƯỚC 2: ora Spinner (Unknown Duration) ──'));
const spinner = ora({
  text: chalk.blue('Đang quét thư mục và thu thập danh sách ảnh...'),
  color: 'cyan',
}).start();

await sleep(1500);
spinner.succeed(chalk.green('Tìm thấy 12 file ảnh hợp lệ!'));

const spinner2 = ora({
  text: chalk.blue('Khởi tạo Worker Thread Pool...'),
  color: 'yellow',
}).start();
await sleep(1000);
spinner2.succeed(chalk.green('Worker Pool sẵn sàng (4 luồng song song)\n'));

// ═══════════════════════════════════════════════════════════════
// BƯỚC 3: cli-progress — Thanh tiến trình có thể đo
//   Determinable Duration: biết tổng số công việc → hiện % + ETA
// ═══════════════════════════════════════════════════════════════
console.log(chalk.bold('── BƯỚC 3: cli-progress Bar (Determinable Duration) ──'));
const totalImages = 12;
const progressBar = new cliProgress.SingleBar({
  format: chalk.cyan('  Nén ảnh') + ' |' + chalk.cyan('{bar}') +
          '| {percentage}% || {value}/{total} file || ETA: {eta}s',
  barCompleteChar: '█',
  barIncompleteChar: '░',
  hideCursor: false,
}, cliProgress.Presets.shades_classic);

progressBar.start(totalImages, 0);
for (let i = 0; i < totalImages; i++) {
  await sleep(200);
  progressBar.increment();
}

progressBar.stop();

// ═══════════════════════════════════════════════════════════════
// BƯỚC 4: chalk — Màu sắc ngữ nghĩa trong kết quả log
// ═══════════════════════════════════════════════════════════════
console.log('\n' + chalk.bold('📊 Kết quả xử lý:'));
console.log(chalk.green('  ✔ photo_001.jpg → output/photo_001.jpeg (98KB → 42KB)'));
console.log(chalk.green('  ✔ photo_002.jpg → output/photo_002.jpeg (120KB → 55KB)'));
console.log(chalk.yellow('  ⚠ icon.png      → BỎ QUA (file PNG < 10KB, không cần nén)'));
console.log(chalk.red   ('  ✖ banner.png    → LỖI: Không đủ quyền ghi vào thư mục output'));
console.log(chalk.green('  ✔ hero_image.jpeg → output/hero_image.jpeg (2.1MB → 340KB)'));
console.log(chalk.green('  ✔ ... (8 file còn lại thành công)\n'));

console.log(chalk.bold.green('✅ Hoàn tất! 10 ảnh nén thành công | 1 cảnh báo | 1 lỗi'));
console.log(chalk.gray('   Thời gian xử lý: 3.2s | Dung lượng tiết kiệm: 4.8MB\n'));
