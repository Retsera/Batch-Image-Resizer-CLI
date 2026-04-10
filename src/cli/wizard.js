/**
 * Interactive CLI Wizard
 * Handles user input prompts and configuration collection
 */

const path = require('path');
const fs = require('fs').promises;
const { parsePositiveInt, parseQuality, parseSizes } = require('./parsers');

async function runInteractiveWizard(ctx) {
  const { inquirer, chalk, numCPUs: cpus } = ctx;
  const defaultWorkers = Math.max(1, cpus - 1);

  console.log(
    chalk.cyan.bold('\n  ╔════════════════════════════════════════════════════════╗')
  );
  console.log(
    chalk.cyan.bold('  ║') +
      chalk.white.bold('     resize-cli — Batch Image Resizer (Interactive)     ') +
      chalk.cyan.bold('║')
  );
  console.log(
    chalk.cyan.bold('  ╚════════════════════════════════════════════════════════╝\n')
  );

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'input',
      message: `${chalk.green('?')} Thư mục chứa ảnh nguồn:`,
      default: './images',
      filter: (v) => String(v ?? '').trim(),
      validate: async (inputPath) => {
        const resolved = path.resolve(inputPath || '');
        try {
          const st = await fs.stat(resolved);
          if (!st.isDirectory()) return '✕ Đường dẫn phải là thư mục';
          await fs.access(resolved, fs.constants.R_OK);
          return true;
        } catch {
          return '✕ Thư mục không tồn tại hoặc không đọc được';
        }
      },
    },
    {
      type: 'input',
      name: 'output',
      message: `${chalk.green('?')} Thư mục ghi ảnh đã resize:`,
      default: './resized',
      filter: (v) => String(v ?? '').trim(),
      validate: async (outputPath) => {
        const p = path.resolve(outputPath || './resized');
        const parent = path.dirname(p);
        try {
          await fs.mkdir(parent, { recursive: true });
          await fs.access(parent, fs.constants.W_OK);
          return true;
        } catch {
          return '✕ Không tạo/ghi được thư mục đích (kiểm tra quyền)';
        }
      },
    },
    {
      type: 'list',
      name: 'widthMode',
      message: `${chalk.green('?')} Chiều rộng resize:`,
      choices: [
        { name: 'Một kích thước (width)', value: 'single' },
        { name: 'Nhiều kích thước (sizes)', value: 'multiple' },
      ],
      default: 'single',
    },
    {
      type: 'input',
      name: 'width',
      message: `${chalk.green('?')} Chiều rộng đích (pixel, số nguyên > 0):`,
      default: '1024',
      when: (a) => a.widthMode === 'single',
      filter: (v) => String(v ?? '').trim(),
      validate: (v) => {
        try {
          parsePositiveInt(String(v).trim(), 'width');
          return true;
        } catch (e) {
          return e.message;
        }
      },
    },
    {
      type: 'input',
      name: 'sizesString',
      message: `${chalk.green('?')} Danh sách chiều rộng (phẩy), ví dụ 800,1200,1920:`,
      when: (a) => a.widthMode === 'multiple',
      filter: (v) => String(v ?? '').trim(),
      validate: (v) => {
        try {
          const s = parseSizes(String(v).trim());
          return s.length > 0 ? true : 'Nhập ít nhất một số';
        } catch (e) {
          return e.message;
        }
      },
    },
    {
      type: 'input',
      name: 'quality',
      message: `${chalk.green('?')} Chất lượng nén (1–100):`,
      default: '85',
      filter: (v) => String(v ?? '').trim(),
      validate: (v) => {
        try {
          parseQuality(String(v).trim());
          return true;
        } catch (e) {
          return e.message;
        }
      },
    },
    {
      type: 'list',
      name: 'format',
      message: `${chalk.green('?')} Định dạng đầu ra:`,
      choices: [
        { name: 'JPEG', value: 'jpeg' },
        { name: 'WebP', value: 'webp' },
        { name: 'AVIF', value: 'avif' },
      ],
      default: 'jpeg',
    },
    {
      type: 'input',
      name: 'workers',
      message: `${chalk.green('?')} Số workers (Enter = ${defaultWorkers} theo CPU):`,
      default: String(defaultWorkers),
      filter: (v) => String(v ?? '').trim(),
      validate: (v) => {
        const s = String(v).trim();
        if (s === '') return true;
        try {
          parsePositiveInt(s, 'workers');
          return true;
        } catch (e) {
          return e.message;
        }
      },
    },
    {
      type: 'confirm',
      name: 'overwrite',
      message: `${chalk.green('?')} Ghi đè file đích nếu đã tồn tại? (${chalk.yellow('No')} = bỏ qua file trùng)`,
      default: false,
    },
  ]);

  const workersRaw = String(answers.workers || '').trim();
  const workers =
    workersRaw === '' ? defaultWorkers : parsePositiveInt(workersRaw, 'workers');

  const sizes =
    answers.widthMode === 'multiple'
      ? parseSizes(String(answers.sizesString).trim())
      : [];

  const width =
    answers.widthMode === 'single'
      ? parsePositiveInt(String(answers.width).trim(), 'width')
      : 1024;

  const previewLines = [
    `  ${chalk.cyan('⚡')} Nguồn:     ${path.resolve(answers.input)}`,
    `  ${chalk.cyan('⚡')} Đích:      ${path.resolve(answers.output)}`,
    `  ${chalk.cyan('⚡')} Kích thước: ${
      answers.widthMode === 'multiple'
        ? parseSizes(String(answers.sizesString).trim()).join(', ') + ' px'
        : `${width} px`
    }`,
    `  ${chalk.cyan('⚡')} Chất lượng: ${parseQuality(String(answers.quality).trim())}`,
    `  ${chalk.cyan('⚡')} Định dạng:  ${answers.format}`,
    `  ${chalk.cyan('⚡')} Workers:    ${workers}`,
    `  ${chalk.cyan('⚡')} Ghi đè:     ${answers.overwrite ? chalk.yellow('Có') : chalk.green('Không (skip)')}`,
  ];
  console.log(chalk.bold.white('\n  ─── Xác nhận cấu hình ───'));
  previewLines.forEach((line) => console.log(line));
  console.log('');

  const { go } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'go',
      message: `${chalk.green('?')} Bắt đầu resize với cấu hình trên?`,
      default: true,
    },
  ]);

  if (!go) {
    const err = new Error('USER_CANCELLED');
    err.code = 'USER_CANCELLED';
    throw err;
  }

  return {
    input: path.normalize(answers.input),
    output: path.normalize(answers.output),
    sizes,
    width,
    quality: parseQuality(String(answers.quality).trim()),
    format: answers.format,
    workers,
    dryRun: false,
    overwrite: Boolean(answers.overwrite),
    skipExisting: !answers.overwrite,
  };
}

module.exports = {
  runInteractiveWizard,
};
