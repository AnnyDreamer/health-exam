<template>
  <view v-if="visible" class="picker-overlay" @tap.self="$emit('close')">
    <view class="picker-sheet">
      <!-- 顶部把手 -->
      <view class="sheet-handle">
        <view class="handle-bar"></view>
      </view>

      <!-- 标题区 -->
      <view class="sheet-header">
        <text class="sheet-title">选择体检时间</text>
        <text class="sheet-subtitle">请选择您方便的日期和时间段</text>
      </view>

      <!-- 日期选择 -->
      <view class="section">
        <text class="section-label">选择日期</text>
        <scroll-view scroll-x class="date-scroll">
          <view class="date-list">
            <view
              v-for="d in availableDates"
              :key="d.value"
              class="date-card"
              :class="{ 'date-card-active': selectedDate === d.value }"
              @tap="selectedDate = d.value"
            >
              <text class="date-weekday" :class="{ 'text-active': selectedDate === d.value }">{{ d.weekday }}</text>
              <text class="date-day" :class="{ 'text-active': selectedDate === d.value }">{{ d.day }}</text>
              <text class="date-month" :class="{ 'text-active': selectedDate === d.value }">{{ d.month }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 时间段选择 -->
      <view class="section">
        <text class="section-label">选择时间段</text>
        <view class="time-group">
          <text class="time-period">上午</text>
          <view class="time-slots">
            <view
              v-for="t in morningSlots"
              :key="t"
              class="time-slot"
              :class="{ 'time-slot-active': selectedTime === t }"
              @tap="selectedTime = t"
            >
              <text class="time-text" :class="{ 'text-active': selectedTime === t }">{{ t }}</text>
            </view>
          </view>
        </view>
        <view class="time-group">
          <text class="time-period">下午</text>
          <view class="time-slots">
            <view
              v-for="t in afternoonSlots"
              :key="t"
              class="time-slot"
              :class="{ 'time-slot-active': selectedTime === t }"
              @tap="selectedTime = t"
            >
              <text class="time-text" :class="{ 'text-active': selectedTime === t }">{{ t }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 已选摘要 + 确认按钮 -->
      <view class="sheet-footer">
        <view v-if="selectedDate && selectedTime" class="selection-summary">
          <text class="summary-text">{{ summaryText }}</text>
        </view>
        <view
          class="confirm-btn"
          :class="{ 'confirm-btn-disabled': !canConfirm }"
          @tap="handleConfirm"
        >
          <text class="confirm-btn-text">确认预约时间</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm', data: { date: string; time: string }): void;
}>();

const selectedDate = ref('');
const selectedTime = ref('');

const morningSlots = ['08:00-09:00', '09:00-10:00', '10:00-11:00'];
const afternoonSlots = ['13:00-14:00', '14:00-15:00'];

const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

interface DateItem {
  value: string;   // yyyy-MM-dd
  weekday: string;  // 周一
  day: string;      // 12
  month: string;    // 3月
}

const availableDates = computed<DateItem[]>(() => {
  const dates: DateItem[] = [];
  const today = new Date();
  let cursor = new Date(today);
  cursor.setDate(cursor.getDate() + 1); // 从明天开始

  while (dates.length < 7) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, '0');
      const d = String(cursor.getDate()).padStart(2, '0');
      dates.push({
        value: `${y}-${m}-${d}`,
        weekday: weekdayNames[dow],
        day: String(cursor.getDate()),
        month: monthNames[cursor.getMonth()],
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  // 默认选中第一个
  if (dates.length > 0 && !selectedDate.value) {
    selectedDate.value = dates[0].value;
  }

  return dates;
});

const canConfirm = computed(() => selectedDate.value && selectedTime.value);

const summaryText = computed(() => {
  if (!selectedDate.value || !selectedTime.value) return '';
  const parts = selectedDate.value.split('-');
  return `${parseInt(parts[1])}月${parseInt(parts[2])}日 ${selectedTime.value}`;
});

function handleConfirm() {
  if (!canConfirm.value) return;
  emit('confirm', {
    date: selectedDate.value,
    time: selectedTime.value,
  });
}
</script>

<style lang="scss" scoped>
.picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 500;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.picker-sheet {
  width: 100%;
  max-width: 500px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 24px 24px 0 0;
  padding: 0 20px calc(20px + env(safe-area-inset-bottom, 0px));
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.12);
  animation: sheetUp 0.3s ease-out;
}

@keyframes sheetUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.sheet-handle {
  display: flex;
  justify-content: center;
  padding: 12px 0 4px;
}

.handle-bar {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: #D1D5DB;
}

.sheet-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sheet-title {
  font-size: 20px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.sheet-subtitle {
  font-size: 13px;
  color: #6B7280;
  font-family: "Noto Sans SC", sans-serif;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  font-family: "Noto Sans SC", sans-serif;
}

/* 日期横向滚动 */
.date-scroll {
  white-space: nowrap;
  width: 100%;

  ::-webkit-scrollbar {
    display: none;
  }
}

.date-list {
  display: inline-flex;
  gap: 10px;
  padding: 2px 0;
}

.date-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 68px;
  height: 84px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.7);
  border: 1.5px solid rgba(209, 213, 219, 0.4);
  flex-shrink: 0;
  transition: all 0.2s ease;

  &:active {
    transform: scale(0.96);
  }
}

.date-card-active {
  background: #0D9488;
  border-color: #0D9488;
  box-shadow: 0 4px 14px rgba(13, 148, 136, 0.3);
}

.date-weekday {
  font-size: 12px;
  color: #6B7280;
  font-family: "Noto Sans SC", sans-serif;
  font-weight: 500;
}

.date-day {
  font-size: 22px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "DM Sans", sans-serif;
}

.date-month {
  font-size: 11px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

.text-active {
  color: #fff !important;
}

/* 时间段 */
.time-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.time-period {
  font-size: 12px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
  font-weight: 500;
}

.time-slots {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.time-slot {
  flex: 1;
  min-width: 90px;
  height: 42px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.7);
  border: 1.5px solid rgba(209, 213, 219, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:active {
    transform: scale(0.96);
  }
}

.time-slot-active {
  background: #0D9488;
  border-color: #0D9488;
  box-shadow: 0 4px 14px rgba(13, 148, 136, 0.3);
}

.time-text {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  font-family: "Noto Sans SC", sans-serif;
}

/* 底部 */
.sheet-footer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 4px;
}

.selection-summary {
  display: flex;
  align-items: center;
  justify-content: center;
}

.summary-text {
  font-size: 14px;
  font-weight: 600;
  color: #0D9488;
  font-family: "Noto Sans SC", sans-serif;
}

.confirm-btn {
  width: 100%;
  height: 50px;
  border-radius: 16px;
  background: linear-gradient(180deg, #0D9488, #0B7C72);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(13, 148, 136, 0.3);
  transition: opacity 0.2s ease;

  &:active {
    opacity: 0.85;
  }
}

.confirm-btn-disabled {
  background: #D1D5DB;
  box-shadow: none;
}

.confirm-btn-text {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  font-family: "Noto Sans SC", sans-serif;
}
</style>
