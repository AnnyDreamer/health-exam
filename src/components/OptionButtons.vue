<template>
  <view class="options-row">
    <view
      v-for="opt in options"
      :key="opt.value"
      class="opt-btn"
      :class="[
        opt.value === selectedValue ? 'opt-selected' : 'opt-normal',
        { 'opt-disabled': !!selectedValue && opt.value !== selectedValue }
      ]"
      @tap="handleTap(opt)"
    >
      <text
        class="opt-text"
        :class="opt.value === selectedValue ? 'opt-text-selected' : 'opt-text-normal'"
      >{{ opt.label }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { ChatOption } from '@/types/chat';

const props = defineProps<{
  options: ChatOption[];
  selectedValue?: string;
}>();

const emit = defineEmits(['select']);

function handleTap(opt: ChatOption) {
  if (props.selectedValue) return;
  emit('select', opt);
}
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
  transition: all 0.2s;

  &:active { opacity: 0.7; }
}

/* 未选中状态：统一灰色 */
.opt-normal {
  background: #F3F4F6;
  border: 1px solid #E5E7EB;
}

/* 选中状态：teal 实心 */
.opt-selected {
  background: #0D9488;
  border: 1px solid #0D9488;
}

/* 已有选中项时，其他按钮变淡 */
.opt-disabled {
  opacity: 0.5;
  &:active { opacity: 0.5; }
}

.opt-text {
  font-size: 13px;
  font-family: "Noto Sans SC", sans-serif;
}

.opt-text-normal {
  color: #374151;
  font-weight: 400;
}

.opt-text-selected {
  color: #fff;
  font-weight: 500;
}
</style>
