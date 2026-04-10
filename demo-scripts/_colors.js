/**
 * _colors.js — ANSI color helper (CommonJS, không cần chalk)
 * Thay thế chalk cho các file demo CommonJS khi chalk v5 là ESM-only.
 */
'use strict';

const ANSI = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  // Foreground colors
  black:   '\x1b[30m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
  gray:    '\x1b[90m',
  // Bright
  greenBright:   '\x1b[92m',
  // Background
  bgBlack: '\x1b[40m',
};

function wrap(codes, text) {
  const open  = codes.map(c => ANSI[c] || '').join('');
  return `${open}${text}${ANSI.reset}`;
}

/**
 * Tạo một chain-able color object tương tự chalk API cơ bản.
 * Ví dụ: c.red('hello'), c.bold.cyan('world'), c.bgBlack.greenBright('!')
 */
function makeChain(appliedCodes = []) {
  const fn = (text) => wrap(appliedCodes, String(text));

  // Gắn tất cả màu/style thành getter để chain
  const colorKeys = Object.keys(ANSI).filter(k => k !== 'reset');
  for (const key of colorKeys) {
    Object.defineProperty(fn, key, {
      get() { return makeChain([...appliedCodes, key]); },
      enumerable: true,
    });
  }

  return fn;
}

const c = makeChain();

// Expose dạng tương tự chalk API
const chalk = new Proxy(c, {
  get(target, prop) {
    if (prop in target) return target[prop];
    return makeChain([prop]);
  },
});

module.exports = chalk;
