<template>
  <view v-if="visible" class="notify-mask" @touchmove.prevent>
    <view class="notify-bg" @tap="$emit('close')"></view>
    <view class="notify-card" :class="{ 'notify-card--show': show }">
      <!-- 顶部图标 + 标题 -->
      <view class="notify-header">
        <view class="notify-icon-wrap">
          <view class="notify-icon-ring"></view>
          <FileCheck :size="24" color="#0D9488" class="notify-icon" />
        </view>
        <text class="notify-title">您的体检报告已出</text>
        <text class="notify-date">体检日期：{{ lastDate }}</text>
      </view>

      <!-- 风险摘要 -->
      <view class="notify-summary">
        <view class="summary-row">
          <view class="summary-item summary-item--abnormal">
            <text class="summary-num">{{ abnormalCount }}</text>
            <text class="summary-label">项异常</text>
          </view>
          <view class="summary-divider"></view>
          <view class="summary-item summary-item--normal">
            <text class="summary-num">{{ normalCount }}</text>
            <text class="summary-label">项正常</text>
          </view>
        </view>

        <!-- 总结描述 -->
        <text class="summary-desc">{{ summaryText }}</text>
      </view>

      <!-- 操作按钮 -->
      <view class="notify-actions">
        <view class="notify-btn notify-btn--primary" @tap="$emit('view')">
          <text class="notify-btn-text notify-btn-text--primary">查看报告</text>
          <ChevronRight :size="16" color="#fff" />
        </view>
        <view class="notify-btn notify-btn--ghost" @tap="$emit('close')">
          <text class="notify-btn-text notify-btn-text--ghost">稍后查看</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { FileCheck, ChevronRight } from 'lucide-vue-next';
import type { HealthIndicator } from '@/types/health';

const props = defineProps<{
  visible: boolean;
  indicators: HealthIndicator[];
  lastDate: string;
}>();

defineEmits(['close', 'view']);

const show = ref(false);

watch(() => props.visible, (val) => {
  if (val) {
    setTimeout(() => { show.value = true; }, 50);
  } else {
    show.value = false;
  }
});

const abnormalIndicators = computed(() => props.indicators?.filter(i => i.status !== 'normal') || []);
const abnormalCount = computed(() => abnormalIndicators.value.length);
const normalCount = computed(() => (props.indicators?.length || 0) - abnormalCount.value);

const summaryText = computed(() => {
  if (abnormalCount.value === 0) return '本次体检各项指标均在正常范围内，整体健康状况良好。';
  const names = abnormalIndicators.value.slice(0, 3).map(i => i.name).join('、');
  const more = abnormalCount.value > 3 ? '等' : '';
  return `本次体检发现${abnormalCount.value}项异常指标，包括${names}${more}，建议点击查看详细报告并进行 AI 解读。`;
});
</script>

<style lang="scss" scoped>
.notify-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.notify-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.35);
}

.notify-card {
  position: relative;
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 24px 24px 0 0;
  padding: 28px 24px calc(env(safe-area-inset-bottom, 0px) + 20px);
  transform: translateY(100%);
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);

  &--show {
    transform: translateY(0);
  }
}

/* ---- 顶部 ---- */
.notify-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}

.notify-icon-wrap {
  position: relative;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.notify-icon-ring {
  position: absolute;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(13, 148, 136, 0.1);
  animation: notifyPulse 2s ease-in-out infinite;
}

@keyframes notifyPulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.15); opacity: 0.3; }
}

.notify-icon {
  position: relative;
  z-index: 1;
}

.notify-title {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.notify-date {
  font-size: 12px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

/* ---- 风险摘要 ---- */
.notify-summary {
  background: #F8FAFA;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 20px;
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin-bottom: 14px;
}

.summary-item {
  flex: 1;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
}

.summary-num {
  font-size: 28px;
  font-weight: 800;
  font-family: "DM Sans", sans-serif;
  line-height: 1;
}

.summary-item--abnormal .summary-num { color: #EF4444; }
.summary-item--normal .summary-num { color: #10B981; }

.summary-label {
  font-size: 13px;
  color: #6B7280;
  font-family: "Noto Sans SC", sans-serif;
}

.summary-divider {
  width: 1px;
  height: 28px;
  background: #E5E7EB;
  flex-shrink: 0;
}

/* ---- 总结描述 ---- */
.summary-desc {
  font-size: 13px;
  color: #4B5563;
  line-height: 1.6;
  font-family: "Noto Sans SC", sans-serif;
}

/* ---- 按钮 ---- */
.notify-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notify-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 14px;
  border-radius: 14px;

  &--primary {
    background: linear-gradient(135deg, #0D9488, #0F766E);
    box-shadow: 0 4px 14px rgba(13, 148, 136, 0.3);

    &:active { opacity: 0.9; }
  }

  &--ghost {
    background: transparent;

    &:active { background: #F5F5F5; }
  }
}

.notify-btn-text {
  font-size: 15px;
  font-weight: 600;
  font-family: "Noto Sans SC", sans-serif;

  &--primary { color: #fff; }
  &--ghost { color: #9CA3AF; }
}
</style>
