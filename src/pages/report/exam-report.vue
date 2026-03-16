<template>
  <view class="exam-report-page">
    <!-- 顶部卡片：姓名 + 状态 + 日期 -->
    <view class="header-card glass-card">
      <view class="header-icon-wrap">
        <CircleCheckBig :size="22" color="#0D9488" />
      </view>
      <view class="header-info">
        <text class="header-name">{{ patientName }}的体检结果</text>
        <view class="header-meta">
          <view class="header-badge"><text class="header-badge-text">已完成</text></view>
          <text class="header-date">{{ lastCheckDate }} 体检</text>
        </view>
      </view>
    </view>

    <!-- 统计摘要 -->
    <view class="stats-row">
      <view class="stat-card glass-card">
        <text class="stat-num">{{ allIndicators.length }}</text>
        <text class="stat-label">检查项目</text>
      </view>
      <view class="stat-card glass-card">
        <text class="stat-num">{{ normalCount }}</text>
        <text class="stat-label">正常</text>
      </view>
      <view class="stat-card glass-card">
        <text class="stat-num">{{ abnormalCount }}</text>
        <text class="stat-label">异常</text>
      </view>
    </view>

    <!-- 异常项详情 -->
    <view v-if="abnormalIndicators.length > 0" class="glass-card section">
      <view class="section-header" @tap="abnormalExpanded = !abnormalExpanded">
        <view class="section-header-left">
          <view class="section-dot section-dot--warn"></view>
          <text class="section-title">异常项</text>
          <text class="section-title-count">（{{ abnormalCount }}）</text>
        </view>
        <view class="section-arrow" :class="{ 'section-arrow--open': abnormalExpanded }">
          <ChevronDown :size="16" color="#C4C9D4" />
        </view>
      </view>

      <view v-if="abnormalExpanded" class="abnormal-list">
        <view v-for="(ind, i) in abnormalIndicators" :key="'ab-' + i" class="abnormal-card">
          <view class="abnormal-card-top">
            <text class="abnormal-name">{{ ind.name }}</text>
            <text class="abnormal-value">{{ ind.value }} {{ ind.status === 'high' ? '↑' : '↓' }}</text>
            <text v-if="ind.reference" class="abnormal-ref">参考 {{ ind.reference }}</text>
          </view>
          <view v-if="ind.suggestion" class="abnormal-advice">
            <Sparkles :size="12" color="#0D9488" class="advice-icon" />
            <text class="abnormal-advice-text">{{ ind.suggestion }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 全部检查项目（按分类） -->
    <view v-for="(group, gi) in categoryGroups" :key="'g-' + gi" class="glass-card section">
      <view class="section-header" @tap="toggleCategory(group.name)">
        <view class="section-header-left">
          <view class="section-dot" :class="dotClass(group.name)"></view>
          <text class="section-title">{{ group.name }}</text>
          <text class="section-title-count">（{{ group.items.length }}）</text>
        </view>
        <view class="section-arrow" :class="{ 'section-arrow--open': expandedCategories[group.name] }">
          <ChevronDown :size="16" color="#C4C9D4" />
        </view>
      </view>

      <view v-if="expandedCategories[group.name]" class="table-wrap">
        <view class="table-header">
          <text class="th th-name">项目</text>
          <text class="th th-result">结果</text>
          <text class="th th-ref">参考值</text>
          <text class="th th-status">状态</text>
        </view>
        <view
          v-for="(ind, ii) in group.items"
          :key="'r-' + ii"
          class="table-row"
        >
          <text class="td td-name">{{ ind.name }}</text>
          <text class="td td-result" :class="{ 'td-result--warn': ind.status !== 'normal' }">{{ ind.value }}{{ ind.status === 'high' ? ' ↑' : ind.status === 'low' ? ' ↓' : '' }}</text>
          <text class="td td-ref">{{ ind.reference || '-' }}</text>
          <view class="td td-status">
            <view v-if="ind.status === 'normal'" class="status-dot status-dot--ok"></view>
            <view v-else class="status-dot status-dot--warn"></view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部占位 -->
    <view class="bottom-spacer"></view>

    <!-- 固定底部按钮 -->
    <view class="fixed-bottom">
      <view class="ai-btn" @tap="goAIInterpret">
        <Sparkles :size="18" color="#fff" />
        <text class="ai-btn-text">AI 报告解读</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { Sparkles, CircleCheckBig, ChevronDown } from 'lucide-vue-next';
import { useHealthStore } from '@/stores/health';
import { useUserStore } from '@/stores/user';
import type { HealthIndicator } from '@/types/health';

const healthStore = useHealthStore();
const userStore = useUserStore();

const patientName = computed(() => userStore.userName || '用户');
const lastCheckDate = computed(() => healthStore.healthData?.lastCheckDate || '');
const allIndicators = computed(() => healthStore.indicators);
const abnormalIndicators = computed(() => allIndicators.value.filter(i => i.status !== 'normal'));
const abnormalCount = computed(() => abnormalIndicators.value.length);
const normalCount = computed(() => allIndicators.value.length - abnormalCount.value);

interface CategoryGroup {
  name: string;
  items: HealthIndicator[];
  abnormalCount: number;
}

const categoryGroups = computed<CategoryGroup[]>(() => {
  const map = new Map<string, HealthIndicator[]>();
  for (const ind of allIndicators.value) {
    const cat = ind.category || '其他检查';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(ind);
  }
  const order = ['实验室检查', '体格检查', '影像检查', '其他检查'];
  return order
    .filter(name => map.has(name))
    .map(name => ({
      name,
      items: map.get(name)!,
      abnormalCount: map.get(name)!.filter(i => i.status !== 'normal').length,
    }));
});

const abnormalExpanded = ref(true);
const expandedCategories = reactive<Record<string, boolean>>({});
categoryGroups.value.forEach(g => { expandedCategories[g.name] = true; });

function dotClass(name: string) {
  if (name === '实验室检查') return 'section-dot--blue';
  if (name === '体格检查') return 'section-dot--green';
  return 'section-dot--purple';
}

function toggleCategory(name: string) {
  expandedCategories[name] = !expandedCategories[name];
}

function goAIInterpret() {
  uni.navigateBack();
  uni.$emit('start-exam-interpret');
}
</script>

<style lang="scss" scoped>
.exam-report-page {
  min-height: 100vh;
  background: linear-gradient(175deg, #B2DFDB 0%, #D5F0EC 15%, #E8F5F2 30%, #F0F7F5 50%, #F5F6FA 70%);
  padding: 14px 14px 0;
}

/* ======== 毛玻璃通用 ======== */
.glass-card {
  background: rgba(255, 255, 255, 0.67);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.75);
  border-radius: 16px;
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.03),
    0 1px 3px rgba(0, 0, 0, 0.02),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

/* ======== 顶部卡片 ======== */
.header-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 16px;
  margin-bottom: 12px;
}

.header-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(13, 148, 136, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.header-name {
  font-size: 16px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-badge {
  padding: 2px 10px;
  border-radius: 6px;
  background: rgba(13, 148, 136, 0.1);
}

.header-badge-text {
  font-size: 11px;
  font-weight: 700;
  color: #0D9488;
  font-family: "Noto Sans SC", sans-serif;
}

.header-date {
  font-size: 12px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

/* ======== 统计行 ======== */
.stats-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.stat-card {
  flex: 1;
  padding: 16px 12px;
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.stat-num {
  font-size: 28px;
  font-weight: 800;
  color: #1A1A1A;
  font-family: "DM Sans", sans-serif;
  line-height: 1;
}

.stat-label {
  font-size: 13px;
  color: #6B7280;
  font-family: "Noto Sans SC", sans-serif;
}

/* ======== 通用 section ======== */
.section {
  padding: 16px;
  margin-bottom: 12px;
}

/* ======== section header ======== */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;

  &--warn { background: #F59E0B; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15); }
  &--blue { background: #3B82F6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); }
  &--green { background: #10B981; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15); }
  &--purple { background: #8B5CF6; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15); }
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.section-title-count {
  font-size: 14px;
  font-weight: 500;
  color: #B0B7C3;
  font-family: "Noto Sans SC", sans-serif;
}

.section-arrow {
  transition: transform 0.25s ease;
  display: flex;
  align-items: center;

  &--open { transform: rotate(180deg); }
}

/* ======== 异常项 ======== */
.abnormal-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.abnormal-card {
  background: transparent;
  border-radius: 0;
  padding: 12px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);

  &:last-child { border-bottom: none; padding-bottom: 0; }
  &:first-child { padding-top: 0; }
}

.abnormal-card-top {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.abnormal-name {
  font-size: 14px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.abnormal-value {
  font-size: 13px;
  font-weight: 700;
  color: #DC2626;
  font-family: "DM Sans", "Noto Sans SC", sans-serif;
}

.abnormal-ref {
  font-size: 12px;
  color: #B0B7C3;
  font-family: "Noto Sans SC", sans-serif;
  margin-left: auto;
}

.abnormal-advice {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(0, 0, 0, 0.04);
}

.advice-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.abnormal-advice-text {
  flex: 1;
  font-size: 12px;
  color: #4B5563;
  line-height: 1.7;
  font-family: "Noto Sans SC", sans-serif;
}

/* ======== 表格 ======== */
.table-wrap {
  margin-top: 14px;
}

.table-header {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
}

.th {
  font-size: 12px;
  color: #B0B7C3;
  font-weight: 500;
  font-family: "Noto Sans SC", sans-serif;
}

.th-name { flex: 2; }
.th-result { flex: 2.2; }
.th-ref { flex: 2; }
.th-status { flex: 0.6; text-align: center; }

.table-row {
  display: flex;
  align-items: center;
  padding: 12px 10px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.03);

  &:last-child { border-bottom: none; }
}

.td {
  font-size: 13px;
  font-family: "Noto Sans SC", sans-serif;
}

.td-name {
  flex: 2;
  font-weight: 600;
  color: #374151;
}

.td-result {
  flex: 2.2;
  color: #374151;
  font-family: "DM Sans", "Noto Sans SC", sans-serif;

  &--warn {
    color: #DC2626;
    font-weight: 700;
  }
}

.td-ref {
  flex: 2;
  color: #C4C9D4;
  font-size: 12px;
}

.td-status {
  flex: 0.6;
  display: flex;
  justify-content: center;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;

  &--ok { background: #10B981; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12); }
  &--warn { background: #F59E0B; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12); }
}

/* ======== 底部 ======== */
.bottom-spacer {
  height: 84px;
}

.fixed-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px calc(env(safe-area-inset-bottom, 0px) + 12px);
  background: linear-gradient(180deg, rgba(240, 247, 245, 0) 0%, rgba(240, 247, 245, 0.9) 35%, rgba(240, 247, 245, 1) 100%);
}

.ai-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 15px;
  border-radius: 16px;
  background: linear-gradient(135deg, #0D9488, #0F766E);
  box-shadow:
    0 6px 20px rgba(13, 148, 136, 0.3),
    0 2px 6px rgba(13, 148, 136, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);

  &:active { transform: scale(0.98); opacity: 0.9; }
}

.ai-btn-text {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  font-family: "Noto Sans SC", sans-serif;
  letter-spacing: 0.5px;
}
</style>
