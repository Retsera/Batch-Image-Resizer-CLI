#!/usr/bin/env node
'use strict';
const fsp  = require('fs').promises;
const path = require('path');
const chalk = require('./_colors');
const BASE_DIR   = path.join(__dirname, '.tmp_fs_demo');
const INPUT_DIR  = path.join(BASE_DIR, 'images');
const OUTPUT_DIR = path.join(BASE_DIR, 'resized');
async function prepare() {
  await fsp.mkdir(INPUT_DIR, { recursive: true });
  const items = ['photo_001.jpg','photo_002.png','photo_003.webp','readme.txt','.hidden_file','sub_folder'];
  for (const name of items) {
    if (name === 'sub_folder') await fsp.mkdir(path.join(INPUT_DIR, name), { recursive: true });
    else await fsp.writeFile(path.join(INPUT_DIR, name), Buffer.alloc(Math.floor(Math.random()*200+50)*1024, 0xAB));
  }
}
async function cleanup() {
  async function rmdir(dir) {
    for (const item of await fsp.readdir(dir)) {
      const full = path.join(dir, item);
      (await fsp.stat(full)).isDirectory() ? await rmdir(full) : await fsp.unlink(full);
    }
    await fsp.rmdir(dir);
  }
  await rmdir(BASE_DIR);
}
async function demoReaddir() {
  console.log(chalk.yellow('── 1. fs.promises.readdir() — Quét thư mục ──'));
  const entries = await fsp.readdir(INPUT_DIR);
  console.log(chalk.white(`  Tìm thấy ${entries.length} entries:`));
  entries.forEach(e => console.log(chalk.green(`    • ${e}`)));
}
async function demoStat() {
  console.log(chalk.yellow('\n── 2. fs.promises.stat() — Phân loại file/thư mục ──'));
  const entries   = await fsp.readdir(INPUT_DIR);
  const SUPPORTED = ['.jpg','.jpeg','.png','.webp','.avif','.gif'];
  const results   = [];
  for (const entry of entries) {
    try {
      const stat  = await fsp.stat(path.join(INPUT_DIR, entry));
      const isDir = stat.isDirectory();
      const ext   = path.extname(entry).toLowerCase();
      results.push({
        'Tên':          entry,
        'Loại':         isDir ? '📁 Thư mục' : '📄 File',
        'Kích thước':   isDir ? '-' : `${(stat.size/1024).toFixed(1)} KB`,
        'Là ảnh?':      isDir ? '-' : (SUPPORTED.includes(ext) ? '✓' : '✗'),
        'Sửa lần cuối': stat.mtime.toLocaleTimeString(),
      });
    } catch (err) {
      results.push({ 'Tên': entry, 'Loại': `Lỗi: ${err.code}`, 'Kích thước': '-', 'Là ảnh?': '-', 'Sửa lần cuối': '-' });
    }
  }
  console.table(results);
  console.log(chalk.green(`  ✓ Phân loại xong: ${results.filter(r=>r['Là ảnh?']==='✓').length} ảnh hợp lệ`));
}
async function demoMkdir() {
  console.log(chalk.yellow('\n── 3. fs.promises.mkdir({ recursive: true }) ──'));
  const deepDir = path.join(OUTPUT_DIR, '2024', '01', 'resized_1920');
  try {
    await fsp.mkdir(OUTPUT_DIR);
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
  await fsp.mkdir(deepDir, { recursive: true });
  console.log(chalk.green(`  ✓ Đã tạo cấu trúc: ${deepDir}`));
  console.log(chalk.gray  ('  → recursive: true tự tạo thư mục cha, không lỗi nếu đã tồn tại'));
}
async function demoCopyFile() {
  console.log(chalk.yellow('\n── 4. fs.promises.copyFile() — Sao chép ảnh ──'));
  const entries = await fsp.readdir(INPUT_DIR);
  const images  = entries.filter(e => ['.jpg','.png','.webp'].includes(path.extname(e).toLowerCase()));
  let copied = 0, skipped = 0;
  for (const img of images) {
    const src  = path.join(INPUT_DIR, img);
    const dest = path.join(OUTPUT_DIR, path.basename(img, path.extname(img)) + '_copy' + path.extname(img));
    try {
      await fsp.copyFile(src, dest);
      const s = await fsp.stat(src);
      console.log(chalk.green(`    ✓ ${img} (${(s.size/1024).toFixed(1)} KB)`));
      copied++;
    } catch (err) {
      console.log(chalk.red(`    ✗ ${img}: ${err.code}`));
      skipped++;
    }
  }
  console.log(chalk.white(`\n  Kết quả: ${copied} sao chép thành công, ${skipped} lỗi`));
}
function demoPermissionModel() {
  console.log(chalk.yellow('\n── 5. Node.js v20+ Permission Model ──'));
  console.log(chalk.white(`  Phiên bản Node.js: ${process.version}`));
  if (process.permission) {
    console.log(chalk.green('  ✓ Permission Model đang ACTIVE'));
    console.log(chalk.white(`    fs.read  all: ${process.permission.has('fs.read')  ? chalk.green('✓'):chalk.red('✗')}`));
    console.log(chalk.white(`    fs.write all: ${process.permission.has('fs.write') ? chalk.green('✓'):chalk.red('✗')}`));
  } else {
    console.log(chalk.gray('  (Permission Model chưa kích hoạt — chạy với flag --permission)'));
  }
  console.log(chalk.yellow('\n  Cách kích hoạt:'));
  console.log(chalk.cyan(`  node --permission --allow-fs-read=* --allow-fs-write="./resized" demo09_fs_permissions.js`));
  console.table({ 'ERR_ACCESS_DENIED': 'Bị chặn bởi Permission Model', 'EACCES': 'Quyền OS không cho phép', 'EPERM': 'Not permitted (Windows)' });
}
async function main() {
  console.log(chalk.bold.cyan('\n╔═══════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║   Demo 4.3.3 — fs.promises & Permission Model            ║'));
  console.log(chalk.bold.cyan('╚═══════════════════════════════════════════════════════════╝\n'));
  await prepare();
  await demoReaddir();
  await demoStat();
  await demoMkdir();
  await demoCopyFile();
  demoPermissionModel();
  await cleanup();
  console.log(chalk.bold.cyan('\n✓ Demo 4.3.3 hoàn tất!\n'));
}
main().catch(err => { console.error(chalk.red(`\n✗ [${err.code}] ${err.message}`)); process.exit(1); });
