<template>
  <view class="top-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
    <view class="nav-content">
      <view class="tb-left">
        <view v-if="showBack" class="back-btn" @tap="goBack">
          <text class="icon-chevron">‹</text>
        </view>
        <text v-if="!showBack" class="app-name">健康助手</text>
      </view>
      <view v-if="!showBack" class="tb-right">
        <view v-if="showNewChat" class="icon-btn" @tap="$emit('newChat')">
          <SquarePen :size="16" class="tb-icon-teal" />
        </view>
        <view class="pill-btn ai-pill">
          <Sparkles :size="16" class="ai-sparkle" />
          <text class="ai-text">AI 助手</text>
        </view>
        <view class="icon-btn" @tap="$emit('menu')">
          <Ellipsis :size="18" class="tb-icon" />
        </view>
      </view>
      <text v-else class="back-title">{{ title }}</text>
    </view>
  </view>
  <view class="top-bar-placeholder" :style="{ height: totalHeight + 'px' }"></view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Sparkles, Ellipsis, SquarePen } from 'lucide-vue-next';

defineProps<{
  title?: string;
  showBack?: boolean;
  showNewChat?: boolean;
}>();

defineEmits(['menu', 'newChat']);

const NAV_HEIGHT = 48;

// H5 环境没有原生状态栏，statusBarHeight 应为 0
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
  padding: 0 20px;
}

.tb-left {
  display: flex;
  align-items: center;
  gap: 12px;
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

.app-name {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.back-title {
  font-size: 17px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.tb-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pill-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(13, 148, 136, 0.2);
  backdrop-filter: blur(8px);
}

.ai-sparkle {
  color: #0D9488;
}

.ai-text {
  font-size: 12px;
  font-weight: 600;
  color: #0D9488;
  font-family: "Noto Sans SC", sans-serif;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(13, 148, 136, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
}

.tb-icon {
  color: #6B7280;
}

.tb-icon-teal {
  color: #0D9488;
}

.top-bar-placeholder {
  width: 100%;
  flex-shrink: 0;
}
</style>
