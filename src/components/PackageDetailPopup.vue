<template>
  <view v-if="visible" class="popup-mask">
    <view class="popup-mask-bg" @tap="$emit('close')" @touchmove.prevent></view>
    <view class="popup-sheet" :class="{ 'popup-sheet--show': visible }">
      <!-- 拖拽条 + 关闭 -->
      <view class="sheet-handle-row" @touchmove.prevent>
        <view class="sheet-handle"></view>
      </view>

      <!-- 滚动内容 -->
      <scroll-view scroll-y class="sheet-scroll" :style="{ height: scrollHeight + 'px' }" @touchmove.stop>
        <view class="sheet-content" v-if="pkg">
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

          <!-- 分类展示 -->
          <template v-if="hasCategoryItems">
            <view class="section-header">
              <text class="section-title section-title--standard">常规检查</text>
              <text class="section-count">{{ selectedStandardCount }}/{{ standardItems.length }}项</text>
            </view>
            <view class="items-list">
              <view v-for="item in standardItems" :key="item.id" class="check-item" :class="{ 'check-item--unchecked': !selectedIds.has(item.id) }" @tap="toggleItem(item.id)">
                <view class="check-item-top">
                  <view class="item-checkbox" :class="{ 'item-checkbox--checked': selectedIds.has(item.id) }">
                    <view v-if="selectedIds.has(item.id)" class="checkbox-tick">✓</view>
                  </view>
                  <text class="item-name">{{ item.name }}</text>
                  <text class="item-price">¥{{ item.price }}</text>
                </view>
                <text v-if="item.description" class="item-desc">{{ item.description }}</text>
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
                  <view class="check-item-top">
                    <view class="item-checkbox" :class="{ 'item-checkbox--checked': selectedIds.has(item.id) }">
                      <view v-if="selectedIds.has(item.id)" class="checkbox-tick">✓</view>
                    </view>
                    <text class="item-name">{{ item.name }}</text>
                    <text class="item-price">¥{{ item.price }}</text>
                  </view>
                  <text v-if="item.description" class="item-desc">{{ item.description }}</text>
                  <view v-if="item.aiReason" class="ai-reason">
                    <text class="ai-reason-text">{{ item.aiReason }}</text>
                  </view>
                </view>
              </view>
            </view>
          </template>

          <!-- 普通展示 -->
          <template v-else>
            <text class="items-title">检查项目 ({{ selectedCount }}/{{ pkg.items.length }}项)</text>
            <view class="items-list">
              <view v-for="item in pkg.items" :key="item.id" class="check-item" :class="{ 'check-item--unchecked': !selectedIds.has(item.id) }" @tap="toggleItem(item.id)">
                <view class="check-item-top">
                  <view class="item-checkbox" :class="{ 'item-checkbox--checked': selectedIds.has(item.id) }">
                    <view v-if="selectedIds.has(item.id)" class="checkbox-tick">✓</view>
                  </view>
                  <text class="item-name">{{ item.name }}</text>
                  <text class="item-price">¥{{ item.price }}</text>
                </view>
                <text v-if="item.description" class="item-desc">{{ item.description }}</text>
                <view v-if="item.aiReason" class="ai-reason">
                  <text class="ai-reason-text">{{ item.aiReason }}</text>
                </view>
              </view>
            </view>
          </template>

          <!-- 注意事项 -->
          <view class="note-card" v-if="pkg.notice">
            <Info :size="16" color="#D97706" class="note-icon-svg" />
            <text class="note-text">{{ pkg.notice.join('。') }}。</text>
          </view>
        </view>

        <!-- 底部占位，避免被 bottom-bar 遮挡 -->
        <view :style="{ height: (pkg?.isGroupPackage ? 220 : 140) + 'px' }"></view>
      </scroll-view>

      <!-- 底部操作栏 -->
      <view class="bottom-bar" v-if="pkg" @touchmove.prevent>
        <!-- 团检费用展示 -->
        <template v-if="pkg.isGroupPackage">
          <view class="group-bottom-summary">
            <view class="group-bottom-row">
              <view class="group-bottom-block">
                <text class="group-bottom-label">企业预算</text>
                <text class="group-bottom-value group-bottom-value--ent">¥{{ (pkg.enterpriseBudget || 1000).toLocaleString() }}</text>
              </view>
              <text class="group-bottom-plus">+</text>
              <view class="group-bottom-block">
                <text class="group-bottom-label">员工自付</text>
                <text class="group-bottom-value group-bottom-value--emp">¥{{ employeePayment.toLocaleString() }}</text>
              </view>
            </view>
            <view class="group-bottom-tags">
              <text class="group-bottom-tag">已选 {{ selectedCount }} 项</text>
              <text v-if="aiAddonDiscountedTotal > 0" class="group-bottom-tag group-bottom-tag--discount">AI加项已享{{ Math.round((pkg.aiAddonDiscount || 0.85) * 100) / 10 }}折</text>
              <text v-if="aiAddonDiscountedTotal > 0" class="group-bottom-tag">折后 ¥{{ aiAddonDiscountedTotal.toLocaleString() }}</text>
            </view>
          </view>
        </template>
        <!-- 普通费用展示 -->
        <template v-else>
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
        </template>
        <view class="confirm-btn" @tap="handleConfirm">
          <CalendarCheck :size="18" color="#fff" />
          <text class="confirm-text">立即预约</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Info, CalendarCheck, Sparkles, BrainCircuit } from 'lucide-vue-next';
import { usePackageStore } from '@/stores/package';

const props = defineProps<{
  visible: boolean;
  packageId: string;
}>();

const emit = defineEmits<{
  close: [];
  book: [packageId: string, detail: { employeePayment: number; totalPrice: number; enterpriseCoverage: number; selectedCount: number }];
}>();

const packageStore = usePackageStore();

// 计算滚动区域高度：85vh - handle(40px) - bottomBar(约140px)
const scrollHeight = computed(() => {
  const windowHeight = uni.getSystemInfoSync().windowHeight;
  return windowHeight * 0.85 - 40 - 140;
});

const pkg = computed(() => packageStore.currentPackage);
const selectedIds = ref<Set<string>>(new Set());

// 加载套餐数据
watch(() => props.packageId, async (id) => {
  if (id) {
    try {
      await packageStore.loadPackageDetail(id);
    } catch (e) {
      console.error('加载套餐详情失败:', e);
    }
  }
}, { immediate: true });

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

const calculatedPrice = computed(() => {
  if (!pkg.value) return 0;
  return pkg.value.items
    .filter((item) => selectedIds.value.has(item.id))
    .reduce((sum, item) => sum + (item.price || 0), 0);
});

const selectedCount = computed(() => selectedIds.value.size);

const selectedStandardCount = computed(() =>
  standardItems.value.filter((item) => selectedIds.value.has(item.id)).length,
);

const selectedAiCount = computed(() =>
  aiAddonItems.value.filter((item) => selectedIds.value.has(item.id)).length,
);

const hasCategoryItems = computed(() => {
  if (!pkg.value) return false;
  return pkg.value.items.some((item) => item.category === 'ai-addon');
});

const standardItems = computed(() => {
  if (!pkg.value) return [];
  return pkg.value.items.filter((item) => item.category === 'standard');
});

const aiAddonItems = computed(() => {
  if (!pkg.value) return [];
  return pkg.value.items.filter((item) => item.category === 'ai-addon');
});

// 团检费用计算
const standardTotal = computed(() => {
  if (!pkg.value) return 0;
  return standardItems.value
    .filter((item) => selectedIds.value.has(item.id))
    .reduce((sum, item) => sum + (item.price || 0), 0);
});

const aiAddonOriginalTotal = computed(() => {
  if (!pkg.value) return 0;
  return aiAddonItems.value
    .filter((item) => selectedIds.value.has(item.id))
    .reduce((sum, item) => sum + (item.price || 0), 0);
});

const aiAddonDiscountedTotal = computed(() => {
  const discount = pkg.value?.aiAddonDiscount || 0.85;
  return Math.round(aiAddonOriginalTotal.value * discount);
});

const employeePayment = computed(() => {
  if (!pkg.value?.isGroupPackage) return 0;
  const budget = pkg.value.enterpriseBudget || 1000;
  const total = standardTotal.value + aiAddonDiscountedTotal.value;
  const coverage = Math.min(budget, total);
  return Math.max(0, total - coverage);
});

function handleConfirm() {
  emit('book', props.packageId, {
    employeePayment: employeePayment.value,
    totalPrice: calculatedPrice.value,
    enterpriseCoverage: pkg.value?.isGroupPackage
      ? Math.min(pkg.value.enterpriseBudget || 1000, standardTotal.value + aiAddonDiscountedTotal.value)
      : 0,
    selectedCount: selectedCount.value,
  });
}
</script>

<style lang="scss" scoped>
.popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 200;
  display: flex;
  align-items: flex-end;
}

.popup-mask-bg {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
}

.popup-sheet {
  position: relative;
  z-index: 1;
  width: 100%;
  max-height: 85vh;
  background: linear-gradient(180deg, #E8F5F2 0%, #F0F7F5 100%);
  border-radius: 24px 24px 0 0;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.sheet-handle-row {
  display: flex;
  justify-content: center;
  padding: 12px 0 4px;
}

.sheet-handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: #D1D5DB;
}

.sheet-scroll {
  flex: 1;
  height: 0;
  overflow: scroll;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

.sheet-content {
  padding: 8px 18px 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ---- 套餐头部 ---- */
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

/* ---- 分类区域 ---- */
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

.section-title--standard { color: #6B7280; }
.section-title--ai { color: #0D9488; }

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
  background: rgba(255, 255, 255, 0.33);
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.ai-reason {
  margin-top: 2px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(13, 148, 136, 0.08);
  border-left: 2px solid rgba(13, 148, 136, 0.4);
  width: 100%;
  box-sizing: border-box;
}

.ai-reason-text {
  font-size: 11px;
  color: #4B5563;
  line-height: 1.6;
  font-family: "Noto Sans SC", sans-serif;
}

/* ---- 检查项目 ---- */
.items-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.check-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.33);
  border: 1px solid rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(8px);
}

.check-item-top {
  display: flex;
  align-items: center;
  gap: 10px;
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

.check-item--unchecked .item-desc {
  color: #D1D5DB;
}

.check-item--unchecked .item-price {
  color: #9CA3AF;
}

.note-icon-svg {
  flex-shrink: 0;
}

.item-name {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.item-desc {
  font-size: 11px;
  color: #6B7280;
  font-family: "Noto Sans SC", sans-serif;
  padding-left: 32px;
}

.item-price {
  font-size: 14px;
  font-weight: 600;
  color: #0D9488;
  font-family: "DM Sans", sans-serif;
  flex-shrink: 0;
}

/* ---- 注意事项 ---- */
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

/* ---- 底部栏 ---- */
.bottom-bar {
  padding: 12px 20px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(229, 231, 235, 0.3);
  display: flex;
  flex-direction: column;
  gap: 12px;
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

.confirm-btn {
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

/* 团检底部费用 */
.group-bottom-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-bottom-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.group-bottom-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.group-bottom-label {
  font-size: 11px;
  color: #6B7280;
  font-family: "Noto Sans SC", sans-serif;
}

.group-bottom-value {
  font-size: 24px;
  font-weight: 700;
  font-family: "DM Sans", sans-serif;
  letter-spacing: -0.5px;
  line-height: 1;
}

.group-bottom-value--ent {
  color: #0D9488;
}

.group-bottom-value--emp {
  color: #F59E0B;
}

.group-bottom-plus {
  font-size: 18px;
  font-weight: 600;
  color: #9CA3AF;
  font-family: "DM Sans", sans-serif;
  margin-top: 10px;
}

.group-bottom-tags {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-wrap: wrap;
}

.group-bottom-tag {
  font-size: 10px;
  color: #6B7280;
  background: rgba(107, 114, 128, 0.08);
  padding: 2px 8px;
  border-radius: 4px;
  font-family: "Noto Sans SC", sans-serif;
}

.group-bottom-tag--discount {
  color: #0D9488;
  background: rgba(13, 148, 136, 0.08);
}

.group-bottom-tag--orig {
  color: #9CA3AF;
  text-decoration: line-through;
}

.confirm-text {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  font-family: "Noto Sans SC", sans-serif;
}
</style>
