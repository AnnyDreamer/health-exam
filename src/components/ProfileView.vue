<template>
  <view class="profile-view">
    <!-- 用户信息 -->
    <view class="user-card">
      <view class="avatar">
        <text class="avatar-text">{{ userName.charAt(0) }}</text>
      </view>
      <view class="user-info">
        <text class="user-name">{{ userName }}</text>
        <text class="user-phone">{{ userPhone }}</text>
      </view>
    </view>

    <!-- 菜单 -->
    <view class="menu-section">
      <view class="menu-item" @tap="goTo('/pages/appointment/index')">
        <view class="menu-icon-wrap">
          <CalendarDays :size="18" color="#6B7280" />
        </view>
        <text class="menu-label">我的预约</text>
        <ChevronRight :size="18" color="#D1D5DB" />
      </view>
    </view>

    <view class="menu-section">
      <view class="menu-item">
        <view class="menu-icon-wrap">
          <Settings :size="18" color="#6B7280" />
        </view>
        <text class="menu-label">设置</text>
        <ChevronRight :size="18" color="#D1D5DB" />
      </view>
      <view class="menu-item">
        <view class="menu-icon-wrap">
          <CircleHelp :size="18" color="#6B7280" />
        </view>
        <text class="menu-label">帮助与反馈</text>
        <ChevronRight :size="18" color="#D1D5DB" />
      </view>
    </view>

    <!-- 退出登录 -->
    <view class="logout-btn" @tap="showLogoutConfirm = true">
      <text class="logout-text">退出登录</text>
    </view>

    <!-- 退出登录确认弹窗 -->
    <view v-if="showLogoutConfirm" class="modal-mask">
      <view class="modal-mask-bg" @tap="showLogoutConfirm = false"></view>
      <view class="modal-card">
        <view class="modal-icon-wrap">
          <LogOut :size="28" color="#EF4444" />
        </view>
        <text class="modal-title">退出登录</text>
        <text class="modal-desc">确定要退出当前账号吗？退出后需要重新登录才能使用服务。</text>
        <view class="modal-buttons">
          <view class="modal-btn-cancel" @tap="showLogoutConfirm = false">
            <text class="modal-btn-cancel-text">取消</text>
          </view>
          <view class="modal-btn-confirm" @tap="confirmLogout">
            <text class="modal-btn-confirm-text">确定退出</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { CalendarDays, Settings, CircleHelp, ChevronRight, LogOut } from 'lucide-vue-next';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();

const userName = computed(() => userStore.userName || '用户');
const userPhone = computed(() => {
  const phone = userStore.userInfo?.phone || '';
  return phone ? phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '';
});

function goTo(url: string) {
  uni.navigateTo({ url });
}

const showLogoutConfirm = ref(false);

function confirmLogout() {
  showLogoutConfirm.value = false;
  userStore.logout();
  uni.redirectTo({ url: '/pages/auth/login' });
}
</script>

<style lang="scss" scoped>
.profile-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(20px);
  box-shadow: 0 2px 16px rgba(13, 148, 136, 0.07);
}

.avatar {
  width: 56px;
  height: 56px;
  border-radius: 28px;
  background: linear-gradient(135deg, #0D9488, #14B8A6);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  font-size: 22px;
  color: #fff;
  font-weight: 700;
  font-family: "Noto Sans SC", sans-serif;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-name {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.user-phone {
  font-size: 14px;
  color: #9CA3AF;
  font-family: "DM Sans", sans-serif;
}

.menu-section {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(20px);
  box-shadow: 0 2px 16px rgba(13, 148, 136, 0.07);
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid rgba(240, 240, 240, 0.5);

  &:last-child { border-bottom: none; }
  &:active { background: rgba(255, 255, 255, 0.5); }
}

.menu-icon-wrap {
  width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.menu-label {
  flex: 1;
  font-size: 15px;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.logout-btn {
  height: 48px;
  border-radius: 14px;
  border: 1px solid #EF4444;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 12px;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(20px);

  &:active { opacity: 0.7; }
}

.logout-text {
  font-size: 15px;
  color: #EF4444;
  font-weight: 500;
  font-family: "Noto Sans SC", sans-serif;
}

/* ---- 退出登录弹窗 ---- */
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-mask-bg {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  animation: maskFadeIn 0.2s ease;
}

@keyframes maskFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-card {
  position: relative;
  z-index: 1;
  width: 300px;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 24px;
  padding: 28px 24px 20px;
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  animation: modalSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modalSlideUp {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.modal-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: rgba(239, 68, 68, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.modal-desc {
  font-size: 13px;
  color: #6B7280;
  text-align: center;
  line-height: 1.5;
  font-family: "Noto Sans SC", sans-serif;
}

.modal-buttons {
  width: 100%;
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.modal-btn-cancel {
  flex: 1;
  height: 44px;
  border-radius: 12px;
  background: rgba(243, 244, 246, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;

  &:active { background: rgba(229, 231, 235, 0.9); }
}

.modal-btn-cancel-text {
  font-size: 14px;
  font-weight: 600;
  color: #6B7280;
  font-family: "Noto Sans SC", sans-serif;
}

.modal-btn-confirm {
  flex: 1;
  height: 44px;
  border-radius: 12px;
  background: #EF4444;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 10px rgba(239, 68, 68, 0.25);

  &:active { opacity: 0.9; }
}

.modal-btn-confirm-text {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  font-family: "Noto Sans SC", sans-serif;
}
</style>
