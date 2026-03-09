<template>
  <view class="page">
    <view class="content" v-if="pkg">
      <text class="page-desc">勾选需要的检查项目，调整您的体检套餐</text>

      <view class="items-list">
        <view
          v-for="item in pkg.items"
          :key="item.id"
          class="check-item"
          @tap="toggleItem(item.id)"
        >
          <view class="checkbox" :class="{ checked: selected.has(item.id) }">
            <Check v-if="selected.has(item.id)" :size="14" color="#fff" :stroke-width="3" />
          </view>
          <view class="item-info">
            <text class="item-name">{{ item.name }}</text>
            <text class="item-desc">{{ item.description }}</text>
          </view>
          <text class="item-price">¥{{ item.price }}</text>
        </view>
      </view>
    </view>

    <view class="bottom-bar" v-if="pkg">
      <view class="price-info">
        <text class="price-label">已选 {{ selected.size }} 项</text>
        <text class="price-total">¥{{ totalPrice.toLocaleString() }}</text>
      </view>
      <view class="confirm-btn" @tap="handleConfirm">
        <text class="confirm-text">确认方案</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { Check } from 'lucide-vue-next';
import { usePackageStore } from '@/stores/package';

const store = usePackageStore();
const packageId = ref('');
const selected = ref(new Set<string>());

const pkg = computed(() => store.currentPackage);

const totalPrice = computed(() => {
  if (!pkg.value) return 0;
  return pkg.value.items
    .filter((item) => selected.value.has(item.id))
    .reduce((sum, item) => sum + item.price, 0);
});

function toggleItem(id: string) {
  const s = new Set(selected.value);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  selected.value = s;
}

function handleConfirm() {
  uni.showToast({ title: '方案已更新', icon: 'success' });
  setTimeout(() => uni.navigateBack(), 1000);
}

onLoad((options: any) => {
  packageId.value = options?.id || 'pkg-ai-001';
});

onMounted(async () => {
  await store.loadPackageDetail(packageId.value);
  if (pkg.value) {
    selected.value = new Set(pkg.value.items.map((i) => i.id));
  }
});
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #B2DFDB 0%, #D5F0EC 30%, #E8F5F2 60%, #F0F7F5 100%);
  padding-bottom: calc(100px + env(safe-area-inset-bottom));
}

.content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-desc {
  font-size: 13px;
  color: #6B7280;
  font-family: "Noto Sans SC", sans-serif;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(20px);

  &:active { background: rgba(255, 255, 255, 0.8); }
}

.checkbox {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 2px solid #D1D5DB;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &.checked {
    background: #0D9488;
    border-color: #0D9488;
  }
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-name {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.item-desc {
  font-size: 12px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

.item-price {
  font-size: 14px;
  font-weight: 600;
  color: #0D9488;
  font-family: "DM Sans", sans-serif;
  flex-shrink: 0;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.3);
  padding: 12px 20px 28px;
  display: flex;
  align-items: center;
  gap: 16px;
  z-index: 100;
}

.price-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.price-label {
  font-size: 12px;
  color: #6B7280;
  font-family: "Noto Sans SC", sans-serif;
}

.price-total {
  font-size: 22px;
  font-weight: 700;
  color: #0D9488;
  font-family: "DM Sans", sans-serif;
}

.confirm-btn {
  height: 48px;
  padding: 0 32px;
  border-radius: 14px;
  background: linear-gradient(90deg, #0D9488, #14B8A6);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(13, 148, 136, 0.25);

  &:active { opacity: 0.85; }
}

.confirm-text {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  font-family: "Noto Sans SC", sans-serif;
}
</style>
