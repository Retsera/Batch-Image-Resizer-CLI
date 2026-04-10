/**
 * CLI UI Helpers - Icons, Formatting, Summary Table, and Progress Bar utilities
 */

/** Ký hiệu output (demo / báo cáo) */
const ICON = {
  ok: '✓',
  fail: '✕',
  bolt: '⚡',
  warn: '⚠',
  dot: '·',
  info: 'ℹ',
};

function formatBytes(num) {
  return `${Number(num || 0).toLocaleString('en-US')} B`;
}

/**
 * Hiển thị dung lượng ngắn gọn (progress bar / tóm tắt).
 */
function formatBytesHuman(num, decimals = 1) {
  const n = Number(num) || 0;
  if (n < 1024) return `${Math.round(n)} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n;
  let i = -1;
  do {
    v /= 1024;
    i += 1;
  } while (v >= 1024 && i < units.length - 1);
  return `${v.toFixed(decimals)} ${units[i]}`;
}

function calcReduction(before, after) {
  if (!before || before <= 0) return '0.00%';
  const ratio = ((before - after) / before) * 100;
  return `${ratio.toFixed(2)}%`;
}

function printSummaryTable(chalk, summary) {
  const { ok, fail, skippedTasks, inputBytes, outputBytes, taskCount } = summary;
  const savedPct =
    inputBytes > 0
      ? (((inputBytes - outputBytes) / inputBytes) * 100).toFixed(2)
      : '0.00';

  console.log(
    chalk.bold.magenta(
      '\n╔══════════════════════════════════════════════════════════╗'
    )
  );
  console.log(
    chalk.bold.magenta('║') +
      chalk.bold.white('  ⚡ TÓM TẮT KẾT QUẢ ') +
      chalk.bold.magenta('                                      ║')
  );
  console.log(
    chalk.bold.magenta(
      '╠══════════════════════════════════════════════════════════╣'
    )
  );
  console.log(
    chalk.bold.magenta('║') +
      `  ${chalk.green('✓')} Thành công: ${chalk.white.bold(String(ok).padStart(6))} task                          ${chalk.bold.magenta('║')}`
  );
  console.log(
    chalk.bold.magenta('║') +
      `  ${chalk.red('✕')} Thất bại:   ${chalk.white.bold(String(fail).padStart(6))} task                          ${chalk.bold.magenta('║')}`
  );
  if (skippedTasks > 0) {
    console.log(
      chalk.bold.magenta('║') +
        `  ${chalk.yellow('…')} Bỏ qua:     ${chalk.white.bold(String(skippedTasks).padStart(6))} task (file đích đã có)     ${chalk.bold.magenta('║')}`
    );
  }
  console.log(
    chalk.bold.magenta('║') +
      `  ${chalk.cyan('⚡')} Dung lượng đầu vào (tổng):  ${chalk.white.bold(formatBytesHuman(inputBytes).padStart(10))}                 ${chalk.bold.magenta('║')}`
  );
  console.log(
    chalk.bold.magenta('║') +
      `  ${chalk.cyan('⚡')} Dung lượng đầu ra (đã ghi): ${chalk.white.bold(formatBytesHuman(outputBytes).padStart(10))}                 ${chalk.bold.magenta('║')}`
  );
  console.log(
    chalk.bold.magenta('║') +
      `  ${chalk.blue('▼')} Ước lượng giảm dung lượng:   ${chalk.white.bold((savedPct + '%').padStart(10))}                 ${chalk.bold.magenta('║')}`
  );
  console.log(
    chalk.bold.magenta('║') +
      `  ${chalk.gray('○')} Tổng task đã chạy:         ${chalk.white.bold(String(taskCount).padStart(6))}                          ${chalk.bold.magenta('║')}`
  );
  console.log(
    chalk.bold.magenta(
      '╚══════════════════════════════════════════════════════════╝'
    )
  );
}

module.exports = {
  ICON,
  formatBytes,
  formatBytesHuman,
  calcReduction,
  printSummaryTable,
};
