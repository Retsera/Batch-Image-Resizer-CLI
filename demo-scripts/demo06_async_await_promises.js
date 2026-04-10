#!/usr/bin/env node
'use strict';
const fsp  = require('fs').promises;
const path = require('path');
const chalk = require('./_colors');
const BASE_DIR    = path.join(__dirname, '.tmp_async_demo');
const INPUT_DIR   = path.join(BASE_DIR, 'input');
const OUTPUT_DIR  = path.join(BASE_DIR, 'output');
const SAMPLE_FILE = path.join(INPUT_DIR, 'sample_image.jpg');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'sample_image_resized.jpg');
function demonstrateCallbackHell() {
  console.log(chalk.yellow('── PHẦN A: Callback Hell (Pyramid of Doom) ──'));
  const code = `
  fs.access(inputDir, (err1) => {
    if (err1) return console.error('Không tìm thấy thư mục!');
    fs.mkdir(outputDir, { recursive: true }, (err2) => {
      if (err2) return console.error('Không tạo được output!');
      fs.readFile(filePath, (err3, data) => {
        if (err3) return console.error('Không đọc được file!');
        fs.writeFile(outPath, data, (err4) => {
          if (err4) return console.error('Không ghi được file!');
          console.log('Hoàn tất!');
        });
      });
    });
  });`;
  console.log(chalk.red(code.split('\n').map(l => '  ' + l).join('\n')));
  console.log(chalk.red('\n  ✗ Vấn đề: Khó đọc, khó bắt lỗi, dễ rò rỉ bộ nhớ!\n'));
}
function demonstratePromiseChain() {
  console.log(chalk.yellow('── PHẦN B: Promise Chain (.then / .catch) ──'));
  const code = `
  fsp.access(inputDir)
    .then(() => fsp.mkdir(outputDir, { recursive: true }))
    .then(() => fsp.readFile(filePath))
    .then(data => fsp.writeFile(outPath, data))
    .then(() => console.log('Hoàn tất!'))
    .catch(err => console.error('Lỗi:', err.message));`;
  console.log(chalk.blue(code.split('\n').map(l => '  ' + l).join('\n')));
  console.log(chalk.blue('\n  ✓ Tốt hơn: Tuyến tính, một catch duy nhất\n'));
}
async function demonstrateAsyncAwait() {
  console.log(chalk.yellow('── PHẦN C: Async/Await — Thực thi thực tế ──'));
  console.log(chalk.white('  [1] Kiểm tra thư mục input...'));
  try {
    await fsp.access(INPUT_DIR);
    console.log(chalk.green('      ✓ Thư mục input đã tồn tại.'));
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(chalk.yellow('      ⚠ Không tìm thấy → tạo mới...'));
      await fsp.mkdir(INPUT_DIR, { recursive: true });
      console.log(chalk.green('      ✓ Đã tạo thư mục input.'));
    } else throw err;
  }
  console.log(chalk.white('\n  [2] Tạo thư mục output...'));
  try {
    await fsp.mkdir(OUTPUT_DIR, { recursive: true });
    console.log(chalk.green('      ✓ Thư mục output đã sẵn sàng.'));
  } catch (err) {
    if (err.code === 'EEXIST') console.log(chalk.gray('      (Đã tồn tại — bỏ qua)'));
    else throw err;
  }
  console.log(chalk.white('\n  [3] Ghi file ảnh mẫu vào input...'));
  await fsp.writeFile(SAMPLE_FILE, Buffer.from('FAKE_JPEG_DATA:' + 'x'.repeat(1024)));
  console.log(chalk.green(`      ✓ Đã ghi: ${SAMPLE_FILE}`));
  console.log(chalk.white('\n  [4] Đọc file và xử lý...'));
  const start   = Date.now();
  const rawData = await fsp.readFile(SAMPLE_FILE);
  const processed = Buffer.from('[PROCESSED]:' + rawData.toString('utf8', 0, 20) + '...');
  console.log(chalk.green(`      ✓ Đọc ${rawData.length} bytes trong ${Date.now()-start}ms`));
  console.log(chalk.white('\n  [5] Ghi kết quả ra output...'));
  await fsp.writeFile(OUTPUT_FILE, processed);
  const stat = await fsp.stat(OUTPUT_FILE);
  console.log(chalk.green(`      ✓ Đã lưu ${stat.size} bytes | ${stat.birthtime.toLocaleTimeString()}`));
  console.log(chalk.white('\n  [6] Dọn dẹp file tạm...'));
  await fsp.unlink(SAMPLE_FILE);
  await fsp.unlink(OUTPUT_FILE);
  await fsp.rmdir(OUTPUT_DIR);
  await fsp.rmdir(INPUT_DIR);
  await fsp.rmdir(BASE_DIR);
  console.log(chalk.green('      ✓ Đã xóa thư mục tạm.\n'));
}
function demonstrateErrorHandling() {
  console.log(chalk.yellow('── PHẦN D: Các mã lỗi fs phổ biến ──'));
  console.table({
    'ENOENT':    'No ENTry — file/thư mục không tồn tại',
    'EEXIST':    'EXISTing — đã tồn tại',
    'EACCES':    'ACCESs denied — không có quyền',
    'EISDIR':    'IS DIRectory — đọc thư mục như file',
    'ENOTDIR':   'NOT DIRectory — mở file như thư mục',
    'ENOTEMPTY': 'NOT EMPTY — xóa thư mục còn nội dung',
  });
  console.log(chalk.cyan(`
  try {
    const data = await fsp.readFile(filePath);
  } catch (err) {
    if (err.code === 'ENOENT') { /* File không tồn tại */ }
    if (err.code === 'EACCES') { /* Không có quyền    */ }
    else throw err;
  }`));
}
async function main() {
  console.log(chalk.bold.cyan('\n╔═══════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║   Demo 4.2.3 — Promises & Async/Await trong Node.js  ║'));
  console.log(chalk.bold.cyan('╚═══════════════════════════════════════════════════════╝\n'));
  demonstrateCallbackHell();
  demonstratePromiseChain();
  await demonstrateAsyncAwait();
  demonstrateErrorHandling();
  console.log(chalk.bold.cyan('\n✓ Demo 4.2.3 hoàn tất!\n'));
}
main().catch(err => { console.error(chalk.red(`\n✗ [${err.code}] ${err.message}`)); process.exit(1); });
