<template>
  <view class="page">
    <view class="content">
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
        <view class="menu-item" @tap="goTo('/pages/report/detail?id=report-001')">
          <view class="menu-icon-wrap">
            <FileBarChart :size="18" color="#6B7280" />
          </view>
          <text class="menu-label">健康档案</text>
          <ChevronRight :size="18" color="#D1D5DB" />
        </view>
        <view class="menu-item" @tap="goTo('/pages/report/interpret')">
          <view class="menu-icon-wrap">
            <FileSearch :size="18" color="#6B7280" />
          </view>
          <text class="menu-label">报告解读</text>
          <ChevronRight :size="18" color="#D1D5DB" />
        </view>
        <view class="menu-item" @tap="goTo('/pages/package/list')">
          <view class="menu-icon-wrap">
            <ClipboardList :size="18" color="#6B7280" />
          </view>
          <text class="menu-label">体检套餐</text>
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
      <view class="logout-btn" @tap="handleLogout">
        <text class="logout-text">退出登录</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { CalendarDays, FileBarChart, FileSearch, ClipboardList, Settings, CircleHelp, ChevronRight } from 'lucide-vue-next';
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

function handleLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        userStore.logout();
        uni.redirectTo({ url: '/pages/auth/login' });
      }
    },
  });
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #B2DFDB 0%, #D5F0EC 30%, #E8F5F2 60%, #F0F7F5 100%);
}

.content {
  padding: 16px;
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
</style>
