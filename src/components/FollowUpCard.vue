<template>
  <view class="followup-card">
    <!-- 强提醒横幅 -->
    <view v-if="plan.urgencyLevel === 'urgent'" class="alert-banner alert-banner--urgent">
      <text class="alert-icon">⚠</text>
      <text class="alert-text">建议2周内就医</text>
    </view>
    <view v-else-if="plan.urgencyLevel === 'soon'" class="alert-banner alert-banner--soon">
      <text class="alert-icon">🔔</text>
      <text class="alert-text">建议1-3个月内完成复查</text>
    </view>

    <!-- 头部：标题 + 紧急程度标签 -->
    <view class="followup-head">
      <text class="followup-title">复查方案</text>
      <view class="urgency-badge" :class="urgencyClass">
        <text class="urgency-text">{{ urgencyLabel }}</text>
      </view>
    </view>

    <!-- 复查项目分组展示 -->
    <template v-if="plan.followUpItems.length > 0">
      <!-- 饮食与运动方案 -->
      <view v-if="lifestyleItems.length > 0" class="type-group">
        <view class="type-group-header">
          <view class="type-dot type-dot--lifestyle"></view>
          <text class="type-group-title">饮食与运动方案</text>
        </view>
        <view class="followup-items">
          <view v-for="(item, index) in lifestyleItems" :key="'l-' + index" class="followup-item followup-item--lifestyle">
            <view class="item-header">
              <view class="item-index item-index--lifestyle">{{ index + 1 }}</view>
              <text class="item-name">{{ item.name }}</text>
            </view>
            <text class="item-reason">{{ item.reason }}</text>
            <view class="item-time-row">
              <text class="item-time-label">建议时间</text>
              <text class="item-time-value">{{ item.suggestedTime }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 补充复查指标 -->
      <view v-if="recheckItems.length > 0" class="type-group">
        <view class="type-group-header">
          <view class="type-dot type-dot--recheck"></view>
          <text class="type-group-title">补充复查指标</text>
        </view>
        <view class="followup-items">
          <view v-for="(item, index) in recheckItems" :key="'r-' + index" class="followup-item followup-item--recheck">
            <view class="item-header">
              <view class="item-index item-index--recheck">{{ index + 1 }}</view>
              <text class="item-name">{{ item.name }}</text>
              <text class="item-dept">{{ item.department }}</text>
            </view>
            <text class="item-reason">{{ item.reason }}</text>
            <view class="item-time-row">
              <text class="item-time-label">建议复查时间</text>
              <text class="item-time-value">{{ item.suggestedTime }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 门诊就医方案 -->
      <view v-if="outpatientItems.length > 0" class="type-group">
        <view class="type-group-header">
          <view class="type-dot type-dot--outpatient"></view>
          <text class="type-group-title">门诊就医方案</text>
        </view>
        <view class="followup-items">
          <view v-for="(item, index) in outpatientItems" :key="'o-' + index" class="followup-item followup-item--outpatient">
            <view class="item-header">
              <view class="item-index item-index--outpatient">{{ index + 1 }}</view>
              <text class="item-name">{{ item.name }}</text>
              <text class="item-dept">{{ item.department }}</text>
            </view>
            <text class="item-reason">{{ item.reason }}</text>
            <view class="item-time-row">
              <text class="item-time-label">建议就诊时间</text>
              <text class="item-time-value">{{ item.suggestedTime }}</text>
            </view>
          </view>
        </view>
      </view>
    </template>

    <!-- 无需复查 -->
    <view v-else class="no-followup">
      <text class="no-followup-text">各项指标正常，暂无需复查项目</text>
    </view>

    <!-- 健康建议三版块 -->
    <view v-if="hasStructuredAdvice" class="advice-sections">
      <view v-if="plan.dietAdvice" class="advice-card advice-card--diet">
        <text class="advice-card-title advice-card-title--diet">🍽 饮食注意事项</text>
        <text class="advice-card-text">{{ plan.dietAdvice }}</text>
      </view>
      <view v-if="plan.exerciseAdvice" class="advice-card advice-card--exercise">
        <text class="advice-card-title advice-card-title--exercise">🏃 运动建议</text>
        <text class="advice-card-text">{{ plan.exerciseAdvice }}</text>
      </view>
      <view v-if="plan.medicalAdvice" class="advice-card advice-card--medical">
        <text class="advice-card-title advice-card-title--medical">🏥 复查就诊建议</text>
        <text class="advice-card-text">{{ plan.medicalAdvice }}</text>
      </view>
    </view>
    <!-- 降级：旧数据只有 generalAdvice -->
    <view v-else-if="plan.generalAdvice" class="general-advice">
      <text class="advice-label">健康建议</text>
      <text class="advice-text">{{ plan.generalAdvice }}</text>
    </view>

    <!-- 操作按钮 -->
    <view v-if="plan.needFollowUp && plan.followUpItems.length > 0" class="followup-actions">
      <view class="book-btn" @tap.stop="$emit('book')">
        <text class="book-btn-text">预约复查</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FollowUpPlan } from '@/types/chat';

const props = defineProps<{
  plan: FollowUpPlan;
}>();

defineEmits(['book']);

const urgencyClass = computed(() => {
  return `urgency-${props.plan.urgencyLevel}`;
});

const urgencyLabel = computed(() => {
  const map: Record<string, string> = {
    normal: '常规复查',
    soon: '尽快复查',
    urgent: '紧急',
  };
  return map[props.plan.urgencyLevel] || '常规复查';
});

// 按 type 分组复查项目
const lifestyleItems = computed(() =>
  props.plan.followUpItems.filter((item) => item.type === 'lifestyle'),
);

const recheckItems = computed(() =>
  props.plan.followUpItems.filter((item) => !item.type || item.type === 'recheck'),
);

const outpatientItems = computed(() =>
  props.plan.followUpItems.filter((item) => item.type === 'outpatient'),
);

// 是否有结构化的健康建议
const hasStructuredAdvice = computed(() =>
  !!(props.plan.dietAdvice || props.plan.exerciseAdvice || props.plan.medicalAdvice),
);
</script>

<style lang="scss" scoped>
.followup-card {
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 6px;
}

/* 强提醒横幅 */
.alert-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  margin-bottom: 2px;
}

.alert-banner--urgent {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.alert-banner--soon {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.25);
}

.alert-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.alert-text {
  font-size: 13px;
  font-weight: 700;
  font-family: "Noto Sans SC", sans-serif;
}

.alert-banner--urgent .alert-text {
  color: #DC2626;
}

.alert-banner--soon .alert-text {
  color: #D97706;
}

.followup-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.followup-title {
  font-size: 15px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.urgency-badge {
  padding: 2px 10px;
  border-radius: 8px;
}

.urgency-text {
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  font-family: "Noto Sans SC", sans-serif;
}

/* 紧急程度颜色 */
.urgency-normal {
  background: #0D9488;
}

.urgency-soon {
  background: #F59E0B;
}

.urgency-urgent {
  background: #EF4444;
}

.followup-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.followup-item {
  background: rgba(255, 255, 255, 0.47);
  border: 1px solid rgba(255, 255, 255, 0.31);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-index {
  width: 20px;
  height: 20px;
  border-radius: 10px;
  background: #0D9488;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  font-family: "DM Sans", sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.item-name {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
  flex: 1;
}

.item-dept {
  font-size: 11px;
  color: #0D9488;
  font-family: "Noto Sans SC", sans-serif;
  background: rgba(13, 148, 136, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.item-reason {
  font-size: 12px;
  color: #6B7280;
  line-height: 1.5;
  font-family: "Noto Sans SC", sans-serif;
  padding-left: 28px;
}

.item-time-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-left: 28px;
}

.item-time-label {
  font-size: 11px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

.item-time-value {
  font-size: 12px;
  font-weight: 600;
  color: #0D9488;
  font-family: "Noto Sans SC", sans-serif;
}

/* 类型分组 */
.type-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.type-group-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.type-dot {
  width: 8px;
  height: 8px;
  border-radius: 4px;
  flex-shrink: 0;
}

.type-dot--lifestyle { background: #10B981; }
.type-dot--recheck { background: #3B82F6; }
.type-dot--outpatient { background: #F59E0B; }

.type-group-title {
  font-size: 13px;
  font-weight: 700;
  color: #374151;
  font-family: "Noto Sans SC", sans-serif;
}

.item-index--lifestyle { background: #10B981; }
.item-index--recheck { background: #3B82F6; }
.item-index--outpatient { background: #F59E0B; }

.no-followup {
  padding: 16px 0;
  text-align: center;
}

.no-followup-text {
  font-size: 13px;
  color: #0D9488;
  font-family: "Noto Sans SC", sans-serif;
}

/* 健康建议三版块 */
.advice-sections {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.advice-card {
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.advice-card--diet {
  background: rgba(13, 148, 136, 0.06);
  border-left: 3px solid #0D9488;
}

.advice-card--exercise {
  background: rgba(59, 130, 246, 0.06);
  border-left: 3px solid #3B82F6;
}

.advice-card--medical {
  background: rgba(245, 158, 11, 0.06);
  border-left: 3px solid #F59E0B;
}

.advice-card-title {
  font-size: 12px;
  font-weight: 700;
  font-family: "Noto Sans SC", sans-serif;
}

.advice-card-title--diet { color: #0D9488; }
.advice-card-title--exercise { color: #3B82F6; }
.advice-card-title--medical { color: #D97706; }

.advice-card-text {
  font-size: 12px;
  color: #374151;
  line-height: 1.6;
  font-family: "Noto Sans SC", sans-serif;
}

/* 旧版降级样式 */
.general-advice {
  background: rgba(13, 148, 136, 0.04);
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.advice-label {
  font-size: 11px;
  font-weight: 600;
  color: #0D9488;
  font-family: "Noto Sans SC", sans-serif;
}

.advice-text {
  font-size: 12px;
  color: #374151;
  line-height: 1.6;
  font-family: "Noto Sans SC", sans-serif;
}

.followup-actions {
  display: flex;
  justify-content: flex-end;
}

.book-btn {
  padding: 8px 20px;
  border-radius: 12px;
  background: #0D9488;

  &:active { opacity: 0.7; }
}

.book-btn-text {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  font-family: "Noto Sans SC", sans-serif;
}
</style>
