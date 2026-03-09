<template>
  <view class="page">
    <!-- Tab Bar -->
    <view class="tab-bar">
      <view
        v-for="(tab, i) in tabs"
        :key="i"
        class="tab"
        :class="{ active: activeTab === i }"
        @tap="activeTab = i"
      >
        <text class="tab-text" :class="{ 'tab-active': activeTab === i }">{{ tab }}</text>
      </view>
    </view>

    <!-- 列表 -->
    <view class="list">
      <view v-if="filteredList.length === 0" class="empty">
        <view class="empty-icon-wrap">
          <CalendarX :size="40" color="#D1D5DB" />
        </view>
        <text class="empty-text">暂无{{ tabs[activeTab] }}的预约</text>
      </view>
      <view
        v-for="apt in filteredList"
        :key="apt.id"
        class="apt-card"
        @tap="goDetail(apt.id)"
      >
        <view class="apt-header">
          <text class="apt-name">{{ apt.packageName }}</text>
          <view class="apt-status" :class="'s-' + apt.status">
            <text class="status-text">{{ statusMap[apt.status] }}</text>
          </view>
        </view>
        <view class="apt-info">
          <view class="apt-info-row">
            <Calendar :size="14" color="#9CA3AF" />
            <text class="apt-info-text">{{ apt.date }} {{ apt.time }}</text>
          </view>
          <view class="apt-info-row">
            <MapPin :size="14" color="#9CA3AF" />
            <text class="apt-info-text">{{ apt.location }}</text>
          </view>
        </view>
        <view class="apt-footer">
          <text class="apt-price">¥{{ apt.totalPrice.toLocaleString() }}</text>
          <text class="apt-items">{{ apt.items.length }} 项检查</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { CalendarX, Calendar, MapPin } from 'lucide-vue-next';
import { useAppointmentStore } from '@/stores/appointment';

const store = useAppointmentStore();
const tabs = ['已预约', '已完成'];
const activeTab = ref(0);

const statusMap: Record<string, string> = {
  pending: '已预约',
  confirmed: '已预约',
  completed: '已完成',
  cancelled: '已取消',
};

const statusKeys = ['confirmed', 'completed'];

const filteredList = computed(() => {
  const key = statusKeys[activeTab.value];
  if (key === 'confirmed') {
    // "已预约" tab 包含 pending 和 confirmed
    return store.appointments.filter((a) => a.status === 'pending' || a.status === 'confirmed');
  }
  return store.appointments.filter((a) => a.status === key);
});

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/appointment/detail?id=${id}` });
}

onMounted(() => {
  store.loadAppointments();
});
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #B2DFDB 0%, #D5F0EC 30%, #E8F5F2 60%, #F0F7F5 100%);
}

.tab-bar {
  display: flex;
  padding: 12px 16px;
  gap: 0;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
}

.tab {
  flex: 1;
  text-align: center;
  padding: 8px 0;
  position: relative;

  &.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 25%;
    width: 50%;
    height: 3px;
    background: #0D9488;
    border-radius: 2px;
  }
}

.tab-text {
  font-size: 14px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

.tab-active {
  color: #0D9488;
  font-weight: 600;
}

.list {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 0;
  gap: 12px;
}

.empty-icon-wrap {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-text { font-size: 14px; color: #9CA3AF; font-family: "Noto Sans SC", sans-serif; }

.apt-card {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(20px);
  box-shadow: 0 2px 16px rgba(13, 148, 136, 0.07);

  &:active { background: rgba(255, 255, 255, 0.8); }
}

.apt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.apt-name {
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.apt-status {
  padding: 2px 8px;
  border-radius: 8px;
}

.s-pending { background: rgba(245, 158, 11, 0.125); }
.s-confirmed { background: rgba(34, 197, 94, 0.125); }
.s-completed { background: rgba(99, 102, 241, 0.125); }
.s-cancelled { background: rgba(239, 68, 68, 0.125); }

.status-text {
  font-size: 11px;
  font-weight: 500;
  font-family: "Noto Sans SC", sans-serif;
}

.s-pending .status-text { color: #D97706; }
.s-confirmed .status-text { color: #059669; }
.s-completed .status-text { color: #4F46E5; }
.s-cancelled .status-text { color: #EF4444; }

.apt-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.apt-info-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.apt-info-text {
  font-size: 13px;
  color: #6B7280;
  font-family: "Noto Sans SC", sans-serif;
}

.apt-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.apt-price {
  font-size: 16px;
  font-weight: 700;
  color: #0D9488;
  font-family: "DM Sans", sans-serif;
}

.apt-items {
  font-size: 12px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}
</style>
