<template>
  <view class="top-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
    <view class="nav-content">
      <view class="tb-left">
        <view v-if="showBack" class="back-btn" @tap="goBack">
          <text class="icon-chevron">‹</text>
        </view>
        <view v-if="!showBack && showNewChat" class="icon-btn" @tap="$emit('newChat')">
          <SquarePen :size="16" class="tb-icon-teal" />
        </view>
      </view>

      <text v-if="showBack" class="back-title">{{ title }}</text>
    </view>
  </view>
  <view class="top-bar-placeholder" :style="{ height: totalHeight + 'px' }"></view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { SquarePen } from 'lucide-vue-next';

defineProps<{
  title?: string;
  showBack?: boolean;
  showNewChat?: boolean;
}>();

defineEmits(['newChat']);

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

.tb-icon-teal {
  color: #0D9488;
}

.top-bar-placeholder {
  width: 100%;
  flex-shrink: 0;
}
</style>
