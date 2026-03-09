<template>
  <view class="page">
    <view v-if="apt" class="content">
      <!-- 状态卡片 -->
      <view class="status-card" :class="'sc-' + apt.status">
        <component :is="statusIconComp" :size="28" :color="statusColor" />
        <text class="sc-text">{{ statusLabel }}</text>
      </view>

      <!-- 信息卡片 -->
      <view class="info-card">
        <text class="card-title">预约信息</text>
        <view class="info-row">
          <text class="info-label">套餐名称</text>
          <text class="info-value">{{ apt.packageName }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">预约日期</text>
          <text class="info-value">{{ apt.date }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">预约时间</text>
          <text class="info-value">{{ apt.time }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">体检地点</text>
          <text class="info-value">{{ apt.location }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">费用</text>
          <text class="info-value price">¥{{ apt.totalPrice.toLocaleString() }}</text>
        </view>
      </view>

      <!-- 检查项目 -->
      <view class="info-card">
        <text class="card-title">检查项目（{{ apt.items.length }}项）</text>
        <view class="items-grid">
          <view v-for="(item, i) in apt.items" :key="i" class="item-tag">
            <text class="item-tag-text">{{ item }}</text>
          </view>
        </view>
      </view>

      <!-- 注意事项 -->
      <view v-if="apt.notice" class="info-card">
        <text class="card-title">注意事项</text>
        <view class="notice-list">
          <text v-for="(n, i) in apt.notice" :key="i" class="notice-text">{{ i + 1 }}. {{ n }}</text>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view v-if="apt.status !== 'cancelled' && apt.status !== 'completed'" class="actions">
        <view class="cancel-btn" @tap="handleCancel">
          <text class="cancel-text">取消预约</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { CircleCheckBig, Award, XCircle } from 'lucide-vue-next';
import { useAppointmentStore } from '@/stores/appointment';

const store = useAppointmentStore();
const aptId = ref('');

const apt = computed(() => store.currentAppointment);

const statusIconComp = computed(() => {
  const map: Record<string, any> = { pending: CircleCheckBig, confirmed: CircleCheckBig, completed: Award, cancelled: XCircle };
  return map[apt.value?.status || ''] || CircleCheckBig;
});

const statusColor = computed(() => {
  const map: Record<string, string> = { pending: '#059669', confirmed: '#059669', completed: '#4F46E5', cancelled: '#EF4444' };
  return map[apt.value?.status || ''] || '#6B7280';
});

const statusLabel = computed(() => {
  const map: Record<string, string> = { pending: '已预约', confirmed: '已预约', completed: '已完成', cancelled: '已取消' };
  return map[apt.value?.status || ''] || '';
});

async function handleCancel() {
  uni.showModal({
    title: '确认取消',
    content: '确定要取消此预约吗？',
    success: async (res) => {
      if (res.confirm) {
        await store.cancel(aptId.value);
        uni.showToast({ title: '已取消', icon: 'success' });
      }
    },
  });
}

onLoad((options: any) => {
  aptId.value = options?.id || '';
});

onMounted(() => {
  if (aptId.value) store.loadDetail(aptId.value);
});
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

.status-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  border-radius: 16px;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);

  &.sc-pending { background: rgba(209, 250, 229, 0.5); }
  &.sc-confirmed { background: rgba(209, 250, 229, 0.5); }
  &.sc-completed { background: rgba(224, 231, 255, 0.5); }
  &.sc-cancelled { background: rgba(254, 226, 226, 0.5); }
}

.sc-text {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.info-card {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(20px);
  box-shadow: 0 2px 16px rgba(13, 148, 136, 0.07);
}

.card-title {
  font-size: 15px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 13px;
  color: #6B7280;
  font-family: "Noto Sans SC", sans-serif;
}

.info-value {
  font-size: 14px;
  color: #1A1A1A;
  font-weight: 500;
  font-family: "Noto Sans SC", sans-serif;
}

.price {
  color: #0D9488;
  font-weight: 700;
  font-family: "DM Sans", sans-serif;
}

.items-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.item-tag {
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(240, 253, 250, 0.8);
}

.item-tag-text {
  font-size: 13px;
  color: #0D9488;
  font-family: "Noto Sans SC", sans-serif;
}

.notice-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.notice-text {
  font-size: 13px;
  color: #6B7280;
  line-height: 1.5;
  font-family: "Noto Sans SC", sans-serif;
}

.actions {
  padding-top: 8px;
}

.cancel-btn {
  height: 48px;
  border-radius: 14px;
  border: 1px solid #EF4444;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(20px);

  &:active { opacity: 0.7; }
}

.cancel-text {
  font-size: 15px;
  color: #EF4444;
  font-weight: 500;
  font-family: "Noto Sans SC", sans-serif;
}
</style>
