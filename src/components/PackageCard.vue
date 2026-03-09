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

    <!-- 价格和操作行 -->
    <view class="price-row">
      <text class="price-text">¥ {{ totalPrice.toLocaleString() }}</text>
      <view class="btn-row">
        <view class="adj-btn" @tap.stop="$emit('customize')">
          <text class="adj-text">查看详情</text>
        </view>
        <view class="cfm-btn" @tap.stop="$emit('confirm')">
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
  items?: string[];
  totalPrice: number;
  originalPrice?: number;
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

.price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.price-text {
  font-size: 20px;
  font-weight: 700;
  color: #0D9488;
  font-family: "DM Sans", sans-serif;
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
