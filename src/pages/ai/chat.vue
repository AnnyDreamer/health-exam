<template>
  <view class="chat-page">
    <TopBar
      :show-new-chat="showChat && currentTab === 'ai'"
      :show-history="currentTab === 'ai' && sessionList.length > 0"
      @new-chat="handleNewChat"
      @show-history="drawerVisible = true"
    />

    <!-- 历史对话抽屉 -->
    <view v-if="drawerVisible" class="drawer-mask" @tap="drawerVisible = false" />
    <view class="drawer" :class="{ 'drawer-open': drawerVisible }">
      <view class="drawer-header">
        <text class="drawer-title">历史对话</text>
        <view class="drawer-close" @tap="drawerVisible = false">
          <text class="drawer-close-icon">×</text>
        </view>
      </view>
      <scroll-view scroll-y class="drawer-body">
        <view v-if="sessionList.length === 0" class="drawer-empty">
          <text class="drawer-empty-text">暂无历史对话</text>
        </view>
        <view
          v-for="s in sessionList"
          :key="s.id"
          class="drawer-item"
          @tap="viewSession(s.id)"
        >
          <text class="drawer-item-preview">{{ s.preview }}</text>
          <text class="drawer-item-meta">{{ formatTime(s.timestamp) }} · {{ s.messageCount }}条消息</text>
        </view>
      </scroll-view>
    </view>

    <!-- 页面主体（始终渲染） -->
    <template v-if="true">
      <!-- Hero 区域 - 所有 tab 共享 -->
      <view class="hero-fixed">
        <view class="hero">
          <!-- SVG 底纹装饰 -->
          <view class="hero-bg-pattern">
            <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 400 200" fill="none" preserveAspectRatio="xMidYMid slice">
              <circle cx="320" cy="40" r="60" fill="rgba(13,148,136,0.06)" />
              <circle cx="360" cy="120" r="40" fill="rgba(13,148,136,0.04)" />
              <circle cx="280" cy="100" r="25" fill="rgba(13,148,136,0.05)" />
              <path d="M250 20 Q300 60 350 30 Q400 0 380 50" stroke="rgba(13,148,136,0.08)" stroke-width="1.5" fill="none" />
              <path d="M270 140 Q320 110 370 150" stroke="rgba(13,148,136,0.06)" stroke-width="1" fill="none" />
              <circle cx="340" cy="170" r="15" fill="rgba(13,148,136,0.04)" />
              <path d="M300 60 L300 72 M294 66 L306 66" stroke="rgba(13,148,136,0.1)" stroke-width="1.5" stroke-linecap="round" />
              <path d="M370 85 L370 93 M366 89 L374 89" stroke="rgba(13,148,136,0.08)" stroke-width="1" stroke-linecap="round" />
              <path d="M240 90 L260 90 L268 70 L276 110 L284 90 L300 90" stroke="rgba(13,148,136,0.07)" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </view>
          <view class="hero-content">
            <view class="hero-text-area">
              <view class="hello-row hero-anim hero-anim-1">
                <text class="hello-text">Hello</text>
                <Sparkles :size="24" class="hello-sparkle sparkle-anim" />
              </view>
              <text v-if="hasData || userStore.dataAuthorized" class="greet-text hero-anim hero-anim-2">你好，{{ userName }}</text>
              <text v-else class="greet-text hero-anim hero-anim-2">让我帮你了解健康</text>
            </view>
            <image class="hero-girl hero-anim hero-anim-2" src="/static/girl.webp" mode="aspectFit" />
          </view>
        </view>

        <!-- Tab 切换 -->
        <view class="tab-group">
          <view
            v-for="tab in tabs"
            :key="tab.key"
            class="tab-pill"
            :class="{ 'tab-pill--active': currentTab === tab.key }"
            @tap="handleTabChange(tab.key)"
          >
            <component :is="tab.icon" :size="14" :color="currentTab === tab.key ? '#fff' : '#6B7280'" />
            <text class="tab-pill-text" :class="{ 'tab-pill-text--active': currentTab === tab.key }">{{ tab.label }}</text>
          </view>
        </view>
      </view>

      <!-- AI 助手 Tab -->
      <scroll-view
        v-show="currentTab === 'ai'"
        scroll-y
        :scroll-into-view="scrollToId"
        :scroll-top="forceScrollTop"
        class="page-scroll"
        @scroll="onPageScroll"
      >
        <view id="page-top"></view>

        <!-- 等待授权中卡片 -->
        <view v-if="showAuthPopup || pagePhase === 'loading'" class="status-card">
          <view class="status-card-icon-wrap">
            <view class="status-card-pulse-ring"></view>
            <ShieldCheck :size="24" color="#0D9488" class="status-card-icon" />
          </view>
          <view class="status-card-text">
            <text class="status-card-title">{{ pagePhase === 'loading' ? '正在获取健康数据' : '等待数据授权' }}</text>
            <text class="status-card-desc">{{ pagePhase === 'loading' ? '正在从医院系统获取您的健康信息...' : '请在弹窗中完成数据授权以获取健康信息' }}</text>
          </view>
        </view>

        <!-- 拒绝授权提示 -->
        <view v-else-if="!userStore.dataAuthorized && authRejected" class="status-card status-card--warning">
          <view class="status-card-icon-wrap status-card-icon-wrap--gray">
            <ShieldOff :size="24" color="#9CA3AF" />
          </view>
          <view class="status-card-text">
            <text class="status-card-title">您未授权获取健康数据</text>
            <text class="status-card-desc">授权后可为您提供个性化健康评估和体检推荐</text>
          </view>
          <view class="status-card-action" @tap="handleReAuth">
            <text class="status-card-action-text">立即授权</text>
          </view>
        </view>

        <!-- 同意授权但无数据提示 -->
        <view v-else-if="userStore.dataAuthorized && !hasData" class="status-card status-card--info">
          <view class="status-card-icon-wrap status-card-icon-wrap--gray">
            <FileX :size="24" color="#9CA3AF" />
          </view>
          <view class="status-card-text">
            <text class="status-card-title">目前没有获取到您在本院的健康数据</text>
            <text class="status-card-desc">您可以使用以下服务开始健康管理</text>
          </view>
        </view>

        <!-- 团检套餐通知横幅 -->
        <view v-if="showGroupBanner && pagePhase === 'ready' && !showAuthPopup" class="group-banner" @tap="goGroupPackageDetail">
          <view class="group-banner-icon">
            <Building2 :size="18" color="#D97706" />
          </view>
          <text class="group-banner-text">您的企业已安排体检套餐，请确认</text>
          <view class="group-banner-action">
            <text class="group-banner-btn">查看</text>
            <ChevronRight :size="14" color="#D97706" />
          </view>
        </view>

        <!-- 有健康数据（仅授权且数据就绪时显示） -->
        <view v-if="hasData && userStore.dataAuthorized && pagePhase === 'ready'" class="content-area">
          <HealthCard
            :score="healthStore.score?.score || 0"
            :max-score="healthStore.score?.maxScore || 100"
            :status="healthStore.score?.status || 'normal'"
            :indicators="healthStore.indicators"
            :last-date="healthStore.healthData?.lastCheckDate || ''"
            @view-report="handleTabChange('health')"
            @view-risk="enterChat('view-risk')"
            @make-package="enterChat('make-package')"
            @interpret-report="enterChat('report-interpret')"
          />
        </view>

        <!-- 无健康数据 - 服务列表（拒绝授权或授权无数据时都显示） -->
        <view v-if="pagePhase === 'ready' && !showAuthPopup && !hasData" class="content-area">
          <view class="service-card">
            <view class="service-title-row">
              <view class="service-dot"></view>
              <text class="service-title">我可以帮你</text>
            </view>
            <text class="service-hint">请选择需要的服务：</text>
            <view class="service-items">
              <view class="service-item" @tap="enterChat('report-interpret')">
                <view class="si-icon" style="background: #0D9488;">
                  <FileSearch :size="20" color="#fff" />
                </view>
                <view class="si-text">
                  <text class="si-title">体检报告解读</text>
                  <text class="si-desc">上传报告，AI 为您逐项分析</text>
                </view>
                <ChevronRight :size="18" color="#9CA3AF" />
              </view>
              <view class="service-item" @tap="enterChat('make-package')">
                <view class="si-icon" style="background: #F59E0B;">
                  <PackageCheck :size="20" color="#fff" />
                </view>
                <view class="si-text">
                  <text class="si-title">制定体检套餐</text>
                  <text class="si-desc">根据年龄和需求推荐体检项目</text>
                </view>
                <ChevronRight :size="18" color="#9CA3AF" />
              </view>
              <view class="service-item" @tap="enterChat('exam-process')">
                <view class="si-icon" style="background: #3B82F6;">
                  <Route :size="20" color="#fff" />
                </view>
                <view class="si-text">
                  <text class="si-title">了解体检流程</text>
                  <text class="si-desc">体检前中后注意事项和流程</text>
                </view>
                <ChevronRight :size="18" color="#9CA3AF" />
              </view>
              <view class="service-item" @tap="enterChat('consult')">
                <view class="si-icon" style="background: #8B5CF6;">
                  <CalendarCheck :size="20" color="#fff" />
                </view>
                <view class="si-text">
                  <text class="si-title">预约咨询</text>
                  <text class="si-desc">在线预约体检或咨询医生</text>
                </view>
                <ChevronRight :size="18" color="#9CA3AF" />
              </view>
            </view>
          </view>
        </view>

        <!-- 对话消息区 -->
        <view v-if="showChat" class="chat-messages">
          <view class="chat-divider">
            <view class="chat-divider-line"></view>
            <text class="chat-divider-text">AI 对话</text>
            <view class="chat-divider-line"></view>
          </view>

          <view v-for="msg in chatStore.messages" :key="msg.id" :id="'m-' + msg.id">
            <ChatBubble :role="msg.role" :content="msg.content" :content-type="msg.contentType">
              <template v-if="msg.contentType === 'image' && msg.imageUrl">
                <image
                  :src="msg.imageUrl"
                  mode="widthFix"
                  class="chat-image"
                  @tap="previewImage(msg.imageUrl!)"
                />
              </template>
              <template v-if="msg.options && msg.options.length > 0">
                <OptionButtons :options="msg.options" @select="handleOption" />
              </template>
              <template v-if="msg.contentType === 'pdf' && msg.pdfFileName">
                <view class="pdf-file-info">
                  <view class="pdf-icon-box">
                    <text class="pdf-icon-text">PDF</text>
                  </view>
                  <text class="pdf-file-name">{{ msg.pdfFileName }}</text>
                </view>
              </template>
              <template v-if="msg.contentType === 'package-card' && msg.packageCard">
                <PackageCard
                  :name="msg.packageCard.name"
                  :badge="msg.packageCard.badge"
                  :description="`含${msg.packageCard.items.slice(0,3).map(i => typeof i === 'string' ? i : i.name).join('、')}等 ${msg.packageCard.items.length} 项检查，\n重点覆盖你的异常指标`"
                  :items="msg.packageCard.items"
                  :total-price="msg.packageCard.totalPrice"
                  :original-price="msg.packageCard.originalPrice"
                  :is-group-package="msg.packageCard.isGroupPackage"
                  :enterprise-budget="msg.packageCard.enterpriseBudget"
                  :enterprise-coverage="msg.packageCard.enterpriseCoverage"
                  :employee-payment="msg.packageCard.employeePayment"
                  :ai-addon-discount="msg.packageCard.aiAddonDiscount"
                  @confirm="openPackagePopup(msg.packageCard!.id)"
                  @customize="openPackagePopup(msg.packageCard!.id)"
                />
              </template>
              <template v-if="msg.contentType === 'follow-up-plan' && msg.followUpPlan">
                <FollowUpCard
                  :plan="msg.followUpPlan"
                  @book="handleFollowUpBook"
                />
              </template>
            </ChatBubble>
          </view>

          <!-- Typing indicator -->
          <view v-if="chatStore.isTyping" class="typing-row">
            <view class="ai-avatar-typing">
              <image src="/static/doctor.png" class="avatar-typing-img" />
            </view>
            <view class="typing-dots">
              <view class="dot"></view>
              <view class="dot"></view>
              <view class="dot"></view>
            </view>
          </view>
        </view>

        <view id="chat-bottom" style="height: 20px;"></view>
      </scroll-view>

      <!-- 健康档案 Tab -->
      <scroll-view v-show="currentTab === 'health'" scroll-y class="page-scroll">
        <view style="padding: 8px 4px;">
          <HealthRecordView />
        </view>
      </scroll-view>

      <!-- 个人中心 Tab -->
      <scroll-view v-show="currentTab === 'profile'" scroll-y class="page-scroll">
        <view style="padding: 8px 4px;">
          <ProfileView />
        </view>
      </scroll-view>

      <!-- 回到顶部按钮 -->
      <view v-if="showBackToTop && currentTab === 'ai'" class="back-to-top" @tap="scrollToTop">
        <ArrowUp :size="18" color="#0D9488" />
      </view>

      <!-- 引导流程进度条 - 固定在输入框上方 -->
      <view v-if="chatStore.guidedStep > 0 && currentTab === 'ai'" class="guided-progress">
        <view class="progress-info">
          <text class="progress-label">问题进度</text>
          <text class="progress-count">{{ chatStore.guidedStep }}/{{ chatStore.GUIDED_TOTAL_STEPS }}</text>
        </view>
        <view class="progress-track">
          <view class="progress-fill" :style="{ width: (chatStore.guidedStep / chatStore.GUIDED_TOTAL_STEPS * 100) + '%' }"></view>
        </view>
      </view>
      <ChatInput v-if="currentTab === 'ai'" @send="handleSend" @send-image="handleSendImage" @send-pdf="handleSendPdf" />
    </template>

    <PendingPopup
      :visible="showPending"
      :company-name="userStore.userInfo?.companyName || ''"
      package-name="企业员工标准体检套餐"
      package-badge="团检"
      package-info="包含 15 项检查 · 企业8折优惠"
      price="1,264"
      original-price="1,580"
      @close="showPending = false"
      @confirm="handlePendingConfirm"
    />

    <DateTimePicker
      :visible="showDatePicker"
      @close="showDatePicker = false"
      @confirm="handleDateTimeConfirm"
    />

    <PackageDetailPopup
      :visible="showPackagePopup"
      :package-id="popupPackageId"
      @close="showPackagePopup = false"
      @book="handlePopupBook"
    />

    <PaymentPopup
      :visible="showPayment"
      :amount="paymentAmount"
      :total-price="paymentTotalPrice"
      :enterprise-coverage="paymentEnterpriseCoverage"
      :discount="paymentDiscount"
      @close="showPayment = false"
      @confirm="handlePaymentConfirm"
    />

    <!-- 加载数据弹窗 -->
    <view v-if="pagePhase === 'loading'" class="loading-popup-mask">
      <view class="loading-popup-bg"></view>
      <view class="loading-popup-sheet">
        <view class="sheet-handle"><view class="handle-bar"></view></view>
        <view class="loading-header">
          <view class="loading-spinner-wrap">
            <view class="loading-spinner"></view>
            <HeartPulse :size="24" color="#0D9488" class="loading-heart-icon" />
          </view>
          <text class="loading-title">正在获取您的健康数据</text>
          <text class="loading-subtitle">请稍候，这可能需要几秒钟</text>
        </view>

        <view class="loading-steps">
          <view
            v-for="(step, i) in loadingSteps"
            :key="i"
            class="loading-step"
            :class="{
              'step-done': step.done,
              'step-active': i === currentLoadingStep && !step.done,
              'step-pending': i > currentLoadingStep,
            }"
          >
            <view class="step-icon-wrap">
              <view v-if="step.done" class="step-check">
                <Check :size="14" color="#fff" />
              </view>
              <view v-else-if="i === currentLoadingStep" class="step-pulse">
                <view class="step-pulse-dot"></view>
              </view>
              <view v-else class="step-dot"></view>
            </view>
            <text class="step-text">{{ step.label }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 数据授权弹窗 -->
    <view v-if="showAuthPopup" class="auth-popup-mask">
      <view class="auth-popup-bg" @tap="handleAuthReject"></view>
      <view class="auth-popup-sheet">
        <view class="sheet-handle"><view class="handle-bar"></view></view>
        <view class="auth-popup-header">
          <view class="auth-icon-wrap">
            <view class="auth-icon-pulse-ring"></view>
            <view class="auth-icon-pulse-ring auth-icon-pulse-ring--delay"></view>
            <ShieldCheck :size="28" color="#0D9488" class="auth-icon-main" />
          </view>
          <view class="auth-popup-title-area">
            <text class="auth-popup-title">健康数据授权</text>
            <text class="auth-popup-subtitle">为了给您提供更精准的健康建议</text>
          </view>
        </view>

        <view class="auth-items">
          <view class="auth-item">
            <view class="auth-item-icon" style="background: rgba(13, 148, 136, 0.1);">
              <FileText :size="18" color="#0D9488" />
            </view>
            <view class="auth-item-text">
              <text class="auth-item-title">就诊记录</text>
              <text class="auth-item-desc">获取您在本院的历史就诊信息</text>
            </view>
          </view>
          <view class="auth-item">
            <view class="auth-item-icon" style="background: rgba(245, 158, 11, 0.1);">
              <ClipboardList :size="18" color="#F59E0B" />
            </view>
            <view class="auth-item-text">
              <text class="auth-item-title">体检报告</text>
              <text class="auth-item-desc">读取您的体检数据和指标结果</text>
            </view>
          </view>
          <view class="auth-item">
            <view class="auth-item-icon" style="background: rgba(59, 130, 246, 0.1);">
              <BrainCircuit :size="18" color="#3B82F6" />
            </view>
            <view class="auth-item-text">
              <text class="auth-item-title">AI 健康分析</text>
              <text class="auth-item-desc">基于数据为您生成个性化健康评估</text>
            </view>
          </view>
        </view>

        <view class="auth-privacy">
          <Lock :size="12" color="#9CA3AF" />
          <text class="auth-privacy-text">您的数据将加密存储，不会分享给第三方</text>
        </view>

        <view class="auth-buttons">
          <view class="auth-btn-primary" @tap="handleAuthAccept">
            <text class="auth-btn-primary-text">同意授权</text>
          </view>
          <view class="auth-btn-secondary" @tap="handleAuthReject">
            <text class="auth-btn-secondary-text">暂不授权</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch, reactive } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useUserStore } from '@/stores/user';
import { usePackageStore } from '@/stores/package';
import { useAppointmentStore } from '@/stores/appointment';
import { useHealthStore } from '@/stores/health';
import { useChatStore } from '@/stores/chat';
import {
  Sparkles, FileSearch, PackageCheck, Route, CalendarCheck,
  ChevronRight, ChevronDown, ChevronUp, History, Building2, ArrowUp,
  ShieldCheck, ShieldOff, FileText, ClipboardList, BrainCircuit, Lock,
  HeartPulse, Check, FileX, FileBarChart, UserRound,
} from 'lucide-vue-next';
import TopBar from '@/components/TopBar.vue';
import HealthCard from '@/components/HealthCard.vue';
import ChatBubble from '@/components/ChatBubble.vue';
import ChatInput from '@/components/ChatInput.vue';
import OptionButtons from '@/components/OptionButtons.vue';
import PackageCard from '@/components/PackageCard.vue';
import FollowUpCard from '@/components/FollowUpCard.vue';
import PendingPopup from '@/components/PendingPopup.vue';
import DateTimePicker from '@/components/DateTimePicker.vue';
import PaymentPopup from '@/components/PaymentPopup.vue';
import PackageDetailPopup from '@/components/PackageDetailPopup.vue';
import HealthRecordView from '@/components/HealthRecordView.vue';
import ProfileView from '@/components/ProfileView.vue';
import type { ChatOption, PackageCardData } from '@/types/chat';

const userStore = useUserStore();
const healthStore = useHealthStore();
const chatStore = useChatStore();

// 页面阶段: idle → loading → ready (授权改为弹窗)
const pagePhase = ref<'idle' | 'loading' | 'ready'>('idle');
const authRejected = ref(false);
const showAuthPopup = ref(false);

// Tab
const currentTab = ref('ai');
const tabs = [
  { key: 'ai', label: 'AI 助手', icon: Sparkles },
  { key: 'health', label: '健康档案', icon: FileBarChart },
  { key: 'profile', label: '个人中心', icon: UserRound },
];

const showChat = ref(false);
const showPending = ref(false);
const drawerVisible = ref(false);
const sessionList = computed(() => chatStore.getSessionList());
const scrollToId = ref('');
const isViewingHistory = ref(false);
const showDatePicker = ref(false);
const pendingPackageCard = ref<PackageCardData | null>(null);
const pendingGroupPkg = ref<any>(null);
const pendingDateTime = ref<{ date: string; time: string } | null>(null);

// 支付弹窗
const showPayment = ref(false);
const paymentAmount = ref(0);
const paymentTotalPrice = ref(0);
const paymentEnterpriseCoverage = ref(0);
const paymentDiscount = ref(0.85);

// 套餐弹窗
const showPackagePopup = ref(false);
const popupPackageId = ref('');

// 滚动相关
const scrollPosition = ref(0);
const forceScrollTop = ref<number | undefined>(undefined);
const showBackToTop = computed(() => scrollPosition.value > 400);

const userName = computed(() => userStore.userName || '用户');
const hasData = computed(() => healthStore.hasData);
const showGroupBanner = computed(() => userStore.hasGroupPackage);

// 加载动画步骤
const loadingSteps = reactive([
  { label: '连接医院信息系统', done: false },
  { label: '获取就诊记录', done: false },
  { label: '读取体检报告', done: false },
  { label: '分析健康指标', done: false },
  { label: '生成健康评估', done: false },
]);
const currentLoadingStep = ref(0);

// ---- 授权处理 ----
function handleAuthAccept() {
  showAuthPopup.value = false;
  userStore.setDataAuthResult(true);
  authRejected.value = false;
  pagePhase.value = 'loading';
  runLoadingSequence();
}

function handleAuthReject() {
  showAuthPopup.value = false;
  userStore.setDataAuthResult(false);
  authRejected.value = true;
  pagePhase.value = 'ready';
}

function handleReAuth() {
  showAuthPopup.value = true;
}

// ---- 加载动画序列 ----
async function runLoadingSequence() {
  const delays = [800, 700, 600, 700, 600];

  for (let i = 0; i < loadingSteps.length; i++) {
    currentLoadingStep.value = i;

    // 第3步(index=2)时并行发起真实请求
    if (i === 2) {
      healthStore.loadHealthData().catch(() => {});
    }

    await sleep(delays[i]);
    loadingSteps[i].done = true;
  }

  // 等待数据加载完成
  await healthStore.loadHealthData().catch(() => {});

  await sleep(500);
  pagePhase.value = 'ready';

  // 标记已加载，下次回到首页不再显示加载动画
  const userId = userStore.userInfo?.id || 'anonymous';
  uni.setStorageSync(DATA_LOADED_KEY + '_' + userId, 'true');
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---- Tab ----
function handleTabChange(tab: string) {
  currentTab.value = tab;
}

function onPageScroll(e: { detail: { scrollTop: number } }) {
  scrollPosition.value = e.detail.scrollTop;
}

function scrollToTop() {
  if (pagePhase.value !== 'ready') return;
  scrollToId.value = '';
  nextTick(() => {
    scrollToId.value = 'page-top';
  });
}

function scrollToBottom() {
  if (pagePhase.value !== 'ready') return;
  nextTick(() => {
    scrollToId.value = '';
    nextTick(() => {
      scrollToId.value = 'chat-bottom';
    });
  });
}

async function enterChat(key: string) {
  showChat.value = true;
  chatStore.reset();
  await chatStore.startScript(key, hasData.value, userName.value);
  scrollToBottom();
}

async function handleOption(opt: ChatOption) {
  // 导航类选项直接跳转，不发送聊天消息
  if (opt.value === 'view-appointment') {
    uni.navigateTo({ url: '/pages/appointment/index' });
    return;
  }
  if (opt.value === 'view-report') {
    uni.navigateTo({ url: '/pages/report/detail?id=report-001' });
    return;
  }
  await chatStore.sendUserMessage(opt.label, opt.value);
  scrollToBottom();
}

async function handleSend(text: string) {
  if (!showChat.value) {
    showChat.value = true;
    chatStore.reset();
  }
  await chatStore.sendUserMessage(text);
  scrollToBottom();
}

async function handleSendImage(payload: { base64: string; url: string }) {
  if (!showChat.value) {
    showChat.value = true;
    chatStore.reset();
  }
  await chatStore.sendImageForInterpretation(payload.base64, payload.url);
  scrollToBottom();
}

async function handleSendPdf(payload: { base64: string; fileName: string }) {
  if (!showChat.value) {
    showChat.value = true;
    chatStore.reset();
  }
  await chatStore.sendPdfForInterpretation(payload.base64, payload.fileName);
  scrollToBottom();
}

function handleFollowUpBook() {
  chatStore.sendUserMessage('预约复查', 'make-package');
  scrollToBottom();
}

function previewImage(url: string) {
  uni.previewImage({ urls: [url], current: url });
}

// 流式输出时自动滚动
watch(
  () => chatStore.streamingMessageId,
  (newId) => {
    if (newId) {
      const interval = setInterval(() => {
        if (!chatStore.streamingMessageId) {
          clearInterval(interval);
          return;
        }
        scrollToBottom();
      }, 300);
    }
  },
);

// 消息列表变化或 typing 状态变化时自动滚动到底部
watch(
  () => chatStore.messages.length,
  () => scrollToBottom(),
);
watch(
  () => chatStore.isTyping,
  (val) => { if (val) scrollToBottom(); },
);

// 套餐弹窗
function openPackagePopup(id: string) {
  popupPackageId.value = id;
  showPackagePopup.value = true;
}

function handlePopupBook(packageId: string, detail?: { employeePayment: number; totalPrice: number; enterpriseCoverage: number; selectedCount: number }) {
  showPackagePopup.value = false;
  // 记住当前套餐信息（团检需要用到）
  const pkgStore = usePackageStore();
  pendingGroupPkg.value = pkgStore.currentPackage;
  // 用 popup 实时计算的值覆盖
  if (detail && pendingGroupPkg.value) {
    pendingGroupPkg.value = {
      ...pendingGroupPkg.value,
      employeePayment: detail.employeePayment,
      totalPrice: detail.totalPrice,
      enterpriseCoverage: detail.enterpriseCoverage,
    };
  }
  const msg = chatStore.messages.find(m => m.packageCard?.id === packageId);
  if (msg?.packageCard) {
    pendingPackageCard.value = msg.packageCard;
  }
  // 统一走选时间流程
  showDatePicker.value = true;
}

function handleBookFromChat(packageCard: PackageCardData) {
  pendingPackageCard.value = packageCard;
  // 先展示套餐详情弹窗，确认后再选时间
  openPackagePopup(packageCard.id);
}

async function handleDateTimeConfirm(data: { date: string; time: string }) {
  showDatePicker.value = false;
  pendingDateTime.value = data;

  // 团检套餐
  if (pendingGroupPkg.value?.isGroupPackage) {
    const payment = pendingGroupPkg.value.employeePayment || 0;
    const budget = pendingGroupPkg.value.enterpriseBudget || 1000;
    const total = pendingGroupPkg.value.totalPrice || 0;
    if (payment > 0) {
      paymentAmount.value = payment;
      paymentTotalPrice.value = total;
      paymentEnterpriseCoverage.value = pendingGroupPkg.value.enterpriseCoverage || Math.min(budget, total);
      paymentDiscount.value = pendingGroupPkg.value.aiAddonDiscount || 0.85;
      showPayment.value = true;
      return;
    }
    // 自付为 0，直接预约
    await completeBooking(data);
    return;
  }

  // 普通套餐：totalPrice > 0 时弹支付
  if (pendingPackageCard.value) {
    const total = pendingGroupPkg.value?.totalPrice || pendingPackageCard.value.totalPrice || 0;
    if (total > 0) {
      paymentAmount.value = total;
      paymentTotalPrice.value = total;
      paymentEnterpriseCoverage.value = 0;
      paymentDiscount.value = 0;
      showPayment.value = true;
      return;
    }
    // 免费套餐（如复查），直接预约
    await completeBooking(data);
    return;
  }
}

async function handlePaymentConfirm() {
  showPayment.value = false;
  if (!pendingDateTime.value) return;
  await completeBooking(pendingDateTime.value);
}

async function completeBooking(data: { date: string; time: string }) {
  const isGroup = pendingGroupPkg.value?.isGroupPackage;

  if (isGroup) {
    const appointmentStore = useAppointmentStore();
    const packageId = pendingGroupPkg.value?.id || pendingPackageCard.value?.id || 'pkg-group-001';
    await appointmentStore.create({ packageId, date: data.date, time: data.time });
    userStore.confirmGroupPackage();
    pendingPackageCard.value = null;
    pendingGroupPkg.value = null;
    pendingDateTime.value = null;
    uni.navigateTo({ url: '/pages/appointment/index' });
  } else if (pendingPackageCard.value) {
    await chatStore.bookFromChat(pendingPackageCard.value, data.date, data.time);
    pendingPackageCard.value = null;
    pendingGroupPkg.value = null;
    pendingDateTime.value = null;
    scrollToBottom();
  }
}

function handleNewChat() {
  chatStore.startNewChat();
  showChat.value = false;
  isViewingHistory.value = false;
  scrollToTop();
}

function viewSession(sessionId: string) {
  const restored = chatStore.restoreSession(sessionId);
  if (restored) {
    showChat.value = true;
    isViewingHistory.value = true;
    drawerVisible.value = false;
    scrollToBottom();
  }
}

function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  const d = new Date(timestamp);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function handlePendingConfirm() {
  showPending.value = false;
  openPackagePopup('pkg-group-001');
}

function goGroupPackageDetail() {
  openPackagePopup('pkg-group-001');
}

const DATA_LOADED_KEY = 'health_exam_data_loaded';

onMounted(async () => {
  const alreadyAuthorized = userStore.checkDataAuth();
  if (alreadyAuthorized) {
    // 如果已经加载过数据，直接进入 ready，不再显示加载动画
    const userId = userStore.userInfo?.id || 'anonymous';
    const loadedFlag = uni.getStorageSync(DATA_LOADED_KEY + '_' + userId);
    if (loadedFlag) {
      await healthStore.loadHealthData().catch(() => {});
      pagePhase.value = 'ready';
    } else {
      pagePhase.value = 'loading';
      runLoadingSequence();
    }
  } else {
    pagePhase.value = 'ready';
    showAuthPopup.value = true;
  }
});

onShow(() => {
  if (pagePhase.value === 'ready' && showChat.value && currentTab.value === 'ai') {
    scrollToBottom();
  }
});
</script>

<style lang="scss" scoped>
.chat-page {
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(180deg, #B2DFDB 0%, #D5F0EC 30%, #E8F5F2 60%, #F0F7F5 100%);
  display: flex;
  flex-direction: column;
}

.page-scroll {
  flex: 1;
  height: 0;
  box-sizing: border-box;
  padding: 0 12px;
  padding-bottom: calc(68px + env(safe-area-inset-bottom, 0px));
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar { display: none; }
  scrollbar-width: none;
  -ms-overflow-style: none;
}

/* ---- Hero ---- */
.hero {
  padding: 4px 20px 16px;
  position: relative;
  overflow: hidden;
}

.hero-bg-pattern {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 60%;
  pointer-events: none;
  z-index: 0;
}

.hero-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hero-text-area {
  flex: 1;
  min-width: 0;
}

.hero-girl {
  width: 100px;
  height: 100px;
  flex-shrink: 0;
  margin-left: 8px;
}

.hero-fixed {
  flex-shrink: 0;
  padding: 0 12px;
}

.hello-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hello-text {
  font-size: 32px;
  font-weight: 700;
  color: #0D9488;
  font-family: "DM Sans", sans-serif;
}

.hello-sparkle {
  color: #0D9488;
}

.greet-text {
  font-size: 20px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
  letter-spacing: -0.3px;
  margin-top: 4px;
  display: block;
}

/* Hero 入场动画 */
.hero-anim {
  opacity: 0;
  transform: translateY(12px);
  animation: heroFadeIn 0.5s ease forwards;
}

.hero-anim-1 { animation-delay: 0.05s; }
.hero-anim-2 { animation-delay: 0.2s; }

@keyframes heroFadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.sparkle-anim {
  animation: sparkleEntry 0.5s ease 0.05s forwards, sparkleBounce 2.5s ease-in-out 0.6s infinite;
  opacity: 0;
}

@keyframes sparkleEntry {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes sparkleBounce {
  0%, 100% { transform: rotate(0deg) scale(1); }
  20% { transform: rotate(12deg) scale(1.15); }
  40% { transform: rotate(-4deg) scale(0.95); }
  60% { transform: rotate(6deg) scale(1.08); }
  80% { transform: rotate(-2deg) scale(1); }
}

/* ---- Tab 切换 ---- */
.tab-group {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.35);
  border-radius: 22px;
  padding: 3px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(8px);
  margin: 0 8px 8px;
}

.tab-pill {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 5px 12px;
  border-radius: 18px;
  transition: all 0.25s ease;

  &:active { opacity: 0.7; }
}

.tab-pill--active {
  background: linear-gradient(90deg, #0D9488, #14B8A6);
  box-shadow: 0 2px 8px rgba(13, 148, 136, 0.3);
}

.tab-pill-text {
  font-size: 12px;
  font-weight: 500;
  color: #6B7280;
  font-family: "Noto Sans SC", sans-serif;
  white-space: nowrap;
}

.tab-pill-text--active {
  color: #fff;
  font-weight: 600;
}

/* ---- 授权弹窗 ---- */
.auth-popup-mask {
  position: fixed;
  inset: 0;
  z-index: 600;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.auth-popup-bg {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  animation: overlayFadeIn 0.2s ease;
}

@keyframes overlayFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.auth-popup-sheet {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 500px;
  background: linear-gradient(180deg, rgba(240, 253, 250, 0.97) 0%, rgba(255, 255, 255, 0.97) 100%);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border-radius: 28px 28px 0 0;
  padding: 0 20px calc(20px + env(safe-area-inset-bottom, 0px));
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 -8px 40px rgba(13, 148, 136, 0.1);
  border-top: 1px solid rgba(255, 255, 255, 0.6);
  animation: sheetSlideUp 0.35s cubic-bezier(0.33, 1, 0.68, 1);
}

@keyframes sheetSlideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.sheet-handle {
  display: flex;
  justify-content: center;
  padding: 12px 0 2px;
}

.handle-bar {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: rgba(13, 148, 136, 0.2);
}

.auth-popup-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.auth-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: rgba(13, 148, 136, 0.08);
  border: 1px solid rgba(13, 148, 136, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  overflow: visible;
}

.auth-icon-main {
  z-index: 1;
  animation: authIconBounce 2s ease-in-out infinite;
}

@keyframes authIconBounce {
  0%, 100% { transform: scale(1); }
  30% { transform: scale(1.12) rotate(4deg); }
  60% { transform: scale(0.95) rotate(-2deg); }
}

.auth-icon-pulse-ring {
  position: absolute;
  inset: -4px;
  border-radius: 18px;
  border: 2px solid rgba(13, 148, 136, 0.25);
  animation: authPulseRing 2.5s ease-in-out infinite;
}

.auth-icon-pulse-ring--delay {
  animation-delay: 1.25s;
}

@keyframes authPulseRing {
  0% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 0; transform: scale(1.3); }
  100% { opacity: 0; transform: scale(1.3); }
}

.auth-popup-title-area {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.auth-popup-title {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.auth-popup-subtitle {
  font-size: 13px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

.auth-items {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.auth-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(12px);
}

.auth-item-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.auth-item-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.auth-item-title {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.auth-item-desc {
  font-size: 12px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

.auth-privacy {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
}

.auth-privacy-text {
  font-size: 11px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

.auth-buttons {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}

.auth-btn-primary {
  height: 50px;
  border-radius: 14px;
  background: linear-gradient(90deg, #0D9488, #14B8A6);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(13, 148, 136, 0.25);

  &:active { opacity: 0.9; }
}

.auth-btn-primary-text {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  font-family: "Noto Sans SC", sans-serif;
}

.auth-btn-secondary {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active { opacity: 0.7; }
}

.auth-btn-secondary-text {
  font-size: 14px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

/* ---- 加载数据弹窗 ---- */
.loading-popup-mask {
  position: fixed;
  inset: 0;
  z-index: 700;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.loading-popup-bg {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  animation: overlayFadeIn 0.2s ease;
}

.loading-popup-sheet {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 500px;
  background: linear-gradient(180deg, rgba(240, 253, 250, 0.97) 0%, rgba(255, 255, 255, 0.97) 100%);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border-radius: 28px 28px 0 0;
  padding: 0 20px calc(28px + env(safe-area-inset-bottom, 0px));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  box-shadow: 0 -8px 40px rgba(13, 148, 136, 0.1);
  border-top: 1px solid rgba(255, 255, 255, 0.6);
  animation: sheetSlideUp 0.35s cubic-bezier(0.33, 1, 0.68, 1);
}

.loading-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.loading-spinner-wrap {
  width: 64px;
  height: 64px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-spinner {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid rgba(13, 148, 136, 0.12);
  border-top-color: #0D9488;
  animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.loading-heart-icon {
  z-index: 1;
}

.loading-title {
  font-size: 16px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.loading-subtitle {
  font-size: 13px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
  margin-top: -8px;
}

.loading-steps {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.loading-step {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(12px);
  opacity: 0;
  transform: translateY(10px);
  animation: stepFadeIn 0.35s ease forwards;
}

.step-pending {
  opacity: 0;
  animation: none;
}

.step-active {
  background: rgba(255, 255, 255, 0.6);
  border-color: rgba(13, 148, 136, 0.2);
}

.step-done {
  opacity: 1;
  transform: none;
}

@keyframes stepFadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.step-icon-wrap {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-check {
  width: 24px;
  height: 24px;
  border-radius: 12px;
  background: #10B981;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: checkPop 0.3s ease;
}

@keyframes checkPop {
  0% { transform: scale(0); }
  60% { transform: scale(1.15); }
  100% { transform: scale(1); }
}

.step-pulse {
  width: 24px;
  height: 24px;
  border-radius: 12px;
  background: rgba(13, 148, 136, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-pulse-dot {
  width: 10px;
  height: 10px;
  border-radius: 5px;
  background: #0D9488;
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(0.8); opacity: 0.6; }
  50% { transform: scale(1.1); opacity: 1; }
}

.step-dot {
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background: #D1D5DB;
}

.step-text {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.step-pending .step-text {
  color: #D1D5DB;
}

/* ---- 状态卡片（授权等待/拒绝/无数据） ---- */
.status-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  margin-bottom: 12px;
  background: rgba(240, 253, 250, 0.6);
  border-radius: 18px;
  border: 1px solid rgba(13, 148, 136, 0.12);
  backdrop-filter: blur(16px);
  box-shadow: 0 2px 12px rgba(13, 148, 136, 0.06);
  animation: statusCardIn 0.4s ease;
}

.status-card--warning {
  background: rgba(255, 255, 255, 0.5);
  border-color: rgba(156, 163, 175, 0.15);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.status-card--info {
  background: rgba(255, 255, 255, 0.5);
  border-color: rgba(156, 163, 175, 0.15);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

@keyframes statusCardIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.status-card-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: rgba(13, 148, 136, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
}

.status-card-icon-wrap--gray {
  background: rgba(156, 163, 175, 0.08);
}

.status-card-pulse-ring {
  position: absolute;
  inset: -3px;
  border-radius: 17px;
  border: 2px solid rgba(13, 148, 136, 0.2);
  animation: statusPulse 2s ease-in-out infinite;
}

@keyframes statusPulse {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.06); }
}

.status-card-icon {
  z-index: 1;
}

.status-card-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.status-card-title {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.status-card-desc {
  font-size: 12px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
  line-height: 1.4;
}

.status-card-action {
  flex-shrink: 0;
  height: 32px;
  padding: 0 16px;
  border-radius: 10px;
  background: linear-gradient(90deg, #0D9488, #14B8A6);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(13, 148, 136, 0.2);

  &:active { opacity: 0.9; }
}

.status-card-action-text {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  font-family: "Noto Sans SC", sans-serif;
  white-space: nowrap;
}

/* 团检通知横幅 */
.group-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  margin-bottom: 12px;
  border-radius: 16px;
  background: rgba(255, 251, 235, 0.72);
  border: 1px solid rgba(251, 191, 36, 0.28);
  backdrop-filter: blur(16px);
  box-shadow: 0 2px 12px rgba(217, 119, 6, 0.08);

  &:active { background: rgba(255, 251, 235, 0.9); }
}

.group-banner-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(251, 191, 36, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.group-banner-text {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: #92400E;
  font-family: "Noto Sans SC", sans-serif;
  line-height: 1.4;
}

.group-banner-action {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.group-banner-btn {
  font-size: 13px;
  font-weight: 600;
  color: #D97706;
  font-family: "Noto Sans SC", sans-serif;
}

.content-area {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 无数据 - 服务卡片 */
.service-card {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 24px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(20px);
  box-shadow: 0 2px 16px rgba(13, 148, 136, 0.07);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.service-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.service-dot {
  width: 4px;
  height: 18px;
  border-radius: 2px;
  background: #0D9488;
}

.service-title {
  font-size: 16px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.service-hint {
  font-size: 13px;
  color: #6B7280;
  line-height: 1.5;
  font-family: "Noto Sans SC", sans-serif;
}

.service-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.service-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.47);
  border: 1px solid rgba(255, 255, 255, 0.31);
  backdrop-filter: blur(12px);

  &:active { background: rgba(255, 255, 255, 0.6); }
}

.si-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.si-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.si-title {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.si-desc {
  font-size: 12px;
  color: #6B7280;
  font-family: "Noto Sans SC", sans-serif;
}

/* 对话分隔线 */
.chat-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 4px 8px;
}

.chat-divider-line {
  flex: 1;
  height: 1px;
  background: rgba(13, 148, 136, 0.15);
}

.chat-divider-text {
  font-size: 12px;
  font-weight: 500;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
  white-space: nowrap;
}

/* 引导流程进度条 */
.guided-progress {
  margin: 8px 0 4px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  border: 1px solid rgba(13, 148, 136, 0.12);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.progress-label {
  font-size: 12px;
  font-weight: 500;
  color: #6B7280;
  font-family: "Noto Sans SC", sans-serif;
}

.progress-count {
  font-size: 12px;
  font-weight: 600;
  color: #0D9488;
  font-family: "DM Sans", sans-serif;
}

.progress-track {
  height: 4px;
  border-radius: 2px;
  background: rgba(13, 148, 136, 0.1);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, #0D9488, #14B8A6);
  transition: width 0.3s ease;
}

/* 对话消息区 */
.chat-messages {
  margin-top: 4px;
}

.typing-row {
  display: flex;
  gap: 8px;
  padding: 0;
  margin-bottom: 14px;
}

.ai-avatar-typing {
  width: 32px;
  height: 32px;
  border-radius: 16px;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar-typing-img {
  width: 32px;
  height: 32px;
  border-radius: 16px;
}

.typing-dots {
  display: flex;
  gap: 6px;
  align-items: center;
  background: rgba(255, 255, 255, 0.5);
  padding: 12px 14px;
  border-radius: 4px 16px 16px 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #D1D5DB;
  animation: dotPulse 1.4s infinite ease-in-out;

  &:nth-child(2) { animation-delay: 0.2s; }
  &:nth-child(3) { animation-delay: 0.4s; }
}

@keyframes dotPulse {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

/* 聊天中的图片缩略图 */
.chat-image {
  width: 200px;
  max-width: 100%;
  border-radius: 12px;
  margin-top: 4px;
}

/* PDF 文件信息展示 */
.pdf-file-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.47);
  border: 1px solid rgba(255, 255, 255, 0.31);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  margin-top: 4px;
}

.pdf-icon-box {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #EF4444;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pdf-icon-text {
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  font-family: "DM Sans", sans-serif;
}

.pdf-file-name {
  font-size: 13px;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 回到顶部 */
.back-to-top {
  position: fixed;
  right: 16px;
  bottom: calc(80px + env(safe-area-inset-bottom, 0px));
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(13, 148, 136, 0.2);
  backdrop-filter: blur(12px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;

  &:active { background: rgba(255, 255, 255, 1); }
}

/* 抽屉 */
.drawer-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 200;
}

.drawer {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 75vw;
  max-width: 280px;
  background: linear-gradient(180deg, #E0F2F1, #F0F7F5 40%, #fff 100%);
  z-index: 201;
  transform: translateX(-100%);
  transition: transform 0.28s ease;
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.1);
  overflow: hidden;

  &.drawer-open {
    transform: translateX(0);
  }
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 56px 16px 14px;
  border-bottom: 1px solid rgba(13, 148, 136, 0.08);
}

.drawer-title {
  font-size: 17px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.drawer-close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;

  &:active { background: rgba(0, 0, 0, 0.05); }
}

.drawer-close-icon {
  font-size: 22px;
  color: #9CA3AF;
  line-height: 1;
}

.drawer-body {
  flex: 1;
  padding: 12px;
  width: auto;
}

.drawer-empty {
  padding-top: 60px;
  text-align: center;
}

.drawer-empty-text {
  font-size: 14px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

.drawer-item {
  padding: 12px 14px;
  border-radius: 12px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.4);
  overflow: hidden;

  &:active { background: rgba(255, 255, 255, 0.9); }
}

.drawer-item-preview {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.drawer-item-meta {
  display: block;
  margin-top: 6px;
  font-size: 11px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}
</style>
