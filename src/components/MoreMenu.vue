<template>
  <view v-if="visible" class="menu-overlay" @tap="$emit('close')">
    <view class="menu-dropdown" @tap.stop>
      <view class="menu-item" @tap="navigate('/pages/user/profile')">
        <User :size="18" color="#6B7280" />
        <text class="menu-label">个人中心</text>
      </view>
      <view class="menu-item" @tap="navigate('/pages/appointment/index')">
        <CalendarDays :size="18" color="#6B7280" />
        <text class="menu-label">我的预约</text>
      </view>
      <view class="menu-item" @tap="navigate('/pages/report/detail?id=report-001')">
        <FileBarChart :size="18" color="#6B7280" />
        <text class="menu-label">健康档案</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { User, CalendarDays, FileBarChart } from 'lucide-vue-next';

defineProps<{ visible: boolean }>();
const emit = defineEmits(['close']);

function navigate(url: string) {
  emit('close');
  uni.navigateTo({ url });
}
</script>

<style lang="scss" scoped>
.menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 200;
}

.menu-dropdown {
  position: absolute;
  top: 48px;
  right: 16px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  padding: 8px 0;
  min-width: 160px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;

  &:active {
    background: #F9FAFB;
  }
}

.menu-icon-text {
  font-size: 16px;
}

.menu-label {
  font-size: 15px;
  color: #374151;
}

.menu-divider {
  height: 1px;
  background: #F3F4F6;
  margin: 4px 16px;
}
</style>
