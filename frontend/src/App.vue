<template>
  <div id="app">
    <header v-if="showNav" class="app-header">
      <router-link to="/" class="brand" aria-label="合同审查首页">
        <img src="/asserts/logo.png" alt="合同审查" />
        <span>合同审查</span>
      </router-link>
      <nav class="app-nav">
        <router-link to="/" class="nav-link" active-class="nav-link-active">工作台</router-link>
        <router-link to="/library" class="nav-link" active-class="nav-link-active">文件库</router-link>
        <router-link to="/review" class="nav-link" active-class="nav-link-active">合同审查</router-link>
        <router-link to="/qna" class="nav-link" active-class="nav-link-active">智能问答</router-link>
        <router-link v-if="isAdmin" to="/settings" class="nav-link" active-class="nav-link-active">知识库</router-link>
        <router-link v-if="isAdmin" to="/users" class="nav-link" active-class="nav-link-active">用户管理</router-link>
      </nav>
      <div class="user-area">
        <span class="user-role">{{ roleText }}</span>
        <span class="user-name">{{ displayName }}</span>
        <button class="logout-button" @click="handleLogout">退出</button>
      </div>
    </header>
    <router-view />
  </div>
</template>

<script>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getCurrentUser, logout, isAdmin } from './user';

export default {
  name: 'App',
  setup() {
    const route = useRoute();
    const router = useRouter();

    const showNav = computed(() => route.path !== '/login');
    const user = computed(() => getCurrentUser());
    const displayName = computed(() => user.value?.displayName || user.value?.username || '');
    const roleText = computed(() => (user.value?.role === 'admin' ? '管理员' : '普通用户'));
    // isAdmin 是普通函数，需用 computed 包裹才能在模板中响应式生效
    const isAdminUser = computed(() => isAdmin());

    const handleLogout = () => {
      logout();
      router.replace('/login');
    };

    return { showNav, displayName, roleText, isAdmin: isAdminUser, handleLogout };
  },
};
</script>

<style>
:root {
  color: #111111;
  background: #ffffff;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
  letter-spacing: 0;
}

* {
  box-sizing: border-box;
}

html,
body,
#app {
  min-height: 100%;
  margin: 0;
}

body {
  background: #ffffff;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

a {
  color: inherit;
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 40;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 0 18px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(18px);
  box-shadow: inset 0 -1px 0 #e5e5e5;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #111111;
  text-decoration: none;
  font-size: 15px;
  font-weight: 900;
  white-space: nowrap;
}

.brand img {
  width: 26px;
  height: 26px;
  border-radius: 8px;
}

.app-nav {
  display: flex;
  align-items: center;
  gap: 5px;
  overflow-x: auto;
}

.nav-link {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  color: #666666;
  text-decoration: none;
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
  transition: background 0.15s ease, color 0.15s ease;
}

.nav-link:hover {
  color: #111111;
  background: #f5f5f5;
}

.nav-link-active {
  color: #ffffff;
  background: #111111;
}

.user-area {
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
}

.user-role {
  font-size: 11px;
  font-weight: 800;
  color: #888888;
  background: #f0f0f0;
  padding: 2px 8px;
  border-radius: 999px;
}

.user-name {
  font-size: 13px;
  font-weight: 800;
  color: #111111;
}

.logout-button {
  border: none;
  background: none;
  font-size: 12px;
  color: #888888;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: color 0.15s ease, background 0.15s ease;
}

.logout-button:hover {
  color: #dc2626;
  background: #fef2f2;
}

.el-button,
.el-input__wrapper,
.el-textarea__inner,
.el-select__wrapper {
  border-radius: 8px !important;
}

.el-input__wrapper,
.el-select__wrapper {
  min-height: 34px !important;
}

.el-textarea__inner {
  font-size: 13px !important;
  line-height: 1.45 !important;
}

@media (max-width: 680px) {
  .app-header {
    height: auto;
    min-height: 56px;
    align-items: flex-start;
    flex-direction: column;
    padding: 10px 14px;
  }

  .app-nav {
    width: 100%;
  }

  .user-area {
    align-self: flex-end;
  }
}
</style>
