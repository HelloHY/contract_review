<template>
  <main class="home-page">
    <section class="hero-section">
      <img
        class="hero-image"
        src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1600&q=80"
        alt="合同审查工作台"
      />
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <p class="eyebrow">合同审查工作台</p>
        <h1>把合同风险看清楚，把修改意见落到文档里。</h1>
        <p class="hero-copy">上传合同后，按步骤确认范围、查看结论，并在同一页面完成修改建议采纳。</p>
        <div class="hero-actions">
          <button class="primary-button" @click="startNewReview">开始审查</button>
          <button class="secondary-button" @click="goLibrary">前往文件库</button>
        </div>
      </div>
    </section>

    <section class="workflow-panel">
      <div class="section-head">
        <p class="eyebrow">审查步骤</p>
        <h2>四步完成审查</h2>
      </div>
      <div class="workflow-list">
        <article v-for="item in workflow" :key="item.title" class="workflow-item" :style="{ '--accent': item.color }">
          <span>{{ item.step }}</span>
          <div>
            <h3>{{ item.title }}</h3>
            <p>{{ item.copy }}</p>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>

<script>
import { useRouter } from 'vue-router';

export default {
  name: 'HomeView',
  setup() {
    const router = useRouter();

    const startNewReview = () => {
      localStorage.removeItem('review_session');
      router.push({ path: '/review' });
    };

    const goLibrary = () => {
      router.push({ path: '/library' });
    };

    const workflow = [
      { step: '01', title: '上传合同', color: '#3b82f6', copy: '选择文件，进入在线预览。' },
      { step: '02', title: '确认范围', color: '#ec4899', copy: '确认立场、重点和目标。' },
      { step: '03', title: '查看结果', color: '#ef4444', copy: '集中查看风险和建议。' },
      { step: '04', title: '采纳修改', color: '#111111', copy: '把修改同步到文档。' },
    ];

    return { workflow, startNewReview, goLibrary };
  },
};
</script>

<style scoped>
.home-page {
  min-height: calc(100vh - 56px);
  background: #ffffff;
  color: #111111;
  font-size: 13px;
  padding-bottom: 48px;
}

.hero-section {
  position: relative;
  height: 380px;
  overflow: hidden;
  display: flex;
  align-items: center;
}

.hero-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.72), rgba(0, 0, 0, 0.25));
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 1080px;
  width: 100%;
  margin: 0 auto;
  padding: 0 24px;
  color: #ffffff;
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.75;
}

.hero-content h1 {
  margin: 0 0 10px;
  font-size: 30px;
  font-weight: 900;
  line-height: 1.3;
  max-width: 560px;
}

.hero-copy {
  margin: 0 0 22px;
  font-size: 14px;
  opacity: 0.85;
  max-width: 480px;
}

.hero-actions {
  display: flex;
  gap: 10px;
}

.primary-button,
.secondary-button {
  height: 40px;
  padding: 0 22px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  border: 1px solid transparent;
}

.primary-button {
  background: #ffffff;
  color: #111111;
}

.secondary-button {
  background: transparent;
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.5);
}

.workflow-panel {
  max-width: 1080px;
  margin: 36px auto 0;
  padding: 0 24px;
}

.section-head {
  margin-bottom: 18px;
}

.section-head .eyebrow {
  color: #888888;
  opacity: 1;
}

.section-head h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 900;
}

.workflow-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.workflow-item {
  display: flex;
  gap: 12px;
  padding: 18px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  border-left: 3px solid var(--accent);
}

.workflow-item span {
  font-size: 20px;
  font-weight: 900;
  color: var(--accent);
}

.workflow-item h3 {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 800;
}

.workflow-item p {
  margin: 0;
  color: #666666;
}
</style>
