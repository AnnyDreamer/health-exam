<template>
  <view class="top-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
    <view class="nav-content">
      <view class="tb-left">
        <view v-if="showBack" class="back-btn" @tap="goBack">
          <text class="icon-chevron">‹</text>
        </view>
        <view v-if="!showBack && showHistory" class="history-btn" @tap="$emit('showHistory')">
          <text class="history-icon">☰</text>
          <text class="history-label">历史</text>
        </view>
        <view v-if="!showBack && showNewChat" class="new-chat-btn" @tap="$emit('newChat')">
          <text class="new-chat-plus">+</text>
          <text class="new-chat-label">新对话</text>
        </view>
      </view>

      <text v-if="showBack" class="back-title">{{ title }}</text>
    </view>
  </view>
  <view class="top-bar-placeholder" :style="{ height: totalHeight + 'px' }"></view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

defineProps<{
  title?: string;
  showBack?: boolean;
  showNewChat?: boolean;
  showHistory?: boolean;
}>();

defineEmits(['newChat', 'showHistory']);

const NAV_HEIGHT = 48;

const statusBarHeight = ref(0);
// #ifndef H5
const sysInfo = uni.getSystemInfoSync();
statusBarHeight.value = sysInfo.statusBarHeight || 0;
// #endif

const totalHeight = computed(() => statusBarHeight.value + NAV_HEIGHT);

function goBack() {
  uni.navigateBack();
}

</script>

<style lang="scss" scoped>
.top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

.nav-content {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  gap: 8px;
}

.tb-left {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 8px;
}

.back-btn {
  display: flex;
  align-items: center;
}

.icon-chevron {
  font-size: 28px;
  color: #1A1A1A;
  font-weight: 300;
  line-height: 1;
}

.back-title {
  font-size: 17px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.new-chat-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 5px 12px 5px 8px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(13, 148, 136, 0.2);
  backdrop-filter: blur(8px);

  &:active { opacity: 0.7; }
}

.new-chat-plus {
  font-size: 18px;
  font-weight: 500;
  color: #0D9488;
  line-height: 1;
  font-family: "DM Sans", sans-serif;
}

.new-chat-label {
  font-size: 12px;
  font-weight: 600;
  color: #0D9488;
  font-family: "Noto Sans SC", sans-serif;
}

.history-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 5px 12px 5px 8px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(0, 0, 0, 0.06);
  backdrop-filter: blur(8px);

  &:active { opacity: 0.7; }
}

.history-icon {
  font-size: 13px;
  color: #6B7280;
  line-height: 1;
}

.history-label {
  font-size: 12px;
  font-weight: 600;
  color: #6B7280;
  font-family: "Noto Sans SC", sans-serif;
}

.top-bar-placeholder {
  width: 100%;
  flex-shrink: 0;
}
</style>
