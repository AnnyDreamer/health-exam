<template>
  <view class="health-card">
    <!-- 评分行：圆环左 + 信息右，点击跳转报告 -->
    <view class="score-row" @tap="$emit('viewReport')">
      <view class="score-ring-wrapper">
        <svg class="score-ring-svg" viewBox="0 0 80 80" width="80" height="80">
          <circle cx="40" cy="40" r="34" fill="none" :stroke="ringTrackColor" stroke-width="6" />
          <circle
            cx="40" cy="40" r="34" fill="none"
            :stroke="ringColor" stroke-width="6" stroke-linecap="round"
            :stroke-dasharray="ringDasharray" :stroke-dashoffset="ringDashoffset"
            transform="rotate(-90 40 40)" class="score-ring-progress"
          />
        </svg>
        <view class="score-ring-content">
          <text class="score-num">{{ score }}</text>
          <text class="score-max">/{{ maxScore }}</text>
        </view>
      </view>
      <view class="score-info">
        <view class="score-title-row">
          <text class="score-title">整体健康评分</text>
          <view class="status-badge" :class="'status-' + status">
            <text class="status-text">{{ statusText }}</text>
          </view>
        </view>
        <text class="last-check">上次体检：{{ lastDate }}</text>
      </view>
      <ChevronRight :size="16" color="#C4C4C4" class="score-arrow" />
    </view>

    <!-- 指标标签：异常最多4个 + 溢出汇总 + 正常汇总，点击跳转报告 -->
    <view class="tag-row" @tap="$emit('viewReport')">
      <view
        v-for="(ind, i) in displayedAbnormal"
        :key="'w-' + i"
        class="indicator-tag tag-warn"
      >
        <text class="tag-text text-warn">{{ ind.name }}{{ ind.label }}</text>
      </view>
      <view v-if="hiddenAbnormalCount > 0" class="indicator-tag tag-warn-more">
        <text class="tag-text text-warn">+{{ hiddenAbnormalCount }}项异常</text>
      </view>
      <view v-if="normalIndicators.length > 0" class="indicator-tag tag-ok">
        <text class="tag-text text-ok">{{ normalIndicators.length }}项正常</text>
      </view>
    </view>

    <!-- 分隔线 -->
    <view class="divider"></view>

    <!-- 操作项 -->
    <view class="action-item" @tap="$emit('viewRisk')">
      <view class="action-icon yellow-bg">
        <ShieldAlert :size="18" color="#D97706" />
      </view>
      <view class="action-text-area">
        <text class="action-title">查看健康风险</text>
        <text class="action-desc">了解异常指标和潜在风险</text>
      </view>
      <ChevronRight :size="16" color="#C4C4C4" />
    </view>

    <view class="action-item" @tap="$emit('makePackage')">
      <view class="action-icon teal-bg">
        <ClipboardList :size="18" color="#0D9488" />
      </view>
      <view class="action-text-area">
        <text class="action-title">制定体检套餐</text>
        <text class="action-desc">根据健康数据定制体检方案</text>
      </view>
      <ChevronRight :size="16" color="#C4C4C4" />
    </view>

    <view class="action-item" @tap="$emit('interpretReport')">
      <view class="action-icon green-bg">
        <FileSearch :size="18" color="#059669" />
      </view>
      <view class="action-text-area">
        <text class="action-title">报告解读</text>
        <text class="action-desc">上传报告，AI 为您逐项分析</text>
      </view>
      <ChevronRight :size="16" color="#C4C4C4" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ShieldAlert, ClipboardList, FileSearch, ChevronRight } from 'lucide-vue-next';
import type { HealthIndicator } from '@/types/health';

const props = defineProps<{
  score: number;
  maxScore: number;
  status: string;
  indicators: HealthIndicator[];
  lastDate: string;
}>();

defineEmits(['viewRisk', 'makePackage', 'viewReport', 'interpretReport']);

const MAX_ABNORMAL_DISPLAY = 4;

const statusText = computed(() => {
  const map: Record<string, string> = { normal: '健康良好', attention: '需要关注', warning: '注意风险' };
  return map[props.status] || '未知';
});

const abnormalIndicators = computed(() =>
  props.indicators.filter(ind => ind.status !== 'normal'),
);
const normalIndicators = computed(() =>
  props.indicators.filter(ind => ind.status === 'normal'),
);
const displayedAbnormal = computed(() =>
  abnormalIndicators.value.slice(0, MAX_ABNORMAL_DISPLAY),
);
const hiddenAbnormalCount = computed(() =>
  Math.max(0, abnormalIndicators.value.length - MAX_ABNORMAL_DISPLAY),
);

// SVG 圆环 r=34
const circumference = 2 * Math.PI * 34;
const ringDasharray = computed(() => `${circumference} ${circumference}`);
const ringDashoffset = computed(() => {
  const ratio = props.maxScore > 0 ? props.score / props.maxScore : 0;
  return circumference * (1 - ratio);
});
const ringColor = computed(() => {
  const m: Record<string, string> = { normal: '#10B981', attention: '#F59E0B', warning: '#EF4444' };
  return m[props.status] || '#10B981';
});
const ringTrackColor = computed(() => {
  const m: Record<string, string> = {
    normal: 'rgba(16,185,129,0.12)',
    attention: 'rgba(245,158,11,0.12)',
    warning: 'rgba(239,68,68,0.12)',
  };
  return m[props.status] || 'rgba(16,185,129,0.12)';
});
</script>

<style lang="scss" scoped>
.health-card {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 20px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 2px 16px rgba(13, 148, 136, 0.07);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ---- 评分行 ---- */
.score-row {
  display: flex;
  align-items: center;
  gap: 16px;

  &:active { opacity: 0.8; }
}

.score-arrow {
  flex-shrink: 0;
}

.score-ring-wrapper {
  position: relative;
  width: 80px;
  height: 80px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.score-ring-svg {
  position: absolute;
  top: 0;
  left: 0;
}

.score-ring-progress {
  transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.score-ring-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 1;
}

.score-num {
  font-size: 28px;
  font-weight: 800;
  color: #1A1A1A;
  font-family: "DM Sans", sans-serif;
  line-height: 1;
}

.score-max {
  font-size: 10px;
  color: #9CA3AF;
  font-family: "DM Sans", sans-serif;
}

.score-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.score-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-title {
  font-size: 15px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.status-badge {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 6px;
  align-self: flex-start;

  &.status-attention { background: rgba(245, 158, 11, 0.12); }
  &.status-warning { background: rgba(239, 68, 68, 0.12); }
  &.status-normal { background: rgba(16, 185, 129, 0.12); }
}

.status-text {
  font-size: 11px;
  font-weight: 600;
  font-family: "Noto Sans SC", sans-serif;
}

.status-attention .status-text { color: #D97706; }
.status-warning .status-text { color: #EF4444; }
.status-normal .status-text { color: #059669; }

.last-check {
  font-size: 11px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

/* ---- 指标标签 ---- */
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.indicator-tag {
  padding: 3px 8px;
  border-radius: 6px;
}

.tag-warn { background: #FEF3C7; }
.tag-warn-more {
  background: rgba(245, 158, 11, 0.08);
  border: 1px dashed rgba(217, 119, 6, 0.3);
}
.tag-ok { background: #D1FAE5; }

.tag-text {
  font-size: 11px;
  font-weight: 500;
  font-family: "Noto Sans SC", sans-serif;
}

.text-warn { color: #D97706; }
.text-ok { color: #059669; }

/* ---- 分隔线 ---- */
.divider {
  height: 1px;
  background: #F0F0F0;
}

/* ---- 操作项 ---- */
.action-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);

  &:active { background: rgba(255, 255, 255, 0.95); }
}

.action-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.yellow-bg { background: #FEF3C7; }
.teal-bg { background: #F0FDFA; }
.green-bg { background: #D1FAE5; }

.action-text-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.action-title {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.action-desc {
  font-size: 11px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}
</style>
