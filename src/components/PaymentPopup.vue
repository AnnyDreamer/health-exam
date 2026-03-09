<template>
  <view v-if="visible" class="pay-overlay">
    <view class="pay-overlay-bg" @tap="$emit('close')"></view>
    <view class="pay-sheet">
      <!-- 拖拽条 -->
      <view class="sheet-handle"><view class="handle-bar"></view></view>

      <!-- 支付信息 -->
      <view class="pay-header">
        <view class="pay-icon-wrap">
          <CreditCard :size="24" color="#0D9488" />
        </view>
        <text class="pay-title">确认支付</text>
        <text class="pay-subtitle">AI 个性化加项超出企业额度部分需员工自付</text>
      </view>

      <!-- 费用明细 -->
      <view class="pay-detail">
        <view class="detail-row">
          <text class="detail-label">套餐总费用</text>
          <text class="detail-value">¥{{ totalPrice.toLocaleString() }}</text>
        </view>
        <view class="detail-row">
          <text class="detail-label">企业额度抵扣</text>
          <text class="detail-value detail-value--green">-¥{{ enterpriseCoverage.toLocaleString() }}</text>
        </view>
        <view v-if="discount" class="detail-row">
          <text class="detail-label">AI加项折扣</text>
          <text class="detail-value detail-value--green">{{ Math.round(discount * 100) / 10 }}折</text>
        </view>
        <view class="detail-divider"></view>
        <view class="detail-row detail-row--total">
          <text class="detail-label--total">需支付</text>
          <text class="detail-value--total">¥{{ amount.toLocaleString() }}</text>
        </view>
      </view>

      <!-- 支付方式 -->
      <view class="pay-method">
        <text class="method-label">支付方式</text>
        <view class="method-option method-option--active">
          <view class="method-icon-wrap">
            <Wallet :size="18" color="#0D9488" />
          </view>
          <text class="method-text">在线支付</text>
          <view class="method-check">✓</view>
        </view>
      </view>

      <!-- 支付按钮 -->
      <view class="pay-btn" @tap="handlePay">
        <text class="pay-btn-text">确认支付 ¥{{ amount.toLocaleString() }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { CreditCard, Wallet } from 'lucide-vue-next';

defineProps<{
  visible: boolean;
  amount: number;
  totalPrice: number;
  enterpriseCoverage: number;
  discount?: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm'): void;
}>();

function handlePay() {
  emit('confirm');
}
</script>

<style lang="scss" scoped>
.pay-overlay {
  position: fixed;
  inset: 0;
  z-index: 600;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.pay-overlay-bg {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  animation: payFadeIn 0.2s ease;
}

@keyframes payFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.pay-sheet {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 500px;
  background: linear-gradient(180deg, rgba(240, 253, 250, 0.97) 0%, #fff 100%);
  backdrop-filter: blur(28px);
  border-radius: 28px 28px 0 0;
  padding: 20px 24px calc(24px + env(safe-area-inset-bottom, 0px));
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: 0 -8px 40px rgba(13, 148, 136, 0.1);
  animation: paySheetUp 0.35s cubic-bezier(0.33, 1, 0.68, 1);
}

@keyframes paySheetUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.sheet-handle {
  display: flex;
  justify-content: center;
  padding: 4px 0;
}

.handle-bar {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: rgba(13, 148, 136, 0.2);
}

.pay-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.pay-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: rgba(13, 148, 136, 0.08);
  border: 1px solid rgba(13, 148, 136, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.pay-title {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.pay-subtitle {
  font-size: 13px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
  text-align: center;
}

.pay-detail {
  background: rgba(255, 255, 255, 0.7);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(13, 148, 136, 0.08);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-label {
  font-size: 13px;
  color: #6B7280;
  font-family: "Noto Sans SC", sans-serif;
}

.detail-value {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
  font-family: "DM Sans", sans-serif;
}

.detail-value--green {
  color: #0D9488;
}

.detail-divider {
  height: 1px;
  background: rgba(13, 148, 136, 0.1);
}

.detail-row--total {
  padding-top: 2px;
}

.detail-label--total {
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.detail-value--total {
  font-size: 22px;
  font-weight: 700;
  color: #F59E0B;
  font-family: "DM Sans", sans-serif;
}

.pay-method {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.method-label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  font-family: "Noto Sans SC", sans-serif;
}

.method-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.6);
  border: 1.5px solid rgba(0, 0, 0, 0.06);
}

.method-option--active {
  border-color: #0D9488;
  background: rgba(13, 148, 136, 0.04);
}

.method-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(13, 148, 136, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.method-text {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.method-check {
  width: 22px;
  height: 22px;
  border-radius: 11px;
  background: #0D9488;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pay-btn {
  width: 100%;
  height: 50px;
  border-radius: 16px;
  background: linear-gradient(90deg, #0D9488, #14B8A6);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(13, 148, 136, 0.25);

  &:active { opacity: 0.85; }
}

.pay-btn-text {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  font-family: "Noto Sans SC", sans-serif;
}
</style>
