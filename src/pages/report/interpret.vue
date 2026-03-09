<template>
  <view class="page">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <view class="loading-spinner" />
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 列表 -->
    <view class="list" v-else-if="reports.length > 0">
      <view
        v-for="r in reports"
        :key="r.id"
        class="report-card"
        @tap="goDetail(r.id)"
      >
        <!-- 左侧图标 -->
        <view class="report-icon-wrap">
          <FileSearch :size="22" color="#0D9488" />
        </view>
        <view class="report-info">
          <text class="report-title">{{ r.title }}</text>
          <text class="report-summary">{{ stripMd(r.summary) }}</text>
          <text class="report-time">{{ formatTime(r.createdAt) }}</text>
        </view>
        <ChevronRight :size="16" color="#D1D5DB" />
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else class="empty">
      <view class="empty-icon-wrap">
        <FileX :size="40" color="#D1D5DB" />
      </view>
      <text class="empty-text">暂无报告解读记录</text>
      <text class="empty-hint">上传体检报告，AI 为您专业解读</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { FileSearch, ChevronRight, FileX } from 'lucide-vue-next';
import { useReportStore } from '@/stores/report';

const reportStore = useReportStore();
const loading = ref(false);
const reports = computed(() => reportStore.sortedReports);

/** 去除 markdown 符号，保留纯文本摘要 */
function stripMd(text: string): string {
  return text
    .replace(/#{1,4}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^-{3,}$/gm, '')
    .replace(/^[-•]\s+/gm, '')
    .replace(/^\d+[.)]\s+/gm, '')
    .replace(/\n+/g, ' ')
    .trim();
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd} ${hh}:${min}`;
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/report/interpret-detail?id=${id}` });
}

onMounted(() => {
  reportStore.loadReports();
});
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #B2DFDB 0%, #D5F0EC 30%, #E8F5F2 60%, #F0F7F5 100%);
}

/* ---- 加载状态 ---- */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200px;
  gap: 12px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(13, 148, 136, 0.15);
  border-top-color: #0D9488;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 14px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

/* ---- 列表 ---- */
.list {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.report-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 2px 16px rgba(13, 148, 136, 0.07);

  &:active {
    background: rgba(255, 255, 255, 0.8);
  }
}

.report-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(13, 148, 136, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.report-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.report-title {
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.report-summary {
  font-size: 13px;
  color: #6B7280;
  font-family: "Noto Sans SC", sans-serif;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.report-time {
  font-size: 12px;
  color: #9CA3AF;
  font-family: "DM Sans", sans-serif;
}

/* ---- 空状态 ---- */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 160px;
  gap: 8px;
}

.empty-icon-wrap {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.empty-text {
  font-size: 15px;
  font-weight: 500;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

.empty-hint {
  font-size: 13px;
  color: #D1D5DB;
  font-family: "Noto Sans SC", sans-serif;
}
</style>
