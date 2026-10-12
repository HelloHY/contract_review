import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import 'element-plus/dist/index.css';
import './assets/css/tailwind.css';

const logoUrl = '/asserts/logo.png';

document.title = '合同审查';
const favicon = document.querySelector('link[rel="icon"]') || document.createElement('link');
favicon.rel = 'icon';
favicon.href = logoUrl;
document.head.appendChild(favicon);

const app = createApp(App);
app.use(router);
app.mount('#app');

window.ResizeObserver = class _NewResizeObserver extends ResizeObserver {
  constructor(callback) {
    super(() => window.requestAnimationFrame(() => callback.apply(this, arguments)));
  }
};
