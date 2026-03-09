<template>
  <view class="page">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <view class="loading-spinner" />
      <text class="loading-text">加载中...</text>
    </view>

    <view v-else-if="report" class="content-card">
      <text class="detail-title">{{ report.title }}</text>
      <text class="detail-time">{{ formatTime(report.createdAt) }}</text>
      <view class="divider" />
      <!-- markdown 渲染 -->
      <view class="detail-content" v-html="renderedContent" />
    </view>

    <!-- 无数据 -->
    <view v-else class="empty">
      <FileX :size="40" color="#D1D5DB" />
      <text class="empty-text">未找到该报告</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { FileX } from 'lucide-vue-next';
import { onLoad } from '@dcloudio/uni-app';
import { useReportStore } from '@/stores/report';
import type { ReportRecord } from '@/types/report';

const reportStore = useReportStore();
const report = ref<ReportRecord | null>(null);
const loading = ref(true);

let reportId = '';

onLoad((query) => {
  reportId = query?.id || '';
  loadData();
});

async function loadData() {
  if (!reportId) {
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    // 如果 store 中尚未加载列表，先加载
    if (reportStore.reports.length === 0) {
      await reportStore.loadReports();
    }
    report.value = reportStore.getReportById(reportId) || null;
  } catch (e) {
    console.error('Failed to load report:', e);
  } finally {
    loading.value = false;
  }
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
}

/** 内联 markdown 转换：**bold**、emoji 保留 */
function inlineMd(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

/** markdown -> HTML 转换 */
function markdownToHtml(md: string): string {
  const lines = md.split('\n');
  const result: string[] = [];
  let listType: 'ul' | 'ol' | '' = '';

  const closeList = () => {
    if (listType) {
      result.push(`</${listType}>`);
      listType = '';
    }
  };

  const pStyle = 'margin:6px 0;color:#374151;font-size:14px;line-height:1.8;';
  const liStyle = 'margin-bottom:4px;color:#374151;font-size:14px;line-height:1.8;';

  for (const line of lines) {
    const trimmed = line.trim();

    // 空行
    if (trimmed === '') {
      closeList();
      result.push('<br/>');
      continue;
    }

    // --- 分隔线
    if (/^-{3,}$/.test(trimmed) || /^\*{3,}$/.test(trimmed)) {
      closeList();
      result.push('<hr style="border:none;border-top:1px solid rgba(13,148,136,0.15);margin:12px 0;"/>');
      continue;
    }

    // ### 标题
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      closeList();
      const level = headingMatch[1].length;
      const sizes: Record<number, string> = { 1: '20px', 2: '18px', 3: '16px', 4: '15px' };
      const fontSize = sizes[level] || '14px';
      result.push(`<p style="margin:16px 0 8px;font-size:${fontSize};font-weight:700;color:#1A1A1A;line-height:1.6;">${inlineMd(headingMatch[2])}</p>`);
      continue;
    }

    // 无序列表 - item
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      if (listType !== 'ul') {
        closeList();
        result.push('<ul style="padding-left:18px;margin:6px 0;">');
        listType = 'ul';
      }
      const content = trimmed.replace(/^[-•]\s+/, '');
      result.push(`<li style="${liStyle}">${inlineMd(content)}</li>`);
      continue;
    }

    // 有序列表 1. item
    const olMatch = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
    if (olMatch) {
      if (listType !== 'ol') {
        closeList();
        result.push('<ol style="padding-left:18px;margin:6px 0;">');
        listType = 'ol';
      }
      result.push(`<li style="${liStyle}">${inlineMd(olMatch[2])}</li>`);
      continue;
    }

    // 普通段落
    closeList();
    result.push(`<p style="${pStyle}">${inlineMd(trimmed)}</p>`);
  }
  closeList();

  return result.join('');
}

const renderedContent = computed(() => {
  if (!report.value?.fullContent) return '';
  return markdownToHtml(report.value.fullContent);
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

/* ---- 内容卡片 ---- */
.content-card {
  margin: 16px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 2px 16px rgba(13, 148, 136, 0.07);
  display: flex;
  flex-direction: column;
}

.detail-title {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
  line-height: 1.4;
}

.detail-time {
  font-size: 13px;
  color: #9CA3AF;
  font-family: "DM Sans", sans-serif;
  margin-top: 6px;
}

.divider {
  height: 1px;
  background: linear-gradient(90deg, rgba(13, 148, 136, 0.12) 0%, rgba(13, 148, 136, 0.04) 100%);
  margin: 16px 0;
}

.detail-content {
  font-size: 14px;
  color: #374151;
  line-height: 1.7;
  font-family: "Noto Sans SC", sans-serif;

  :deep(p) {
    margin: 6px 0;
  }

  :deep(strong) {
    color: #1A1A1A;
  }

  :deep(hr) {
    border: none;
    border-top: 1px solid rgba(13, 148, 136, 0.15);
    margin: 12px 0;
  }

  :deep(ul), :deep(ol) {
    padding-left: 18px;
    margin: 6px 0;
  }

  :deep(li) {
    margin-bottom: 4px;
  }
}

/* ---- 空状态 ---- */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200px;
  gap: 12px;
}

.empty-text {
  font-size: 15px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}
</style>
