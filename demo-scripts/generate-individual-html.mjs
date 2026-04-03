// generate-individual-html.mjs
// Tạo 20 file HTML riêng lẻ — mỗi file 1 panel (code hoặc terminal)
// Dễ chụp screenshot mà không cần scroll
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'captured-outputs.json'), 'utf-8'));
const OUT = path.join(__dirname, 'panels');
fs.mkdirSync(OUT, { recursive: true });

function escapeHTML(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Tô màu syntax đơn giản cho code (chạy sau escape)
function colorize(escaped) {
  let s = escaped;
  // Strings đơn (sau escape: &#x27; hoặc ')
  s = s.replace(/(&#x27;[^<]*?&#x27;)/g, '<span style="color:#16a34a">$1</span>');
  s = s.replace(/('(?:[^'\\<]|\\.)*')/g,   '<span style="color:#16a34a">$1</span>');
  // Comment
  s = s.replace(/(\/\/[^\n]*)/g, '<span style="color:#6b7280;font-style:italic">$1</span>');
  // Keywords
  s = s.replace(/\b(import|export|from|const|let|var|function|async|await|return|if|else|for|of|in|new|throw|try|catch|finally|true|false|null|undefined|class|extends|this|process|console)\b/g,
    '<span style="color:#7c3aed;font-weight:600">$1</span>');
  // Numbers
  s = s.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#0284c7">$1</span>');
  return s;
}

for (const demo of data) {
  const codeLine = `node ${demo.file}${demo.args ? ' ' + demo.args : ''}`;
  const codeEscaped = colorize(escapeHTML(demo.code));
  const outputEscaped = escapeHTML(demo.output);

  // ── CODE panel ─────────────────────────────────────────────────
  const codeHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Code ${demo.id}: ${demo.title}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#ffffff; padding:20px; font-family:'Segoe UI',sans-serif; }
  .header {
    display:flex; align-items:center; gap:10px;
    padding:8px 14px; background:#f0f4ff;
    border-left:4px solid #0f3460; border-radius:4px; margin-bottom:12px;
  }
  .num { font-size:18px; font-weight:800; color:#0f3460; }
  .title { font-size:13px; font-weight:600; color:#0f3460; flex:1; }
  .ffile { font-size:11px; color:#6b7280; font-family:monospace;
           background:#e5e7eb; padding:2px 6px; border-radius:3px; }
  .panel { border-radius:8px; overflow:hidden;
           border:1px solid #e2e8f0; box-shadow:0 2px 8px rgba(0,0,0,.06); }
  .bar { display:flex; align-items:center; gap:6px;
         padding:8px 14px; background:#f1f5f9; border-bottom:1px solid #e2e8f0; }
  .dot { width:11px; height:11px; border-radius:50%; }
  .dr { background:#ef4444; } .dy { background:#f59e0b; } .dg { background:#22c55e; }
  .bname { font-size:12px; font-weight:600; color:#374151;
           font-family:monospace; margin-left:6px; }
  pre { margin:0; padding:16px 18px; background:#fafafa;
        font-family:Consolas,'Courier New',monospace; font-size:12.5px;
        line-height:1.65; overflow-x:auto; white-space:pre; color:#1e293b; }
</style>
</head>
<body>
  <div class="header">
    <span class="num">${String(demo.id).padStart(2,'0')}</span>
    <span class="title">${escapeHTML(demo.title)}</span>
    <span class="ffile">${demo.file}</span>
  </div>
  <div class="panel">
    <div class="bar">
      <span class="dot dr"></span><span class="dot dy"></span><span class="dot dg"></span>
      <span class="bname">📄 ${demo.file}</span>
    </div>
    <pre>${codeEscaped}</pre>
  </div>
</body></html>`;

  fs.writeFileSync(path.join(OUT, `code-${String(demo.id).padStart(2,'0')}.html`), codeHtml);

  // ── TERMINAL panel ──────────────────────────────────────────────
  const termHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Terminal ${demo.id}: ${demo.title}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#ffffff; padding:20px; font-family:'Segoe UI',sans-serif; }
  .header {
    display:flex; align-items:center; gap:10px;
    padding:8px 14px; background:#f0f4ff;
    border-left:4px solid #0f3460; border-radius:4px; margin-bottom:12px;
  }
  .num { font-size:18px; font-weight:800; color:#0f3460; }
  .title { font-size:13px; font-weight:600; color:#0f3460; flex:1; }
  .cmd  { font-size:11px; color:#6b7280; font-family:monospace;
          background:#e5e7eb; padding:2px 6px; border-radius:3px; }
  .panel { border-radius:8px; overflow:hidden;
           border:1px solid #334155; box-shadow:0 2px 12px rgba(0,0,0,.15); }
  .bar { display:flex; align-items:center; gap:6px;
         padding:8px 14px; background:#1e293b; border-bottom:1px solid #334155; }
  .dot { width:11px; height:11px; border-radius:50%; }
  .dr { background:#ef4444; } .dy { background:#f59e0b; } .dg { background:#22c55e; }
  .bname { font-size:11.5px; font-weight:600; color:#94a3b8;
           font-family:monospace; margin-left:6px; }
  pre { margin:0; padding:16px 18px; background:#0f172a;
        font-family:Consolas,'Courier New',monospace; font-size:12.5px;
        line-height:1.7; overflow-x:auto; white-space:pre; color:#e2e8f0; }
</style>
</head>
<body>
  <div class="header">
    <span class="num">${String(demo.id).padStart(2,'0')}</span>
    <span class="title">${escapeHTML(demo.title)}</span>
    <span class="cmd">$ node ${demo.file}${demo.args ? ' ' + escapeHTML(demo.args) : ''}</span>
  </div>
  <div class="panel">
    <div class="bar">
      <span class="dot dr"></span><span class="dot dy"></span><span class="dot dg"></span>
      <span class="bname">🖥️ Terminal Output — node ${escapeHTML(demo.file)}${demo.args ? ' ' + escapeHTML(demo.args) : ''}</span>
    </div>
    <pre>${outputEscaped}</pre>
  </div>
</body></html>`;

  fs.writeFileSync(path.join(OUT, `terminal-${String(demo.id).padStart(2,'0')}.html`), termHtml);
}

console.log(`✅ Đã tạo ${data.length * 2} file HTML trong: ${OUT}`);
console.log('   Files: code-01.html ... code-10.html, terminal-01.html ... terminal-10.html');
