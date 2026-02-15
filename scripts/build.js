const { execSync } = require('child_process');
const fs = require('fs');
const { join } = require('path');
const { compile } = require('nexe');

const { version } = require('../package.json');

const platforms = [
  { platform: 'windows', arch: 'x64', ext: '.exe', name: 'win' },
  { platform: 'linux', arch: 'x64', ext: '', name: 'linux' },
];

const launcherPath = join(__dirname, '../apps/launcher');
const distPath = join(__dirname, '../dist');

(async () => {
  if (fs.existsSync(distPath)) {
    console.log('🗑️ Cleaning dist folder...');
    fs.rmSync(distPath, { recursive: true, force: true });
  }
  fs.mkdirSync(distPath, { recursive: true });

  console.log('🔨 Building with ncc...');
  execSync('ncc build', { cwd: launcherPath, stdio: 'inherit' });

  for (const target of platforms) {
    const outputName = `kugoumusic-playlist-exporter-${target.name}-v${version}${target.ext}`;
    const outputPath = join(distPath, outputName);

    console.log(`\n🔨 Building for ${target.platform}-${target.arch}...`);

    await compile({
      remote: 'https://raw.githubusercontent.com/Steven-Qiang/nexe_pre_builds/refs/heads/main/',
      input: 'dist/index.js',
      resources: [`../web/dist/**/*`],
      output: outputPath,
      cwd: launcherPath,
      loglevel: 'verbose',
      targets: [
        {
          platform: target.platform,
          arch: target.arch,
          version: '24.12.0',
        },
      ],
    });

    console.log(`✅ Built: ${outputName} (${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB)`);
  }
})();
