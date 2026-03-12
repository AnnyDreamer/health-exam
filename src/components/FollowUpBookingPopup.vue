<template>
  <view v-if="visible" class="popup-mask">
    <view class="popup-mask-bg" @tap="$emit('close')" @touchmove.prevent></view>
    <view class="popup-sheet" :style="{ height: sheetHeight + 'px' }">
      <!-- 拖拽条 -->
      <view class="sheet-handle-row" @touchmove.prevent>
        <view class="sheet-handle"></view>
      </view>

      <!-- Step 1: 选择复查项目 -->
      <template v-if="step === 1">
        <!-- 标题区 -->
        <view class="header-area">
          <view class="header-icon-wrap">
            <ClipboardCheck :size="20" color="#0D9488" />
          </view>
          <view class="header-text">
            <text class="header-title">复查项目确认</text>
            <text class="header-subtitle">请选择需要预约的复查项目</text>
          </view>
        </view>

        <!-- 项目列表（按科室分组） -->
        <scroll-view scroll-y class="sheet-scroll" @touchmove.stop>
          <view class="sheet-content">
            <view v-for="(group, dept) in groupedItems" :key="dept" class="dept-group">
              <view class="dept-header">
                <view class="dept-dot"></view>
                <text class="dept-name">{{ dept }}</text>
                <text class="dept-count">{{ group.length }}项</text>
              </view>
              <view class="dept-items">
                <view
                  v-for="item in group"
                  :key="item.name"
                  class="item-row"
                  :class="{ 'item-row--unchecked': !selectedSet.has(item.name) }"
                  @tap="toggleItem(item.name)"
                >
                  <view class="item-checkbox" :class="{ 'item-checkbox--checked': selectedSet.has(item.name) }">
                    <text v-if="selectedSet.has(item.name)" class="checkbox-tick">✓</text>
                  </view>
                  <view class="item-info">
                    <view class="item-top">
                      <text class="item-name">{{ item.name }}</text>
                      <view v-if="item.registrationFee" class="fee-tag" :class="feeTagClass(item.feeType)">
                        <text class="fee-tag-text" :class="feeTagTextClass(item.feeType)">{{ item.feeType || '普通号' }} ¥{{ item.registrationFee }}</text>
                      </view>
                      <view v-else-if="item.type === 'lifestyle'" class="fee-tag fee-tag--free">
                        <text class="fee-tag-text fee-tag-text--free">免挂号费</text>
                      </view>
                      <view class="item-time-tag">
                        <text class="item-time-tag-text">{{ item.suggestedTime }}</text>
                      </view>
                    </view>
                    <view v-if="item.doctor" class="item-doctor-row">
                      <UserRound :size="12" color="#0D9488" />
                      <text class="item-doctor">{{ item.doctor }}</text>
                    </view>
                    <view v-if="expandedReasons.has(item.name)" class="item-reason-wrap">
                      <text class="item-reason">{{ item.reason }}</text>
                    </view>
                    <view class="item-reason-toggle" @tap.stop="toggleReason(item.name)">
                      <text class="item-reason-toggle-text">{{ expandedReasons.has(item.name) ? '收起原因' : '查看原因' }}</text>
                      <ChevronDown :size="12" color="#9CA3AF" :class="{ 'reason-arrow-expanded': expandedReasons.has(item.name) }" />
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
          <view style="height: 120px;"></view>
        </scroll-view>

        <!-- 底部栏 Step 1 -->
        <view class="bottom-bar" @touchmove.prevent>
          <view class="step1-summary">
            <text class="summary-label">已选 </text>
            <text class="summary-count">{{ selectedCount }}</text>
            <text class="summary-label"> 项</text>
            <text v-if="totalRegistrationFee > 0" class="summary-label"> · 挂号费 </text>
            <text v-if="totalRegistrationFee > 0" class="summary-fee">¥{{ totalRegistrationFee }}</text>
          </view>
          <view
            class="action-btn"
            :class="{ 'action-btn--disabled': selectedCount === 0 }"
            @tap="goStep2"
          >
            <text class="action-btn-text">下一步</text>
            <ChevronRight :size="18" color="#fff" />
          </view>
        </view>
      </template>

      <!-- Step 2: 选择日期时间 -->
      <template v-if="step === 2">
        <!-- 标题区 -->
        <view class="header-area">
          <view class="header-back" @tap="step = 1">
            <ChevronLeft :size="20" color="#6B7280" />
          </view>
          <view class="header-icon-wrap">
            <CalendarClock :size="20" color="#0D9488" />
          </view>
          <view class="header-text">
            <text class="header-title">选择复查时间</text>
            <text class="header-subtitle">请选择您方便的日期和时间段</text>
          </view>
        </view>

        <scroll-view scroll-y class="sheet-scroll" @touchmove.stop>
          <view class="sheet-content">
            <!-- 多科室排班提示 -->
            <view v-if="scheduleMap.size > 1" class="schedule-hint">
              <AlertCircle :size="14" color="#F59E0B" />
              <text class="schedule-hint-text">已综合 {{ scheduleMap.size }} 个科室排班，仅显示所有科室均可预约的时段</text>
            </view>

            <!-- 日期选择 -->
            <view class="section">
              <text class="section-label">选择日期</text>
              <scroll-view scroll-x class="date-scroll">
                <view class="date-list">
                  <view
                    v-for="d in mergedDays"
                    :key="d.date"
                    class="date-card"
                    :class="{
                      'date-card-active': selectedDate === d.date,
                      'date-card-closed': d.closed,
                    }"
                    @tap="!d.closed && (selectedDate = d.date)"
                  >
                    <text class="date-weekday" :class="{ 'text-active': selectedDate === d.date, 'text-closed': d.closed }">{{ d.weekday }}</text>
                    <text class="date-day" :class="{ 'text-active': selectedDate === d.date, 'text-closed': d.closed }">{{ d.day }}</text>
                    <text class="date-month" :class="{ 'text-active': selectedDate === d.date, 'text-closed': d.closed }">{{ d.month }}</text>
                    <!-- 停诊标记 -->
                    <text v-if="d.closed" class="date-badge-closed">停诊</text>
                    <!-- 紧张标记（有可用但有些约满） -->
                    <view v-else-if="hasTenseSlots(d)" class="date-badge-tense"></view>
                  </view>
                </view>
              </scroll-view>
            </view>

            <!-- 停诊科室提示 -->
            <view v-if="currentDayClosedDepts.length > 0 && !currentDay?.closed" class="closed-dept-hint">
              <AlertCircle :size="13" color="#EF4444" />
              <text class="closed-dept-hint-text">{{ currentDayClosedDepts.join('、') }} 当日停诊，其余科室可预约</text>
            </view>

            <!-- 时间段选择 -->
            <view class="section">
              <text class="section-label">选择时间段</text>
              <view class="time-group">
                <view class="time-period-row">
                  <Sunrise :size="14" color="#F59E0B" />
                  <text class="time-period">上午</text>
                </view>
                <view class="time-slots">
                  <view
                    v-for="slot in currentMorning"
                    :key="slot.time"
                    class="time-slot"
                    :class="{
                      'time-slot-active': selectedTime === slot.time,
                      'time-slot-full': !slot.available,
                    }"
                    @tap="slot.available && (selectedTime = slot.time)"
                  >
                    <text class="time-text" :class="{ 'text-active': selectedTime === slot.time, 'text-closed': !slot.available }">{{ slot.time }}</text>
                    <text v-if="!slot.available" class="slot-status slot-status--full">约满</text>
                    <text v-else-if="slot.remainingSlots <= 2" class="slot-status slot-status--tense">仅剩{{ slot.remainingSlots }}号</text>
                    <text v-else class="slot-status slot-status--ok">余{{ slot.remainingSlots }}号</text>
                  </view>
                </view>
              </view>
              <view class="time-group">
                <view class="time-period-row">
                  <Sunset :size="14" color="#F97316" />
                  <text class="time-period">下午</text>
                </view>
                <view class="time-slots">
                  <view
                    v-for="slot in currentAfternoon"
                    :key="slot.time"
                    class="time-slot"
                    :class="{
                      'time-slot-active': selectedTime === slot.time,
                      'time-slot-full': !slot.available,
                    }"
                    @tap="slot.available && (selectedTime = slot.time)"
                  >
                    <text class="time-text" :class="{ 'text-active': selectedTime === slot.time, 'text-closed': !slot.available }">{{ slot.time }}</text>
                    <text v-if="!slot.available" class="slot-status slot-status--full">约满</text>
                    <text v-else-if="slot.remainingSlots <= 2" class="slot-status slot-status--tense">仅剩{{ slot.remainingSlots }}号</text>
                    <text v-else class="slot-status slot-status--ok">余{{ slot.remainingSlots }}号</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
          <view style="height: 120px;"></view>
        </scroll-view>

        <!-- 底部栏 Step 2 -->
        <view class="bottom-bar" @touchmove.prevent>
          <view v-if="selectedDate && selectedTime" class="selection-summary">
            <CalendarCheck :size="16" color="#0D9488" />
            <text class="summary-text">{{ summaryText }}</text>
            <text v-if="totalRegistrationFee > 0" class="summary-text"> · 挂号费 ¥{{ totalRegistrationFee }}</text>
          </view>
          <view
            class="action-btn"
            :class="{ 'action-btn--disabled': !canConfirm }"
            @tap="handleConfirm"
          >
            <CalendarCheck v-if="canConfirm" :size="18" color="#fff" />
            <text class="action-btn-text">确认预约</text>
          </view>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  ClipboardCheck, CalendarClock, CalendarCheck,
  ChevronDown, ChevronRight, ChevronLeft,
  Sunrise, Sunset, UserRound, AlertCircle,
} from 'lucide-vue-next';
import type { FollowUpPlan, FollowUpItem } from '@/types/chat';
import {
  generateScheduleForItems, mergeSchedules,
  type DoctorSchedule, type MergedDaySchedule, type TimeSlotStatus,
} from '@/utils/mockSchedule';

const props = defineProps<{
  visible: boolean;
  followUpPlan: FollowUpPlan;
}>();

const emit = defineEmits<{
  close: [];
  confirm: [data: { selectedItems: FollowUpItem[]; date: string; time: string; totalRegistrationFee: number }];
}>();

const step = ref(1);
const selectedSet = ref<Set<string>>(new Set());
const expandedReasons = ref<Set<string>>(new Set());
const selectedDate = ref('');
const selectedTime = ref('');

// 排班数据
const scheduleMap = ref<Map<string, DoctorSchedule>>(new Map());
const mergedDays = ref<MergedDaySchedule[]>([]);

const sheetHeight = computed(() => {
  return Math.round(uni.getSystemInfoSync().windowHeight * 0.85);
});

/** 科室 → 默认医生名映射（为缺失 doctor 字段的旧数据提供 fallback） */
const defaultDoctors: Record<string, string> = {
  '心血管内科': '王建华/主任医师',
  '呼吸科': '陈志强/副主任医师',
  '呼吸内科': '陈志强/副主任医师',
  '内分泌科': '李慧敏/主任医师',
  '内分泌科或健康管理中心': '李慧敏/主任医师',
  '消化内科': '张国栋/副主任医师',
  '肝病科': '刘文斌/主任医师',
  '神经内科': '赵明辉/主任医师',
  '骨科': '孙卫东/副主任医师',
  '泌尿外科': '周大伟/副主任医师',
  '眼科': '吴丽华/主任医师',
  '耳鼻喉科': '钱锋/副主任医师',
  '皮肤科': '郑雅琴/副主任医师',
  '妇科': '黄秀兰/主任医师',
  '甲乳外科': '林志远/副主任医师',
  '肾内科': '马文杰/主任医师',
  '血液科': '徐海燕/副主任医师',
  '健康管理中心': '杨德明/主任医师',
};

/** 为旧数据补充缺失的 doctor / registrationFee / feeType */
const normalizedItems = computed<FollowUpItem[]>(() => {
  const items = props.followUpPlan?.followUpItems || [];
  return items.map((item) => {
    const type = item.type || 'recheck';
    const defaultFee = type === 'lifestyle' ? 0 : type === 'outpatient' ? 50 : 25;
    const defaultFeeType = type === 'outpatient' ? '专家号' : '普通号';
    // 根据科室匹配默认医生，如果科室名包含关键词也能匹配
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

// 按科室分组（使用 normalized 数据）
const groupedItems = computed(() => {
  const map: Record<string, FollowUpItem[]> = {};
  for (const item of normalizedItems.value) {
    const dept = (item.type === 'recheck' || !item.type) ? '健康体检中心' : (item.department || '其他');
    if (!map[dept]) map[dept] = [];
    map[dept].push(item);
  }
  return map;
});

const selectedCount = computed(() => selectedSet.value.size);

/** 选中项目的挂号费合计 */
const totalRegistrationFee = computed(() => {
  let total = 0;
  for (const item of normalizedItems.value) {
    if (selectedSet.value.has(item.name)) {
      total += item.registrationFee || 0;
    }
  }
  return total;
});

/** 挂号费 tag 颜色 class */
function feeTagClass(feeType?: string): string {
  if (feeType === '专家号') return 'fee-tag--expert';
  if (feeType === '特需号') return 'fee-tag--special';
  return 'fee-tag--normal';
}

function feeTagTextClass(feeType?: string): string {
  if (feeType === '专家号') return 'fee-tag-text--expert';
  if (feeType === '特需号') return 'fee-tag-text--special';
  return 'fee-tag-text--normal';
}

// 打开时重置状态，默认选中 outpatient/recheck
watch(() => props.visible, (v) => {
  if (v) {
    step.value = 1;
    selectedDate.value = '';
    selectedTime.value = '';
    expandedReasons.value = new Set();
    scheduleMap.value = new Map();
    mergedDays.value = [];
    const defaults = new Set<string>();
    for (const item of normalizedItems.value) {
      if (item.type !== 'lifestyle') {
        defaults.add(item.name);
      }
    }
    selectedSet.value = defaults;
  }
});

function toggleItem(name: string) {
  const s = new Set(selectedSet.value);
  if (s.has(name)) {
    s.delete(name);
  } else {
    s.add(name);
  }
  selectedSet.value = s;
}

function toggleReason(name: string) {
  const s = new Set(expandedReasons.value);
  if (s.has(name)) {
    s.delete(name);
  } else {
    s.add(name);
  }
  expandedReasons.value = s;
}

function goStep2() {
  if (selectedCount.value === 0) return;
  // 生成排班数据
  const selected = normalizedItems.value.filter((i) => selectedSet.value.has(i.name));
  const sMap = generateScheduleForItems(selected);
  scheduleMap.value = sMap;
  mergedDays.value = mergeSchedules(sMap);

  // 默认选中第一个非停诊日
  selectedDate.value = '';
  selectedTime.value = '';
  const firstAvailable = mergedDays.value.find((d) => !d.closed);
  if (firstAvailable) {
    selectedDate.value = firstAvailable.date;
  }

  step.value = 2;
}

// 当前选中日的排班
const currentDay = computed<MergedDaySchedule | undefined>(() => {
  return mergedDays.value.find((d) => d.date === selectedDate.value);
});

const currentMorning = computed<TimeSlotStatus[]>(() => currentDay.value?.morning || []);
const currentAfternoon = computed<TimeSlotStatus[]>(() => currentDay.value?.afternoon || []);

const currentDayClosedDepts = computed<string[]>(() => {
  return currentDay.value?.closedDepts || [];
});

/** 判断某天是否有紧张时段（可用但 remainingSlots <= 2） */
function hasTenseSlots(day: MergedDaySchedule): boolean {
  const all = [...day.morning, ...day.afternoon];
  return all.some((s) => s.available && s.remainingSlots <= 2);
}

// 切换日期时清除时间选择
watch(selectedDate, () => {
  selectedTime.value = '';
});

const canConfirm = computed(() => selectedDate.value && selectedTime.value);

const summaryText = computed(() => {
  if (!selectedDate.value || !selectedTime.value) return '';
  const parts = selectedDate.value.split('-');
  return `${parseInt(parts[1])}月${parseInt(parts[2])}日 ${selectedTime.value}`;
});

function handleConfirm() {
  if (!canConfirm.value) return;
  const selected = normalizedItems.value.filter((i) => selectedSet.value.has(i.name));
  emit('confirm', {
    selectedItems: selected,
    date: selectedDate.value,
    time: selectedTime.value,
    totalRegistrationFee: totalRegistrationFee.value,
  });
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

/* ====== 标题区 ====== */
.header-area {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 18px 14px;
}

.header-back {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: rgba(107, 114, 128, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  &:active { opacity: 0.7; }
}

.header-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: rgba(13, 148, 136, 0.08);
  border: 1px solid rgba(13, 148, 136, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.header-title {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.header-subtitle {
  font-size: 13px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

/* ====== 滚动区 ====== */
.sheet-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

.sheet-content {
  padding: 0 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ====== 科室分组 ====== */
.dept-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dept-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dept-dot {
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background: #0D9488;
  box-shadow: 0 0 6px rgba(13, 148, 136, 0.3);
  flex-shrink: 0;
}

.dept-name {
  font-size: 14px;
  font-weight: 700;
  color: #374151;
  font-family: "Noto Sans SC", sans-serif;
}

.dept-count {
  font-size: 12px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

.dept-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ====== 项目行 ====== */
.item-row {
  display: flex;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  transition: opacity 0.2s;
}

.item-row--unchecked {
  opacity: 0.5;
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
  margin-top: 2px;
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

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.item-top {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.item-name {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

/* ====== 挂号费 Tag ====== */
.fee-tag {
  padding: 1px 6px;
  border-radius: 4px;
  line-height: 1;
}

.fee-tag--normal {
  background: rgba(13, 148, 136, 0.08);
  border: 1px solid rgba(13, 148, 136, 0.15);
}

.fee-tag--expert {
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.15);
}

.fee-tag--special {
  background: rgba(249, 115, 22, 0.08);
  border: 1px solid rgba(249, 115, 22, 0.15);
}

.fee-tag--free {
  background: rgba(107, 114, 128, 0.06);
  border: 1px solid rgba(107, 114, 128, 0.1);
}

.fee-tag-text {
  font-size: 10px;
  font-weight: 600;
  font-family: "Noto Sans SC", sans-serif;
}

.fee-tag-text--normal {
  color: #0D9488;
}

.fee-tag-text--expert {
  color: #3B82F6;
}

.fee-tag-text--special {
  color: #F97316;
}

.fee-tag-text--free {
  color: #9CA3AF;
}

.item-doctor-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.item-doctor {
  font-size: 12px;
  color: #0D9488;
  font-weight: 500;
  font-family: "Noto Sans SC", sans-serif;
}

.item-time-tag {
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(13, 148, 136, 0.08);
  border: 1px solid rgba(13, 148, 136, 0.12);
}

.item-time-tag-text {
  font-size: 11px;
  font-weight: 600;
  color: #0D9488;
  font-family: "Noto Sans SC", sans-serif;
}

.item-reason-wrap {
  padding: 0;
}

.item-reason {
  font-size: 12px;
  color: #6B7280;
  line-height: 1.7;
  font-family: "Noto Sans SC", sans-serif;
}

.item-reason-toggle {
  display: flex;
  align-items: center;
  gap: 2px;
}

.item-reason-toggle-text {
  font-size: 11px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

.reason-arrow-expanded {
  transform: rotate(180deg);
}

/* ====== 底部栏 ====== */
.bottom-bar {
  padding: 12px 20px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(229, 231, 235, 0.3);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.step1-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
}

.summary-label {
  font-size: 13px;
  color: #6B7280;
  font-family: "Noto Sans SC", sans-serif;
}

.summary-count {
  font-size: 18px;
  font-weight: 700;
  color: #0D9488;
  font-family: "DM Sans", sans-serif;
}

.summary-fee {
  font-size: 16px;
  font-weight: 700;
  color: #0D9488;
  font-family: "DM Sans", sans-serif;
}

.action-btn {
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

.action-btn--disabled {
  background: linear-gradient(90deg, #D1D5DB, #E5E7EB);
  box-shadow: none;
}

.action-btn-text {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  font-family: "Noto Sans SC", sans-serif;
}

/* ====== 排班提示 ====== */
.schedule-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.06);
  border: 1px solid rgba(245, 158, 11, 0.12);
}

.schedule-hint-text {
  font-size: 12px;
  color: #92400E;
  font-family: "Noto Sans SC", sans-serif;
  line-height: 1.4;
}

.closed-dept-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.1);
}

.closed-dept-hint-text {
  font-size: 11px;
  color: #DC2626;
  font-family: "Noto Sans SC", sans-serif;
}

/* ====== 日期时间 (Step 2) ====== */
.section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  font-family: "Noto Sans SC", sans-serif;
}

.date-scroll {
  white-space: nowrap;
  width: 100%;
  ::-webkit-scrollbar { display: none; }
}

.date-list {
  display: inline-flex;
  gap: 8px;
  padding: 2px 0;
}

.date-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 64px;
  height: 80px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.6);
  border: 1.5px solid rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(8px);
  flex-shrink: 0;
  transition: all 0.25s ease;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  position: relative;
  &:active { transform: scale(0.95); }
}

.date-card-active {
  background: linear-gradient(135deg, #0D9488, #14B8A6);
  border-color: transparent;
  box-shadow: 0 4px 16px rgba(13, 148, 136, 0.3);
}

.date-card-closed {
  background: rgba(229, 231, 235, 0.4);
  border-color: rgba(209, 213, 219, 0.3);
  opacity: 0.7;
}

.date-weekday {
  font-size: 11px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
  font-weight: 500;
}

.date-day {
  font-size: 22px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "DM Sans", sans-serif;
  line-height: 1.1;
}

.date-month {
  font-size: 10px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

.text-active {
  color: #fff !important;
}

.text-closed {
  color: #9CA3AF !important;
}

.date-badge-closed {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 8px;
  color: #EF4444;
  background: rgba(239, 68, 68, 0.08);
  padding: 1px 4px;
  border-radius: 4px;
  font-family: "Noto Sans SC", sans-serif;
  font-weight: 600;
}

.date-badge-tense {
  position: absolute;
  bottom: 4px;
  width: 6px;
  height: 6px;
  border-radius: 3px;
  background: #F59E0B;
}

.time-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.time-period-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.time-period {
  font-size: 12px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
  font-weight: 500;
}

.time-slots {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.time-slot {
  flex: 1;
  min-width: 88px;
  height: 52px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.6);
  border: 1.5px solid rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  transition: all 0.25s ease;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  &:active { transform: scale(0.96); }
}

.time-slot-active {
  background: linear-gradient(135deg, #0D9488, #14B8A6);
  border-color: transparent;
  box-shadow: 0 4px 16px rgba(13, 148, 136, 0.3);
}

.time-slot-full {
  background: rgba(229, 231, 235, 0.35);
  border-color: rgba(209, 213, 219, 0.3);
  opacity: 0.6;
}

.time-text {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  font-family: "DM Sans", sans-serif;
}

.slot-status {
  font-size: 10px;
  font-family: "Noto Sans SC", sans-serif;
  font-weight: 500;
}

.slot-status--ok {
  color: #0D9488;
}

.slot-status--tense {
  color: #F59E0B;
  font-weight: 600;
}

.slot-status--full {
  color: #9CA3AF;
}

.selection-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(13, 148, 136, 0.06);
  border-radius: 10px;
  border: 1px solid rgba(13, 148, 136, 0.1);
}

.summary-text {
  font-size: 14px;
  font-weight: 600;
  color: #0D9488;
  font-family: "Noto Sans SC", sans-serif;
}
</style>
