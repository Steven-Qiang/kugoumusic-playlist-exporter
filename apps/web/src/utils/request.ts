import axios from 'axios';
import { ElMessage } from 'element-plus';
import router from '@/router';

const request = axios.create({
  baseURL: import.meta.env.DEV ? '/api' : '/',
  timeout: 10000,
  withCredentials: true
});

const ignoreErrorDialogUrl = ['/login/cellphone', '/user/detail'];

request.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log('API Response:', response.config.url, JSON.stringify(response.data));
    }
    if (response.data.data) {
      return response.data;
    }
    return response;
  },
  (error) => {
    console.error('API Error:', error.config?.url, JSON.stringify(error.response?.data));
    if (error.response?.status === 301) {
      router.push('/login');
      ElMessage.error('请先登录');
    } else {
      if (!ignoreErrorDialogUrl.includes(error.config?.url || '')) {
        ElMessage.error(error.response?.data?.msg || '请求失败');
      }
    }
    return Promise.reject(error);
  }
);

export default request;
