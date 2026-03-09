<template>
  <view class="page">
    <!-- 列表 -->
    <view v-if="sessionList.length > 0" class="list">
      <view
        v-for="s in sessionList"
        :key="s.id"
        class="history-item"
        @tap="viewSession(s.id)"
      >
        <view class="history-icon-wrap">
          <MessageSquare :size="18" color="#0D9488" />
        </view>
        <view class="history-info">
          <text class="history-preview">{{ s.preview }}</text>
          <text class="history-meta">{{ formatTime(s.timestamp) }} · {{ s.messageCount }}条消息</text>
        </view>
        <ChevronRight :size="16" color="#D1D5DB" />
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else class="empty">
      <MessageSquareOff :size="40" color="#D1D5DB" />
      <text class="empty-text">暂无历史对话</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { MessageSquare, MessageSquareOff, ChevronRight } from 'lucide-vue-next';
import { useChatStore } from '@/stores/chat';

const chatStore = useChatStore();
const sessionList = computed(() => chatStore.getSessionList());

function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  const d = new Date(timestamp);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function viewSession(sessionId: string) {
  const restored = chatStore.restoreSession(sessionId);
  if (restored) {
    uni.navigateTo({ url: '/pages/ai/chat?viewHistory=1' });
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #B2DFDB 0%, #D5F0EC 30%, #E8F5F2 60%, #F0F7F5 100%);
}

.list {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 2px 16px rgba(13, 148, 136, 0.07);

  &:active { background: rgba(255, 255, 255, 0.8); }
}

.history-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(13, 148, 136, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.history-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.history-preview {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-meta {
  font-size: 12px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 160px;
  gap: 12px;
}

.empty-text {
  font-size: 15px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}
</style>
