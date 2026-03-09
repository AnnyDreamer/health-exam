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
        <view @tap="showActionSheet">
          <CirclePlus :size="20" class="plus-icon" />
        </view>
      </view>
      <view class="send-btn" @tap="send">
        <SendIcon :size="18" class="send-icon" />
      </view>
    </view>
    <!-- 隐藏的 PDF 文件选择器（仅 H5 环境使用） -->
    <input
      ref="pdfInputRef"
      type="file"
      accept=".pdf"
      style="display: none;"
      @change="handlePdfFileChange"
    />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CirclePlus, Send as SendIcon } from 'lucide-vue-next';

const emit = defineEmits(['send', 'sendImage', 'sendPdf']);
const text = ref('');
const pdfInputRef = ref<HTMLInputElement | null>(null);

function send() {
  const msg = text.value.trim();
  if (!msg) return;
  emit('send', msg);
  text.value = '';
}

function showActionSheet() {
  uni.showActionSheet({
    itemList: ['拍照', '从相册选择', '上传PDF报告'],
    success: (res) => {
      if (res.tapIndex === 2) {
        choosePdf();
      } else {
        const sourceType = res.tapIndex === 0 ? ['camera'] : ['album'];
        chooseImage(sourceType as ('camera' | 'album')[]);
      }
    },
  });
}

/** 选择 PDF 文件 */
function choosePdf() {
  // #ifdef H5
  // H5 环境下使用隐藏的 file input
  const input = pdfInputRef.value;
  if (input) {
    input.value = '';
    input.click();
  }
  // #endif
  // #ifndef H5
  // 非 H5 平台暂不支持 PDF（可在后续扩展）
  uni.showToast({ title: '当前平台暂不支持 PDF 上传', icon: 'none' });
  // #endif
}

/** H5 环境：处理 PDF 文件选择 */
function handlePdfFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  // 验证文件类型
  if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
    uni.showToast({ title: '请选择 PDF 格式文件', icon: 'none' });
    return;
  }

  // 验证文件大小（限制 10MB）
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    uni.showToast({ title: 'PDF 文件不能超过 10MB', icon: 'none' });
    return;
  }

  const fileName = file.name;
  const reader = new FileReader();
  reader.onloadend = () => {
    const base64 = reader.result as string;
    emit('sendPdf', { base64, fileName });
  };
  reader.onerror = () => {
    console.error('PDF 文件读取失败');
    uni.showToast({ title: 'PDF 文件读取失败', icon: 'none' });
  };
  reader.readAsDataURL(file);
}

function chooseImage(sourceType: ('camera' | 'album')[]) {
  uni.chooseImage({
    count: 1,
    sourceType,
    sizeType: ['compressed'],
    success: (res) => {
      const tempFilePath = res.tempFilePaths[0];
      if (!tempFilePath) return;

      // 将图片转为 base64
      // #ifdef H5
      imageToBase64H5(tempFilePath);
      // #endif
      // #ifndef H5
      imageToBase64Native(tempFilePath);
      // #endif
    },
  });
}

/** H5 平台：通过 fetch + FileReader 转 base64 */
function imageToBase64H5(filePath: string) {
  fetch(filePath)
    .then((res) => res.blob())
    .then((blob) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        emit('sendImage', { base64, url: filePath });
      };
      reader.readAsDataURL(blob);
    })
    .catch((err) => {
      console.error('图片转 base64 失败:', err);
      uni.showToast({ title: '图片处理失败', icon: 'none' });
    });
}

/** 非 H5 平台：通过 uni.getFileSystemManager 转 base64 */
function imageToBase64Native(filePath: string) {
  // @ts-ignore - uni.getFileSystemManager 在非 H5 平台可用
  const fsm = uni.getFileSystemManager();
  fsm.readFile({
    filePath,
    encoding: 'base64',
    success: (res: { data: string }) => {
      const ext = filePath.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeMap: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
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
  padding-bottom: 20px;
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

  &:active {
    color: #0D9488;
  }
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
</style>
