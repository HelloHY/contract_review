<template>
  <main class="library-page">
    <div class="library-container">
      <div class="library-head">
        <div>
          <p class="eyebrow">文件库</p>
          <h1>合同文件管理</h1>
          <p class="library-subtitle">管理已上传的合同文件与审查记录，可随时查看、继续审查或删除。</p>
        </div>
        <div class="head-actions">
          <button class="secondary-button" @click="fetchHistory">刷新</button>
          <button class="primary-button" @click="startNewReview">上传新合同</button>
        </div>
      </div>

      <div class="library-filters">
        <input
          v-model="searchKeyword"
          class="filter-input"
          type="text"
          placeholder="按文件名搜索..."
        />
        <select v-model="statusFilter" class="filter-select">
          <option value="">全部状态</option>
          <option value="Reviewed">已完成</option>
          <option value="Uploaded">已上传</option>
          <option value="PreAnalyzed">待确认</option>
        </select>
        <select v-model="typeFilter" class="filter-select">
          <option value="">全部类型</option>
          <option v-for="t in availableContractTypes" :key="t" :value="t">{{ t }}</option>
        </select>
        <span class="result-count">共 {{ filteredHistory.length }} 份文件</span>
      </div>

      <div v-if="loading" class="empty-block">正在加载文件...</div>
      <div v-else-if="error" class="empty-block danger">{{ error }}</div>
      <div v-else-if="history.length === 0" class="empty-block">
        <h3>文件库为空</h3>
        <p>上传合同后，文件会显示在这里。</p>
        <button class="primary-button" @click="startNewReview">上传第一份合同</button>
      </div>
      <div v-else-if="filteredHistory.length === 0" class="empty-block">
        <h3>未匹配到文件</h3>
        <p>请调整搜索关键词或筛选条件。</p>
      </div>
      <HistoryTable
        v-else
        :items="pagedHistory"
        :page="historyPage"
        :total-pages="totalHistoryPages"
        @view="viewReport"
        @delete="deleteReport"
        @update:page="historyPage = $event"
      />
    </div>

    <GroupReportModal
      :visible="groupReportVisible"
      :loading="groupReportLoading"
      :report="groupReport"
      @close="closeGroupReport"
    />
  </main>
</template>

<script>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import api from '../api';
import GroupReportModal from '../components/GroupReportModal.vue';
import HistoryTable from '../components/HistoryTable.vue';
import { useHomeHistory } from '../composables/useHomeHistory';

export default {
  name: 'LibraryView',
  components: { GroupReportModal, HistoryTable },
  setup() {
    const router = useRouter();
    const groupReportVisible = ref(false);
    const groupReportLoading = ref(false);
    const groupReport = ref(null);

    const {
      history, loading, error, historyPage,
      searchKeyword, statusFilter, typeFilter,
      availableContractTypes, filteredHistory, totalHistoryPages, pagedHistory,
      fetchHistory, deleteReport,
    } = useHomeHistory();

    const viewReport = async (item) => {
      if (item.record_type !== 'group') {
        router.push({ path: '/review', query: { contract_id: item.id } });
        return;
      }
      groupReportVisible.value = true;
      groupReportLoading.value = true;
      groupReport.value = null;
      try {
        const response = await api.getContractGroup(item.id);
        groupReport.value = response.data;
      } catch (err) {
        ElMessage.error('加载关联合同分析报告失败。');
        groupReportVisible.value = false;
      } finally {
        groupReportLoading.value = false;
      }
    };

    const closeGroupReport = () => {
      groupReportVisible.value = false;
      groupReport.value = null;
    };

    const startNewReview = () => {
      localStorage.removeItem('review_session');
      router.push({ path: '/review' });
    };

    return {
      history, loading, error, historyPage,
      groupReportVisible, groupReportLoading, groupReport,
      totalHistoryPages, pagedHistory, filteredHistory,
      fetchHistory, viewReport, closeGroupReport, deleteReport, startNewReview,
      searchKeyword, statusFilter, typeFilter, availableContractTypes,
    };
  },
};
</script>

<style scoped>
.library-page {
  min-height: calc(100vh - 56px);
  background: #fafafa;
  padding: 32px 24px 48px;
  font-size: 13px;
  color: #111111;
}

.library-container {
  max-width: 1080px;
  margin: 0 auto;
}

.library-head {
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

.library-subtitle {
  margin: 6px 0 0;
  color: #666666;
}

.head-actions {
  display: flex;
  gap: 10px;
}

.primary-button,
.secondary-button {
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  border: 1px solid transparent;
}

.primary-button {
  background: #111111;
  color: #ffffff;
}

.secondary-button {
  background: #ffffff;
  color: #111111;
  border-color: #e0e0e0;
}

.library-filters {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.filter-input,
.filter-select {
  height: 36px;
  padding: 0 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 13px;
  background: #ffffff;
  outline: none;
}

.filter-input {
  flex: 1;
  min-width: 200px;
}

.filter-input:focus,
.filter-select:focus {
  border-color: #111111;
}

.result-count {
  margin-left: auto;
  color: #888888;
  font-size: 12px;
}

.empty-block {
  background: #ffffff;
  border: 1px dashed #e0e0e0;
  border-radius: 12px;
  padding: 48px 24px;
  text-align: center;
  color: #666666;
}

.empty-block h3 {
  margin: 0 0 6px;
  font-size: 16px;
  color: #111111;
}

.empty-block .primary-button {
  margin-top: 16px;
}

.empty-block.danger {
  color: #dc2626;
}
</style>
