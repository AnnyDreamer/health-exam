<template>
  <view class="page">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <view class="loading-spinner" />
      <text class="loading-text">加载中...</text>
    </view>

    <view class="content" v-else-if="profile">
      <!-- 顶部：患者姓名 + 健康评分圆环 -->
      <view class="header-card">
        <view class="header-row">
          <view class="score-ring-wrapper">
            <svg class="score-ring-svg" viewBox="0 0 80 80" width="80" height="80">
              <circle cx="40" cy="40" r="34" fill="none" :stroke="ringTrackColor" stroke-width="6" />
              <circle
                cx="40" cy="40" r="34" fill="none"
                :stroke="ringColor" stroke-width="6" stroke-linecap="round"
                :stroke-dasharray="ringDasharray" :stroke-dashoffset="ringDashoffset"
                transform="rotate(-90 40 40)" class="score-ring-progress"
              />
            </svg>
            <view class="score-ring-content">
              <text class="score-num">{{ profile.score.score }}</text>
              <text class="score-max">/{{ profile.score.maxScore }}</text>
            </view>
          </view>
          <view class="header-info">
            <text class="patient-name">{{ profile.patientName }}</text>
            <view class="status-badge" :class="'status-' + profile.score.status">
              <text class="status-text">{{ statusText }}</text>
            </view>
            <text class="header-subtitle">健康档案</text>
          </view>
        </view>
      </view>

      <!-- Tab 切换 -->
      <view class="tab-bar">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-item"
          :class="{ 'tab-active': activeTab === tab.key }"
          @tap="activeTab = tab.key"
        >
          <component :is="tab.icon" :size="16" :color="activeTab === tab.key ? '#0D9488' : '#9CA3AF'" />
          <text class="tab-label" :class="{ 'tab-label-active': activeTab === tab.key }">{{ tab.label }}</text>
          <view v-if="activeTab === tab.key" class="tab-indicator" />
        </view>
      </view>

      <!-- 就医记录 Tab -->
      <view v-if="activeTab === 'visits'" class="tab-content">
        <view v-if="profile.medicalVisits.length === 0" class="empty-state">
          <FileX :size="40" color="#D1D5DB" />
          <text class="empty-text">暂无就医记录</text>
        </view>
        <view v-else class="timeline">
          <view
            v-for="(visit, index) in profile.medicalVisits"
            :key="visit.id"
            class="timeline-item"
          >
            <!-- 时间线左侧 -->
            <view class="timeline-rail">
              <view class="timeline-dot" :class="'dot-dept-' + getDeptColorKey(visit.department)" />
              <view v-if="index < profile.medicalVisits.length - 1" class="timeline-line" />
            </view>
            <!-- 时间线右侧卡片 -->
            <view class="visit-card">
              <view class="visit-top">
                <text class="visit-date">{{ visit.date }}</text>
                <view class="dept-tag" :class="'dept-' + getDeptColorKey(visit.department)">
                  <text class="dept-tag-text">{{ visit.department }}</text>
                </view>
              </view>
              <view class="visit-hospital-row">
                <Building2 :size="13" color="#9CA3AF" />
                <text class="visit-hospital">{{ visit.hospital }}</text>
              </view>
              <view v-if="visit.doctor" class="visit-doctor-row">
                <User :size="13" color="#9CA3AF" />
                <text class="visit-doctor">{{ visit.doctor }} 医师</text>
              </view>
              <view class="visit-diag-row">
                <text class="visit-diag-label">诊断</text>
                <text class="visit-diag">{{ visit.diagnosis }}</text>
              </view>
              <text v-if="visit.summary" class="visit-summary">{{ visit.summary }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 体检记录 Tab -->
      <view v-if="activeTab === 'exams'" class="tab-content">
        <view v-if="profile.examRecords.length === 0" class="empty-state">
          <FileX :size="40" color="#D1D5DB" />
          <text class="empty-text">暂无体检记录</text>
        </view>
        <view v-else class="exam-list">
          <view
            v-for="exam in profile.examRecords"
            :key="exam.id"
            class="exam-card"
          >
            <view class="exam-top">
              <view class="exam-meta">
                <text class="exam-date">{{ exam.date }}</text>
                <view class="exam-type-tag">
                  <text class="exam-type-text">{{ exam.type }}</text>
                </view>
              </view>
              <view class="exam-abnormal-badge" v-if="exam.abnormalCount > 0">
                <text class="exam-abnormal-num">{{ exam.abnormalCount }}</text>
                <text class="exam-abnormal-label">项异常</text>
              </view>
            </view>
            <view class="exam-institution-row">
              <Building2 :size="13" color="#9CA3AF" />
              <text class="exam-institution">{{ exam.institution }}</text>
            </view>

            <!-- 体检小结 -->
            <text v-if="exam.summary" class="exam-summary">{{ exam.summary }}</text>

            <!-- 展开/收起指标 -->
            <view class="exam-toggle" @tap="toggleExam(exam.id)">
              <text class="exam-toggle-text">{{ expandedExams[exam.id] ? '收起指标详情' : '展开指标详情' }}</text>
              <ChevronDown
                :size="14"
                color="#0D9488"
                :class="{ 'toggle-icon-up': expandedExams[exam.id] }"
                class="toggle-icon"
              />
            </view>

            <!-- 指标列表 -->
            <view v-if="expandedExams[exam.id]" class="indicator-list">
              <view
                v-for="ind in exam.indicators"
                :key="ind.name"
                class="indicator-row"
              >
                <text class="ind-name">{{ ind.name }}</text>
                <text class="ind-value">{{ ind.value }}</text>
                <view class="ind-status" :class="'is-' + ind.status">
                  <text class="ind-label">{{ ind.label }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 风险评估 Tab -->
      <view v-if="activeTab === 'risks'" class="tab-content">
        <view v-if="profile.risks.length === 0" class="empty-state">
          <ShieldCheck :size="40" color="#D1D5DB" />
          <text class="empty-text">暂无健康风险</text>
        </view>
        <view v-else class="risk-list">
          <view
            v-for="risk in profile.risks"
            :key="risk.id"
            class="risk-card"
          >
            <view class="risk-header">
              <view class="risk-name-area">
                <view class="risk-level-dot" :class="'rld-' + risk.level" />
                <text class="risk-name">{{ risk.name }}</text>
              </view>
              <view class="risk-level-tag" :class="'rlt-' + risk.level">
                <text class="risk-level-text">{{ riskLevelMap[risk.level] }}</text>
              </view>
            </view>
            <text class="risk-desc">{{ risk.description }}</text>
            <view class="risk-suggest-box">
              <Lightbulb :size="14" color="#0D9488" class="suggest-icon" />
              <text class="risk-suggest">{{ risk.suggestion }}</text>
            </view>
            <!-- 关联就医记录 -->
            <view v-if="risk.relatedVisits && risk.relatedVisits.length > 0" class="risk-related">
              <text class="risk-related-label">关联就诊</text>
              <view
                v-for="visitId in risk.relatedVisits"
                :key="visitId"
                class="risk-related-item"
                @tap="goToVisit(visitId)"
              >
                <FileText :size="12" color="#0D9488" />
                <text class="risk-related-text">{{ getVisitBrief(visitId) }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 无数据状态 -->
    <view v-else class="empty-page">
      <FileX :size="48" color="#D1D5DB" />
      <text class="empty-page-text">暂无健康档案数据</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import {
  Building2,
  User,
  FileText,
  FileX,
  ChevronDown,
  ShieldCheck,
  Lightbulb,
  Activity,
  ClipboardList,
  ShieldAlert,
} from 'lucide-vue-next';
import { useHealthStore } from '@/stores/health';
import type { HealthProfile } from '@/types/health';

const healthStore = useHealthStore();
const profile = ref<HealthProfile | null>(null);
const loading = ref(true);
const activeTab = ref<'visits' | 'exams' | 'risks'>('visits');
const expandedExams = reactive<Record<string, boolean>>({});

const tabs = [
  { key: 'visits' as const, label: '就医记录', icon: Activity },
  { key: 'exams' as const, label: '体检记录', icon: ClipboardList },
  { key: 'risks' as const, label: '风险评估', icon: ShieldAlert },
];

const riskLevelMap: Record<string, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
};

const statusText = computed(() => {
  const map: Record<string, string> = {
    normal: '健康良好',
    attention: '需要关注',
    warning: '注意风险',
  };
  return map[profile.value?.score.status || ''] || '';
});

// SVG 圆环参数 (r=34)
const circumference = 2 * Math.PI * 34;
const ringDasharray = computed(() => `${circumference} ${circumference}`);
const ringDashoffset = computed(() => {
  const s = profile.value?.score;
  if (!s || s.maxScore === 0) return circumference;
  return circumference * (1 - s.score / s.maxScore);
});
const ringColor = computed(() => {
  const m: Record<string, string> = { normal: '#10B981', attention: '#F59E0B', warning: '#EF4444' };
  return m[profile.value?.score.status || ''] || '#10B981';
});
const ringTrackColor = computed(() => {
  const m: Record<string, string> = {
    normal: 'rgba(16,185,129,0.12)',
    attention: 'rgba(245,158,11,0.12)',
    warning: 'rgba(239,68,68,0.12)',
  };
  return m[profile.value?.score.status || ''] || 'rgba(16,185,129,0.12)';
});

/** 科室 -> 颜色 key 映射 */
function getDeptColorKey(dept: string): string {
  if (dept.includes('内分泌')) return 'endo';
  if (dept.includes('心内') || dept.includes('心血管')) return 'cardio';
  if (dept.includes('消化')) return 'gastro';
  if (dept.includes('骨科')) return 'ortho';
  if (dept.includes('体检')) return 'checkup';
  return 'general';
}

function toggleExam(examId: string) {
  expandedExams[examId] = !expandedExams[examId];
}

/** 获取就诊记录简要描述 */
function getVisitBrief(visitId: string): string {
  const visit = profile.value?.medicalVisits.find(v => v.id === visitId);
  if (!visit) return visitId;
  return `${visit.date} ${visit.department} - ${visit.diagnosis}`;
}

/** 跳转到就医记录 Tab */
function goToVisit(_visitId: string) {
  activeTab.value = 'visits';
}

onMounted(async () => {
  loading.value = true;
  try {
    await healthStore.loadProfile();
    profile.value = healthStore.profile;
  } catch (e) {
    console.error('Failed to load profile:', e);
  } finally {
    loading.value = false;
  }
});
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #B2DFDB 0%, #D5F0EC 30%, #E8F5F2 60%, #F0F7F5 100%);
}

/* ---- 加载状态 ---- */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200px;
  gap: 12px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(13, 148, 136, 0.15);
  border-top-color: #0D9488;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 14px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

/* ---- 主体内容 ---- */
.content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ---- 顶部头卡 ---- */
.header-card {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 20px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 2px 16px rgba(13, 148, 136, 0.07);
}

.header-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.score-ring-wrapper {
  position: relative;
  width: 80px;
  height: 80px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.score-ring-svg {
  position: absolute;
  top: 0;
  left: 0;
}

.score-ring-progress {
  transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.score-ring-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 1;
}

.score-num {
  font-size: 28px;
  font-weight: 800;
  color: #1A1A1A;
  font-family: "DM Sans", sans-serif;
  line-height: 1;
}

.score-max {
  font-size: 10px;
  color: #9CA3AF;
  font-family: "DM Sans", sans-serif;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.patient-name {
  font-size: 20px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.status-badge {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 6px;
  align-self: flex-start;

  &.status-attention { background: rgba(245, 158, 11, 0.12); }
  &.status-warning { background: rgba(239, 68, 68, 0.12); }
  &.status-normal { background: rgba(16, 185, 129, 0.12); }
}

.status-text {
  font-size: 11px;
  font-weight: 600;
  font-family: "Noto Sans SC", sans-serif;
}

.status-attention .status-text { color: #D97706; }
.status-warning .status-text { color: #EF4444; }
.status-normal .status-text { color: #059669; }

.header-subtitle {
  font-size: 12px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

/* ---- Tab 栏 ---- */
.tab-bar {
  display: flex;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  padding: 4px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 2px 16px rgba(13, 148, 136, 0.07);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px 8px;
  border-radius: 12px;
  position: relative;
  transition: background-color 0.25s ease;

  &:active { opacity: 0.7; }
}

.tab-active {
  background: rgba(13, 148, 136, 0.08);
}

.tab-label {
  font-size: 12px;
  font-weight: 500;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
  transition: color 0.25s ease;
}

.tab-label-active {
  color: #0D9488;
  font-weight: 600;
}

.tab-indicator {
  position: absolute;
  bottom: 2px;
  width: 20px;
  height: 2px;
  border-radius: 1px;
  background: #0D9488;
}

/* ---- Tab 内容区域 ---- */
.tab-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ---- 空状态 ---- */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 60px 0;
}

.empty-text {
  font-size: 14px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

.empty-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200px;
  gap: 12px;
}

.empty-page-text {
  font-size: 15px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

/* ======== 就医记录 - 时间线 ======== */
.timeline {
  display: flex;
  flex-direction: column;
}

.timeline-item {
  display: flex;
  gap: 12px;
}

.timeline-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 20px;
  flex-shrink: 0;
  padding-top: 6px;
}

.timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 5px;
  flex-shrink: 0;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.8);
}

/* 科室颜色 */
.dot-dept-endo { background: #8B5CF6; }
.dot-dept-cardio { background: #EF4444; }
.dot-dept-gastro { background: #F59E0B; }
.dot-dept-ortho { background: #3B82F6; }
.dot-dept-checkup { background: #0D9488; }
.dot-dept-general { background: #6B7280; }

.timeline-line {
  width: 2px;
  flex: 1;
  min-height: 16px;
  background: linear-gradient(180deg, #B2DFDB 0%, rgba(178, 223, 219, 0.2) 100%);
  margin-top: 4px;
}

.visit-card {
  flex: 1;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 14px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 2px 12px rgba(13, 148, 136, 0.05);
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.visit-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.visit-date {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  font-family: "DM Sans", sans-serif;
}

/* 科室标签 */
.dept-tag {
  padding: 2px 8px;
  border-radius: 6px;
}

.dept-endo { background: rgba(139, 92, 246, 0.1); }
.dept-cardio { background: rgba(239, 68, 68, 0.1); }
.dept-gastro { background: rgba(245, 158, 11, 0.1); }
.dept-ortho { background: rgba(59, 130, 246, 0.1); }
.dept-checkup { background: rgba(13, 148, 136, 0.1); }
.dept-general { background: rgba(107, 114, 128, 0.1); }

.dept-tag-text {
  font-size: 11px;
  font-weight: 500;
  font-family: "Noto Sans SC", sans-serif;
}

.dept-endo .dept-tag-text { color: #7C3AED; }
.dept-cardio .dept-tag-text { color: #EF4444; }
.dept-gastro .dept-tag-text { color: #D97706; }
.dept-ortho .dept-tag-text { color: #2563EB; }
.dept-checkup .dept-tag-text { color: #0D9488; }
.dept-general .dept-tag-text { color: #6B7280; }

.visit-hospital-row,
.visit-doctor-row {
  display: flex;
  align-items: center;
  gap: 5px;
}

.visit-hospital,
.visit-doctor {
  font-size: 12px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

.visit-diag-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.visit-diag-label {
  font-size: 11px;
  font-weight: 600;
  color: #0D9488;
  background: rgba(13, 148, 136, 0.08);
  padding: 1px 6px;
  border-radius: 4px;
  flex-shrink: 0;
  font-family: "Noto Sans SC", sans-serif;
}

.visit-diag {
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
  line-height: 1.4;
}

.visit-summary {
  font-size: 12px;
  color: #6B7280;
  line-height: 1.6;
  font-family: "Noto Sans SC", sans-serif;
  padding-top: 4px;
  border-top: 1px solid #F3F4F6;
}

/* ======== 体检记录 ======== */
.exam-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.exam-card {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 2px 12px rgba(13, 148, 136, 0.05);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.exam-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.exam-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.exam-date {
  font-size: 16px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "DM Sans", sans-serif;
}

.exam-type-tag {
  display: inline-flex;
  align-self: flex-start;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(13, 148, 136, 0.08);
}

.exam-type-text {
  font-size: 11px;
  font-weight: 500;
  color: #0D9488;
  font-family: "Noto Sans SC", sans-serif;
}

.exam-abnormal-badge {
  display: flex;
  align-items: baseline;
  gap: 2px;
  background: rgba(239, 68, 68, 0.08);
  padding: 4px 10px;
  border-radius: 8px;
}

.exam-abnormal-num {
  font-size: 20px;
  font-weight: 800;
  color: #EF4444;
  font-family: "DM Sans", sans-serif;
  line-height: 1;
}

.exam-abnormal-label {
  font-size: 11px;
  color: #EF4444;
  font-family: "Noto Sans SC", sans-serif;
}

.exam-institution-row {
  display: flex;
  align-items: center;
  gap: 5px;
}

.exam-institution {
  font-size: 12px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

.exam-summary {
  font-size: 13px;
  color: #6B7280;
  line-height: 1.6;
  font-family: "Noto Sans SC", sans-serif;
}

.exam-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 0 4px;
  border-top: 1px solid #F3F4F6;

  &:active { opacity: 0.7; }
}

.exam-toggle-text {
  font-size: 12px;
  font-weight: 500;
  color: #0D9488;
  font-family: "Noto Sans SC", sans-serif;
}

.toggle-icon {
  transition: transform 0.25s ease;
}

.toggle-icon-up {
  transform: rotate(180deg);
}

/* 指标列表 */
.indicator-list {
  display: flex;
  flex-direction: column;
  background: rgba(249, 250, 251, 0.6);
  border-radius: 10px;
  padding: 4px 10px;
}

.indicator-row {
  display: flex;
  align-items: center;
  padding: 7px 0;
  border-bottom: 1px solid #F3F4F6;

  &:last-child { border-bottom: none; }
}

.ind-name {
  flex: 1;
  font-size: 13px;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.ind-value {
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
  font-family: "DM Sans", sans-serif;
  margin-right: 10px;
}

.ind-status {
  padding: 1px 7px;
  border-radius: 5px;
}

.is-normal { background: #D1FAE5; }
.is-high { background: #FEF3C7; }
.is-low { background: #DBEAFE; }

.ind-label {
  font-size: 10px;
  font-weight: 500;
  font-family: "Noto Sans SC", sans-serif;
}

.is-normal .ind-label { color: #059669; }
.is-high .ind-label { color: #D97706; }
.is-low .ind-label { color: #2563EB; }

/* ======== 风险评估 ======== */
.risk-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.risk-card {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 2px 12px rgba(13, 148, 136, 0.05);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.risk-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.risk-name-area {
  display: flex;
  align-items: center;
  gap: 8px;
}

.risk-level-dot {
  width: 8px;
  height: 8px;
  border-radius: 4px;
  flex-shrink: 0;
}

.rld-high { background: #EF4444; }
.rld-medium { background: #F59E0B; }
.rld-low { background: #10B981; }

.risk-name {
  font-size: 15px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.risk-level-tag {
  padding: 2px 10px;
  border-radius: 6px;
}

.rlt-high { background: rgba(239, 68, 68, 0.1); }
.rlt-medium { background: rgba(245, 158, 11, 0.1); }
.rlt-low { background: rgba(16, 185, 129, 0.1); }

.risk-level-text {
  font-size: 11px;
  font-weight: 600;
  font-family: "Noto Sans SC", sans-serif;
}

.rlt-high .risk-level-text { color: #EF4444; }
.rlt-medium .risk-level-text { color: #F59E0B; }
.rlt-low .risk-level-text { color: #10B981; }

.risk-desc {
  font-size: 13px;
  color: #6B7280;
  line-height: 1.6;
  font-family: "Noto Sans SC", sans-serif;
}

.risk-suggest-box {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(13, 148, 136, 0.04);
  border-radius: 10px;
  border: 1px solid rgba(13, 148, 136, 0.08);
}

.suggest-icon {
  flex-shrink: 0;
  margin-top: 1px;
}

.risk-suggest {
  font-size: 13px;
  color: #0D9488;
  line-height: 1.6;
  font-family: "Noto Sans SC", sans-serif;
}

/* 关联就诊 */
.risk-related {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid #F3F4F6;
}

.risk-related-label {
  font-size: 11px;
  font-weight: 600;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

.risk-related-item {
  display: flex;
  align-items: center;
  gap: 5px;

  &:active { opacity: 0.7; }
}

.risk-related-text {
  font-size: 12px;
  color: #0D9488;
  font-family: "Noto Sans SC", sans-serif;
  text-decoration: underline;
  text-decoration-color: rgba(13, 148, 136, 0.3);
  text-underline-offset: 2px;
}
</style>
