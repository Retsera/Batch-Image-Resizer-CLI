#!/usr/bin/env node
'use strict';
const os   = require('os');
const fsp  = require('fs').promises;
const path = require('path');
const chalk = require('./_colors');
const DEMO_DIR  = path.join(__dirname, '.tmp_threadpool_demo');
const NUM_FILES = 16;
const delay = (ms) => new Promise(r => setTimeout(r, ms));
async function prepare() {
  await fsp.mkdir(DEMO_DIR, { recursive: true });
  await Promise.all(
    Array.from({ length: NUM_FILES }, (_, i) =>
      fsp.writeFile(path.join(DEMO_DIR, `img_${String(i).padStart(3,'0')}.bin`), Buffer.alloc(50*1024, i%256))
    )
  );
}
async function cleanup() {
  const files = await fsp.readdir(DEMO_DIR);
  await Promise.all(files.map(f => fsp.unlink(path.join(DEMO_DIR, f))));
  await fsp.rmdir(DEMO_DIR);
}
function demonstrateEventLoopPhases() {
  console.log(chalk.yellow('\n── 1. Event Loop — Thứ tự thực thi ──'));
  console.log(chalk.gray('  Quan sát: synchronous → microtask → macrotask\n'));
  console.log(chalk.white('  [A] CODE ĐỒNG BỘ — thực thi NGAY'));
  Promise.resolve().then(() => console.log(chalk.green  ('  [C] MICROTASK (Promise.then) — sau sync, TRƯỚC macrotask')));
  queueMicrotask(()     =>  console.log(chalk.green  ('  [D] MICROTASK (queueMicrotask) — cùng hàng đợi Promise')));
  setImmediate(()       =>  console.log(chalk.blue   ('  [E] MACROTASK (setImmediate) — phase "check" của Event Loop')));
  setTimeout(()         =>  console.log(chalk.blue   ('  [F] MACROTASK (setTimeout 0) — phase "timers" của Event Loop')), 0);
  console.log(chalk.white('  [B] CODE ĐỒNG BỘ — vẫn thực thi TRƯỚC promise'));
}
async function demonstrateThreadPool() {
  console.log(chalk.yellow('\n── 2. Libuv Thread Pool (UV_THREADPOOL_SIZE) ──'));
  const cpuCount      = os.cpus().length;
  const threadPoolSize = parseInt(process.env.UV_THREADPOOL_SIZE || '4', 10);
  console.log(chalk.white(`  CPU logic trên máy này:      ${chalk.green(cpuCount)} lõi`));
  console.log(chalk.white(`  UV_THREADPOOL_SIZE hiện tại: ${chalk.green(threadPoolSize)} thread`));
  if (threadPoolSize < cpuCount) {
    console.log(chalk.yellow(`  ⚠ Khuyến nghị: đặt UV_THREADPOOL_SIZE=${cpuCount}`));
    console.log(chalk.gray  (`    PowerShell: $env:UV_THREADPOOL_SIZE=${cpuCount}`));
  } else {
    console.log(chalk.green ('  ✓ Thread Pool đã tối ưu cho CPU này.'));
  }
  console.log(chalk.gray(`\n  Chạy ${NUM_FILES} fs.promises.stat() đồng thời...`));
  const files = await fsp.readdir(DEMO_DIR);
  const start = Date.now();
  const stats = await Promise.all(files.map(f => fsp.stat(path.join(DEMO_DIR, f))));
  const elapsed   = Date.now() - start;
  const totalBytes = stats.reduce((sum, s) => sum + s.size, 0);
  console.log(chalk.white(`\n  Kết quả: ${stats.length} files | Tổng ${(totalBytes/1024).toFixed(0)} KB`));
  console.log(chalk.green(`  ⏱ ${NUM_FILES} stat() đồng thời: ${elapsed}ms`));
  console.log(chalk.gray (`  → Libuv dùng tối đa ${threadPoolSize} thread để xử lý song song.`));
  console.log(chalk.yellow('\n── 3. Lấy số CPU để cấu hình tối ưu ──'));
  const cpus = os.cpus();
  console.log(chalk.white(`  os.cpus().length = ${chalk.cyan(cpus.length)} logical cores`));
  console.log(chalk.white(`  Model: ${chalk.gray(cpus[0].model)}`));
  console.log(chalk.white(`  Speed: ${chalk.gray(cpus[0].speed + ' MHz')}`));
  console.log(chalk.green ('\n  Cấu hình lý tưởng:'));
  console.log(chalk.cyan  ('    process.env.UV_THREADPOOL_SIZE = String(os.cpus().length);'));
  console.log(chalk.gray  ('    // Đặt TRƯỚC khi import bất kỳ module fs nào'));
}
async function main() {
  console.log(chalk.bold.cyan('\n╔══════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║   Demo 4.2.2 — Event Loop & Libuv Thread Pool       ║'));
  console.log(chalk.bold.cyan('╚══════════════════════════════════════════════════════╝'));
  demonstrateEventLoopPhases();
  await delay(50);
  await prepare();
  await demonstrateThreadPool();
  await cleanup();
  console.log(chalk.bold.cyan('\n✓ Demo 4.2.2 hoàn tất!\n'));
}
main().catch(err => { console.error(chalk.red('✗ ' + err.message)); process.exit(1); });
