#!/usr/bin/env node
'use strict';
const path  = require('path');
const chalk = require('./_colors');
console.log(chalk.bold.cyan('\n╔══════════════════════════════════════════════════╗'));
console.log(chalk.bold.cyan('║   Demo 4.3.1 — Module path: Phân tích đường dẫn ║'));
console.log(chalk.bold.cyan('╚══════════════════════════════════════════════════╝\n'));
const SAMPLE = '/home/user/projects/batch-resizer/images/raw/photo_001.jpg';
console.log(chalk.yellow('── 1. Các hàm phân tích đường dẫn cơ bản ──'));
console.log(chalk.gray('  Đường dẫn mẫu: ' + chalk.white(SAMPLE) + '\n'));
[
  { fn: 'path.basename(p)',         result: path.basename(SAMPLE),          desc: 'Tên file + extension' },
  { fn: 'path.basename(p, ".jpg")', result: path.basename(SAMPLE, '.jpg'),  desc: 'Tên file, không extension' },
  { fn: 'path.extname(p)',          result: path.extname(SAMPLE),           desc: 'Extension' },
  { fn: 'path.dirname(p)',          result: path.dirname(SAMPLE),           desc: 'Thư mục chứa file' },
].forEach(({ fn, result, desc }) => {
  console.log(chalk.white(`  ${fn.padEnd(30)}`) + chalk.green(`→ "${result}"`) + chalk.gray(` (${desc})`));
});
console.log(chalk.yellow('\n── 2. path.parse() — Giải phẫu đầy đủ ──'));
const parsed = path.parse(SAMPLE);
console.log(chalk.gray('  Input: ' + SAMPLE + '\n'));
console.table({ root: parsed.root||'(rỗng)', dir: parsed.dir, base: parsed.base, ext: parsed.ext, name: parsed.name });
console.log(chalk.yellow('── 3. path.sep và path.delimiter ──'));
console.log(chalk.white(`  path.sep       = ${chalk.green(JSON.stringify(path.sep))}  ← Ký tự phân cách thư mục`));
console.log(chalk.white(`  path.delimiter = ${chalk.green(JSON.stringify(path.delimiter))}  ← Ký tự phân cách PATH env`));
if (process.platform === 'win32') {
  console.log(chalk.yellow('  Bạn đang chạy trên WINDOWS → sep=\\\\ , delimiter=;'));
} else {
  console.log(chalk.blue  ('  Bạn đang chạy trên POSIX   → sep=/ , delimiter=:'));
}
console.log(chalk.yellow('\n── 4. Cross-platform: path.posix vs path.win32 ──'));
const posixP   = '/home/user/images/photo.jpg';
const windowsP = 'C:\\Users\\Admin\\images\\photo.jpg';
console.table([
  { Hàm: 'basename',  POSIX: path.posix.basename(posixP),   Windows: path.win32.basename(windowsP) },
  { Hàm: 'extname',   POSIX: path.posix.extname(posixP),    Windows: path.win32.extname(windowsP) },
  { Hàm: 'dirname',   POSIX: path.posix.dirname(posixP),    Windows: path.win32.dirname(windowsP) },
  { Hàm: 'sep',       POSIX: path.posix.sep,                Windows: path.win32.sep },
  { Hàm: 'delimiter', POSIX: path.posix.delimiter,          Windows: path.win32.delimiter },
]);
console.log(chalk.yellow('── 5. Ứng dụng trong đồ án xử lý ảnh ──'));
const imageFile = '/home/user/images/raw/DSC_0042.JPG';
const SUPPORTED = ['.jpg','.jpeg','.png','.webp','.gif','.avif'];
const ext  = path.extname(imageFile).toLowerCase();
const name = path.basename(imageFile, path.extname(imageFile));
console.log(chalk.white(`  File nguồn:  ${chalk.green(imageFile)}`));
console.log(chalk.white(`  Extension:   ${chalk.green(ext)} → ${SUPPORTED.includes(ext) ? chalk.green('✓ Hỗ trợ') : chalk.red('✗ Không hỗ trợ')}`));
console.log(chalk.white(`  Tên gốc:     ${chalk.green(name)}`));
console.log(chalk.white(`  File đầu ra: ${chalk.green(name + '_resized' + ext)}`));
console.log(chalk.bold.cyan('\n✓ Demo 4.3.1 hoàn tất!\n'));
