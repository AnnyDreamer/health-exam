<template>
  <view v-if="visible" class="notify-mask" @touchmove.prevent>
    <view class="notify-bg" @tap="$emit('close')"></view>
    <view class="notify-card" :class="{ 'notify-card--show': show }">
      <!-- 关闭按钮 -->
      <view class="notify-close" @tap="$emit('close')">
        <X :size="18" color="#9CA3AF" />
      </view>

      <!-- 第一部分：顶部标题区（带浅色背景） -->
      <view class="notify-header">
        <view class="notify-icon-wrap">
          <view class="notify-icon-ring"></view>
          <FileCheck :size="24" color="#0D9488" class="notify-icon" />
        </view>
        <text class="notify-title">您的体检报告已出</text>
        <text class="notify-date">体检日期：{{ lastDate }}</text>
      </view>

      <!-- 第二部分：异常/正常指标统计 -->
      <view class="notify-stats">
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
      </view>

      <!-- 第三部分：总结描述 -->
      <view class="notify-summary">
        <text class="summary-desc">{{ summaryLine1 }}</text>
        <text v-if="summaryLine2" class="summary-desc summary-desc--detail">{{ summaryLine2 }}</text>
        <text class="summary-desc summary-desc--action">{{ summaryAction }}</text>
      </view>

      <!-- 操作按钮 -->
      <view class="notify-actions">
        <view class="notify-btn notify-btn--primary" @tap="$emit('view')">
          <text class="notify-btn-text">查看报告</text>
          <ChevronRight :size="16" color="#fff" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { FileCheck, ChevronRight, X } from 'lucide-vue-next';
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

const summaryLine1 = computed(() => {
  if (abnormalCount.value === 0) {
    return '本次体检各项指标均在正常范围内，整体健康状况良好，请继续保持健康的生活方式。';
  }
  const names = abnormalIndicators.value.map(i => i.name);
  const display = names.slice(0, 3).join('、');
  const more = names.length > 3 ? '等' : '';
  return `本次体检共检查${props.indicators.length}项指标，其中${abnormalCount.value}项结果异常，包括${display}${more}。`;
});

const summaryLine2 = computed(() => {
  if (abnormalCount.value === 0) return '';

  const lipidItems = abnormalIndicators.value.filter(i =>
    ['总胆固醇', '甘油三酯', '低密度脂蛋白', '高密度脂蛋白'].includes(i.name),
  );
  const bpItem = abnormalIndicators.value.find(i => i.name === '血压');
  const thyroidItem = abnormalIndicators.value.find(i => i.name === 'TSH' || i.name.includes('甲'));

  const risks: string[] = [];
  if (lipidItems.length >= 2) risks.push('血脂多项异常需重点关注心血管健康');
  if (bpItem) risks.push('血压偏高需注意日常监测');
  if (thyroidItem) risks.push('甲状腺功能指标异常建议进一步复查');

  if (risks.length > 0) return risks.join('，') + '。';

  const highItems = abnormalIndicators.value.filter(i => i.status === 'high');
  const lowItems = abnormalIndicators.value.filter(i => i.status === 'low');
  const parts: string[] = [];
  if (highItems.length > 0) parts.push(`${highItems.map(i => i.name).join('、')}偏高`);
  if (lowItems.length > 0) parts.push(`${lowItems.map(i => i.name).join('、')}偏低`);
  return `${parts.join('，')}，部分指标需要引起重视。`;
});

const summaryAction = computed(() => {
  if (abnormalCount.value === 0) {
    return '您可以点击查看完整报告，了解各项指标的详细数据。';
  }
  return '建议点击查看详细报告，AI 将为您逐项解读异常指标并给出个性化的饮食、运动及复查建议。';
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
  padding: 0 0 calc(env(safe-area-inset-bottom, 0px) + 20px);
  transform: translateY(100%);
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);

  &--show {
    transform: translateY(0);
  }
}

/* ---- 关闭按钮 ---- */
.notify-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;

  &:active { background: rgba(0, 0, 0, 0.08); }
}

/* ---- 第一部分：顶部标题 ---- */
.notify-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 24px 20px;
  background: linear-gradient(180deg, #F0FDFA 0%, #F8FAFA 100%);
  border-radius: 24px 24px 0 0;
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
  background: rgba(13, 148, 136, 0.12);
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

/* ---- 第二部分：指标统计 ---- */
.notify-stats {
  margin: 16px 24px 0;
  background: #F8FAFA;
  border-radius: 14px;
  padding: 16px;
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: center;
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

/* ---- 第三部分：总结描述 ---- */
.notify-summary {
  margin: 12px 24px 0;
  background: #FFFBEB;
  border-radius: 14px;
  padding: 14px 16px;
}

.summary-desc {
  display: block;
  font-size: 13px;
  color: #4B5563;
  line-height: 1.7;
  font-family: "Noto Sans SC", sans-serif;

  &--detail {
    margin-top: 6px;
    color: #92400E;
  }

  &--action {
    margin-top: 6px;
    color: #0D9488;
    font-weight: 500;
  }
}

/* ---- 按钮 ---- */
.notify-actions {
  padding: 20px 24px 0;
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
}

.notify-btn-text {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  font-family: "Noto Sans SC", sans-serif;
}
</style>
