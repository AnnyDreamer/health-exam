<template>
  <view class="page">
    <view class="content">
      <view v-if="loading" class="loading">
        <text class="loading-text">加载中...</text>
      </view>
      <view
        v-for="pkg in packages"
        :key="pkg.id"
        class="pkg-card"
        @tap="goDetail(pkg.id)"
      >
        <view class="pkg-header">
          <view class="pkg-info">
            <text class="pkg-name">{{ pkg.name }}</text>
            <text class="pkg-desc">{{ pkg.description }}</text>
          </view>
          <view v-if="pkg.badge" class="pkg-badge">
            <text class="badge-text">{{ pkg.badge }}</text>
          </view>
        </view>
        <view class="pkg-items">
          <text v-for="item in pkg.items.slice(0, 4)" :key="item.id" class="item-tag">{{ item.name }}</text>
          <text v-if="pkg.items.length > 4" class="item-more">+{{ pkg.items.length - 4 }}</text>
        </view>
        <view class="pkg-footer">
          <view class="price-area">
            <text class="price">¥{{ pkg.totalPrice }}</text>
            <text v-if="pkg.originalPrice" class="orig-price">¥{{ pkg.originalPrice }}</text>
          </view>
          <view class="detail-link">
            <text class="detail-text">查看详情</text>
            <ChevronRight :size="14" color="#0D9488" />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { ChevronRight } from 'lucide-vue-next';
import { usePackageStore } from '@/stores/package';

const store = usePackageStore();
const packages = computed(() => store.packages);
const loading = computed(() => store.loading);

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/package/detail?id=${id}` });
}

onMounted(() => { store.loadPackages(); });
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #B2DFDB 0%, #D5F0EC 30%, #E8F5F2 60%, #F0F7F5 100%);
}

.content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.loading {
  padding: 40px 0;
  text-align: center;
}

.loading-text {
  font-size: 14px;
  color: #9CA3AF;
}

.pkg-card {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(20px);
  box-shadow: 0 2px 16px rgba(13, 148, 136, 0.07);

  &:active { background: rgba(255, 255, 255, 0.8); }
}

.pkg-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.pkg-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pkg-name {
  font-size: 16px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.pkg-desc {
  font-size: 12px;
  color: #6B7280;
  font-family: "Noto Sans SC", sans-serif;
}

.pkg-badge {
  padding: 3px 8px;
  border-radius: 8px;
  background: #0D9488;
}

.badge-text {
  font-size: 10px;
  color: #fff;
  font-weight: 600;
}

.pkg-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.item-tag {
  font-size: 12px;
  color: #0D9488;
  padding: 3px 8px;
  background: rgba(240, 253, 250, 0.8);
  border-radius: 6px;
  font-family: "Noto Sans SC", sans-serif;
}

.item-more {
  font-size: 12px;
  color: #9CA3AF;
  padding: 3px 8px;
}

.pkg-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.price-area {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.price {
  font-size: 20px;
  font-weight: 700;
  color: #0D9488;
  font-family: "DM Sans", sans-serif;
}

.orig-price {
  font-size: 12px;
  color: #9CA3AF;
  text-decoration: line-through;
  font-family: "DM Sans", sans-serif;
}

.detail-link {
  display: flex;
  align-items: center;
  gap: 2px;
}

.detail-text {
  font-size: 13px;
  color: #0D9488;
  font-weight: 500;
  font-family: "Noto Sans SC", sans-serif;
}
</style>
