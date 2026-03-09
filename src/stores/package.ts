import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ExamPackage } from '@/types/package';
import { getPackageList, getPackageDetail as fetchDetail, getGroupPackage } from '@/api/package';

// Storage key 常量
const CUSTOM_PACKAGES_KEY = 'health_exam_custom_packages';

export const usePackageStore = defineStore('package', () => {
  const packages = ref<ExamPackage[]>([]);
  const currentPackage = ref<ExamPackage | null>(null);
  const loading = ref(false);

  /** AI 生成的自定义套餐列表（持久化到 storage） */
  const customPackages = ref<ExamPackage[]>([]);

  // 初始化时从 storage 恢复自定义套餐
  _restoreCustomPackages();

  /** 从 storage 恢复自定义套餐 */
  function _restoreCustomPackages() {
    try {
      const stored = uni.getStorageSync(CUSTOM_PACKAGES_KEY);
      if (stored) {
        customPackages.value = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('恢复自定义套餐数据失败:', e);
    }
  }

  /** 将自定义套餐同步写入 storage */
  function _saveCustomPackages() {
    try {
      uni.setStorageSync(CUSTOM_PACKAGES_KEY, JSON.stringify(customPackages.value));
    } catch (e) {
      console.warn('保存自定义套餐数据失败:', e);
    }
  }

  /** 添加 AI 生成的自定义套餐 */
  function addCustomPackage(pkg: ExamPackage) {
    // 避免重复添加
    const idx = customPackages.value.findIndex((p) => p.id === pkg.id);
    if (idx >= 0) {
      customPackages.value[idx] = pkg;
    } else {
      customPackages.value.push(pkg);
    }
    _saveCustomPackages();
  }

  /**
   * 根据 ID 获取套餐：优先查 customPackages，再查 packages 列表
   * 返回 null 表示本地没有缓存，需要调用 API
   */
  function getPackageById(id: string): ExamPackage | null {
    // 优先查自定义套餐
    const custom = customPackages.value.find((p) => p.id === id);
    if (custom) return custom;
    // 再查已加载的套餐列表
    const fromList = packages.value.find((p) => p.id === id);
    if (fromList) return fromList;
    // 查 currentPackage
    if (currentPackage.value?.id === id) return currentPackage.value;
    return null;
  }

  async function loadPackages() {
    loading.value = true;
    try {
      packages.value = await getPackageList();
    } finally {
      loading.value = false;
    }
  }

  async function loadPackageDetail(id: string) {
    // 优先从本地缓存查找（包括 AI 生成的自定义套餐）
    const cached = getPackageById(id);
    if (cached) {
      currentPackage.value = cached;
      return;
    }

    // 本地没有，走 API
    loading.value = true;
    try {
      currentPackage.value = await fetchDetail(id);
    } finally {
      loading.value = false;
    }
  }

  async function loadGroupPackage() {
    loading.value = true;
    try {
      currentPackage.value = await getGroupPackage();
    } finally {
      loading.value = false;
    }
  }

  return {
    packages,
    currentPackage,
    loading,
    customPackages,
    loadPackages,
    loadPackageDetail,
    loadGroupPackage,
    addCustomPackage,
    getPackageById,
  };
});
