<template>
  <view class="chat-input-bar">
    <view class="input-row">
      <view class="input-field">
        <input
          v-model="text"
          class="chat-input"
          placeholder="发消息..."
          confirm-type="send"
          @confirm="send"
        />
        <view @tap="showUploadPanel = !showUploadPanel">
          <CirclePlus :size="20" class="plus-icon" :class="{ 'plus-active': showUploadPanel }" />
        </view>
      </view>
      <view class="send-btn" @tap="send">
        <SendIcon :size="18" class="send-icon" />
      </view>
    </view>

    <!-- 自定义上传面板 -->
    <view v-if="showUploadPanel" class="upload-panel">
      <view class="upload-item" @tap="triggerImagePick">
        <view class="upload-icon-wrap" style="background: #0D9488;">
          <ImageIcon :size="20" color="#fff" />
        </view>
        <text class="upload-label">图片/拍照</text>
      </view>
      <view class="upload-item" @tap="triggerPdfPick">
        <view class="upload-icon-wrap" style="background: #EF4444;">
          <FileText :size="20" color="#fff" />
        </view>
        <text class="upload-label">PDF报告</text>
      </view>
    </view>

  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CirclePlus, Send as SendIcon, Image as ImageIcon, FileText } from 'lucide-vue-next';

const emit = defineEmits(['send', 'sendImage', 'sendPdf']);
const text = ref('');
const showUploadPanel = ref(false);

function send() {
  const msg = text.value.trim();
  if (!msg) return;
  emit('send', msg);
  text.value = '';
}

/** 动态创建 file input 并触发（绕过 uni-app ref 问题） */
function pickFile(accept: string, onFile: (file: File) => void) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.style.display = 'none';
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) onFile(file);
    document.body.removeChild(input);
  });
  document.body.appendChild(input);
  input.click();
}

function triggerImagePick() {
  showUploadPanel.value = false;
  // #ifdef H5
  pickFile('image/*', (file) => {
    if (!file.type.startsWith('image/')) {
      uni.showToast({ title: '请选择图片文件', icon: 'none' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      uni.showToast({ title: '图片不能超过 10MB', icon: 'none' });
      return;
    }
    const url = URL.createObjectURL(file);
    const reader = new FileReader();
    reader.onloadend = () => emit('sendImage', { base64: reader.result as string, url });
    reader.readAsDataURL(file);
  });
  return;
  // #endif
  // #ifndef H5
  uni.chooseImage({
    count: 1,
    sourceType: ['album', 'camera'],
    sizeType: ['compressed'],
    success: (res) => {
      const tempFilePath = res.tempFilePaths[0];
      if (tempFilePath) imageToBase64Native(tempFilePath);
    },
  });
  // #endif
}

function triggerPdfPick() {
  showUploadPanel.value = false;
  // #ifdef H5
  pickFile('.pdf,application/pdf', (file) => {
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      uni.showToast({ title: '请选择 PDF 格式文件', icon: 'none' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      uni.showToast({ title: 'PDF 不能超过 10MB', icon: 'none' });
      return;
    }
    const fileName = file.name;
    const reader = new FileReader();
    reader.onloadend = () => emit('sendPdf', { base64: reader.result as string, fileName });
    reader.readAsDataURL(file);
  });
  return;
  // #endif
  // #ifndef H5
  uni.showToast({ title: '当前平台暂不支持 PDF 上传', icon: 'none' });
  // #endif
}

/** 非 H5 平台：通过 uni.getFileSystemManager 转 base64 */
function imageToBase64Native(filePath: string) {
  // @ts-ignore
  const fsm = uni.getFileSystemManager();
  fsm.readFile({
    filePath,
    encoding: 'base64',
    success: (res: { data: string }) => {
      const ext = filePath.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeMap: Record<string, string> = {
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
        gif: 'image/gif', webp: 'image/webp',
      };
      const mime = mimeMap[ext] || 'image/jpeg';
      const base64 = `data:${mime};base64,${res.data}`;
      emit('sendImage', { base64, url: filePath });
    },
    fail: (err: unknown) => {
      console.error('图片转 base64 失败:', err);
      uni.showToast({ title: '图片处理失败', icon: 'none' });
    },
  });
}
</script>

<style lang="scss" scoped>
.chat-input-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(20px);
  padding: 8px 16px 0 16px;
  padding-bottom: calc(0px + env(safe-area-inset-bottom));
  border-top: 1px solid rgba(255, 255, 255, 0.3);
  z-index: 100;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 8px;
}

.input-field {
  flex: 1;
  height: 40px;
  border-radius: 20px;
  background: #F3F4F6;
  border: 1px solid #E5E7EB;
  display: flex;
  align-items: center;
  padding: 0 16px;
}

.chat-input {
  flex: 1;
  font-size: 14px;
  color: #1A1A1A;
  background: transparent;
  font-family: "Noto Sans SC", sans-serif;
}

.plus-icon {
  color: #9CA3AF;
  flex-shrink: 0;
  transition: color 0.15s;
}

.plus-active {
  color: #0D9488;
}

.send-btn {
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background: #0D9488;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &:active { opacity: 0.8; }
}

.send-icon {
  color: #fff;
}

/* 上传面板 */
.upload-panel {
  display: flex;
  gap: 24px;
  padding: 12px 8px 16px;
  justify-content: center;
}

.upload-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;

  &:active { opacity: 0.7; }
}

.upload-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-label {
  font-size: 11px;
  color: #6B7280;
  font-family: "Noto Sans SC", sans-serif;
  font-weight: 500;
}
</style>
