<template>
  <main class="users-page">
    <div class="users-container">
      <div class="users-head">
        <div>
          <p class="eyebrow">权限管理</p>
          <h1>用户管理</h1>
          <p class="users-subtitle">查看系统用户并管理角色权限。仅管理员可访问此页面。</p>
        </div>
        <button class="secondary-button" @click="fetchUsers">刷新</button>
      </div>

      <div v-if="loading" class="empty-block">正在加载用户列表...</div>
      <div v-else-if="error" class="empty-block danger">{{ error }}</div>
      <div v-else class="table-card">
        <table class="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>用户名</th>
              <th>显示名称</th>
              <th>角色</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.userId">
              <td>{{ u.userId }}</td>
              <td>{{ u.username || '—' }}</td>
              <td>{{ u.displayName || '—' }}</td>
              <td>
                <span :class="['role-pill', u.role]">{{ u.role === 'admin' ? '管理员' : '普通用户' }}</span>
              </td>
              <td>{{ formatDate(u.createdAt) }}</td>
              <td>
                <el-popconfirm
                  v-if="u.userId !== currentUserId"
                  :title="u.role === 'admin' ? '确认降级为普通用户？' : '确认升级为管理员？'"
                  @confirm="toggleRole(u)"
                >
                  <template #reference>
                    <button class="text-button">
                      {{ u.role === 'admin' ? '设为普通用户' : '设为管理员' }}
                    </button>
                  </template>
                </el-popconfirm>
                <span v-else class="self-tag">当前账号</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</template>

<script>
import { ref, onMounted } from 'vue';
import { ElMessage, ElPopconfirm } from 'element-plus';
import api from '../api';
import { getUserId } from '../user';

export default {
  name: 'UsersView',
  components: { ElPopconfirm },
  setup() {
    const users = ref([]);
    const loading = ref(true);
    const error = ref('');
    const currentUserId = getUserId();

    const formatDate = (d) => {
      if (!d) return '—';
      return new Date(d).toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    };

    const fetchUsers = async () => {
      loading.value = true;
      error.value = '';
      try {
        const response = await api.getUsers();
        users.value = response.data;
      } catch (err) {
        error.value = err.response?.data?.error || '加载用户列表失败';
      } finally {
        loading.value = false;
      }
    };

    const toggleRole = async (u) => {
      const newRole = u.role === 'admin' ? 'user' : 'admin';
      try {
        await api.updateUserRole(u.userId, newRole);
        ElMessage.success('角色已更新');
        await fetchUsers();
      } catch (err) {
        ElMessage.error(err.response?.data?.error || '更新角色失败');
      }
    };

    onMounted(fetchUsers);

    return { users, loading, error, currentUserId, formatDate, fetchUsers, toggleRole };
  },
};
</script>

<style scoped>
.users-page {
  min-height: calc(100vh - 56px);
  background: #fafafa;
  padding: 32px 24px 48px;
  font-size: 13px;
  color: #111111;
}

.users-container {
  max-width: 960px;
  margin: 0 auto;
}

.users-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.eyebrow {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #888888;
}

h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 900;
}

.users-subtitle {
  margin: 6px 0 0;
  color: #666666;
}

.secondary-button {
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  background: #ffffff;
  color: #111111;
  border: 1px solid #e0e0e0;
}

.table-card {
  background: #ffffff;
  border: 1px solid #ececec;
  border-radius: 12px;
  overflow: hidden;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.users-table th,
.users-table td {
  padding: 12px 14px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
}

.users-table th {
  background: #fafafa;
  font-weight: 800;
  color: #555555;
}

.users-table tr:last-child td {
  border-bottom: none;
}

.role-pill {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
}

.role-pill.admin {
  background: #111111;
  color: #ffffff;
}

.role-pill.user {
  background: #f0f0f0;
  color: #555555;
}

.text-button {
  border: none;
  background: none;
  color: #2563eb;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
}

.self-tag {
  font-size: 12px;
  color: #aaaaaa;
}

.empty-block {
  background: #ffffff;
  border: 1px dashed #e0e0e0;
  border-radius: 12px;
  padding: 48px 24px;
  text-align: center;
  color: #666666;
}

.empty-block.danger {
  color: #dc2626;
}
</style>
