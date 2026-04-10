#!/usr/bin/env node
'use strict';
const path  = require('path');
const chalk = require('./_colors');
const CWD     = process.cwd();
const DIRNAME = __dirname;
console.log(chalk.bold.cyan('\n╔══════════════════════════════════════════════════════╗'));
console.log(chalk.bold.cyan('║   Demo 4.3.2 — path.join vs path.resolve vs cwd()   ║'));
console.log(chalk.bold.cyan('╚══════════════════════════════════════════════════════╝\n'));
console.log(chalk.yellow('── Ngữ cảnh thực thi ──'));
console.log(chalk.white('  process.cwd() :') + chalk.green(' ' + CWD));
console.log(chalk.white('  __dirname     :') + chalk.green(' ' + DIRNAME));
console.log(chalk.gray  ('  (CWD = thư mục người dùng đang đứng; __dirname = thư mục chứa file .js)\n'));
console.log(chalk.yellow('── 1. path.join() — Ghép chuỗi từ vựng ──'));
console.log(chalk.gray('  Nguyên tắc: Nối segment bằng sep, rồi normalize\n'));
[
  { args: ['images','raw','photo.jpg'],           desc: 'Kết hợp 3 segment tương đối' },
  { args: [CWD,'images','raw','photo.jpg'],        desc: 'Tuyệt đối + tương đối' },
  { args: ['images','.','raw','..','output'],      desc: 'Normalize: "." và ".." tự xử lý' },
  { args: ['/base','sub','../other','file.txt'],   desc: 'Truy ngược ".." được normalize' },
  { args: ['a//b','///c'],                         desc: 'Dấu phân cách kép được gộp' },
].forEach(({ args, desc }) => {
  console.log(chalk.white(`  path.join(${JSON.stringify(args).slice(1,-1)})`));
  console.log(chalk.green (`  → "${path.join(...args)}"`) + chalk.gray(` (${desc})\n`));
});
console.log(chalk.yellow('── 2. path.resolve() — Phân giải tuyệt đối ──'));
console.log(chalk.gray('  Nguyên tắc: Quét PHẢI→TRÁI, dừng khi tạo được đường dẫn tuyệt đối\n'));
[
  { args: ['images','raw'],                   desc: 'Chỉ tương đối → prepend CWD tự động' },
  { args: ['/absolute','sub','file.txt'],     desc: 'Gặp / → dừng, không dùng CWD' },
  { args: [CWD,'images'],                     desc: 'Tương đương path.join(cwd,"images")' },
  { args: ['/var/www','../home','user'],       desc: 'Phân giải ".." trong tuyệt đối' },
  { args: ['images','/override','file.txt'],  desc: 'Gặp "/" ở phải → OVERRIDE hết bên trái!' },
].forEach(({ args, desc }) => {
  console.log(chalk.white(`  path.resolve(${JSON.stringify(args).slice(1,-1)})`));
  console.log(chalk.blue  (`  → "${path.resolve(...args)}"`) + chalk.gray(` (${desc})\n`));
});
console.log(chalk.yellow('── 3. So sánh trực tiếp join vs resolve ──\n'));
[
  { a: ['output','resized'],         label: 'Tương đối thuần' },
  { a: ['/base','sub'],              label: 'Bắt đầu bằng /' },
  { a: ['images','..','output'],     label: 'Có ..' },
  { a: [CWD,'output'],               label: 'CWD + tương đối' },
].forEach(({ a, label }) => {
  const j = path.join(...a);
  const r = path.resolve(...a);
  console.log(chalk.white(`  [${label}]`));
  console.log(chalk.green (`    join    → "${j}"`));
  console.log(chalk.blue  (`    resolve → "${r}"`));
  console.log(chalk.gray  (`    Giống nhau? ${j===r ? '✓ Có' : '✗ Không!'}\n`));
});
console.log(chalk.yellow('── 4. Cạm bẫy: __dirname trong CLI tool ──'));
console.log(chalk.red  (`  ✗ SAI : path.join(__dirname, 'images')     → "${path.join(DIRNAME,'images')}"`));
console.log(chalk.green(`  ✓ ĐÚNG: path.join(process.cwd(), 'images') → "${path.join(CWD,'images')}"`));
console.log(chalk.gray  ('  → Luôn dùng process.cwd() khi trỏ đến file của NGƯỜI DÙNG'));
console.log(chalk.yellow('\n── 5. Pattern chuẩn trong đồ án ──'));
console.log(chalk.green (`  INPUT  = path.resolve(cwd, 'images')  → "${path.resolve(CWD,'images')}"`));
console.log(chalk.green (`  OUTPUT = path.resolve(cwd, 'resized') → "${path.resolve(CWD,'resized')}"`));
console.log(chalk.blue  (`  CONFIG = path.join(__dirname, '..', 'config', 'default.json')`));
console.log(chalk.bold.cyan('\n✓ Demo 4.3.2 hoàn tất!\n'));
