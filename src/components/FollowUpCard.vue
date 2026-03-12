<template>
  <view class="followup-card">
    <!-- 头部 -->
    <view class="followup-head">
      <text class="followup-title">健康管理方案</text>
      <view class="urgency-badge" :class="urgencyClass">
        <text class="urgency-text">{{ urgencyLabel }}</text>
      </view>
    </view>

    <!-- Tab 栏 -->
    <view v-if="tabs.length > 0" class="tab-bar">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ 'tab-item--active': activeTab === tab.key }"
        @tap="activeTab = tab.key"
      >
        <text class="tab-label" :class="{ 'tab-label--active': activeTab === tab.key }">{{ tab.label }}</text>
      </view>
    </view>

    <!-- Tab 内容 -->
    <view class="tab-content">
      <!-- 风险分析 — 按高/中/低分组折叠 -->
      <view v-if="activeTab === 'risk'" class="advice-panel">
        <view v-for="group in riskGroups" :key="group.level" class="risk-group" :class="'risk-group--' + group.level">
          <!-- 分组头 -->
          <view class="risk-group-header" @tap="toggleRiskGroup(group.level)">
            <view class="risk-dot" :class="'risk-dot--' + group.level"></view>
            <text class="risk-group-label">{{ group.label }}</text>
            <view class="risk-count-badge" :class="'risk-count-badge--' + group.level">
              <text class="risk-count-text" :class="'risk-count-text--' + group.level">{{ group.items.length }}</text>
            </view>
            <text class="risk-arrow">{{ expandedRiskGroups[group.level] ? '▾' : '▸' }}</text>
          </view>
          <!-- 展开项目列表 -->
          <view v-if="expandedRiskGroups[group.level]" class="risk-group-items">
            <view v-for="(item, i) in group.items" :key="'r-' + group.level + '-' + i" class="risk-detail-item" :class="'risk-detail-item--' + group.level">
              <view class="risk-detail-top">
                <view class="risk-detail-num" :class="'risk-detail-num--' + group.level">
                  <text class="risk-detail-num-text">{{ i + 1 }}</text>
                </view>
                <text class="risk-detail-name">{{ item.category }}</text>
              </view>
              <text v-if="item.brief" class="risk-detail-desc">{{ item.brief }}</text>
              <view v-if="item.indicators.length > 0" class="risk-detail-tags">
                <view v-for="(ind, j) in item.indicators" :key="'ri-' + i + '-' + j" class="risk-tag" :class="'risk-tag--' + group.level">
                  <text class="risk-tag-text" :class="'risk-tag-text--' + group.level">{{ ind }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 健康建议（饮食 + 运动合并） -->
      <view v-if="activeTab === 'daily'" class="advice-panel">
        <view v-if="parsedDiet.length > 0" class="advice-card advice-card--diet">
          <view class="advice-card-header advice-card-header--diet">
            <text class="advice-card-title advice-card-title--diet">饮食注意事项（{{ parsedDiet.length }}）</text>
          </view>
          <view class="advice-card-body">
            <view v-for="(line, i) in parsedDiet" :key="'d-' + i" class="advice-line">
              <view class="advice-bullet advice-bullet--diet"></view>
              <text class="advice-line-text">
                <text v-if="line.highlight" class="advice-highlight">{{ line.highlight }}</text>
                <text v-if="line.highlight && line.detail"> — </text>
                <text class="advice-detail">{{ line.detail }}</text>
              </text>
            </view>
          </view>
        </view>
        <view v-if="parsedExercise.length > 0" class="advice-card advice-card--exercise">
          <view class="advice-card-header advice-card-header--exercise">
            <text class="advice-card-title advice-card-title--exercise">运动建议（{{ parsedExercise.length }}）</text>
          </view>
          <view class="advice-card-body">
            <view v-for="(line, i) in parsedExercise" :key="'e-' + i" class="advice-line">
              <view class="advice-bullet advice-bullet--exercise"></view>
              <text class="advice-line-text">
                <text v-if="line.highlight" class="advice-highlight">{{ line.highlight }}</text>
                <text v-if="line.highlight && line.detail"> — </text>
                <text class="advice-detail">{{ line.detail }}</text>
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 复查就医 -->
      <view v-if="activeTab === 'medical'" class="advice-panel">
        <!-- 门诊/体检 子 tab -->
        <view class="fu-sub-tabs">
          <view class="fu-sub-tab" :class="{ 'fu-sub-tab--active': medSubTab === 'outpatient' }" @tap="medSubTab = 'outpatient'">
            <text class="fu-sub-tab-text" :class="{ 'fu-sub-tab-text--active': medSubTab === 'outpatient' }">门诊就医（{{ outpatientItems.length }}）</text>
          </view>
          <view class="fu-sub-tab" :class="{ 'fu-sub-tab--active': medSubTab === 'recheck' }" @tap="medSubTab = 'recheck'">
            <text class="fu-sub-tab-text" :class="{ 'fu-sub-tab-text--active': medSubTab === 'recheck' }">体检复查（{{ recheckOnlyItems.length }}）</text>
          </view>
        </view>

        <!-- 门诊就医 -->
        <template v-if="medSubTab === 'outpatient'">
          <view v-if="outpatientItems.length === 0" class="no-followup">
            <text class="no-followup-text">暂无门诊就医建议</text>
          </view>
          <view v-for="(group, dept) in outpatientGrouped" :key="'op-' + dept" class="followup-dept-group">
            <view class="followup-dept-header">
              <view class="followup-dept-dot"></view>
              <text class="followup-dept-name">{{ dept }}</text>
              <text class="followup-dept-count">{{ group.length }}项</text>
            </view>
            <view class="followup-items">
              <view v-for="(item, idx) in group" :key="'op-' + idx" class="followup-item">
                <view class="item-header">
                  <view class="item-index item-index--outpatient">{{ idx + 1 }}</view>
                  <text class="item-name">{{ item.name }}</text>
                  <text v-if="item.feeType" class="item-fee-tag">{{ item.feeType }} ¥{{ item.registrationFee || 50 }}</text>
                </view>
                <view class="item-time-row">
                  <text class="item-time-label">建议就诊时间</text>
                  <text class="item-time-value">{{ item.suggestedTime }}</text>
                </view>
                <view v-if="item.doctor" class="item-doctor-row">
                  <text class="item-doctor">{{ item.doctor }}</text>
                </view>
                <view class="item-ai-reason">
                  <text class="item-ai-reason-label">AI推荐：</text>
                  <text class="item-ai-reason-text">{{ item.reason }}</text>
                </view>
              </view>
            </view>
          </view>
        </template>

        <!-- 体检复查 -->
        <template v-if="medSubTab === 'recheck'">
          <view v-if="recheckOnlyItems.length === 0" class="no-followup">
            <text class="no-followup-text">暂无体检复查建议</text>
          </view>
          <view class="followup-items">
            <view v-for="(item, idx) in recheckOnlyItems" :key="'rc-' + idx" class="followup-item followup-item--recheck">
              <view class="item-header">
                <view class="item-index">{{ idx + 1 }}</view>
                <text class="item-name">{{ item.name }}</text>
              </view>
              <text v-if="item.department" class="item-dept">{{ item.department }}</text>
              <view class="item-time-row">
                <text class="item-time-label">建议时间</text>
                <text class="item-time-value">{{ item.suggestedTime }}</text>
              </view>
              <view class="item-ai-reason">
                <text class="item-ai-reason-label">AI推荐：</text>
                <text class="item-ai-reason-text">{{ item.reason }}</text>
              </view>
            </view>
          </view>
        </template>
      </view>

      <!-- 降级：仅 generalAdvice -->
      <view v-if="activeTab === 'general'" class="advice-panel">
        <view class="advice-card advice-card--diet">
          <view class="advice-card-header advice-card-header--diet">
            <text class="advice-card-title advice-card-title--diet">健康建议</text>
          </view>
          <view class="advice-card-body">
            <view v-for="(line, i) in parsedGeneral" :key="'g-' + i" class="advice-line">
              <view class="advice-bullet advice-bullet--diet"></view>
              <text class="advice-line-text">
                <text v-if="line.highlight" class="advice-highlight">{{ line.highlight }}</text>
                <text v-if="line.highlight && line.detail"> — </text>
                <text class="advice-detail">{{ line.detail }}</text>
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 无任何建议 -->
    <view v-if="tabs.length === 0" class="no-followup">
      <text class="no-followup-text">各项指标正常，暂无需复查项目</text>
    </view>

    <!-- 操作按钮 -->
    <view v-if="activeTab === 'medical' && plan.needFollowUp && plan.followUpItems.length > 0" class="followup-actions">
      <view class="book-btn" @tap.stop="$emit('book')">
        <text class="book-btn-text">{{ medSubTab === 'outpatient' ? '预约挂号' : '预约体检' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { FollowUpPlan } from '@/types/chat';

const props = defineProps<{
  plan: FollowUpPlan;
}>();

defineEmits(['book']);

const activeTab = ref('');

interface TabItem {
  key: string;
  label: string;
}

/** 门诊/体检 子 tab */
const medSubTab = ref<'outpatient' | 'recheck'>('outpatient');

const outpatientItems = computed(() =>
  props.plan.followUpItems.filter(i => i.type === 'outpatient'),
);
const recheckOnlyItems = computed(() =>
  props.plan.followUpItems.filter(i => i.type !== 'outpatient'),
);
const outpatientGrouped = computed(() => {
  const map: Record<string, typeof props.plan.followUpItems> = {};
  for (const item of outpatientItems.value) {
    const dept = item.department || '其他';
    if (!map[dept]) map[dept] = [];
    map[dept].push(item);
  }
  return map;
});

// 默认选中有数据的子 tab
watch(() => props.plan.followUpItems, () => {
  const hasOut = outpatientItems.value.length > 0;
  const hasRe = recheckOnlyItems.value.length > 0;
  if (!hasOut && hasRe) medSubTab.value = 'recheck';
  else medSubTab.value = 'outpatient';
}, { immediate: true });

const urgencyClass = computed(() => `urgency-${props.plan.urgencyLevel}`);

const urgencyLabel = computed(() => {
  const map: Record<string, string> = {
    normal: '常规复查',
    soon: '尽快复查',
    urgent: '紧急',
  };
  return map[props.plan.urgencyLevel] || '常规复查';
});

/** 去除 emoji 字符 */
function stripEmoji(str: string): string {
  return str.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '').trim();
}

function parseAdviceLines(text: string): Array<{ highlight: string; detail: string }> {
  if (!text) return [];
  return text
    .split('\n')
    .map((line) => stripEmoji(line.replace(/^[•\-\*]\s*/, '').trim()))
    .filter(Boolean)
    .map((line) => {
      const sep = line.indexOf('——') !== -1 ? '——' : line.indexOf('—') !== -1 ? '—' : null;
      if (sep) {
        const idx = line.indexOf(sep);
        return { highlight: line.slice(0, idx).trim(), detail: line.slice(idx + sep.length).trim() };
      }
      return { highlight: '', detail: line };
    });
}

const parsedDiet = computed(() => parseAdviceLines(props.plan.dietAdvice || ''));
const parsedExercise = computed(() => parseAdviceLines(props.plan.exerciseAdvice || ''));
const parsedMedical = computed(() => parseAdviceLines(props.plan.medicalAdvice || ''));
const parsedGeneral = computed(() => parseAdviceLines(props.plan.generalAdvice || ''));

const hasStructuredAdvice = computed(() =>
  !!(props.plan.dietAdvice || props.plan.exerciseAdvice || props.plan.medicalAdvice),
);

function riskLevelLabel(level: string): string {
  const map: Record<string, string> = { high: '高风险', medium: '中风险', low: '低风险' };
  return map[level] || '中风险';
}

/** 按高/中/低分组风险项 */
interface RiskGroup {
  level: 'high' | 'medium' | 'low';
  label: string;
  items: typeof props.plan.riskItems extends (infer T)[] | undefined ? NonNullable<T>[] : never[];
}
const riskGroups = computed<RiskGroup[]>(() => {
  const all = props.plan.riskItems || [];
  const order: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];
  const labels: Record<string, string> = { high: '高风险', medium: '中风险', low: '低风险' };
  return order
    .map(level => ({ level, label: labels[level], items: all.filter(i => i.level === level) }))
    .filter(g => g.items.length > 0) as RiskGroup[];
});

/** 风险分组折叠状态 */
const expandedRiskGroups = ref<Record<string, boolean>>({});
function toggleRiskGroup(level: string) {
  expandedRiskGroups.value[level] = !expandedRiskGroups.value[level];
}
// 默认展开所有风险分组
watch(() => props.plan.riskItems, () => {
  const groups = riskGroups.value;
  if (groups.length > 0 && Object.keys(expandedRiskGroups.value).length === 0) {
    for (const g of groups) {
      expandedRiskGroups.value[g.level] = true;
    }
  }
}, { immediate: true });

// 动态构建 tab 列表（带条数）
const tabs = computed<TabItem[]>(() => {
  const list: TabItem[] = [];
  if (props.plan.riskItems && props.plan.riskItems.length > 0) {
    list.push({ key: 'risk', label: `风险分析（${props.plan.riskItems.length}）` });
  }
  if (hasStructuredAdvice.value) {
    const dailyCount = parsedDiet.value.length + parsedExercise.value.length;
    if (props.plan.dietAdvice || props.plan.exerciseAdvice) {
      list.push({ key: 'daily', label: `健康建议（${dailyCount}）` });
    }
    const medicalCount = parsedMedical.value.length + props.plan.followUpItems.length;
    if (props.plan.medicalAdvice || props.plan.followUpItems.length > 0) {
      list.push({ key: 'medical', label: `复查就医（${medicalCount}）` });
    }
  } else if (props.plan.generalAdvice) {
    list.push({ key: 'general', label: '健康建议' });
  }
  return list;
});

// 默认选中第一个 tab
watch(tabs, (val) => {
  if (val.length > 0 && !val.find(t => t.key === activeTab.value)) {
    activeTab.value = val[0].key;
  }
}, { immediate: true });
</script>

<style lang="scss" scoped>
.followup-card {
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 6px;
}

/* 头部 */
.followup-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.followup-title {
  font-size: 16px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.urgency-badge {
  padding: 3px 12px;
  border-radius: 8px;
}

.urgency-text {
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  font-family: "Noto Sans SC", sans-serif;
}

.urgency-normal { background: #0D9488; }
.urgency-soon { background: #F59E0B; }
.urgency-urgent { background: #EF4444; }

/* Tab 栏 — 匹配 ReportDrawer 样式 */
.tab-bar {
  display: flex;
  background: rgba(13, 148, 136, 0.08);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(13, 148, 136, 0.15);
  border-radius: 14px;
  padding: 4px;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 0;
  border-radius: 11px;
  transition: all 0.25s ease;
}

.tab-item--active {
  background: #FFFFFF;
  box-shadow: 0 2px 8px rgba(13, 148, 136, 0.12);
}

.tab-label {
  font-size: 12px;
  font-weight: 600;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
  transition: color 0.25s;
}

.tab-label--active {
  color: #0D9488;
}

/* Tab 内容 */
.tab-content {
  min-height: 40px;
}

.advice-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ============================================================
   建议卡片 — 匹配设计稿的 accordion 风格
   ============================================================ */
.advice-card {
  border-radius: 12px;
  background: #FFFFFF;
  border: 1px solid rgba(229, 231, 235, 0.37);
  overflow: hidden;
}

.advice-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
}

.advice-card-header--diet {
  background: linear-gradient(90deg, #F0FDFA 0%, #FFFFFF 100%);
}

.advice-card-header--exercise {
  background: linear-gradient(90deg, #EFF6FF 0%, #FFFFFF 100%);
}

.advice-card-header--medical {
  background: linear-gradient(90deg, #FFF7ED 0%, #FFFFFF 100%);
}

.advice-card-title {
  font-size: 14px;
  font-weight: 600;
  font-family: "Noto Sans SC", sans-serif;
  flex: 1;
}

.advice-card-title--diet { color: #0D9488; }
.advice-card-title--exercise { color: #3B82F6; }
.advice-card-title--medical { color: #B45309; }


.advice-card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 14px 14px;
}

.advice-line {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.advice-bullet {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 6px;
}

.advice-bullet--diet { background: #0D9488; }
.advice-bullet--exercise { background: #3B82F6; }
.advice-bullet--medical { background: #F59E0B; }

.advice-line-text {
  font-size: 13px;
  color: #374151;
  line-height: 1.6;
  font-family: "Noto Sans SC", sans-serif;
  flex: 1;
}

.advice-highlight {
  font-weight: 600;
  color: #1A1A1A;
}

.advice-detail {
  color: #6B7280;
}

/* ============================================================
   风险分析 — 匹配设计稿分组折叠卡片
   ============================================================ */
.risk-group {
  border-radius: 12px;
  overflow: hidden;
}

.risk-group--high {
  background: rgba(239, 68, 68, 0.06);
  border: 1px solid rgba(239, 68, 68, 0.12);
}
.risk-group--medium {
  background: rgba(245, 158, 11, 0.06);
  border: 1px solid rgba(245, 158, 11, 0.12);
}
.risk-group--low {
  background: rgba(16, 185, 129, 0.06);
  border: 1px solid rgba(16, 185, 129, 0.12);
}

.risk-group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
}

.risk-dot {
  width: 8px;
  height: 8px;
  border-radius: 4px;
  flex-shrink: 0;
}

.risk-dot--high { background: #EF4444; }
.risk-dot--medium { background: #F59E0B; }
.risk-dot--low { background: #10B981; }

.risk-group-label {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
  flex: 1;
}

.risk-count-badge {
  width: 22px;
  height: 22px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.risk-count-badge--high { background: rgba(239, 68, 68, 0.08); }
.risk-count-badge--medium { background: rgba(245, 158, 11, 0.08); }
.risk-count-badge--low { background: rgba(16, 185, 129, 0.08); }

.risk-count-text {
  font-size: 12px;
  font-weight: 600;
  font-family: "DM Sans", sans-serif;
}

.risk-count-text--high { color: #EF4444; }
.risk-count-text--medium { color: #F59E0B; }
.risk-count-text--low { color: #10B981; }

.risk-arrow {
  font-size: 12px;
  color: #9CA3AF;
  flex-shrink: 0;
  font-family: "Inter", sans-serif;
}

.risk-group-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 10px 10px;
}

/* 展开项 */
.risk-detail-item {
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.risk-detail-item--high { background: rgba(239, 68, 68, 0.04); }
.risk-detail-item--medium { background: rgba(245, 158, 11, 0.04); }
.risk-detail-item--low { background: rgba(16, 185, 129, 0.04); }

.risk-detail-top {
  display: flex;
  align-items: center;
  gap: 6px;
}

.risk-detail-num {
  width: 20px;
  height: 20px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.risk-detail-num--high { background: #EF4444; }
.risk-detail-num--medium { background: #F59E0B; }
.risk-detail-num--low { background: #10B981; }

.risk-detail-num-text {
  font-size: 11px;
  font-weight: 700;
  color: #FFFFFF;
  font-family: "DM Sans", sans-serif;
}

.risk-detail-name {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.risk-detail-desc {
  font-size: 12px;
  color: #6B7280;
  line-height: 1.5;
  font-family: "Noto Sans SC", sans-serif;
}

.risk-detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.risk-tag {
  padding: 3px 0;
}

.risk-tag-text {
  font-size: 11px;
  font-weight: 500;
  font-family: "DM Sans", "Noto Sans SC", sans-serif;
}

.risk-tag-text--high { color: #DC2626; }
.risk-tag-text--medium { color: #B45309; }
.risk-tag-text--low { color: #059669; }

/* ============================================================
   复查项目列表
   ============================================================ */
.followup-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.followup-item {
  background: #FFFFFF;
  border: 1px solid rgba(229, 231, 235, 0.37);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-index {
  width: 22px;
  height: 22px;
  border-radius: 11px;
  background: #F59E0B;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  font-family: "DM Sans", sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.item-name {
  font-size: 14px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
  flex: 1;
}

.item-dept {
  font-size: 11px;
  color: #0D9488;
  font-family: "Noto Sans SC", sans-serif;
  background: rgba(13, 148, 136, 0.08);
  padding: 2px 8px;
  border-radius: 6px;
  flex-shrink: 0;
  font-weight: 500;
}

.item-reason {
  font-size: 12px;
  color: #6B7280;
  line-height: 1.5;
  font-family: "Noto Sans SC", sans-serif;
  padding-left: 30px;
}

.item-time-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-left: 30px;
}

.item-time-label {
  font-size: 11px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

.item-time-value {
  font-size: 12px;
  font-weight: 700;
  color: #0D9488;
  font-family: "Noto Sans SC", sans-serif;
}

/* 无需复查 */
.no-followup {
  padding: 12px 0;
  text-align: center;
}

.no-followup-text {
  font-size: 13px;
  color: #0D9488;
  font-family: "Noto Sans SC", sans-serif;
}

/* 门诊/体检 二级 Tab（下划线风格） */
.fu-sub-tabs {
  display: flex;
  border-bottom: 1px solid rgba(229, 231, 235, 0.6);
  margin-bottom: 12px;
}

.fu-sub-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0 10px;
  position: relative;
  transition: all 0.2s ease;
}

.fu-sub-tab--active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 20%;
  right: 20%;
  height: 2px;
  background: #0D9488;
  border-radius: 1px;
}

.fu-sub-tab-text {
  font-size: 13px;
  font-weight: 500;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
  transition: color 0.2s;
}

.fu-sub-tab-text--active {
  color: #0D9488;
  font-weight: 700;
}

/* 门诊科室分组 */
.followup-dept-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.followup-dept-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.followup-dept-dot {
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background: #0D9488;
  flex-shrink: 0;
}

.followup-dept-name {
  font-size: 13px;
  font-weight: 700;
  color: #374151;
  font-family: "Noto Sans SC", sans-serif;
}

.followup-dept-count {
  font-size: 11px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

.item-index--outpatient {
  background: #EF4444;
}

.item-fee-tag {
  font-size: 10px;
  font-weight: 600;
  color: #3B82F6;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.15);
  padding: 1px 6px;
  border-radius: 4px;
  flex-shrink: 0;
  font-family: "Noto Sans SC", sans-serif;
}

.item-doctor-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-left: 30px;
}

.item-doctor {
  font-size: 12px;
  color: #0D9488;
  font-weight: 500;
  font-family: "Noto Sans SC", sans-serif;
}

.followup-item--recheck {
  border-left: 3px solid rgba(13, 148, 136, 0.3);
}

/* AI 推荐理由 */
.item-ai-reason {
  background: rgba(13, 148, 136, 0.06);
  border-radius: 8px;
  padding: 8px 10px;
}

.item-ai-reason-label {
  font-size: 12px;
  font-weight: 700;
  color: #0D9488;
  font-family: "Noto Sans SC", sans-serif;
}

.item-ai-reason-text {
  font-size: 12px;
  color: #374151;
  line-height: 1.7;
  font-family: "Noto Sans SC", sans-serif;
}

/* 操作按钮 */
.followup-actions {
  display: flex;
  justify-content: flex-end;
}

.book-btn {
  padding: 8px 20px;
  border-radius: 12px;
  background: #0D9488;

  &:active { opacity: 0.7; }
}

.book-btn-text {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  font-family: "Noto Sans SC", sans-serif;
}
</style>
