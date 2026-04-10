#!/usr/bin/env node
'use strict';
const fs   = require('fs');
const fsp  = require('fs').promises;
const path = require('path');
const chalk = require('./_colors');
const DEMO_DIR  = path.join(__dirname, '.tmp_blocking_demo');
const NUM_FILES = 20;
async function prepare() {
  await fsp.mkdir(DEMO_DIR, { recursive: true });
  const content = 'x'.repeat(10 * 1024);
  await Promise.all(
    Array.from({ length: NUM_FILES }, (_, i) =>
      fsp.writeFile(path.join(DEMO_DIR, `img_${i}.txt`), content)
    )
  );
}
async function cleanup() {
  const files = await fsp.readdir(DEMO_DIR);
  await Promise.all(files.map(f => fsp.unlink(path.join(DEMO_DIR, f))));
  await fsp.rmdir(DEMO_DIR);
}
function runBlocking() {
  const files = fs.readdirSync(DEMO_DIR);
  const start = Date.now();
  const results = [];
  for (const file of files) {
    const data = fs.readFileSync(path.join(DEMO_DIR, file));
    results.push(data.length);
  }
  return { elapsed: Date.now() - start, count: results.length, totalBytes: results.reduce((a,b) => a+b, 0) };
}
async function runNonBlocking() {
  const files = await fsp.readdir(DEMO_DIR);
  const start = Date.now();
  const buffers = await Promise.all(files.map(f => fsp.readFile(path.join(DEMO_DIR, f))));
  return { elapsed: Date.now() - start, count: buffers.length, totalBytes: buffers.reduce((a,b) => a+b.length, 0) };
}
async function main() {
  console.log(chalk.bold.cyan('\n╔══════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║  Demo 4.2.1 — Blocking vs Non-blocking I/O      ║'));
  console.log(chalk.bold.cyan('╚══════════════════════════════════════════════════╝\n'));
  console.log(chalk.gray(`  Chuẩn bị ${NUM_FILES} file giả (~10KB mỗi file)...`));
  await prepare();
  console.log(chalk.green('  ✓ Đã tạo xong các file test.\n'));
  console.log(chalk.yellow('── MÔ HÌNH 1: BLOCKING (fs.readFileSync trong vòng lặp) ──'));
  console.log(chalk.gray('  Lý thuyết: Luồng V8 bị ĐÓNG BĂNG mỗi lần readFileSync()\n'));
  const r1 = runBlocking();
  console.log(chalk.white(`  Đọc: ${r1.count} files | Tổng: ${(r1.totalBytes/1024).toFixed(1)} KB`));
  console.log(chalk.red(`  ⏱ Thời gian BLOCKING: ${r1.elapsed} ms`));
  console.log(chalk.yellow('\n── MÔ HÌNH 2: NON-BLOCKING (Promise.all + fs.promises) ──'));
  console.log(chalk.gray('  Lý thuyết: Gửi TẤT CẢ yêu cầu I/O cùng lúc — Libuv xử lý song song\n'));
  const r2 = await runNonBlocking();
  console.log(chalk.white(`  Đọc: ${r2.count} files | Tổng: ${(r2.totalBytes/1024).toFixed(1)} KB`));
  console.log(chalk.green(`  ⏱ Thời gian NON-BLOCKING: ${r2.elapsed} ms`));
  console.log(chalk.yellow('\n── KẾT QUẢ SO SÁNH ──'));
  const diff  = r1.elapsed - r2.elapsed;
  const ratio = r1.elapsed > 0 ? (r1.elapsed / Math.max(r2.elapsed, 1)).toFixed(1) : '∞';
  console.table({
    'Mô hình':        { Blocking: 'fs.readFileSync (loop)', NonBlocking: 'Promise.all + readFile' },
    'Thời gian (ms)': { Blocking: r1.elapsed,               NonBlocking: r2.elapsed              },
    'Số file':        { Blocking: r1.count,                  NonBlocking: r2.count                },
  });
  if (r2.elapsed < r1.elapsed) {
    console.log(chalk.green(`\n  ✓ Non-blocking nhanh hơn ${diff}ms (${ratio}x) so với Blocking!`));
  } else {
    console.log(chalk.gray('\n  (Tăng NUM_FILES để thấy chênh lệch rõ hơn)'));
  }
  console.log(chalk.yellow('\n── GHI CHÚ KIẾN TRÚC ──'));
  console.log(chalk.white('  Blocking:     O(n) nối tiếp → thời gian tỉ lệ với số file'));
  console.log(chalk.white('  Non-Blocking: O(1) vì I/O song song trong Libuv Thread Pool'));
  await cleanup();
  console.log(chalk.bold.cyan('\n✓ Demo 4.2.1 hoàn tất!\n'));
}
main().catch(err => { console.error(chalk.red('✗ ' + err.message)); process.exit(1); });
