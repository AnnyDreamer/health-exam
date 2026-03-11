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
          <text class="info-label">{{ apt.isFollowUp ? '预约类型' : '套餐名称' }}</text>
          <text class="info-value">{{ apt.packageName }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">预约日期</text>
          <text class="info-value">{{ formatDate(apt.date) }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">预约时间</text>
          <text class="info-value">{{ apt.time }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">{{ apt.isFollowUp ? '就诊地点' : '体检地点' }}</text>
          <text class="info-value">{{ apt.location }}</text>
        </view>
        <view v-if="apt.isFollowUp && apt.departments && apt.departments.length > 0" class="info-row">
          <text class="info-label">就诊科室</text>
          <text class="info-value">{{ apt.departments.length }}个科室</text>
        </view>
        <view class="info-row">
          <text class="info-label">{{ apt.isFollowUp ? '挂号费合计' : '费用' }}</text>
          <text class="info-value price">¥{{ apt.totalPrice.toLocaleString() }}</text>
        </view>
      </view>

      <!-- 复查项目详情（结构化展示） -->
      <view v-if="apt.isFollowUp && apt.followUpDetails && apt.followUpDetails.length > 0" class="info-card">
        <text class="card-title">就诊项目（{{ apt.followUpDetails.length }}项）</text>
        <view class="detail-list">
          <view v-for="(d, i) in apt.followUpDetails" :key="i" class="detail-item">
            <view class="detail-index-wrap">
              <view class="detail-index">{{ i + 1 }}</view>
            </view>
            <view class="detail-content">
              <text class="detail-name">{{ d.name }}</text>
              <view class="detail-meta-row">
                <view class="detail-dept-tag">
                  <text class="detail-dept-text">{{ d.department }}</text>
                </view>
                <view v-if="d.registrationFee > 0" class="detail-fee-tag" :class="feeTagClass(d.feeType)">
                  <text class="detail-fee-text" :class="feeTextClass(d.feeType)">{{ d.feeType }} ¥{{ d.registrationFee }}</text>
                </view>
              </view>
              <view v-if="d.doctor" class="detail-doctor-row">
                <UserRound :size="12" color="#0D9488" />
                <text class="detail-doctor">{{ d.doctor }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 检查项目（非复查预约或无详情的 fallback） -->
      <view v-else class="info-card">
        <text class="card-title">检查项目（{{ apt.items.length }}项）</text>
        <view class="items-grid">
          <view v-for="(item, i) in apt.items" :key="i" class="item-tag">
            <text class="item-tag-text">{{ item }}</text>
          </view>
        </view>
      </view>

      <!-- 注意事项 -->
      <view v-if="apt.notice && apt.notice.length > 0" class="info-card">
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
import { CircleCheckBig, Award, XCircle, UserRound } from 'lucide-vue-next';
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

function formatDate(date: string): string {
  if (!date) return '';
  // 如果是 YYYY-MM-DD 格式，转为更友好的显示
  const parts = date.split('-');
  if (parts.length === 3) {
    return `${parts[0]}年${parseInt(parts[1])}月${parseInt(parts[2])}日`;
  }
  return date;
}

function feeTagClass(feeType?: string): string {
  if (feeType === '专家号') return 'fee-tag--expert';
  if (feeType === '特需号') return 'fee-tag--special';
  return 'fee-tag--normal';
}

function feeTextClass(feeType?: string): string {
  if (feeType === '专家号') return 'fee-text--expert';
  if (feeType === '特需号') return 'fee-text--special';
  return 'fee-text--normal';
}

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
  flex-shrink: 0;
}

.info-value {
  font-size: 14px;
  color: #1A1A1A;
  font-weight: 500;
  font-family: "Noto Sans SC", sans-serif;
  text-align: right;
}

.price {
  color: #0D9488;
  font-weight: 700;
  font-family: "DM Sans", sans-serif;
}

/* ====== 复查项目结构化列表 ====== */
.detail-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-item {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(240, 253, 250, 0.5);
  border: 1px solid rgba(13, 148, 136, 0.06);
}

.detail-index-wrap {
  flex-shrink: 0;
  padding-top: 1px;
}

.detail-index {
  width: 22px;
  height: 22px;
  border-radius: 11px;
  background: #0D9488;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  font-family: "DM Sans", sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.detail-name {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
  line-height: 1.3;
}

.detail-meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.detail-dept-tag {
  padding: 2px 8px;
  border-radius: 5px;
  background: rgba(13, 148, 136, 0.08);
  border: 1px solid rgba(13, 148, 136, 0.1);
}

.detail-dept-text {
  font-size: 11px;
  color: #0D9488;
  font-weight: 500;
  font-family: "Noto Sans SC", sans-serif;
}

.detail-fee-tag {
  padding: 2px 6px;
  border-radius: 4px;
}

.fee-tag--normal { background: rgba(13, 148, 136, 0.08); }
.fee-tag--expert { background: rgba(59, 130, 246, 0.08); }
.fee-tag--special { background: rgba(249, 115, 22, 0.08); }

.detail-fee-text {
  font-size: 10px;
  font-weight: 600;
  font-family: "Noto Sans SC", sans-serif;
}

.fee-text--normal { color: #0D9488; }
.fee-text--expert { color: #3B82F6; }
.fee-text--special { color: #F97316; }

.detail-doctor-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.detail-doctor {
  font-size: 12px;
  color: #0D9488;
  font-weight: 500;
  font-family: "Noto Sans SC", sans-serif;
}

/* ====== 非复查 fallback ====== */
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
