<template>
  <main class="login-page">
    <div class="login-card">
      <img src="/asserts/logo.png" alt="logo" class="login-logo" />
      <h1>合同审查系统</h1>
      <p class="login-subtitle">建筑行业智能合同审核平台</p>

      <form class="login-form" @submit.prevent="handleLogin">
        <label>
          <span>用户名</span>
          <input v-model.trim="username" type="text" placeholder="请输入用户名" autocomplete="username" />
        </label>
        <label>
          <span>密码</span>
          <input v-model="password" type="password" placeholder="请输入密码" autocomplete="current-password" />
        </label>
        <p v-if="error" class="login-error">{{ error }}</p>
        <button class="login-button" type="submit" :disabled="loading">
          {{ loading ? '登录中...' : '登 录' }}
        </button>
      </form>

      <p class="login-tip">默认管理员账号：admin / admin123</p>
    </div>
  </main>
</template>

<script>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { login } from '../user';

export default {
  name: 'LoginView',
  setup() {
    const router = useRouter();
    const route = useRoute();
    const username = ref('');
    const password = ref('');
    const loading = ref(false);
    const error = ref('');

    const handleLogin = async () => {
      if (!username.value || !password.value) {
        error.value = '请输入用户名和密码';
        return;
      }
      loading.value = true;
      error.value = '';
      try {
        await login(username.value, password.value);
        const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
        router.replace(redirect);
      } catch (err) {
        error.value = err.response?.data?.error || '登录失败，请稍后重试';
      } finally {
        loading.value = false;
      }
    };

    return { username, password, loading, error, handleLogin };
  },
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.login-card {
  width: 360px;
  padding: 40px 36px 28px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  text-align: center;
}

.login-logo {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  margin-bottom: 12px;
}

h1 {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 900;
}

.login-subtitle {
  margin: 0 0 24px;
  font-size: 13px;
  color: #888888;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  text-align: left;
}

.login-form label span {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: #555555;
  margin-bottom: 6px;
}

.login-form input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s ease;
  box-sizing: border-box;
}

.login-form input:focus {
  border-color: #111111;
}

.login-error {
  margin: 0;
  font-size: 12px;
  color: #dc2626;
}

.login-button {
  height: 42px;
  border: none;
  border-radius: 8px;
  background: #111111;
  color: #ffffff;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.login-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.login-tip {
  margin: 18px 0 0;
  font-size: 12px;
  color: #aaaaaa;
}
</style>
