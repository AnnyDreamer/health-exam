import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { UserInfo } from '@/types/user';
import { getToken, setToken, removeToken, setUser, getUser, clearAll, getGroupPackageConfirmed, setGroupPackageConfirmed, getDataAuth, setDataAuth, removeDataAuth } from '@/utils/storage';

export const useUserStore = defineStore('user', () => {
  const token = ref(getToken());
  const userInfo = ref<UserInfo | null>(getUser<UserInfo>());
  const groupPackageConfirmed = ref(getGroupPackageConfirmed());
  const dataAuthorized = ref(false);

  const isLoggedIn = computed(() => !!token.value);
  const userName = computed(() => userInfo.value?.name || '');
  const hasGroupPackage = computed(() => (userInfo.value?.hasGroupPackage || false) && !groupPackageConfirmed.value);
  const hasPendingPackage = computed(() => userInfo.value?.hasPendingPackage || false);

  function login(data: { token: string; user: UserInfo }) {
    token.value = data.token;
    userInfo.value = data.user;
    setToken(data.token);
    setUser(data.user);
  }

  function checkDataAuth(): boolean {
    const userId = userInfo.value?.id || userInfo.value?.idCard || '';
    if (!userId) return false;
    const record = getDataAuth(userId);
    if (record && record.authorized) {
      dataAuthorized.value = true;
      return true;
    }
    return false;
  }

  function setDataAuthResult(authorized: boolean) {
    const userId = userInfo.value?.id || userInfo.value?.idCard || '';
    if (!userId) return;
    dataAuthorized.value = authorized;
    setDataAuth(userId, { authorized, timestamp: Date.now() });
  }

  function confirmGroupPackage() {
    groupPackageConfirmed.value = true;
    setGroupPackageConfirmed(true);
  }

  function logout() {
    // 清除授权数据（需要在清除 userInfo 之前拿到 userId）
    const userId = userInfo.value?.id || userInfo.value?.idCard || '';
    if (userId) {
      removeDataAuth(userId);
    }
    token.value = '';
    userInfo.value = null;
    groupPackageConfirmed.value = false;
    dataAuthorized.value = false;
    clearAll();
  }

  function updateUser(data: Partial<UserInfo>) {
    if (userInfo.value) {
      userInfo.value = { ...userInfo.value, ...data };
      setUser(userInfo.value);
    }
  }

  return { token, userInfo, isLoggedIn, userName, hasGroupPackage, groupPackageConfirmed, hasPendingPackage, dataAuthorized, login, logout, updateUser, confirmGroupPackage, checkDataAuth, setDataAuthResult };
});
