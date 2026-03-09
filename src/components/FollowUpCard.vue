<template>
  <view class="followup-card">
    <!-- 头部：标题 + 紧急程度标签 -->
    <view class="followup-head">
      <text class="followup-title">复查方案</text>
      <view class="urgency-badge" :class="urgencyClass">
        <text class="urgency-text">{{ urgencyLabel }}</text>
      </view>
    </view>

    <!-- 复查项目列表 -->
    <view v-if="plan.followUpItems.length > 0" class="followup-items">
      <view
        v-for="(item, index) in plan.followUpItems"
        :key="index"
        class="followup-item"
      >
        <view class="item-header">
          <view class="item-index">{{ index + 1 }}</view>
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

    <!-- 无需复查 -->
    <view v-else class="no-followup">
      <text class="no-followup-text">各项指标正常，暂无需复查项目</text>
    </view>

    <!-- 总体建议 -->
    <view v-if="plan.generalAdvice" class="general-advice">
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

.no-followup {
  padding: 16px 0;
  text-align: center;
}

.no-followup-text {
  font-size: 13px;
  color: #0D9488;
  font-family: "Noto Sans SC", sans-serif;
}

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
