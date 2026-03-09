<template>
  <view v-if="visible" class="popup-overlay">
    <view class="popup-modal">
      <!-- 关闭按钮 -->
      <view class="close-row">
        <view @tap="handleClose">
          <X :size="20" color="#9CA3AF" />
        </view>
      </view>

      <!-- 礼物图标 -->
      <view class="icon-circle">
        <Gift :size="28" color="#0D9488" />
      </view>

      <!-- 标题和描述 -->
      <text class="popup-title">您有待确认的体检套餐</text>
      <view class="popup-desc">
        <text v-if="companyName" class="company-name">{{ companyName }}</text>
        <text class="desc-text">{{ descriptionText }}</text>
      </view>

      <!-- 套餐卡片 -->
      <view class="pkg-summary">
        <view class="pkg-head-row">
          <text class="pkg-name">{{ packageName }}</text>
          <view v-if="packageBadge" class="pkg-badge">
            <text class="badge-text">{{ packageBadge }}</text>
          </view>
        </view>
        <text class="pkg-info">{{ packageInfo }}</text>
        <view class="pkg-price-row">
          <text class="pkg-price">¥{{ price }}</text>
          <text v-if="originalPrice" class="pkg-orig-price">¥{{ originalPrice }}</text>
        </view>
      </view>

      <!-- 主按钮 -->
      <view class="primary-btn" @tap="handleConfirmTap">
        <text class="primary-btn-text">查看并确认</text>
      </view>

      <!-- 次要操作 -->
      <text class="later-text" @tap="handleClose">稍后提醒</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { X, Gift } from 'lucide-vue-next';

const props = defineProps<{
  visible: boolean;
  description?: string;
  companyName?: string;
  packageName: string;
  packageBadge?: string;
  packageInfo: string;
  price: string;
  originalPrice?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm'): void;
}>();

const descriptionText = computed(() => {
  if (props.companyName) {
    return ' 已为您安排体检套餐，请查看并确认';
  }
  return props.description || '您的企业已为您安排了体检套餐，请查看并确认体检项目';
});

function handleConfirmTap() {
  emit('confirm');
}

function handleClose() {
  emit('close');
}
</script>

<style lang="scss" scoped>
.popup-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  padding: 0 35px;
}

.popup-modal {
  width: 100%;
  background: #fff;
  border-radius: 24px;
  padding: 16px 24px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.close-row {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  margin-bottom: -4px;
}

.icon-circle {
  width: 56px;
  height: 56px;
  border-radius: 28px;
  background: #F0FDFA;
  display: flex;
  align-items: center;
  justify-content: center;
}

.popup-title {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  text-align: center;
  font-family: "Noto Sans SC", sans-serif;
}

.popup-desc {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: baseline;
  text-align: center;
  line-height: 1.6;
}

.company-name {
  font-size: 13px;
  font-weight: 700;
  color: #0D9488;
  font-family: "Noto Sans SC", sans-serif;
}

.desc-text {
  font-size: 13px;
  color: #6B7280;
  font-family: "Noto Sans SC", sans-serif;
}

.pkg-summary {
  width: 100%;
  background: #F0FDFA;
  border-radius: 16px;
  padding: 16px;
  border: 1px solid #CCFBF1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 2px;
}

.pkg-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pkg-name {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.pkg-badge {
  padding: 2px 8px;
  border-radius: 8px;
  background: #0D9488;
}

.badge-text {
  font-size: 10px;
  color: #fff;
  font-weight: 600;
}

.pkg-info {
  font-size: 12px;
  color: #6B7280;
  font-family: "Noto Sans SC", sans-serif;
}

.pkg-price-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pkg-price {
  font-size: 20px;
  font-weight: 700;
  color: #0D9488;
  font-family: "DM Sans", sans-serif;
}

.pkg-orig-price {
  font-size: 13px;
  color: #9CA3AF;
  text-decoration: line-through;
  font-family: "DM Sans", sans-serif;
}

.primary-btn {
  width: 100%;
  height: 48px;
  border-radius: 24px;
  background: linear-gradient(180deg, #0D9488, #0B7C72);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25);
  margin-top: 4px;

  &:active { opacity: 0.85; }
}

.primary-btn-text {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  font-family: "Noto Sans SC", sans-serif;
}

.later-text {
  font-size: 13px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}
</style>
