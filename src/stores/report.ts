import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ReportRecord } from '@/types/report';
import { useUserStore } from '@/stores/user';

const REPORTS_KEY_PREFIX = 'health_exam_reports_';

function _getStorageKey(): string {
  const userStore = useUserStore();
  const userId = userStore.userInfo?.id || userStore.userInfo?.idCard || 'anonymous';
  return REPORTS_KEY_PREFIX + userId;
}

export const useReportStore = defineStore('report', () => {
  const reports = ref<ReportRecord[]>([]);

  const sortedReports = computed(() =>
    [...reports.value].sort((a, b) => b.createdAt - a.createdAt),
  );

  _restoreReports();

  function _restoreReports() {
    try {
      const stored = uni.getStorageSync(_getStorageKey());
      if (stored) {
        reports.value = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('恢复报告数据失败:', e);
    }
  }

  function _saveReports() {
    try {
      uni.setStorageSync(_getStorageKey(), JSON.stringify(reports.value));
    } catch (e) {
      console.warn('保存报告数据失败:', e);
    }
  }

  function loadReports() {
    _restoreReports();
  }

  function addReport(record: Omit<ReportRecord, 'id' | 'createdAt'>) {
    const newRecord: ReportRecord = {
      ...record,
      id: `report_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
    };
    reports.value.unshift(newRecord);
    _saveReports();
    return newRecord;
  }

  function getReportById(id: string): ReportRecord | undefined {
    return reports.value.find((r) => r.id === id);
  }

  return { reports, sortedReports, loadReports, addReport, getReportById };
});
