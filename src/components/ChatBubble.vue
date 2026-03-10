<template>
  <view class="bubble-row" :class="isAI ? 'ai' : 'user'">
    <!-- AI 头像 -->
    <view v-if="isAI" class="ai-avatar">
      <image src="/static/doctor.png" class="avatar-img" />
    </view>

    <view class="bubble" :class="isAI ? 'ai-bubble' : 'user-bubble'">
      <view
        v-if="content && contentType !== 'loading'"
        class="bubble-text-wrap"
        :class="{ 'bubble-text-collapsed': isAI && isLong && !expanded }"
        @tap="toggleExpand"
      >
        <rich-text :nodes="renderedHtml" class="bubble-text md-content"></rich-text>
      </view>
      <!-- 展开/收起按钮 -->
      <view v-if="isAI && isLong" class="expand-toggle" @tap="toggleExpand">
        <text class="expand-text">{{ expanded ? '收起' : '展开全文' }}</text>
        <text class="expand-arrow" :class="{ 'expand-arrow--up': expanded }">›</text>
      </view>
      <slot></slot>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { marked } from 'marked';

const props = defineProps<{
  role: 'ai' | 'user';
  content: string;
  contentType: string;
}>();

const isAI = computed(() => props.role === 'ai');
const expanded = ref(true);

// 超过 200 字符认为是长消息
const isLong = computed(() => {
  if (!isAI.value || !props.content) return false;
  return props.content.length > 200;
});

function toggleExpand() {
  if (isAI.value && isLong.value) {
    expanded.value = !expanded.value;
  }
}

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true,
});

const renderedHtml = computed(() => {
  if (!props.content) return '';
  // 用户消息不渲染 markdown，直接转义
  if (!isAI.value) {
    return props.content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
  }
  // AI 消息使用 marked 渲染
  return marked.parse(props.content, { async: false }) as string;
});
</script>

<style lang="scss" scoped>
.bubble-row {
  display: flex;
  margin-bottom: 14px;
  padding: 0;

  &.ai {
    justify-content: flex-start;
    gap: 8px;
  }
  &.user {
    justify-content: flex-end;
  }
}

.ai-avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 16px;
  overflow: hidden;
}

.avatar-img {
  width: 32px;
  height: 32px;
  border-radius: 16px;
}

.bubble {
  max-width: 80%;
  font-size: 14px;
  line-height: 1.5;
  font-family: "Noto Sans SC", sans-serif;
}

.ai-bubble {
  background: rgba(255, 255, 255, 0.5);
  color: #1A1A1A;
  border-radius: 4px 16px 16px 16px;
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(20px);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.user-bubble {
  background: #0D9488;
  color: #fff;
  border-radius: 16px 4px 16px 16px;
  padding: 10px 14px;
}

.bubble-text {
  font-size: 14px;
  line-height: 1.6;
}

/* 折叠长消息 */
.bubble-text-wrap {
  overflow: hidden;
  position: relative;
}

.bubble-text-collapsed {
  max-height: 160px;
  -webkit-mask-image: linear-gradient(to bottom, #000 60%, transparent 100%);
  mask-image: linear-gradient(to bottom, #000 60%, transparent 100%);
}

.expand-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 4px 0 0;

  &:active { opacity: 0.6; }
}

.expand-text {
  font-size: 12px;
  font-weight: 500;
  color: #0D9488;
  font-family: "Noto Sans SC", sans-serif;
}

.expand-arrow {
  font-size: 16px;
  color: #0D9488;
  transform: rotate(90deg);
  transition: transform 0.2s;
  line-height: 1;
}

.expand-arrow--up {
  transform: rotate(-90deg);
}
</style>

<style lang="scss">
/* Markdown 渲染样式（非 scoped，因为 rich-text 内部 DOM 无法被 scoped 样式覆盖） */
.md-content {

  p {
    margin: 0 0 8px 0;
    &:last-child { margin-bottom: 0; }
  }

  h1, h2, h3, h4, h5, h6 {
    margin: 12px 0 6px 0;
    font-weight: 700;
    color: #1A1A1A;
    &:first-child { margin-top: 0; }
  }
  h1 { font-size: 18px; }
  h2 { font-size: 16px; }
  h3 { font-size: 15px; }
  h4, h5, h6 { font-size: 14px; }

  strong {
    font-weight: 700;
    color: #0D9488;
  }

  em {
    font-style: italic;
  }

  ul, ol {
    margin: 4px 0 8px 0;
    padding-left: 20px;
  }

  li {
    margin: 2px 0;
    line-height: 1.6;
  }

  /* 表格样式 */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0;
    font-size: 12px;
    border-radius: 8px;
    overflow: hidden;
  }

  thead {
    background: rgba(13, 148, 136, 0.1);
  }

  th {
    font-weight: 600;
    color: #0D9488;
    padding: 8px 10px;
    text-align: left;
    border-bottom: 2px solid rgba(13, 148, 136, 0.2);
    white-space: nowrap;
  }

  td {
    padding: 6px 10px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    color: #374151;
  }

  tr:last-child td {
    border-bottom: none;
  }

  tr:nth-child(even) {
    background: rgba(0, 0, 0, 0.02);
  }

  /* 行内代码 */
  code {
    background: rgba(13, 148, 136, 0.08);
    color: #0D9488;
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 13px;
    font-family: "DM Sans", monospace;
  }

  /* 代码块 */
  pre {
    background: rgba(0, 0, 0, 0.04);
    border-radius: 8px;
    padding: 10px 12px;
    margin: 8px 0;
    overflow-x: auto;
    code {
      background: none;
      padding: 0;
      color: #374151;
    }
  }

  /* 引用块 */
  blockquote {
    border-left: 3px solid #0D9488;
    padding: 4px 0 4px 12px;
    margin: 8px 0;
    color: #6B7280;
    background: rgba(13, 148, 136, 0.04);
    border-radius: 0 6px 6px 0;
  }

  /* 水平线 */
  hr {
    border: none;
    border-top: 1px solid rgba(0, 0, 0, 0.08);
    margin: 12px 0;
  }

  /* 链接 */
  a {
    color: #0D9488;
    text-decoration: underline;
  }
}
</style>
