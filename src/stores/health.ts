import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { HealthData, HealthProfile } from '@/types/health';
import { getHealthData as fetchHealthData, getHealthProfile as fetchHealthProfile } from '@/api/health';

export const useHealthStore = defineStore('health', () => {
  const healthData = ref<HealthData | null>(null);
  const loading = ref(false);

  const hasData = computed(() => healthData.value?.hasData ?? false);
  const score = computed(() => healthData.value?.score);
  const indicators = computed(() => healthData.value?.indicators || []);

  async function loadHealthData() {
    loading.value = true;
    try {
      healthData.value = await fetchHealthData();
    } catch (e) {
      console.error('Failed to load health data:', e);
    } finally {
      loading.value = false;
    }
  }

  // ---- 健康档案 ----
  const profile = ref<HealthProfile | null>(null);
  const profileLoading = ref(false);

  const medicalVisits = computed(() => profile.value?.medicalVisits || []);
  const examRecords = computed(() => profile.value?.examRecords || []);
  const risks = computed(() => profile.value?.risks || []);

  async function loadProfile() {
    profileLoading.value = true;
    try {
      profile.value = await fetchHealthProfile();
    } catch (e) {
      console.error('Failed to load health profile:', e);
    } finally {
      profileLoading.value = false;
    }
  }

  return {
    healthData, loading, hasData, score, indicators, loadHealthData,
    profile, profileLoading, medicalVisits, examRecords, risks, loadProfile,
  };
});
