<template>
  <view class="pkg-card">
    <!-- 头部 -->
    <view class="pkg-head">
      <text class="pkg-name">{{ name }}</text>
      <view v-if="badge" class="ai-badge">
        <text class="badge-text">{{ badge }}</text>
      </view>
    </view>

    <!-- 描述 -->
    <text v-if="description" class="pkg-desc">{{ description }}</text>

    <!-- 项目数 -->
    <text v-if="items && items.length" class="item-count">共 {{ items.length }} 项检查</text>

    <!-- 价格和操作行 -->
    <view class="price-row">
      <view v-if="!isGroupPackage" class="price-area">
        <text class="price-text">¥ {{ totalPrice.toLocaleString() }}</text>
        <text v-if="originalPrice" class="orig-price">¥{{ originalPrice.toLocaleString() }}</text>
      </view>
      <view v-else class="price-area price-area--group">
        <view class="group-price-row">
          <view class="group-price-item">
            <text class="group-price-label">企业承担</text>
            <text class="group-price-value">¥{{ (enterpriseCoverage || 0).toLocaleString() }}</text>
          </view>
          <view class="group-price-item">
            <text class="group-price-label">员工自付</text>
            <text class="group-price-value group-price-value--emp">¥{{ (employeePayment || 0).toLocaleString() }}</text>
          </view>
        </view>
        <view class="group-info-row">
          <text class="group-info-tag">企业额度 ¥{{ (enterpriseBudget || 0).toLocaleString() }}</text>
          <text v-if="aiAddonDiscount" class="group-info-tag group-info-tag--discount">AI加项 {{ Math.round(aiAddonDiscount * 100) / 10 }}折</text>
        </view>
      </view>
      <view class="btn-row">
        <view class="adj-btn" @tap="$emit('customize')">
          <text class="adj-text">查看详情</text>
        </view>
        <view class="cfm-btn" @tap="$emit('confirm')">
          <text class="cfm-text">立即预约</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  name: string;
  badge?: string;
  description?: string;
  items?: (string | { name: string; reason?: string })[];
  totalPrice: number;
  originalPrice?: number;
  isGroupPackage?: boolean;
  enterpriseBudget?: number;
  enterpriseCoverage?: number;
  employeePayment?: number;
  aiAddonDiscount?: number;
}>();

defineEmits(['tap', 'confirm', 'customize']);
</script>

<style lang="scss" scoped>
.pkg-card {
  background: #F0FDFA;
  border-radius: 16px;
  padding: 14px;
  border: 1px solid #CCFBF1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 6px;
}

.pkg-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pkg-name {
  font-size: 15px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.ai-badge {
  padding: 2px 8px;
  border-radius: 8px;
  background: #0D9488;
}

.badge-text {
  font-size: 10px;
  color: #fff;
  font-weight: 600;
  font-family: "Noto Sans SC", sans-serif;
}

.pkg-desc {
  font-size: 12px;
  color: #6B7280;
  line-height: 1.4;
  font-family: "Noto Sans SC", sans-serif;
}

.item-count {
  font-size: 11px;
  font-weight: 500;
  color: #0D9488;
  background: rgba(13, 148, 136, 0.08);
  padding: 2px 8px;
  border-radius: 6px;
  align-self: flex-start;
  font-family: "Noto Sans SC", sans-serif;
}

.price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.price-area {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.price-text {
  font-size: 20px;
  font-weight: 700;
  color: #0D9488;
  font-family: "DM Sans", sans-serif;
}

.orig-price {
  font-size: 13px;
  color: #9CA3AF;
  text-decoration: line-through;
  font-family: "DM Sans", sans-serif;
}

/* 团检价格展示 */
.price-area--group {
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.group-price-row {
  display: flex;
  gap: 12px;
}

.group-price-item {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.group-price-label {
  font-size: 10px;
  color: #6B7280;
  font-family: "Noto Sans SC", sans-serif;
}

.group-price-value {
  font-size: 16px;
  font-weight: 700;
  color: #0D9488;
  font-family: "DM Sans", sans-serif;
}

.group-price-value--emp {
  color: #F59E0B;
}

.group-info-row {
  display: flex;
  gap: 6px;
}

.group-info-tag {
  font-size: 10px;
  color: #6B7280;
  background: rgba(107, 114, 128, 0.08);
  padding: 1px 6px;
  border-radius: 4px;
  font-family: "Noto Sans SC", sans-serif;
}

.group-info-tag--discount {
  color: #0D9488;
  background: rgba(13, 148, 136, 0.08);
}

.btn-row {
  display: flex;
  gap: 8px;
}

.adj-btn {
  padding: 6px 12px;
  border-radius: 12px;
  border: 1px solid #0D9488;

  &:active { opacity: 0.7; }
}

.adj-text {
  font-size: 12px;
  font-weight: 500;
  color: #0D9488;
  font-family: "Noto Sans SC", sans-serif;
}

.cfm-btn {
  padding: 6px 12px;
  border-radius: 12px;
  background: #0D9488;

  &:active { opacity: 0.7; }
}

.cfm-text {
  font-size: 12px;
  font-weight: 500;
  color: #fff;
  font-family: "Noto Sans SC", sans-serif;
}
</style>
