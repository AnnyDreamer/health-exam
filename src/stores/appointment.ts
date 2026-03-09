import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Appointment } from '@/types/appointment';
import {
  getAppointmentList,
  getAppointmentDetail as fetchDetail,
  createAppointment as apiCreate,
  cancelAppointment as apiCancel,
} from '@/api/appointment';
import { useUserStore } from '@/stores/user';

// Storage key 前缀，实际 key 会拼上用户 ID
const APPOINTMENTS_KEY_PREFIX = 'health_exam_appointments_';

function _getStorageKey(): string {
  const userStore = useUserStore();
  const userId = userStore.userInfo?.id || userStore.userInfo?.idCard || 'anonymous';
  return APPOINTMENTS_KEY_PREFIX + userId;
}

export const useAppointmentStore = defineStore('appointment', () => {
  const appointments = ref<Appointment[]>([]);
  const currentAppointment = ref<Appointment | null>(null);
  const loading = ref(false);

  // 初始化时从 storage 恢复预约数据
  _restoreAppointments();

  /** 从 storage 恢复预约数据 */
  function _restoreAppointments() {
    try {
      const stored = uni.getStorageSync(_getStorageKey());
      if (stored) {
        appointments.value = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('恢复预约数据失败:', e);
    }
  }

  /** 将预约数据同步写入 storage */
  function _saveAppointments() {
    try {
      uni.setStorageSync(_getStorageKey(), JSON.stringify(appointments.value));
    } catch (e) {
      console.warn('保存预约数据失败:', e);
    }
  }

  async function loadAppointments() {
    loading.value = true;
    // 先恢复当前用户的本地数据（切换用户后需要重新加载）
    _restoreAppointments();
    try {
      const apiList = await getAppointmentList();
      // 合并 API 数据与本地存储的数据（以 API 为主，补充本地独有的）
      const apiIds = new Set(apiList.map((a) => a.id));
      const localOnly = appointments.value.filter((a) => !apiIds.has(a.id));
      appointments.value = [...apiList, ...localOnly];
      _saveAppointments();
    } finally {
      loading.value = false;
    }
  }

  async function loadDetail(id: string) {
    // 优先从本地查找
    const local = appointments.value.find((a) => a.id === id);
    if (local) {
      currentAppointment.value = local;
      return;
    }

    loading.value = true;
    try {
      currentAppointment.value = await fetchDetail(id);
    } finally {
      loading.value = false;
    }
  }

  async function create(data: { packageId: string; date: string; time: string }) {
    const apt = await apiCreate(data);
    appointments.value.push(apt);
    _saveAppointments();
    return apt;
  }

  async function cancel(id: string) {
    await apiCancel(id);
    const apt = appointments.value.find((a) => a.id === id);
    if (apt) apt.status = 'cancelled';
    if (currentAppointment.value?.id === id) currentAppointment.value.status = 'cancelled';
    _saveAppointments();
  }

  return { appointments, currentAppointment, loading, loadAppointments, loadDetail, create, cancel };
});
