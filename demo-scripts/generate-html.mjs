#!/usr/bin/env node
// generate-html.mjs — Tạo file HTML styled cho việc chụp ảnh
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'captured-outputs.json'), 'utf-8'));

// Syntax highlighting đúng thứ tự: escape HTML trước, rồi mới áp dụng regex
function highlightJS(rawCode) {
  // Bước 1: escape HTML entities
  let code = rawCode
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bước 2: áp dụng regex highlight TRÊN TEXT ĐÃ ESCAPE
  // Comments (phải làm trước để tránh conflict)
  code = code.replace(/(\/\/[^\n]*)/g, '<span class="c">$1</span>');
  // Template literals
  code = code.replace(/(`[^`\n]*`)/g, '<span class="t">$1</span>');
  // Single-quoted strings
  code = code.replace(/('(?:[^'\\]|\\.)*')/g, '<span class="s">$1</span>');
  // Double-quoted strings
  code = code.replace(/(&quot;(?:[^&]|&(?!quot;))*&quot;)/g, '<span class="s">$1</span>');
  // Keywords
  code = code.replace(/\b(import|export|from|const|let|var|function|async|await|return|if|else|for|of|in|new|throw|try|catch|finally|true|false|null|undefined|class|extends|this|process|console)\b/g,
    '<span class="k">$1</span>');
  // Numbers
  code = code.replace(/\b(\d+\.?\d*)\b/g, '<span class="n">$1</span>');
  // Function calls
  code = code.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g, '<span class="f">$1</span>(');

  return code;
}


function escapeHTML(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const sections = data.map((demo, i) => `
  <!-- ========== DEMO ${demo.id} ========== -->
  <div class="section" id="demo-${demo.id}">
    <div class="section-header">
      <span class="section-num">${String(demo.id).padStart(2, '0')}</span>
      <span class="section-title">${demo.title}</span>
      <span class="section-file">${demo.file}</span>
    </div>

    <!-- Code snippet -->
    <div class="panel code-panel" id="code-${demo.id}">
      <div class="panel-label">
        <span class="dot dot-red"></span>
        <span class="dot dot-yellow"></span>
        <span class="dot dot-green"></span>
        <span class="panel-title">📄 ${demo.file}</span>
      </div>
      <pre class="code-content"><code>${highlightJS(demo.code)}</code></pre>
    </div>

    <!-- Terminal output -->
    <div class="panel terminal-panel" id="terminal-${demo.id}">
      <div class="panel-label terminal-label">
        <span class="dot dot-red"></span>
        <span class="dot dot-yellow"></span>
        <span class="dot dot-green"></span>
        <span class="panel-title">🖥️ Terminal — node ${demo.file} ${demo.args}</span>
      </div>
      <pre class="terminal-content"><code>${escapeHTML(demo.output)}</code></pre>
    </div>
  </div>
`).join('\n');

const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Node.js CLI Chương 4 — Demo Scripts</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Segoe UI', system-ui, sans-serif;
    background: #ffffff;
    color: #1a1a2e;
    padding: 32px;
  }

  .page-title {
    font-size: 22px;
    font-weight: 700;
    color: #0f3460;
    border-bottom: 3px solid #0f3460;
    padding-bottom: 12px;
    margin-bottom: 36px;
    letter-spacing: 0.3px;
  }

  .section {
    margin-bottom: 56px;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
    padding: 10px 16px;
    background: #f0f4ff;
    border-left: 4px solid #0f3460;
    border-radius: 4px;
  }

  .section-num {
    font-size: 20px;
    font-weight: 800;
    color: #0f3460;
    min-width: 32px;
  }

  .section-title {
    font-size: 15px;
    font-weight: 600;
    color: #0f3460;
    flex: 1;
  }

  .section-file {
    font-size: 12px;
    color: #6b7280;
    font-family: 'Consolas', monospace;
    background: #e5e7eb;
    padding: 2px 8px;
    border-radius: 4px;
  }

  /* ── Panel (code & terminal) ── */
  .panel {
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 16px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    background: #ffffff;
  }

  .panel-label {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 9px 14px;
    background: #f1f5f9;
    border-bottom: 1px solid #e2e8f0;
  }

  .terminal-label {
    background: #1e293b;
    border-bottom: 1px solid #334155;
  }

  .dot {
    width: 12px; height: 12px;
    border-radius: 50%;
    display: inline-block;
  }
  .dot-red    { background: #ef4444; }
  .dot-yellow { background: #f59e0b; }
  .dot-green  { background: #22c55e; }

  .panel-title {
    font-size: 12.5px;
    font-weight: 600;
    margin-left: 6px;
    color: #374151;
    font-family: 'Consolas', monospace;
  }

  .terminal-label .panel-title { color: #94a3b8; }

  /* ── Code panel ── */
  .code-content {
    margin: 0;
    padding: 16px 20px;
    background: #fafafa;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.6;
    overflow-x: auto;
    white-space: pre;
    color: #1e293b;
  }

  /* Syntax colors */
  .k  { color: #7c3aed; font-weight: 600; }  /* keywords */
  .s  { color: #16a34a; }                     /* strings quotes */
  .t  { color: #b45309; }                     /* template literals */
  .c  { color: #6b7280; font-style: italic; } /* comments */
  .n  { color: #0284c7; }                     /* numbers */
  .f  { color: #0369a1; }                     /* function names */

  /* ── Terminal panel ── */
  .terminal-content {
    margin: 0;
    padding: 16px 20px;
    background: #0f172a;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.65;
    overflow-x: auto;
    white-space: pre;
    color: #e2e8f0;
  }

  /* Line numbers for code */
  .code-content code {
    counter-reset: line;
  }

  /* Horizontal divider */
  .divider {
    border: none;
    border-top: 1px dashed #cbd5e1;
    margin: 40px 0;
  }
</style>
</head>
<body>
<h1 class="page-title">Node.js CLI — Chương 4: Demo Scripts (Code Snippet + Terminal Output)</h1>

${sections}

</body>
</html>`;

const outPath = path.join(__dirname, 'demo-viewer.html');
fs.writeFileSync(outPath, html, 'utf-8');
console.log(`✅ HTML đã tạo: ${outPath}`);
console.log(`   Mở file trong browser để xem và chụp ảnh.`);
