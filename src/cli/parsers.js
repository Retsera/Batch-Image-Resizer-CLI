/**
 * CLI Option Parsers and Validators
 * Handles parsing and validation of command-line arguments
 */

function parsePositiveInt(value, label) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n < 1) {
    throw new Error(`${label} phải là số nguyên dương`);
  }
  return n;
}

function parseQuality(value) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n < 1 || n > 100) {
    throw new Error('quality phải từ 1 đến 100');
  }
  return n;
}

function parseSizes(value) {
  if (!value || typeof value !== 'string') return [];
  const parts = value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    throw new Error('sizes không hợp lệ. Ví dụ: --sizes 800,1200,1920');
  }

  const sizes = parts.map((item) => parsePositiveInt(item, 'sizes'));
  return [...new Set(sizes)];
}

function parseTimeoutSeconds(value) {
  return parsePositiveInt(value, 'timeout');
}

module.exports = {
  parsePositiveInt,
  parseQuality,
  parseSizes,
  parseTimeoutSeconds,
};
