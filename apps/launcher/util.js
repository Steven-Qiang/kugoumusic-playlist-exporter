const kugoumusicapi = require('kugoumusicapi');
const kugoumusicapi_util = require('kugoumusicapi/util');
const { getConfig, saveConfig } = require('./config');

let last_refresh_time = 0;

async function refreshLogin() {
  const now = Date.now();
  if (now - last_refresh_time < 60 * 60 * 1000) {
    // 一小时内不重复
    return;
  }
  last_refresh_time = now;
  try {
    const config = getConfig();
    const resp = await kugoumusicapi.login_token(config.cookies);
    if (resp.status == 200 && resp.cookie.length > 0) {
      const new_cookies = kugoumusicapi_util.cookieToJson(resp.cookie.join(';'));
      config.cookies = {
        ...config.cookies,
        ...new_cookies,
      };
      saveConfig(config);
    }
    return config.cookies;
  } catch (error) {
    console.error('refreshToken', error);
  }
}
async function registerDev() {
  try {
    const config = getConfig();
    const register_dev_resp = await kugoumusicapi.register_dev({
      cookie: config.cookies,
    });
    if (register_dev_resp.body.status == 1 && register_dev_resp.body?.data?.dfid) {
      config.cookies.dfid = register_dev_resp.body.data.dfid;
    }
    saveConfig(config);
    return config.cookies;
  } catch (error) {
    console.error('register_dev', error);
  }
}

module.exports = { refreshLogin, registerDev };
