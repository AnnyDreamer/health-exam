<template>
  <view class="chat-page">
    <TopBar :show-new-chat="showChat" @menu="showMenu = true" @new-chat="handleNewChat" />
    <MoreMenu :visible="showMenu" @close="showMenu = false" />

    <!-- 统一滚动区域：卡片 + 对话消息 -->
    <scroll-view
      scroll-y
      :scroll-into-view="scrollToId"
      :scroll-top="forceScrollTop"
      class="page-scroll"
      @scroll="onPageScroll"
    >
      <view id="page-top"></view>

      <!-- Hero -->
      <view class="hero">
        <view class="hello-row">
          <text class="hello-text">Hello</text>
          <Sparkles :size="24" class="hello-sparkle" />
        </view>
        <text v-if="hasData" class="greet-text">你好，{{ userName }}</text>
        <text v-else class="greet-text">让我帮你了解健康</text>
      </view>

      <!-- 团检套餐通知横幅 -->
      <view v-if="showGroupBanner" class="group-banner" @tap="goGroupPackageDetail">
        <view class="group-banner-icon">
          <Building2 :size="18" color="#D97706" />
        </view>
        <text class="group-banner-text">您的企业已安排体检套餐，请确认</text>
        <view class="group-banner-action">
          <text class="group-banner-btn">查看</text>
          <ChevronRight :size="14" color="#D97706" />
        </view>
      </view>

      <!-- 有健康数据 -->
      <view v-if="hasData" class="content-area">
        <HealthCard
          :score="healthStore.score?.score || 0"
          :max-score="healthStore.score?.maxScore || 100"
          :status="healthStore.score?.status || 'normal'"
          :indicators="healthStore.indicators"
          :last-date="healthStore.healthData?.lastCheckDate || ''"
          @view-risk="enterChat('view-risk')"
          @make-package="enterChat('make-package')"
        />
      </view>

      <!-- 无健康数据 -->
      <view v-else class="content-area">
        <view class="service-card">
          <view class="service-title-row">
            <view class="service-dot"></view>
            <text class="service-title">我可以帮你</text>
          </view>
          <text class="service-hint">目前没有获取到您的健康数据，请选择需要的服务：</text>
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

      <!-- 历史会话（仅非对话时显示） -->
      <view v-if="!showChat && sessionList.length > 0" class="history-section">
        <view class="history-header" @tap="showHistory = !showHistory">
          <view class="history-title-row">
            <History :size="14" color="#9CA3AF" />
            <text class="history-title">历史会话</text>
            <text class="history-count">{{ sessionList.length }}条</text>
          </view>
          <ChevronDown v-if="!showHistory" :size="16" color="#9CA3AF" />
          <ChevronUp v-if="showHistory" :size="16" color="#9CA3AF" />
        </view>
        <view v-if="showHistory" class="history-list">
          <view
            v-for="s in sessionList"
            :key="s.id"
            class="history-item"
            @tap="viewSession(s.id)"
          >
            <view class="history-item-content">
              <text class="history-preview">{{ s.preview }}</text>
              <text class="history-meta">{{ formatTime(s.timestamp) }} · {{ s.messageCount }}条消息</text>
            </view>
            <ChevronRight :size="14" color="#C4C4C4" />
          </view>
        </view>
      </view>

      <!-- 对话消息区（卡片下方） -->
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
            <template v-if="msg.contentType === 'options' && msg.options">
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
                :description="`含${msg.packageCard.items.slice(0,3).join('、')}等 ${msg.packageCard.items.length} 项检查，\n重点覆盖你的异常指标`"
                :items="msg.packageCard.items"
                :total-price="msg.packageCard.totalPrice"
                :original-price="msg.packageCard.originalPrice"
                @confirm="handleBookFromChat(msg.packageCard!)"
                @customize="goPackageDetail(msg.packageCard!.id)"
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

    <!-- 回到顶部按钮 -->
    <view v-if="showBackToTop" class="back-to-top" @tap="scrollToTop">
      <ArrowUp :size="18" color="#0D9488" />
    </view>

    <ChatInput @send="handleSend" @send-image="handleSendImage" @send-pdf="handleSendPdf" />

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
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useUserStore } from '@/stores/user';
import { useHealthStore } from '@/stores/health';
import { useChatStore } from '@/stores/chat';
import { Sparkles, FileSearch, PackageCheck, Route, CalendarCheck, ChevronRight, ChevronDown, ChevronUp, History, Building2, ArrowUp } from 'lucide-vue-next';
import TopBar from '@/components/TopBar.vue';
import MoreMenu from '@/components/MoreMenu.vue';
import HealthCard from '@/components/HealthCard.vue';
import ChatBubble from '@/components/ChatBubble.vue';
import ChatInput from '@/components/ChatInput.vue';
import OptionButtons from '@/components/OptionButtons.vue';
import PackageCard from '@/components/PackageCard.vue';
import FollowUpCard from '@/components/FollowUpCard.vue';
import PendingPopup from '@/components/PendingPopup.vue';
import DateTimePicker from '@/components/DateTimePicker.vue';
import type { ChatOption, PackageCardData } from '@/types/chat';

const userStore = useUserStore();
const healthStore = useHealthStore();
const chatStore = useChatStore();

const showMenu = ref(false);
const showChat = ref(false);
const showPending = ref(false);
const showHistory = ref(false);
const scrollToId = ref('');
const isViewingHistory = ref(false);
const showDatePicker = ref(false);
const pendingPackageCard = ref<PackageCardData | null>(null);

// 滚动相关
const scrollPosition = ref(0);
const forceScrollTop = ref<number | undefined>(undefined);
const showBackToTop = computed(() => scrollPosition.value > 400);

const sessionList = computed(() => chatStore.getSessionList());

const userName = computed(() => userStore.userName || '用户');
const hasData = computed(() => healthStore.hasData);
const showGroupBanner = computed(() => userStore.hasGroupPackage);

function onPageScroll(e: { detail: { scrollTop: number } }) {
  scrollPosition.value = e.detail.scrollTop;
}

function scrollToTop() {
  forceScrollTop.value = undefined;
  nextTick(() => {
    forceScrollTop.value = 0;
  });
}

function scrollToBottom() {
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

// 流式输出时自动滚动到底部
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

function goPackageDetail(id: string) {
  uni.navigateTo({ url: `/pages/package/detail?id=${id}` });
}

function handleBookFromChat(packageCard: PackageCardData) {
  pendingPackageCard.value = packageCard;
  showDatePicker.value = true;
}

async function handleDateTimeConfirm(data: { date: string; time: string }) {
  showDatePicker.value = false;
  if (!pendingPackageCard.value) return;
  await chatStore.bookFromChat(pendingPackageCard.value, data.date, data.time);
  pendingPackageCard.value = null;
  scrollToBottom();
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

function handlePendingConfirm(data: { date: string; time: string }) {
  showPending.value = false;
  const { date, time } = data;
  uni.navigateTo({ url: `/pages/package/detail?id=pkg-group-001&date=${date}&time=${encodeURIComponent(time)}` });
}

function goGroupPackageDetail() {
  uni.navigateTo({ url: '/pages/package/detail?id=pkg-group-001' });
}

onMounted(async () => {
  await healthStore.loadHealthData();

  if (userStore.hasGroupPackage) {
    showPending.value = true;
  }
});

onShow(() => {
  if (showChat.value) {
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

.hero {
  padding: 4px 20px 16px;
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

/* 历史会话 */
.history-section {
  margin-top: 4px;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 4px;

  &:active { opacity: 0.7; }
}

.history-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.history-title {
  font-size: 13px;
  font-weight: 500;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

.history-count {
  font-size: 11px;
  color: #C4C4C4;
  font-family: "Noto Sans SC", sans-serif;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(12px);

  &:active { background: rgba(255, 255, 255, 0.8); }
}

.history-item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow: hidden;
}

.history-preview {
  font-size: 13px;
  font-weight: 500;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-meta {
  font-size: 11px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}
</style>
