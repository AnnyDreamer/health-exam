<template>
  <view class="options-row">
    <view
      v-for="opt in options"
      :key="opt.value"
      class="opt-btn"
      :class="opt.primary ? 'opt-primary' : 'opt-secondary'"
      @tap="$emit('select', opt)"
    >
      <text
        class="opt-text"
        :class="opt.primary ? 'opt-text-primary' : 'opt-text-secondary'"
      >{{ opt.label }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { ChatOption } from '@/types/chat';

defineProps<{ options: ChatOption[] }>();
defineEmits(['select']);
</script>

<style lang="scss" scoped>
.options-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.opt-btn {
  padding: 8px 14px;
  border-radius: 16px;

  &:active { opacity: 0.7; }
}

/* 主要选项: teal-50 背景 + teal 边框 */
.opt-primary {
  background: #F0FDFA;
  border: 1px solid #0D9488;
}

/* 次要选项: 灰色背景 + 灰色边框 */
.opt-secondary {
  background: #F3F4F6;
  border: 1px solid #E5E7EB;
}

.opt-text {
  font-size: 13px;
  font-family: "Noto Sans SC", sans-serif;
}

.opt-text-primary {
  color: #0D9488;
  font-weight: 500;
}

.opt-text-secondary {
  color: #6B7280;
  font-weight: 400;
}
</style>
