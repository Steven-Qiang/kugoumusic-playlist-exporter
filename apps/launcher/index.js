const path = require('path');
const getPort = require('get-port').default;
const chalk = require('chalk').default;
const kugoumusicapi = require('kugoumusicapi');
const { version } = require('../../package.json');

process.removeAllListeners('warning');

function showBanner() {
  console.log(chalk.cyan('  _  __                                    ____    _                   _   _         _       _____                                 _                 \n | |/ /  _   _    __ _    ___    _   _    |  _ \\  | |   __ _   _   _  | | (_)  ___  | |_    | ____| __  __  _ __     ___    _ __  | |_    ___   _ __ \n | \' /  | | | |  / _` |  / _ \\  | | | |   | |_) | | |  / _` | | | | | | | | | / __| | __|   |  _|   \\ \\/ / | \'_ \\   / _ \\  | \'__| | __|  / _ \\ | \'__|\n | . \\  | |_| | | (_| | | (_) | | |_| |   |  __/  | | | (_| | | |_| | | | | | \\__ \\ | |_    | |___   >  <  | |_) | | (_) | | |    | |_  |  __/ | |   \n |_|\\_\\  \\__,_|  \\__, |  \\___/   \\__,_|   |_|     |_|  \\__,_|  \\__, | |_| |_| |___/  \\__|   |_____| /_/\\_\\ | .__/   \\___/  |_|     \\__|  \\___| |_|   \n                 |___/                                         |___/                                       |_|                                       \n'));
  console.log(chalk.gray('━'.repeat(60)));
  console.log(chalk.yellow(`  🎵 酷狗音乐歌单导出工具 v${version}`));
  console.log(chalk.gray('  将酷狗音乐歌单导出为通用 JSON 格式，兼容 xiaomusic 等播放器'));
  console.log();
  console.log(chalk.gray('  👤 作者: ') + chalk.white('Steven-Qiang'));
  console.log(chalk.gray('  🔗 仓库: ') + chalk.blue('github.com/Steven-Qiang/kugoumusic-playlist-exporter'));
  console.log(chalk.gray('━'.repeat(60)));
  console.log();
}

async function start() {
  showBanner();

  try {
    const port = await getPort({ port: 3000 });
    console.log('🚀 启动服务中...');

    const app = await kugoumusicapi.consturctServer();

    // @ts-ignore
    if (process.__nexe) {
      kugoumusicapi.setupStatic(app, path.join(__dirname, '../../web/dist'));
    }

    // @ts-ignore
    app.service = app.listen(port, () => {
      console.log(chalk.green(`✅ 服务已启动: http://127.0.0.1:${port}`));
      console.log(chalk.gray('\n按 Ctrl+C 停止服务\n'));
    });
  } catch (error) {
    console.error('❌ 服务启动失败:', error);
    process.exit(1);
  }
}

start();
