const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const configPath = path.join(process.cwd(), 'config.yaml');

/**
 * @typedef {object} Config
 * @property {string} serverUrl - 服务器URL
 * @property {any?} cookies - cookies
 */

/** @type {Config} */
const defaultConfig = {
  serverUrl: '',
  cookies: {},
};

/**
 * @return {Config}
 */
function getConfig() {
  if (!fs.existsSync(configPath)) {
    return defaultConfig;
  }
  const content = fs.readFileSync(configPath, 'utf8');
  // @ts-ignore
  return yaml.load(content) || defaultConfig;
}

/**
 * @param {Partial<Config>} config
 */
function saveConfig(config) {
  const old_config = getConfig();
  const new_config = Object.assign(old_config, config);
  const content = yaml.dump(new_config);
  fs.writeFileSync(configPath, content, 'utf8');
}

module.exports = { getConfig, saveConfig };
