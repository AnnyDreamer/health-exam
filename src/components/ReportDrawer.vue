<template>
  <view v-if="visible" class="popup-mask">
    <view class="popup-mask-bg" @tap="$emit('close')" @touchmove.prevent></view>
    <view class="popup-sheet" :class="{ 'popup-sheet--show': visible }" :style="{ height: sheetHeight + 'px' }">
      <!-- 拖拽条 -->
      <view class="sheet-handle-row" @touchmove.prevent>
        <view class="sheet-handle"></view>
      </view>

      <!-- 顶部总览卡片（固定，不随滚动） -->
      <view class="overview-card" :class="`overview-card--${urgencyLevel}`">
        <view class="overview-left">
          <text class="overview-status">{{ overviewTitle }}</text>
          <text class="overview-desc">{{ overviewDesc }}</text>
        </view>
      </view>

      <!-- Tab 栏（固定） -->
      <view class="tab-bar">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-item"
          :class="{ 'tab-item--active': activeTab === tab.key }"
          @tap="activeTab = tab.key"
        >
          <text class="tab-label" :class="{ 'tab-label--active': activeTab === tab.key }">{{ tab.label }}<text v-if="tab.badge && tab.badge > 0" class="tab-badge-inline">（{{ tab.badge }}）</text></text>
        </view>
        <view class="tab-indicator" :style="{ transform: `translateX(${tabIndex * 100}%)` }"></view>
      </view>

      <!-- 滚动内容区 -->
      <scroll-view scroll-y class="sheet-scroll" @touchmove.stop>
        <view class="sheet-content">

          <!-- ====== Tab 1: 异常项分析 ====== -->
          <template v-if="activeTab === 'abnormal'">
            <template v-if="hasFollowUpItems">
              <!-- 待就诊 -->
              <view v-if="outpatientItems.length > 0" class="category-section category-section--outpatient">
                <view class="category-row" @tap="toggleExpand('outpatient')">
                  <view class="category-left">
                    <view class="category-dot category-dot--outpatient"></view>
                    <text class="category-name">待就诊（{{ outpatientItems.length }}）</text>
                  </view>
                  <view class="category-arrow" :class="{ 'category-arrow--expanded': expandedMap.outpatient }">
                    <ChevronDown :size="16" color="#9CA3AF" />
                  </view>
                </view>
                <view v-if="expandedMap.outpatient" class="category-items">
                  <view v-for="(item, idx) in outpatientItems" :key="'o-' + idx" class="detail-item detail-item--outpatient">
                    <view class="detail-item-head">
                      <view class="detail-idx detail-idx--outpatient">{{ idx + 1 }}</view>
                      <text class="detail-name">{{ item.name }}</text>
                      <text v-if="item.department" class="detail-dept">{{ item.department }}</text>
                    </view>
                    <text class="detail-reason">{{ item.reason }}</text>
                    <view class="detail-time-row">
                      <text class="detail-time-label">建议就诊时间</text>
                      <text class="detail-time-value">{{ item.suggestedTime }}</text>
                    </view>
                  </view>
                </view>
              </view>

              <!-- 需复查 -->
              <view v-if="recheckItems.length > 0" class="category-section category-section--recheck">
                <view class="category-row" @tap="toggleExpand('recheck')">
                  <view class="category-left">
                    <view class="category-dot category-dot--recheck"></view>
                    <text class="category-name">需复查（{{ recheckItems.length }}）</text>
                  </view>
                  <view class="category-arrow" :class="{ 'category-arrow--expanded': expandedMap.recheck }">
                    <ChevronDown :size="16" color="#9CA3AF" />
                  </view>
                </view>
                <view v-if="expandedMap.recheck" class="category-items">
                  <view v-for="(item, idx) in recheckItems" :key="'r-' + idx" class="detail-item detail-item--recheck">
                    <view class="detail-item-head">
                      <view class="detail-idx detail-idx--recheck">{{ idx + 1 }}</view>
                      <text class="detail-name">{{ item.name }}</text>
                      <text v-if="item.department" class="detail-dept">{{ item.department }}</text>
                    </view>
                    <text class="detail-reason">{{ item.reason }}</text>
                    <view class="detail-time-row">
                      <text class="detail-time-label">建议复查时间</text>
                      <text class="detail-time-value">{{ item.suggestedTime }}</text>
                    </view>
                  </view>
                </view>
              </view>

              <!-- 需关注 -->
              <view v-if="lifestyleItems.length > 0" class="category-section category-section--lifestyle">
                <view class="category-row" @tap="toggleExpand('lifestyle')">
                  <view class="category-left">
                    <view class="category-dot category-dot--lifestyle"></view>
                    <text class="category-name">需关注（{{ lifestyleItems.length }}）</text>
                  </view>
                  <view class="category-arrow" :class="{ 'category-arrow--expanded': expandedMap.lifestyle }">
                    <ChevronDown :size="16" color="#9CA3AF" />
                  </view>
                </view>
                <view v-if="expandedMap.lifestyle" class="category-items">
                  <view v-for="(item, idx) in lifestyleItems" :key="'l-' + idx" class="detail-item detail-item--lifestyle">
                    <view class="detail-item-head">
                      <view class="detail-idx detail-idx--lifestyle">{{ idx + 1 }}</view>
                      <text class="detail-name">{{ item.name }}</text>
                    </view>
                    <text class="detail-reason">{{ item.reason }}</text>
                    <view class="detail-time-row">
                      <text class="detail-time-label">建议时间</text>
                      <text class="detail-time-value">{{ item.suggestedTime }}</text>
                    </view>
                  </view>
                </view>
              </view>
            </template>

            <!-- 无异常 -->
            <view v-else class="empty-state">
              <text class="empty-icon">✓</text>
              <text class="empty-text">各项指标正常，暂无异常项</text>
            </view>
          </template>

          <!-- ====== Tab 2: 健康建议 ====== -->
          <template v-if="activeTab === 'advice'">
            <!-- 饮食建议 -->
            <view v-if="followUpPlan?.dietAdvice" class="advice-section">
              <view class="advice-header advice-header--diet" @tap="toggleExpand('diet')">
                <text class="advice-header-title advice-header-title--diet">饮食注意事项（{{ parseAdviceLines(followUpPlan.dietAdvice).length }}）</text>
                <view class="advice-arrow" :class="{ 'advice-arrow--expanded': expandedMap.diet }">
                  <ChevronDown :size="16" color="#9CA3AF" />
                </view>
              </view>
              <view v-if="expandedMap.diet" class="advice-body">
                <view v-for="(line, i) in parseAdviceLines(followUpPlan.dietAdvice)" :key="'d-' + i" class="advice-line">
                  <view class="advice-bullet advice-bullet--diet"></view>
                  <text class="advice-line-text"><text v-if="line.highlight" class="advice-highlight">{{ line.highlight }}</text>{{ line.highlight ? ' — ' : '' }}{{ line.detail }}</text>
                </view>
              </view>
            </view>

            <!-- 运动建议 -->
            <view v-if="followUpPlan?.exerciseAdvice" class="advice-section">
              <view class="advice-header advice-header--exercise" @tap="toggleExpand('exercise')">
                <text class="advice-header-title advice-header-title--exercise">运动建议（{{ parseAdviceLines(followUpPlan.exerciseAdvice).length }}）</text>
                <view class="advice-arrow" :class="{ 'advice-arrow--expanded': expandedMap.exercise }">
                  <ChevronDown :size="16" color="#9CA3AF" />
                </view>
              </view>
              <view v-if="expandedMap.exercise" class="advice-body">
                <view v-for="(line, i) in parseAdviceLines(followUpPlan.exerciseAdvice)" :key="'e-' + i" class="advice-line">
                  <view class="advice-bullet advice-bullet--exercise"></view>
                  <text class="advice-line-text"><text v-if="line.highlight" class="advice-highlight">{{ line.highlight }}</text>{{ line.highlight ? ' — ' : '' }}{{ line.detail }}</text>
                </view>
              </view>
            </view>

            <!-- 复查就诊建议 -->
            <view v-if="followUpPlan?.medicalAdvice" class="advice-section">
              <view class="advice-header advice-header--medical" @tap="toggleExpand('medical')">
                <text class="advice-header-title advice-header-title--medical">复查就诊建议（{{ parseAdviceLines(followUpPlan.medicalAdvice).length }}）</text>
                <view class="advice-arrow" :class="{ 'advice-arrow--expanded': expandedMap.medical }">
                  <ChevronDown :size="16" color="#9CA3AF" />
                </view>
              </view>
              <view v-if="expandedMap.medical" class="advice-body">
                <view v-for="(line, i) in parseAdviceLines(followUpPlan.medicalAdvice)" :key="'m-' + i" class="advice-line">
                  <view class="advice-bullet advice-bullet--medical"></view>
                  <text class="advice-line-text"><text v-if="line.highlight" class="advice-highlight">{{ line.highlight }}</text>{{ line.highlight ? ' — ' : '' }}{{ line.detail }}</text>
                </view>
              </view>
            </view>

            <!-- 降级：仅有 generalAdvice -->
            <view v-if="!hasStructuredAdvice && followUpPlan?.generalAdvice" class="advice-section">
              <view class="advice-header advice-header--diet" @tap="toggleExpand('general')">
                <text class="advice-header-title advice-header-title--diet">健康建议（{{ parseAdviceLines(followUpPlan.generalAdvice).length }}）</text>
                <view class="advice-arrow" :class="{ 'advice-arrow--expanded': expandedMap.general }">
                  <ChevronDown :size="16" color="#9CA3AF" />
                </view>
              </view>
              <view v-if="expandedMap.general" class="advice-body">
                <view v-for="(line, i) in parseAdviceLines(followUpPlan.generalAdvice)" :key="'g-' + i" class="advice-line">
                  <view class="advice-bullet advice-bullet--diet"></view>
                  <text class="advice-line-text"><text v-if="line.highlight" class="advice-highlight">{{ line.highlight }}</text>{{ line.highlight ? ' — ' : '' }}{{ line.detail }}</text>
                </view>
              </view>
            </view>

            <!-- 无建议 -->
            <view v-if="!hasAdvice" class="empty-state">
              <text class="empty-text">暂无特殊健康建议，请保持良好生活习惯</text>
            </view>
          </template>

          <!-- ====== Tab 3: 复查建议 ====== -->
          <template v-if="activeTab === 'followup'">
            <view class="medical-hint">
              <text class="medical-hint-icon">&#9888;</text>
              <text class="medical-hint-text">根据您的健康风险，按照轻重程度区分<text class="medical-hint-outpatient">门诊就医</text>和<text class="medical-hint-recheck">体检复查</text>路径</text>
            </view>
            <!-- 门诊/体检 子 tab -->
            <view class="fu-sub-tabs">
              <view
                class="fu-sub-tab"
                :class="{ 'fu-sub-tab--active': fuSubTab === 'outpatient' }"
                @tap="fuSubTab = 'outpatient'"
              >
                <text class="fu-sub-tab-text" :class="{ 'fu-sub-tab-text--active': fuSubTab === 'outpatient' }">门诊就医（{{ outpatientItems.length }}）</text>
              </view>
              <view
                class="fu-sub-tab"
                :class="{ 'fu-sub-tab--active': fuSubTab === 'recheck' }"
                @tap="fuSubTab = 'recheck'"
              >
                <text class="fu-sub-tab-text" :class="{ 'fu-sub-tab-text--active': fuSubTab === 'recheck' }">体检复查（{{ recheckItems.length }}）</text>
              </view>
            </view>

            <!-- 门诊就医：按科室分组，含医生和挂号费 -->
            <template v-if="fuSubTab === 'outpatient'">
              <view v-if="outpatientItems.length === 0" class="fu-empty">
                <text class="fu-empty-text">暂无门诊就医建议</text>
              </view>
              <view v-for="(group, dept) in outpatientGrouped" :key="'op-' + dept" class="fu-dept-group">
                <view class="fu-dept-header">
                  <view class="fu-dept-dot"></view>
                  <text class="fu-dept-name">{{ dept }}</text>
                  <text class="fu-dept-count">{{ group.length }}项</text>
                </view>
                <view class="fu-dept-items">
                  <view v-for="(item, idx) in group" :key="'op-' + idx" class="fu-item">
                    <view class="fu-item-top">
                      <text class="fu-item-name">{{ item.name }}</text>
                      <view v-if="item.registrationFee" class="fu-fee-tag" :class="fuFeeTagClass(item.feeType)">
                        <text class="fu-fee-tag-text" :class="fuFeeTagTextClass(item.feeType)">{{ item.feeType || '专家号' }} ¥{{ item.registrationFee }}</text>
                      </view>
                    </view>
                    <view class="fu-meta-row">
                      <template v-if="item.doctor">
                        <UserRound :size="12" color="#0D9488" />
                        <text class="fu-doctor">{{ item.doctor }}</text>
                        <text class="fu-meta-sep">|</text>
                      </template>
                      <text class="fu-time-inline-label">建议就诊</text>
                      <text class="fu-time-inline-value">{{ item.suggestedTime }}</text>
                    </view>
                    <view class="fu-type-reason fu-type-reason--outpatient">
                      <text class="fu-type-reason-text">需门诊就医：{{ getTypeReason(item) }}</text>
                    </view>
                  </view>
                </view>
              </view>
            </template>

            <!-- 体检复查：检查项目列表 -->
            <template v-if="fuSubTab === 'recheck'">
              <view v-if="recheckItems.length === 0" class="fu-empty">
                <text class="fu-empty-text">暂无体检复查建议</text>
              </view>
              <view v-for="(item, idx) in recheckItems" :key="'rc-' + idx" class="fu-item fu-item--recheck">
                <view class="fu-item-top">
                  <view class="fu-recheck-index">
                    <text class="fu-recheck-index-text">{{ idx + 1 }}</text>
                  </view>
                  <text class="fu-item-name">{{ item.name }}</text>
                  <view class="fu-time-tag">
                    <text class="fu-time-tag-text">{{ item.suggestedTime }}</text>
                  </view>
                </view>
                <text class="fu-recheck-dept">健康体检中心</text>
                <view class="fu-type-reason fu-type-reason--recheck">
                  <text class="fu-type-reason-text">体检复查即可：{{ getTypeReason(item) }}</text>
                </view>
              </view>
            </template>
          </template>

        </view>

        <!-- 底部占位 -->
        <view :style="{ height: showBookBtn ? '120px' : '40px' }"></view>
      </scroll-view>

      <!-- 底部固定栏 -->
      <view v-if="showBookBtn" class="bottom-bar" @touchmove.prevent>
        <view class="book-btn" @tap="$emit('book', fuSubTab)">
          <CalendarCheck :size="18" color="#fff" />
          <text class="book-btn-text">{{ bookBtnText }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue';
import { ChevronDown, CalendarCheck, UserRound } from 'lucide-vue-next';
import type { FollowUpPlan, FollowUpItem } from '@/types/chat';

const props = defineProps<{
  visible: boolean;
  reportContent: string;
  followUpPlan: FollowUpPlan | null;
}>();

defineEmits<{
  close: [];
  book: [];
}>();

// Tab 状态
const activeTab = ref<'abnormal' | 'advice' | 'followup'>('abnormal');

const adviceTotalCount = computed(() => {
  const plan = props.followUpPlan;
  if (!plan) return 0;
  let count = 0;
  if (plan.dietAdvice) count += parseAdviceLines(plan.dietAdvice).length;
  if (plan.exerciseAdvice) count += parseAdviceLines(plan.exerciseAdvice).length;
  if (plan.medicalAdvice) count += parseAdviceLines(plan.medicalAdvice).length;
  if (!plan.dietAdvice && !plan.exerciseAdvice && !plan.medicalAdvice && plan.generalAdvice) {
    count += parseAdviceLines(plan.generalAdvice).length;
  }
  return count;
});

const tabs = computed(() => {
  const t: { key: 'abnormal' | 'advice' | 'followup'; label: string; badge: number }[] = [
    { key: 'abnormal', label: '异常项分析', badge: props.followUpPlan?.followUpItems.length || 0 },
    { key: 'advice', label: '健康建议', badge: adviceTotalCount.value },
  ];
  const recheckCount = (props.followUpPlan?.followUpItems || []).filter(i => i.type !== 'lifestyle').length;
  if (recheckCount > 0) {
    t.push({ key: 'followup', label: '复查建议', badge: recheckCount });
  }
  return t;
});

const tabIndex = computed(() => {
  const idx = tabs.value.findIndex(t => t.key === activeTab.value);
  return idx >= 0 ? idx : 0;
});

// 固定弹窗高度为 85vh，滚动区用 flex:1 自动填满
const sheetHeight = computed(() => {
  return Math.round(uni.getSystemInfoSync().windowHeight * 0.85);
});

// 展开/收起状态（异常项 + 健康建议）
const expandedMap = reactive<Record<string, boolean>>({
  outpatient: false,
  recheck: false,
  lifestyle: false,
  diet: true,
  exercise: true,
  medical: true,
  general: true,
});

function toggleExpand(key: string) {
  expandedMap[key] = !expandedMap[key];
}

// 打开时重置状态
watch(() => props.visible, (v) => {
  if (v) {
    activeTab.value = 'abnormal';
    expandedMap.outpatient = true;
    expandedMap.recheck = true;
    expandedMap.lifestyle = true;
    expandedMap.diet = true;
    expandedMap.exercise = true;
    expandedMap.medical = true;
    expandedMap.general = true;
  }
});

// 紧急程度（防御性修正）
const urgencyLevel = computed(() => {
  const plan = props.followUpPlan;
  if (!plan) return 'normal';
  const level = plan.urgencyLevel || 'normal';
  if (level === 'normal' && plan.followUpItems.length > 0) {
    if (plan.followUpItems.some((i) => i.type === 'outpatient')) return 'urgent';
    if (plan.followUpItems.some((i) => !i.type || i.type === 'recheck')) return 'soon';
  }
  return level;
});

const overviewTitle = computed(() => {
  const map: Record<string, string> = { urgent: '需要重视', soon: '值得留意', normal: '整体良好' };
  return map[urgencyLevel.value] || '整体良好';
});

const overviewDesc = computed(() => {
  const plan = props.followUpPlan;
  if (!plan || plan.followUpItems.length === 0) return '各项指标基本正常';
  const total = plan.followUpItems.length;
  const out = outpatientItems.value.length;
  const re = recheckItems.value.length;
  const life = lifestyleItems.value.length;
  const parts: string[] = [];
  if (out > 0) parts.push(`${out}项需就诊`);
  if (re > 0) parts.push(`${re}项需复查`);
  if (life > 0) parts.push(`${life}项需关注`);
  return `共 ${total} 项异常，${parts.join('、')}`;
});

const urgencyIcon = computed(() => {
  const map: Record<string, string> = { urgent: '⚠', soon: '🔔', normal: '✓' };
  return map[urgencyLevel.value] || '✓';
});

const hasFollowUpItems = computed(() =>
  (props.followUpPlan?.followUpItems.length || 0) > 0,
);

// 健康建议
const hasStructuredAdvice = computed(() =>
  !!(props.followUpPlan?.dietAdvice || props.followUpPlan?.exerciseAdvice || props.followUpPlan?.medicalAdvice),
);
const hasAdvice = computed(() =>
  hasStructuredAdvice.value || !!props.followUpPlan?.generalAdvice,
);

/** 去除 emoji */
function stripEmoji(str: string): string {
  return str.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '').trim();
}

/** 解析建议文本为行列表，拆分重点和说明 */
function parseAdviceLines(text: string): Array<{ highlight: string; detail: string }> {
  if (!text) return [];
  return text
    .split('\n')
    .map((line) => stripEmoji(line.replace(/^[•\-\*]\s*/, '').trim()))
    .filter(Boolean)
    .map((line) => {
      // 按 "——" 或 "—" 分割：前半为重点，后半为说明
      const sep = line.indexOf('——') !== -1 ? '——' : line.indexOf('—') !== -1 ? '—' : null;
      if (sep) {
        const idx = line.indexOf(sep);
        return { highlight: line.slice(0, idx).trim(), detail: line.slice(idx + sep.length).trim() };
      }
      return { highlight: '', detail: line };
    });
}

// 底部按钮
const showBookBtn = computed(() =>
  activeTab.value === 'followup' && !!(props.followUpPlan?.needFollowUp && (props.followUpPlan?.followUpItems.length || 0) > 0),
);

const bookBtnText = computed(() =>
  fuSubTab.value === 'outpatient' ? '预约挂号' : '预约体检',
);

// ====== 复查建议 Tab ======

/** 默认医生名映射 */
const defaultDoctors: Record<string, string> = {
  '心血管内科': '王建华 主任医师',
  '呼吸科': '陈志强 副主任医师',
  '呼吸内科': '陈志强 副主任医师',
  '内分泌科': '李慧敏 主任医师',
  '消化内科': '张国栋 副主任医师',
  '肝病科': '刘文斌 主任医师',
  '神经内科': '赵明辉 主任医师',
  '骨科': '孙卫东 副主任医师',
  '眼科': '吴丽华 主任医师',
  '耳鼻喉科': '钱锋 副主任医师',
  '检验科': '杨德明 主任医师',
  '健康管理中心': '杨德明 主任医师',
};

/** 补充缺失的 doctor / registrationFee / feeType */
const normalizedFollowUpItems = computed<FollowUpItem[]>(() => {
  return (props.followUpPlan?.followUpItems || [])
    .filter(i => i.type !== 'lifestyle')
    .map((item) => {
      const type = item.type || 'recheck';
      const defaultFee = type === 'outpatient' ? 50 : 25;
      const defaultFeeType = type === 'outpatient' ? '专家号' : '普通号';
      let fallbackDoctor = defaultDoctors[item.department] || '';
      if (!fallbackDoctor) {
        for (const [key, val] of Object.entries(defaultDoctors)) {
          if (item.department?.includes(key) || key.includes(item.department)) {
            fallbackDoctor = val;
            break;
          }
        }
      }
      if (!fallbackDoctor) fallbackDoctor = '专家门诊';
      return {
        ...item,
        type,
        doctor: item.doctor || fallbackDoctor,
        registrationFee: typeof item.registrationFee === 'number' ? item.registrationFee : defaultFee,
        feeType: item.feeType || (defaultFeeType as FollowUpItem['feeType']),
      };
    });
});

/** 门诊 / 体检复查 子 tab */
const fuSubTab = ref<'outpatient' | 'recheck'>('outpatient');

/** 根据 type 生成就医路径说明，优先用 typeReason，否则用 reason 拼接 */
function getTypeReason(item: FollowUpItem): string {
  if (item.typeReason) return item.typeReason;
  const brief = item.reason || item.name;
  if (item.type === 'outpatient') return `${brief}，需医生面诊评估`;
  return `${brief}，定期监测即可`;
}

/** 门诊就医项 */
const outpatientItems = computed(() =>
  normalizedFollowUpItems.value.filter(i => i.type === 'outpatient'),
);

/** 体检复查项 */
const recheckItems = computed(() =>
  normalizedFollowUpItems.value.filter(i => i.type === 'recheck' || !i.type),
);

/** 需关注（生活方式调整） — 异常项分析 tab 用 */
const lifestyleItems = computed(() =>
  (props.followUpPlan?.followUpItems || []).filter(i => i.type === 'lifestyle'),
);

/** 门诊项按科室分组 */
const outpatientGrouped = computed(() => {
  const map: Record<string, FollowUpItem[]> = {};
  for (const item of outpatientItems.value) {
    const dept = item.department || '其他';
    if (!map[dept]) map[dept] = [];
    map[dept].push(item);
  }
  return map;
});

// 默认选中有数据的子 tab
watch(normalizedFollowUpItems, (items) => {
  const hasOutpatient = items.some(i => i.type === 'outpatient');
  const hasRecheck = items.some(i => i.type !== 'outpatient');
  if (!hasOutpatient && hasRecheck) fuSubTab.value = 'recheck';
  else fuSubTab.value = 'outpatient';
}, { immediate: true });

function fuFeeTagClass(feeType?: string): string {
  if (feeType === '专家号') return 'fu-fee-tag--expert';
  if (feeType === '特需号') return 'fu-fee-tag--special';
  return 'fu-fee-tag--normal';
}

function fuFeeTagTextClass(feeType?: string): string {
  if (feeType === '专家号') return 'fu-fee-tag-text--expert';
  if (feeType === '特需号') return 'fu-fee-tag-text--special';
  return 'fu-fee-tag-text--normal';
}
</script>

<style lang="scss" scoped>
/* ====== 弹窗骨架 ====== */
.popup-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
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
  /* 高度由 :style 绑定固定为 85vh，不再随内容变化 */
  background: linear-gradient(180deg, rgba(240, 253, 250, 0.97) 0%, rgba(255, 255, 255, 0.97) 100%);
  border-radius: 24px 24px 0 0;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 -8px 40px rgba(13, 148, 136, 0.1);
  display: flex;
  flex-direction: column;
  animation: sheetSlideUp 0.35s cubic-bezier(0.33, 1, 0.68, 1);
}

@keyframes sheetSlideUp {
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

/* ====== 总览卡片 ====== */
.overview-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px 0;
  margin: 0;
}

.overview-card--normal {}
.overview-card--soon {}
.overview-card--urgent {}

.overview-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  position: relative;
  z-index: 1;
}

.overview-status {
  font-size: 17px;
  font-weight: 700;
  font-family: "Noto Sans SC", sans-serif;
}

.overview-card--normal .overview-status { color: #0D9488; }
.overview-card--soon .overview-status { color: #D97706; }
.overview-card--urgent .overview-status { color: #DC2626; }

.overview-desc {
  font-size: 12px;
  font-family: "Noto Sans SC", sans-serif;
  line-height: 1.4;
}

.overview-card--normal .overview-desc { color: #0B7C72; }
.overview-card--soon .overview-desc { color: #92400E; }
.overview-card--urgent .overview-desc { color: #991B1B; }

.overview-ring {
  width: 44px;
  height: 44px;
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.overview-ring--normal {
  background: rgba(13, 148, 136, 0.12);
  border: 2px solid rgba(13, 148, 136, 0.25);
}

.overview-ring--soon {
  background: rgba(245, 158, 11, 0.12);
  border: 2px solid rgba(245, 158, 11, 0.25);
}

.overview-ring--urgent {
  background: rgba(239, 68, 68, 0.12);
  border: 2px solid rgba(239, 68, 68, 0.25);
}

.overview-ring-icon {
  font-size: 20px;
}

/* ====== Tab 栏 ====== */
.tab-bar {
  display: flex;
  position: relative;
  margin: 12px 18px 0;
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
  z-index: 1;
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

.tab-badge-inline {
  font-weight: 700;
}

.tab-indicator {
  display: none;
}

/* ====== 滚动区 ====== */
.sheet-scroll {
  flex: 1;
  min-height: 0; /* flex 子元素需要 min-height:0 才能正确收缩 */
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

.sheet-content {
  padding: 14px 18px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ====== 异常项分类 ====== */
.category-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-radius: 14px;
  overflow: hidden;
}

.category-section--outpatient {
  background: rgba(239, 68, 68, 0.06);
  border: 1px solid rgba(239, 68, 68, 0.12);
}

.category-section--recheck {
  background: rgba(245, 158, 11, 0.06);
  border: 1px solid rgba(245, 158, 11, 0.12);
}

.category-section--lifestyle {
  background: rgba(16, 185, 129, 0.06);
  border: 1px solid rgba(16, 185, 129, 0.12);
}

.category-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 14px;
  &:active { opacity: 0.7; }
}

.category-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.category-dot {
  width: 10px;
  height: 10px;
  border-radius: 5px;
  flex-shrink: 0;
}

.category-dot--outpatient { background: #EF4444; box-shadow: 0 0 6px rgba(239, 68, 68, 0.3); }
.category-dot--recheck { background: #F59E0B; box-shadow: 0 0 6px rgba(245, 158, 11, 0.3); }
.category-dot--lifestyle { background: #10B981; box-shadow: 0 0 6px rgba(16, 185, 129, 0.3); }

.category-name {
  font-size: 14px;
  font-weight: 700;
  color: #374151;
  font-family: "Noto Sans SC", sans-serif;
}

.category-count {
  padding: 2px 8px;
  border-radius: 10px;
}

.category-count--outpatient { background: rgba(239, 68, 68, 0.1); }
.category-count--recheck { background: rgba(245, 158, 11, 0.1); }
.category-count--lifestyle { background: rgba(16, 185, 129, 0.1); }

.category-count-text {
  font-size: 12px;
  font-weight: 700;
  font-family: "DM Sans", sans-serif;
}

.category-count--outpatient .category-count-text { color: #EF4444; }
.category-count--recheck .category-count-text { color: #F59E0B; }
.category-count--lifestyle .category-count-text { color: #10B981; }

.category-arrow {
  transition: transform 0.25s ease;
}

.category-arrow--expanded {
  transform: rotate(180deg);
}

.category-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 10px 12px;
}

/* ====== 详情项卡片 ====== */
.detail-item {
  backdrop-filter: blur(20px);
  border-radius: 14px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item--outpatient {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.18);
}

.detail-item--recheck {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.18);
}

.detail-item--lifestyle {
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.18);
}

.detail-item-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-idx {
  width: 22px;
  height: 22px;
  border-radius: 11px;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  font-family: "DM Sans", sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.detail-idx--outpatient { background: #EF4444; box-shadow: 0 2px 6px rgba(239, 68, 68, 0.25); }
.detail-idx--recheck { background: #F59E0B; box-shadow: 0 2px 6px rgba(245, 158, 11, 0.25); }
.detail-idx--lifestyle { background: #10B981; box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25); }

.detail-name {
  font-size: 14px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
  flex: 1;
}

.detail-dept {
  font-size: 11px;
  font-weight: 600;
  color: #0D9488;
  font-family: "Noto Sans SC", sans-serif;
  background: rgba(13, 148, 136, 0.08);
  border: 1px solid rgba(13, 148, 136, 0.12);
  padding: 3px 8px;
  border-radius: 6px;
  flex-shrink: 0;
}

.detail-reason {
  font-size: 12px;
  color: #6B7280;
  line-height: 1.7;
  font-family: "Noto Sans SC", sans-serif;
  padding-left: 30px;
}

.detail-time-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-left: 30px;
  margin-top: 2px;
}

.detail-time-label {
  font-size: 11px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

.detail-time-value {
  font-size: 12px;
  font-weight: 700;
  color: #0D9488;
  font-family: "DM Sans", "Noto Sans SC", sans-serif;
}

/* ====== 空状态 ====== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 48px 0;
}

.empty-icon {
  font-size: 36px;
  opacity: 0.8;
}

.empty-text {
  font-size: 13px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

/* ====== 健康建议（Tab 2） ====== */
.advice-section {
  display: flex;
  flex-direction: column;
  gap: 0;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.35);
  box-shadow: 0 2px 16px rgba(13, 148, 136, 0.04);
}

.advice-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 13px 16px;
  &:active { opacity: 0.7; }
}

.advice-arrow {
  transition: transform 0.25s ease;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.advice-arrow--expanded {
  transform: rotate(180deg);
}

.advice-header--diet {
  background: linear-gradient(90deg, rgba(13, 148, 136, 0.1) 0%, rgba(13, 148, 136, 0.04) 100%);
  border-bottom: 1px solid rgba(13, 148, 136, 0.08);
}

.advice-header--exercise {
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.04) 100%);
  border-bottom: 1px solid rgba(59, 130, 246, 0.08);
}

.advice-header--medical {
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.04) 100%);
  border-bottom: 1px solid rgba(245, 158, 11, 0.08);
}

.advice-header-title {
  font-size: 14px;
  font-weight: 700;
  font-family: "Noto Sans SC", sans-serif;
  flex: 1;
}

.advice-header-title--diet { color: #0D9488; }
.advice-header-title--exercise { color: #3B82F6; }
.advice-header-title--medical { color: #D97706; }

.advice-body {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.advice-line {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.advice-bullet {
  width: 6px;
  height: 6px;
  border-radius: 3px;
  flex-shrink: 0;
  margin-top: 7px;
}

.advice-bullet--diet { background: #0D9488; box-shadow: 0 0 4px rgba(13, 148, 136, 0.3); }
.advice-bullet--exercise { background: #3B82F6; box-shadow: 0 0 4px rgba(59, 130, 246, 0.3); }
.advice-bullet--medical { background: #F59E0B; box-shadow: 0 0 4px rgba(245, 158, 11, 0.3); }

.advice-line-text {
  font-size: 13px;
  color: #6B7280;
  line-height: 1.75;
  font-family: "Noto Sans SC", sans-serif;
}

.advice-highlight {
  font-weight: 700;
  color: #1A1A1A;
}

/* ====== 底部栏 ====== */
.bottom-bar {
  padding: 12px 20px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(229, 231, 235, 0.3);
}

.book-btn {
  height: 50px;
  border-radius: 14px;
  background: linear-gradient(90deg, #0D9488, #14B8A6);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-shadow: 0 4px 16px rgba(13, 148, 136, 0.25);
  &:active { opacity: 0.85; transform: scale(0.99); }
}

.book-btn-text {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  font-family: "Noto Sans SC", sans-serif;
}

/* ====== 复查建议 Tab ====== */

.medical-hint {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  background: rgba(245, 158, 11, 0.06);
  border: 1px solid rgba(245, 158, 11, 0.15);
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 4px;
}

.medical-hint-icon {
  font-size: 14px;
  color: #F59E0B;
  flex-shrink: 0;
  line-height: 1.4;
}

.medical-hint-text {
  font-size: 12px;
  color: #6B7280;
  line-height: 1.5;
  font-family: "Noto Sans SC", sans-serif;
}

.medical-hint-outpatient {
  font-weight: 700;
  color: #EF4444;
}

.medical-hint-recheck {
  font-weight: 700;
  color: #0D9488;
}

/* 门诊/体检 子 Tab */
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

.fu-empty {
  padding: 20px 0;
  text-align: center;
}

.fu-empty-text {
  font-size: 13px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

/* 体检复查序号 */
.fu-recheck-index {
  width: 20px;
  height: 20px;
  border-radius: 10px;
  background: #0D9488;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.fu-recheck-index-text {
  font-size: 11px;
  font-weight: 700;
  color: #FFFFFF;
  font-family: "DM Sans", sans-serif;
}

.fu-item--recheck {
  border-left: 3px solid rgba(13, 148, 136, 0.3);
}

.fu-recheck-dept {
  font-size: 11px;
  color: #0D9488;
  background: rgba(13, 148, 136, 0.06);
  padding: 2px 8px;
  border-radius: 4px;
  align-self: flex-start;
  font-family: "Noto Sans SC", sans-serif;
  font-weight: 500;
}

.fu-dept-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fu-dept-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fu-dept-dot {
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background: #0D9488;
  box-shadow: 0 0 6px rgba(13, 148, 136, 0.3);
  flex-shrink: 0;
}

.fu-dept-name {
  font-size: 14px;
  font-weight: 700;
  color: #374151;
  font-family: "Noto Sans SC", sans-serif;
}

.fu-dept-count {
  font-size: 12px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

.fu-dept-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fu-item {
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fu-item-top {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.fu-item-name {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.fu-fee-tag {
  padding: 1px 6px;
  border-radius: 4px;
  line-height: 1;
}

.fu-fee-tag--normal {
  background: rgba(13, 148, 136, 0.08);
  border: 1px solid rgba(13, 148, 136, 0.15);
}

.fu-fee-tag--expert {
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.15);
}

.fu-fee-tag--special {
  background: rgba(249, 115, 22, 0.08);
  border: 1px solid rgba(249, 115, 22, 0.15);
}

.fu-fee-tag-text {
  font-size: 10px;
  font-weight: 600;
  font-family: "Noto Sans SC", sans-serif;
}

.fu-fee-tag-text--normal { color: #0D9488; }
.fu-fee-tag-text--expert { color: #3B82F6; }
.fu-fee-tag-text--special { color: #F97316; }

.fu-time-tag {
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(13, 148, 136, 0.08);
  border: 1px solid rgba(13, 148, 136, 0.12);
}

.fu-time-tag-text {
  font-size: 11px;
  font-weight: 600;
  color: #0D9488;
  font-family: "Noto Sans SC", sans-serif;
}

.fu-meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.fu-time-inline-label {
  font-size: 11px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

.fu-time-inline-value {
  font-size: 12px;
  font-weight: 700;
  color: #0D9488;
  font-family: "Noto Sans SC", sans-serif;
}

.fu-meta-sep {
  font-size: 11px;
  color: #D1D5DB;
}

.fu-doctor {
  font-size: 12px;
  color: #0D9488;
  font-weight: 500;
  font-family: "Noto Sans SC", sans-serif;
}

.fu-reason-toggle {
  display: flex;
  align-items: center;
  gap: 2px;
}

.fu-reason-toggle-text {
  font-size: 11px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

.fu-arrow-expanded {
  transform: rotate(180deg);
}

.fu-reason-wrap {
  padding: 0;
}

/* 就医路径说明 */
.fu-type-reason {
  padding: 5px 10px;
  border-radius: 8px;
  margin-top: 2px;
}

.fu-type-reason--outpatient {
  background: rgba(239, 68, 68, 0.06);
}

.fu-type-reason--recheck {
  background: rgba(13, 148, 136, 0.06);
}

.fu-type-reason-text {
  font-size: 12px;
  line-height: 1.5;
  font-family: "Noto Sans SC", sans-serif;
}

.fu-type-reason--outpatient .fu-type-reason-text {
  color: #DC2626;
}

.fu-type-reason--recheck .fu-type-reason-text {
  color: #0D9488;
}

.fu-ai-reason {
  background: rgba(13, 148, 136, 0.06);
  border-radius: 8px;
  padding: 8px 10px;
  margin-top: 4px;
}

.fu-ai-reason-label {
  font-size: 12px;
  font-weight: 700;
  color: #0D9488;
  font-family: "Noto Sans SC", sans-serif;
}

.fu-ai-reason-text {
  font-size: 12px;
  color: #374151;
  line-height: 1.7;
  font-family: "Noto Sans SC", sans-serif;
}
</style>
