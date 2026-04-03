// capture-outputs.mjs
// Chạy tất cả demo scripts, lưu output sạch (không có ANSI codes) ra file JSON
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// Xóa ANSI escape codes khỏi chuỗi
function stripAnsi(str) {
  return str.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
}

const demos = [
  {
    id: 1,
    file: '01-demo-shebang-cli.js',
    args: '',
    title: 'Demo 4.1.1 — Shebang & Cấu trúc CLI'
  },
  {
    id: 2,
    file: '02-demo-process-argv.js',
    args: 'compress --input ./images --quality 80 --verbose',
    title: 'Demo 4.1.2 — process.argv thủ công'
  },
  {
    id: 3,
    file: '03-demo-commander-config.js',
    args: 'compress -i ./images -o ./output -q 80 --verbose',
    title: 'Demo 4.1.2 — commander parse config'
  },
  {
    id: 4,
    file: '04-demo-terminal-ux.js',
    args: '',
    title: 'Demo 4.1.3 — Terminal UX'
  },
  {
    id: 5,
    file: '05-demo-blocking-vs-nonblocking.js',
    args: '',
    title: 'Demo 4.2.1 — Blocking vs Non-blocking'
  },
  {
    id: 6,
    file: '06-demo-threadpool.js',
    args: '',
    title: 'Demo 4.2.2 — UV_THREADPOOL_SIZE'
  },
  {
    id: 7,
    file: '07-demo-async-await.js',
    args: '',
    title: 'Demo 4.2.3 — async/await + fs.promises'
  },
  {
    id: 8,
    file: '08-demo-path-basics.js',
    args: '',
    title: 'Demo 4.3.1 — path module cơ bản'
  },
  {
    id: 9,
    file: '09-demo-path-join-resolve.js',
    args: '',
    title: 'Demo 4.3.2 — path.join vs path.resolve'
  },
  {
    id: 10,
    file: '10-demo-fs-operations.js',
    args: '',
    title: 'Demo 4.3.3 — fs.promises thao tác tệp'
  },
];

const results = [];

for (const demo of demos) {
  const scriptPath = path.join(__dirname, demo.file);
  const code = fs.readFileSync(scriptPath, 'utf-8');

  console.log(`⏳ Chạy: ${demo.file}...`);
  let output = '';
  try {
    const cmd = `node "${scriptPath}" ${demo.args}`;
    output = execSync(cmd, {
      cwd: ROOT,
      timeout: 30000,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (e) {
    output = (e.stdout || '') + (e.stderr || '');
  }

  const cleanOutput = stripAnsi(output || '(no output)').trim();
  results.push({ ...demo, code, output: cleanOutput });
  console.log(`   ✅ Done (${cleanOutput.split('\n').length} lines output)`);
}

const outFile = path.join(__dirname, 'captured-outputs.json');
fs.writeFileSync(outFile, JSON.stringify(results, null, 2), 'utf-8');
console.log(`\n✅ Đã lưu tất cả vào: ${outFile}`);
