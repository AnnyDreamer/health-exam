<template>
  <view class="page">
    <!-- Status Bar -->
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

    <!-- Header -->
    <view class="header">
      <view @tap="goBack"><ChevronLeft :size="24" color="#1A1A1A" /></view>
      <text class="header-title">套餐确认</text>
    </view>

    <!-- Content -->
    <view class="content">
      <!-- Package Info Card -->
      <view class="pkg-card" v-if="pkg">
        <!-- 套餐头部 -->
        <view class="pkg-head">
          <view class="pkg-head-left">
            <text class="pkg-name">{{ pkg.name }}</text>
            <text class="pkg-desc">{{ pkg.description }}</text>
          </view>
          <view v-if="pkg.badge" class="ai-badge">
            <Sparkles :size="12" color="#fff" />
            <text class="badge-text">{{ pkg.badge }}</text>
          </view>
        </view>

        <view class="divider"></view>

        <!-- === 分类展示（团检套餐等含 category 的套餐） === -->
        <template v-if="hasCategoryItems">
          <!-- 常规检查 -->
          <view class="section-header">
            <text class="section-title section-title--standard">常规检查</text>
            <text class="section-count">{{ selectedStandardCount }}/{{ standardItems.length }}项</text>
          </view>
          <view class="items-list">
            <view v-for="item in standardItems" :key="item.id" class="check-item" :class="{ 'check-item--unchecked': !selectedIds.has(item.id) }" @tap="toggleItem(item.id)">
              <view class="item-checkbox" :class="{ 'item-checkbox--checked': selectedIds.has(item.id) }">
                <view v-if="selectedIds.has(item.id)" class="checkbox-tick">✓</view>
              </view>
              <view class="item-info">
                <text class="item-name">{{ item.name }}</text>
                <text class="item-desc">{{ item.description }}</text>
              </view>
              <text class="item-price">¥{{ item.price }}</text>
            </view>
          </view>

          <!-- AI 个性化加项 -->
          <view class="ai-addon-section">
            <view class="section-header">
              <view class="section-title-row">
                <text class="section-title section-title--ai">AI 个性化加项</text>
                <view class="ai-tag">
                  <BrainCircuit :size="11" color="#0D9488" />
                  <text class="ai-tag-text">AI</text>
                </view>
              </view>
              <text class="section-count">{{ selectedAiCount }}/{{ aiAddonItems.length }}项</text>
            </view>
            <text class="ai-addon-hint">根据您的健康数据，AI 为您个性化推荐以下加项</text>
            <view class="items-list">
              <view v-for="item in aiAddonItems" :key="item.id" class="check-item check-item--ai" :class="{ 'check-item--unchecked': !selectedIds.has(item.id) }" @tap="toggleItem(item.id)">
                <view class="item-checkbox" :class="{ 'item-checkbox--checked': selectedIds.has(item.id) }">
                  <view v-if="selectedIds.has(item.id)" class="checkbox-tick">✓</view>
                </view>
                <view class="item-info">
                  <text class="item-name">{{ item.name }}</text>
                  <text class="item-desc">{{ item.description }}</text>
                  <view v-if="item.aiReason" class="ai-reason">
                    <text class="ai-reason-text">{{ item.aiReason }}</text>
                  </view>
                </view>
                <text class="item-price">¥{{ item.price }}</text>
              </view>
            </view>
          </view>
        </template>

        <!-- === 普通展示（无分类的套餐） === -->
        <template v-else>
          <text class="items-title">检查项目 ({{ selectedCount }}/{{ pkg.items.length }}项)</text>
          <view class="items-list">
            <view v-for="item in displayItems" :key="item.id" class="check-item" :class="{ 'check-item--unchecked': !selectedIds.has(item.id) }" @tap="toggleItem(item.id)">
              <view class="item-checkbox" :class="{ 'item-checkbox--checked': selectedIds.has(item.id) }">
                <view v-if="selectedIds.has(item.id)" class="checkbox-tick">✓</view>
              </view>
              <view class="item-info">
                <text class="item-name">{{ item.name }}</text>
                <text class="item-desc">{{ item.description }}</text>
              </view>
              <text class="item-price">¥{{ item.price }}</text>
            </view>

            <!-- 展开更多 -->
            <view v-if="pkg.items.length > 4 && !showAll" class="more-row" @tap="showAll = true">
              <text class="more-text">还有 {{ pkg.items.length - 4 }} 项检查...</text>
            </view>
          </view>
        </template>
      </view>

      <!-- 注意事项 -->
      <view class="note-card" v-if="pkg?.notice">
        <Info :size="16" color="#D97706" class="note-icon-svg" />
        <text class="note-text">{{ pkg.notice.join('。') }}。</text>
      </view>
    </view>

    <!-- Bottom Bar -->
    <view class="bottom-bar" v-if="pkg">
      <view class="price-section">
        <view class="price-label-area">
          <text class="price-label">已选 {{ selectedCount }} 项</text>
          <view class="orig-price-row" v-if="pkg.originalPrice">
            <text class="orig-price">原价 ¥{{ pkg.originalPrice.toLocaleString() }}</text>
          </view>
        </view>
        <view class="price-value">
          <text class="price-symbol">¥</text>
          <text class="price-num">{{ calculatedPrice.toLocaleString() }}</text>
        </view>
      </view>

      <view class="btn-row">
        <view class="confirm-btn confirm-btn--full" @tap="handleConfirm">
          <CalendarCheck :size="18" color="#fff" />
          <text class="confirm-text">立即预约</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { ChevronLeft, Info, CalendarCheck, Sparkles, BrainCircuit } from 'lucide-vue-next';
import { usePackageStore } from '@/stores/package';
import { useAppointmentStore } from '@/stores/appointment';

const packageStore = usePackageStore();
const appointmentStore = useAppointmentStore();
// H5 环境没有原生状态栏
const statusBarHeight = ref(0);
// #ifndef H5
statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0;
// #endif
const showAll = ref(false);
const packageId = ref('');

const pkg = computed(() => packageStore.currentPackage);

// 选中的项目 ID 集合
const selectedIds = ref<Set<string>>(new Set());

// 套餐加载后默认全选
watch(pkg, (val) => {
  if (val) {
    selectedIds.value = new Set(val.items.map((item) => item.id));
  }
}, { immediate: true });

function toggleItem(id: string) {
  const s = new Set(selectedIds.value);
  if (s.has(id)) {
    s.delete(id);
  } else {
    s.add(id);
  }
  selectedIds.value = s;
}

// 计算选中项目的总价
const calculatedPrice = computed(() => {
  if (!pkg.value) return 0;
  return pkg.value.items
    .filter((item) => selectedIds.value.has(item.id))
    .reduce((sum, item) => sum + (item.price || 0), 0);
});

const selectedCount = computed(() => selectedIds.value.size);

const selectedStandardCount = computed(() => {
  return standardItems.value.filter((item) => selectedIds.value.has(item.id)).length;
});

const selectedAiCount = computed(() => {
  return aiAddonItems.value.filter((item) => selectedIds.value.has(item.id)).length;
});

const displayItems = computed(() => {
  if (!pkg.value) return [];
  return showAll.value ? pkg.value.items : pkg.value.items.slice(0, 4);
});

// 是否为分类套餐（含 standard / ai-addon 分类）
const hasCategoryItems = computed(() => {
  if (!pkg.value) return false;
  return pkg.value.items.some((item) => item.category === 'ai-addon');
});

// 常规检查项目
const standardItems = computed(() => {
  if (!pkg.value) return [];
  return pkg.value.items.filter((item) => item.category === 'standard');
});

// AI 加项
const aiAddonItems = computed(() => {
  if (!pkg.value) return [];
  return pkg.value.items.filter((item) => item.category === 'ai-addon');
});

function goBack() {
  uni.navigateBack();
}

async function handleConfirm() {
  try {
    const apt = await appointmentStore.create({
      packageId: packageId.value,
      date: '2026-03-20',
      time: '08:00-09:00',
    });
    uni.showToast({ title: '预约成功', icon: 'success' });
    setTimeout(() => {
      uni.navigateTo({ url: `/pages/appointment/detail?id=${apt.id}` });
    }, 1000);
  } catch (e: any) {
    uni.showToast({ title: e.message || '预约失败', icon: 'none' });
  }
}

onLoad((options: any) => {
  packageId.value = options?.id || 'pkg-ai-001';
});

onMounted(async () => {
  await packageStore.loadPackageDetail(packageId.value);
});
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #B2DFDB 0%, #D5F0EC 30%, #E8F5F2 60%, #F0F7F5 100%);
  padding-bottom: calc(160px + env(safe-area-inset-bottom));
}

.status-bar { width: 100%; }

.header {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 48px;
  padding: 0 16px;
}

.header-title {
  font-size: 17px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.content {
  padding: 8px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pkg-card {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 24px;
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(20px);
  box-shadow: 0 2px 16px rgba(13, 148, 136, 0.07);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pkg-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.pkg-head-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pkg-name {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.pkg-desc {
  font-size: 13px;
  color: #6B7280;
  font-family: "Noto Sans SC", sans-serif;
}

.ai-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 10px;
  background: linear-gradient(90deg, #0D9488, #14B8A6);
  flex-shrink: 0;
}

.badge-text {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  font-family: "Noto Sans SC", sans-serif;
}

.divider {
  height: 1px;
  background: rgba(229, 231, 235, 0.27);
}

.items-title {
  font-size: 14px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

/* ---- 分类区域样式 ---- */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  font-family: "Noto Sans SC", sans-serif;
}

.section-title--standard {
  color: #6B7280;
}

.section-title--ai {
  color: #0D9488;
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.section-count {
  font-size: 12px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

.ai-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: 6px;
  background: rgba(13, 148, 136, 0.1);
  border: 1px solid rgba(13, 148, 136, 0.2);
}

.ai-tag-text {
  font-size: 10px;
  font-weight: 700;
  color: #0D9488;
  font-family: "DM Sans", sans-serif;
  letter-spacing: 0.5px;
}

.ai-addon-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: rgba(240, 253, 250, 0.85);
  border: 1px solid rgba(13, 148, 136, 0.18);
  border-radius: 16px;
  padding: 14px;
}

.ai-addon-hint {
  font-size: 12px;
  color: #6B7280;
  font-family: "Noto Sans SC", sans-serif;
  line-height: 1.5;
}

.check-item--ai {
  align-items: flex-start;
  background: rgba(255, 255, 255, 0.33);
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.check-item--ai .item-price {
  margin-top: 2px;
}

.ai-reason {
  margin-top: 4px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(13, 148, 136, 0.08);
  border-left: 2px solid rgba(13, 148, 136, 0.4);
}

.ai-reason-text {
  font-size: 11px;
  color: #4B5563;
  line-height: 1.6;
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
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.33);
  border: 1px solid rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(8px);
}

.item-checkbox {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1.5px solid #D1D5DB;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;
}

.item-checkbox--checked {
  background: #0D9488;
  border-color: #0D9488;
}

.checkbox-tick {
  font-size: 13px;
  color: #fff;
  font-weight: 700;
  line-height: 1;
}

.check-item--unchecked {
  opacity: 0.5;
}

.check-item--unchecked .item-name {
  text-decoration: line-through;
  color: #9CA3AF;
}

.check-item--unchecked .item-price {
  color: #9CA3AF;
}

.note-icon-svg {
  flex-shrink: 0;
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
  font-size: 11px;
  color: #6B7280;
  font-family: "Noto Sans SC", sans-serif;
}

.item-price {
  font-size: 14px;
  font-weight: 600;
  color: #0D9488;
  font-family: "DM Sans", sans-serif;
  flex-shrink: 0;
}

.more-row {
  padding: 4px 0;
  display: flex;
  justify-content: center;
}

.more-text {
  font-size: 12px;
  color: #0D9488;
  font-family: "Noto Sans SC", sans-serif;
}

.note-card {
  display: flex;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(254, 243, 199, 0.4);
  border: 1px solid rgba(253, 230, 138, 0.4);
  backdrop-filter: blur(12px);
}

.note-text {
  font-size: 12px;
  color: #92400E;
  line-height: 1.6;
  font-family: "Noto Sans SC", sans-serif;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.87);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.3);
  padding: 12px 20px 28px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 100;
}

.price-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.price-label-area {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.price-label {
  font-size: 12px;
  color: #6B7280;
  font-family: "Noto Sans SC", sans-serif;
}

.orig-price-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.orig-price {
  font-size: 12px;
  color: #9CA3AF;
  text-decoration: line-through;
  font-family: "DM Sans", sans-serif;
}

.price-value {
  display: flex;
  align-items: flex-end;
  gap: 2px;
}

.price-symbol {
  font-size: 18px;
  font-weight: 700;
  color: #0D9488;
  font-family: "DM Sans", sans-serif;
}

.price-num {
  font-size: 30px;
  font-weight: 700;
  color: #0D9488;
  font-family: "DM Sans", sans-serif;
  letter-spacing: -1px;
  line-height: 1;
}

.btn-row {
  display: flex;
  gap: 12px;
}

.confirm-btn {
  flex: 1;
  height: 50px;
  border-radius: 14px;
  background: linear-gradient(90deg, #0D9488, #14B8A6);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
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
