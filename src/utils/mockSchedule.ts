/**
 * 排班数据生成工具
 *
 * 基于科室名 hash 的确定性伪随机（LCG），保证同科室每次结果一致。
 * 纯工具函数，被组件直接 import，不走 API/mock 层。
 */
import type { FollowUpItem } from '@/types/chat';

export interface TimeSlotStatus {
  time: string;
  available: boolean;
  remainingSlots: number;
}

export interface DaySchedule {
  date: string;
  weekday: string;
  day: string;
  month: string;
  morning: TimeSlotStatus[];
  afternoon: TimeSlotStatus[];
  /** 当日是否停诊 */
  closed: boolean;
}

export interface DoctorSchedule {
  department: string;
  doctor: string;
  schedules: DaySchedule[];
}

const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

const morningSlots = ['08:00-09:00', '09:00-10:00', '10:00-11:00'];
const afternoonSlots = ['13:00-14:00', '14:00-15:00'];

/** 简单字符串 hash */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** LCG 伪随机数生成器 */
function lcg(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/** 获取未来 7 个工作日 */
function getNextWorkdays(count: number): Date[] {
  const dates: Date[] = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() + 1);
  while (dates.length < count) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) {
      dates.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** 科室忙碌模式：上午忙 / 下午忙 / 均匀 */
type BusyPattern = 'morning' | 'afternoon' | 'even';

function getBusyPattern(deptHash: number): BusyPattern {
  const patterns: BusyPattern[] = ['morning', 'afternoon', 'even'];
  return patterns[deptHash % 3];
}

function generateSlots(
  slots: string[],
  rand: () => number,
  isBusy: boolean,
): TimeSlotStatus[] {
  return slots.map((time) => {
    const r = rand();
    // 约满概率：忙时段 ~30%，闲时段 ~15%
    const fullThreshold = isBusy ? 0.3 : 0.15;
    if (r < fullThreshold) {
      return { time, available: false, remainingSlots: 0 };
    }
    // 剩余号源 1-8
    const remaining = Math.floor(rand() * 8) + 1;
    return { time, available: true, remainingSlots: remaining };
  });
}

/** 为单个科室+医生生成排班 */
function generateDoctorSchedule(department: string, doctor: string): DoctorSchedule {
  const seed = hashStr(department + doctor);
  const rand = lcg(seed);
  const pattern = getBusyPattern(hashStr(department));

  // 每周 1 天不出诊（停诊日 index 0-4 对应周一到周五）
  const closedDayIndex = Math.floor(rand() * 5);

  const workdays = getNextWorkdays(7);
  const schedules: DaySchedule[] = workdays.map((d, i) => {
    const closed = i % 5 === closedDayIndex;
    const isMorningBusy = pattern === 'morning' || pattern === 'even';
    const isAfternoonBusy = pattern === 'afternoon' || pattern === 'even';

    return {
      date: formatDate(d),
      weekday: weekdayNames[d.getDay()],
      day: String(d.getDate()),
      month: monthNames[d.getMonth()],
      morning: closed ? morningSlots.map((t) => ({ time: t, available: false, remainingSlots: 0 })) : generateSlots(morningSlots, rand, isMorningBusy),
      afternoon: closed ? afternoonSlots.map((t) => ({ time: t, available: false, remainingSlots: 0 })) : generateSlots(afternoonSlots, rand, isAfternoonBusy),
      closed,
    };
  });

  return { department, doctor, schedules };
}

/**
 * 为选中的复查项目批量生成排班
 * key = "科室-医生"
 */
export function generateScheduleForItems(items: FollowUpItem[]): Map<string, DoctorSchedule> {
  const map = new Map<string, DoctorSchedule>();
  for (const item of items) {
    const key = `${item.department}-${item.doctor || '专家'}`;
    if (!map.has(key)) {
      map.set(key, generateDoctorSchedule(item.department, item.doctor || '专家'));
    }
  }
  return map;
}

/**
 * 合并多个排班的交集：对于每个日期+时段，取所有科室中最小的余号数
 * 如果任一科室停诊，则该天标记停诊
 */
export interface MergedDaySchedule {
  date: string;
  weekday: string;
  day: string;
  month: string;
  morning: TimeSlotStatus[];
  afternoon: TimeSlotStatus[];
  closed: boolean;
  /** 有多少科室当天停诊 */
  closedDepts: string[];
}

export function mergeSchedules(scheduleMap: Map<string, DoctorSchedule>): MergedDaySchedule[] {
  const schedules = Array.from(scheduleMap.values());
  if (schedules.length === 0) return [];

  const base = schedules[0].schedules;
  return base.map((day, dayIdx) => {
    const closedDepts: string[] = [];
    for (const s of schedules) {
      if (s.schedules[dayIdx]?.closed) {
        closedDepts.push(s.department);
      }
    }
    // 如果所有科室都停诊，才标记整天停诊
    const allClosed = closedDepts.length === schedules.length;

    const mergeMorning = day.morning.map((slot, slotIdx) => {
      let minRemaining = slot.remainingSlots;
      let anyUnavailable = !slot.available;
      for (let si = 1; si < schedules.length; si++) {
        const other = schedules[si].schedules[dayIdx]?.morning[slotIdx];
        if (other) {
          if (!other.available) anyUnavailable = true;
          minRemaining = Math.min(minRemaining, other.remainingSlots);
        }
      }
      return {
        time: slot.time,
        available: !anyUnavailable && !allClosed,
        remainingSlots: anyUnavailable || allClosed ? 0 : minRemaining,
      };
    });

    const mergeAfternoon = day.afternoon.map((slot, slotIdx) => {
      let minRemaining = slot.remainingSlots;
      let anyUnavailable = !slot.available;
      for (let si = 1; si < schedules.length; si++) {
        const other = schedules[si].schedules[dayIdx]?.afternoon[slotIdx];
        if (other) {
          if (!other.available) anyUnavailable = true;
          minRemaining = Math.min(minRemaining, other.remainingSlots);
        }
      }
      return {
        time: slot.time,
        available: !anyUnavailable && !allClosed,
        remainingSlots: anyUnavailable || allClosed ? 0 : minRemaining,
      };
    });

    return {
      date: day.date,
      weekday: day.weekday,
      day: day.day,
      month: day.month,
      morning: mergeMorning,
      afternoon: mergeAfternoon,
      closed: allClosed,
      closedDepts,
    };
  });
}
