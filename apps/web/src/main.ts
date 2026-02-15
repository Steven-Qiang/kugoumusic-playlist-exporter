import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './assets/main.css';
import 'element-plus/dist/index.css';

const app = createApp(App);
app.use(router);
app.mount('#app');
