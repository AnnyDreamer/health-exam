<template>
  <view class="apt-card">
    <!-- 头部 -->
    <view class="apt-header">
      <view class="apt-status-icon">
        <CalendarCheck :size="18" color="#fff" />
      </view>
      <view class="apt-header-text">
        <text class="apt-title">预约成功</text>
        <text class="apt-subtitle">复查预约已确认</text>
      </view>
    </view>

    <!-- 时间 + 地点 + 费用 概览 -->
    <view class="apt-overview">
      <view class="overview-row">
        <Calendar :size="14" color="#0D9488" />
        <text class="overview-text">{{ formatDate(data.date) }} {{ data.time }}</text>
      </view>
      <view class="overview-row">
        <MapPin :size="14" color="#0D9488" />
        <text class="overview-text">{{ data.location }}</text>
      </view>
      <view v-if="data.registrationFee > 0" class="overview-row">
        <CreditCard :size="14" color="#0D9488" />
        <text class="overview-text">挂号费合计</text>
        <text class="overview-fee">¥{{ data.registrationFee }}</text>
      </view>
    </view>

    <!-- 就诊项目列表（按科室分组，展示医生） -->
    <view v-if="data.details && data.details.length > 0" class="apt-detail-list">
      <view v-for="(item, i) in data.details" :key="i" class="detail-item">
        <view class="detail-left">
          <view class="detail-index">{{ i + 1 }}</view>
        </view>
        <view class="detail-right">
          <text class="detail-name">{{ item.name }}</text>
          <view class="detail-meta">
            <text class="detail-dept">{{ item.department }}</text>
            <text class="detail-divider">·</text>
            <UserRound :size="11" color="#0D9488" />
            <text class="detail-doctor">{{ item.doctor }}</text>
          </view>
          <view v-if="item.registrationFee > 0" class="detail-fee-row">
            <view class="detail-fee-tag" :class="feeTagClass(item.feeType)">
              <text class="detail-fee-tag-text" :class="feeTagTextClass(item.feeType)">{{ item.feeType }} ¥{{ item.registrationFee }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="apt-actions">
      <view class="apt-btn" @tap="goDetail">
        <text class="apt-btn-text">查看详情</text>
        <ChevronRight :size="16" color="#0D9488" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { CalendarCheck, Calendar, MapPin, CreditCard, ChevronRight, UserRound } from 'lucide-vue-next';
import type { AppointmentCardData } from '@/types/chat';

const props = defineProps<{
  data: AppointmentCardData;
}>();

function formatDate(date: string): string {
  if (!date) return '';
  const parts = date.split('-');
  return `${parseInt(parts[1])}月${parseInt(parts[2])}日`;
}

function feeTagClass(feeType?: string): string {
  if (feeType === '专家号') return 'fee-tag--expert';
  if (feeType === '特需号') return 'fee-tag--special';
  return 'fee-tag--normal';
}

function feeTagTextClass(feeType?: string): string {
  if (feeType === '专家号') return 'fee-text--expert';
  if (feeType === '特需号') return 'fee-text--special';
  return 'fee-text--normal';
}

function goDetail() {
  uni.navigateTo({ url: `/pages/appointment/detail?id=${props.data.appointmentId}` });
}
</script>

<style lang="scss" scoped>
.apt-card {
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 16px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 6px;
}

.apt-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.apt-status-icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: linear-gradient(135deg, #0D9488, #14B8A6);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(13, 148, 136, 0.3);
}

.apt-header-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.apt-title {
  font-size: 15px;
  font-weight: 700;
  color: #0D9488;
  font-family: "Noto Sans SC", sans-serif;
}

.apt-subtitle {
  font-size: 12px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

/* 概览 */
.apt-overview {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  background: rgba(13, 148, 136, 0.04);
  border-radius: 10px;
  border: 1px solid rgba(13, 148, 136, 0.06);
}

.overview-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.overview-text {
  font-size: 13px;
  color: #374151;
  font-family: "Noto Sans SC", sans-serif;
}

.overview-fee {
  font-size: 15px;
  font-weight: 700;
  color: #0D9488;
  font-family: "DM Sans", sans-serif;
  margin-left: auto;
}

/* 项目列表 */
.apt-detail-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item {
  display: flex;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.35);
}

.detail-left {
  flex-shrink: 0;
  padding-top: 1px;
}

.detail-index {
  width: 20px;
  height: 20px;
  border-radius: 10px;
  background: #0D9488;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  font-family: "DM Sans", sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.detail-name {
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.detail-meta {
  display: flex;
  align-items: center;
  gap: 4px;
}

.detail-dept {
  font-size: 11px;
  color: #6B7280;
  font-family: "Noto Sans SC", sans-serif;
}

.detail-divider {
  font-size: 11px;
  color: #D1D5DB;
}

.detail-doctor {
  font-size: 11px;
  color: #0D9488;
  font-weight: 500;
  font-family: "Noto Sans SC", sans-serif;
}

.detail-fee-row {
  display: flex;
  margin-top: 2px;
}

.detail-fee-tag {
  padding: 1px 6px;
  border-radius: 4px;
}

.fee-tag--normal {
  background: rgba(13, 148, 136, 0.08);
}

.fee-tag--expert {
  background: rgba(59, 130, 246, 0.08);
}

.fee-tag--special {
  background: rgba(249, 115, 22, 0.08);
}

.detail-fee-tag-text {
  font-size: 10px;
  font-weight: 600;
  font-family: "Noto Sans SC", sans-serif;
}

.fee-text--normal { color: #0D9488; }
.fee-text--expert { color: #3B82F6; }
.fee-text--special { color: #F97316; }

/* 操作 */
.apt-actions {
  display: flex;
  justify-content: flex-end;
}

.apt-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border-radius: 10px;
  background: rgba(13, 148, 136, 0.08);
  border: 1px solid rgba(13, 148, 136, 0.12);
  &:active { opacity: 0.7; }
}

.apt-btn-text {
  font-size: 13px;
  font-weight: 600;
  color: #0D9488;
  font-family: "Noto Sans SC", sans-serif;
}
</style>
