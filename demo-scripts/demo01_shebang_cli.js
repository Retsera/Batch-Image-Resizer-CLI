#!/usr/bin/env node
'use strict';
const chalk = require('./_colors');
console.log(chalk.bold.cyan('\n╔══════════════════════════════════════════╗'));
console.log(chalk.bold.cyan('║   Demo 4.1.1 — Shebang & CLI Structure  ║'));
console.log(chalk.bold.cyan('╚══════════════════════════════════════════╝\n'));
console.log(chalk.yellow('── 1. Thông tin tiến trình hệ thống ──'));
console.log(chalk.white('  process.argv[0]  (node bin):  ') + chalk.green(process.argv[0]));
console.log(chalk.white('  process.argv[1]  (script):    ') + chalk.green(process.argv[1]));
console.log(chalk.white('  process.version  (Node ver):  ') + chalk.green(process.version));
console.log(chalk.white('  process.platform (OS):        ') + chalk.green(process.platform));
console.log(chalk.white('  process.pid      (PID):       ') + chalk.green(process.pid));
console.log(chalk.white('  process.cwd()    (CWD):       ') + chalk.green(process.cwd()));
console.log(chalk.bgBlack.greenBright('  #!/usr/bin/env node'));

const fakePackageJsonBin = {
  bin: {
    'batch-resizer': './src/cli.js',
    'batch-resizer-demo01': './demo-scripts/demo01_shebang_cli.js',
  },
};
console.log(chalk.cyan(JSON.stringify(fakePackageJsonBin, null, 4).split('\n').map(l => '  ' + l).join('\n')));
console.log(chalk.white('  → Sau khi "npm link"/"npm install -g", lệnh "batch-resizer" gọi được từ bất kỳ đâu.'));
console.log(chalk.yellow('\n── 4. Cách CLI được gọi trên từng OS ──'));
const osInfo = {
  'Linux / macOS': '$ batch-resizer --input ./photos   (shebang → exec node)',
  'Windows (npm)': '> batch-resizer --input ./photos   (npm tạo .cmd wrapper)',
  'Trực tiếp':     '$ node demo01_shebang_cli.js        (mọi OS, dùng khi dev)',
};
for (const [os, cmd] of Object.entries(osInfo)) {
  console.log(chalk.white(`  [${os}]`));
  console.log(chalk.green(`    ${cmd}`));
}
console.log(chalk.bold.cyan('\n✓ Demo 4.1.1 hoàn tất!\n'));
