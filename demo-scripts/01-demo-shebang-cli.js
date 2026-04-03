#!/usr/bin/env node
// =============================================================
// DEMO 4.1.1 — Shebang & Cấu trúc CLI cơ bản trong Node.js
// Minh họa: dòng shebang, thông tin môi trường tiến trình,
//           và cách khai báo bin trong package.json
// Chạy:  node 01-demo-shebang-cli.js
// =============================================================

// ── 1. Thông tin môi trường runtime ──────────────────────────
console.log('╔══════════════════════════════════════════════╗');
console.log('║   Node.js CLI — Shebang & Entry Point Demo   ║');
console.log('╚══════════════════════════════════════════════╝\n');

console.log('📌 Thông tin tiến trình Node.js:');
console.log('   Node version  :', process.version);
console.log('   Platform      :', process.platform);
console.log('   Architecture  :', process.arch);
console.log('   PID           :', process.pid);

// ── 2. Thông tin về file thực thi ────────────────────────────
console.log('\n📂 Đường dẫn thực thi:');
console.log('   process.execPath :', process.execPath);
//    → Đường dẫn tới tệp nhị phân node.exe
console.log('   process.argv[1]  :', process.argv[1]);
//    → Đường dẫn tới script JS đang chạy (Entry Point)

// ── 3. Mô phỏng cấu trúc package.json → bin ──────────────────
console.log('\n📦 Cấu trúc package.json cần khai báo để dùng shebang:');
const packageJsonExample = {
  name: 'image-resizer-cli',
  version: '1.0.0',
  bin: {
    'resize-img': './src/index.js',
    //  └─ Sau npm install -g, gõ "resize-img" sẽ gọi file này
  },
  type: 'module',
};
console.log(JSON.stringify(packageJsonExample, null, 2));

// ── 4. Giải thích cơ chế shebang ──────────────────────────────
console.log('\n🔍 Cơ chế Shebang:');
console.log('   Dòng đầu file:  #!/usr/bin/env node');
console.log('   → OS đọc #! và gọi: /usr/bin/env node <file>');
console.log('   → env tìm "node" trong biến $PATH → thực thi');
console.log('   → Trên Windows: npm tạo file .cmd thay thế\n');

console.log('✅ Script thực thi thành công qua Node.js runtime!');
