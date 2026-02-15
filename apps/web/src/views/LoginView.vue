<template>
  <div class="login-page">
    <div class="login-box">
      <div class="login-header">
        <h1>酷狗音乐歌单导出</h1>
        <p>导出歌单为JSON格式，兼容XiaoMusic</p>
      </div>

      <div class="login-tabs">
        <div class="tab-nav">
          <button :class="{ active: activeTab === 'phone' }" @click="activeTab = 'phone'">
            手机登录
          </button>
          <button :class="{ active: activeTab === 'qr' }" @click="activeTab = 'qr'">
            扫码登录
          </button>
        </div>

        <div class="tab-content">
          <div v-show="activeTab === 'phone'" class="tab-pane">
            <div class="form-group">
              <label>手机号</label>
              <el-input v-model="phoneForm.phone" placeholder="请输入手机号" size="large" />
            </div>
            <div class="form-group">
              <label>验证码</label>
              <div class="code-input">
                <el-input v-model="phoneForm.code" placeholder="请输入验证码" size="large" />
                <el-button :disabled="countdown > 0" size="large" @click="sendCode">
                  {{ countdown > 0 ? `${countdown}s` : '发送验证码' }}
                </el-button>
              </div>
            </div>
            <el-button type="primary" size="large" :loading="loading" class="submit-btn" @click="handlePhoneLogin">
              登录
            </el-button>
          </div>

          <div v-show="activeTab === 'qr'" class="tab-pane qr-pane">
            <div v-if="loading" class="qr-loading">
              <el-icon class="is-loading" :size="50">
                <loading-icon />
              </el-icon>
              <p>正在生成二维码...</p>
            </div>
            <template v-else-if="qrCode">
              <div class="qr-image">
                <img :src="qrCode" alt="QR Code">
              </div>
              <p class="qr-hint">
                请使用酷狗音乐APP扫码登录
              </p>
              <el-button text type="primary" @click="generateQR">
                刷新二维码
              </el-button>
            </template>
          </div>
        </div>

        <div class="login-footer">
          <a href="https://github.com/Steven-Qiang/kugoumusic-playlist-exporter" target="_blank">
            GitHub
          </a>
          <span>@ Steven Qiang</span>
        </div>
      </div>
    </div>

    <el-dialog v-model="showAccountSelect" title="选择账号" width="400px" :close-on-click-modal="false">
      <div class="account-list">
        <div v-for="account in accountList" :key="account.userid" class="account-item" @click="selectAccount(account.userid)">
          <el-avatar :src="replaceImageSize(account.pic, 100)" :size="50" />
          <div class="account-info">
            <div class="account-name">
              {{ account.nickname }}
            </div>
            <div class="account-username">
              {{ account.username }}
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { QRCheckData, QRCreateData, QRKeyData } from '@/types';
import { Loading as LoadingIcon } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import { replaceImageSize } from '@/utils/image';
import request from '@/utils/request';

const router = useRouter();

const activeTab = ref('phone');
const loading = ref(false);
const countdown = ref(0);
const qrCode = ref('');
const qrKey = ref('');
let qrTimer: number | null = null;

watch(activeTab, (newTab) => {
  if (newTab === 'qr') {
    if (!qrCode.value) {
      generateQR();
    } else {
      checkQRStatus();
    }
  } else if (qrTimer) {
    clearInterval(qrTimer);
    qrTimer = null;
  }
});

const phoneForm = reactive({
  phone: '',
  code: ''
});

const accountList = ref<any[]>([]);
const showAccountSelect = ref(false);

async function sendCode() {
  if (!phoneForm.phone) {
    ElMessage.warning('请输入手机号');
    return;
  }
  try {
    await request.get('/captcha/sent', { params: { mobile: phoneForm.phone } });
    ElMessage.success('验证码已发送');
    countdown.value = 60;
    const timer = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0) clearInterval(timer);
    }, 1000);
  } catch (error) {
    console.error(error);
  }
}

async function handlePhoneLogin() {
  if (!phoneForm.phone || !phoneForm.code) {
    ElMessage.warning('请填写完整信息');
    return;
  }
  loading.value = true;
  try {
    const res = await request.get('/login/cellphone', {
      params: { mobile: phoneForm.phone, code: phoneForm.code }
    });
    if (res.status === 1) {
      ElMessage.success('登录成功');
      router.push('/playlist');
    }
  } catch (error: any) {
    if (error.response?.data?.data?.info_list) {
      accountList.value = error.response.data.data.info_list;
      showAccountSelect.value = true;
      loading.value = false;
    } else {
      console.error(error);
      loading.value = false;
    }
  }
}

async function selectAccount(userid: number) {
  showAccountSelect.value = false;
  loading.value = true;
  try {
    await request.get('/login/cellphone', {
      params: { mobile: phoneForm.phone, code: phoneForm.code, userid }
    });
    ElMessage.success('登录成功');
    router.push('/playlist');
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
}

async function generateQR() {
  loading.value = true;
  try {
    const keyRes = await request.get<QRKeyData>('/login/qr/key', {
      params: { timestamp: Date.now() }
    });
    qrKey.value = keyRes.data.qrcode;
    const qrRes = await request.get<QRCreateData>('/login/qr/create', {
      params: { key: qrKey.value, qrimg: true, timestamp: Date.now() }
    });
    qrCode.value = qrRes.data.base64;
    checkQRStatus();
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
}

async function checkQRStatus() {
  if (qrTimer) clearInterval(qrTimer);
  qrTimer = setInterval(async () => {
    try {
      const res = await request.get<QRCheckData>('/login/qr/check', {
        params: { key: qrKey.value, timestamp: Date.now() }
      });
      if (res.data.status === 4) {
        clearInterval(qrTimer!);
        qrTimer = null;
        ElMessage.success('登录成功');
        router.push('/playlist');
      } else if (res.data.status === 0) {
        clearInterval(qrTimer!);
        qrTimer = null;
        ElMessage.error('二维码已过期');
        qrCode.value = '';
      }
    } catch {
      clearInterval(qrTimer!);
      qrTimer = null;
    }
  }, 2000);
}

onUnmounted(() => {
  if (qrTimer) {
    clearInterval(qrTimer);
    qrTimer = null;
  }
});
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  background: #f0f2f5;
  padding: 80px 20px 20px;
}

.login-box {
  width: 100%;
  max-width: 420px;
  height: fit-content;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.login-header {
  padding: 40px 30px 30px;
  text-align: center;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
}

.login-header h1 {
  margin: 0 0 10px;
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
}

.login-header p {
  margin: 0;
  font-size: 14px;
  color: #8c8c8c;
}

.login-tabs {
  padding: 30px;
}

.tab-nav {
  display: flex;
  gap: 8px;
  margin-bottom: 30px;
  background: #f5f7fa;
  padding: 4px;
  border-radius: 8px;
}

.tab-nav button {
  flex: 1;
  padding: 10px;
  border: none;
  background: transparent;
  color: #606266;
  font-size: 14px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.3s;
}

.tab-nav button.active {
  background: #fff;
  color: #409eff;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.tab-content {
  height: 280px;
}

.tab-pane {
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #303133;
  font-size: 14px;
  font-weight: 500;
}

.code-input {
  display: flex;
  gap: 10px;
}

.code-input .el-input {
  flex: 1;
}

.submit-btn {
  width: 100%;
  margin-top: 10px;
}

.qr-pane {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.qr-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  color: #909399;
}

.qr-image {
  width: 200px;
  height: 200px;
  padding: 15px;
  background: #fff;
  border: 2px solid #e4e7ed;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.qr-image img {
  width: 100%;
  height: 100%;
  display: block;
}

.qr-hint {
  margin: 20px 0 10px;
  color: #606266;
  font-size: 14px;
}

.login-footer {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e8e8e8;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #8c8c8c;
}

.login-footer a {
  color: #409eff;
  text-decoration: none;
}

.login-footer a:hover {
  text-decoration: underline;
}

.account-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.account-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.account-item:hover {
  border-color: #409eff;
  background: #ecf5ff;
}

.account-info {
  flex: 1;
}

.account-name {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.account-username {
  font-size: 13px;
  color: #8c8c8c;
}
</style>
