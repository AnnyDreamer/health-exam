<template>
  <view class="login-page">
    <!-- Status Bar -->
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

    <!-- Logo Area -->
    <view class="logo-area">
      <view class="logo-bg">
        <HeartPulse :size="36" color="#fff" />
      </view>
      <text class="logo-title">健康体检中心</text>
      <text class="logo-sub">AI 智能健康管理平台</text>
    </view>

    <!-- Form Area -->
    <view class="form-area">
      <!-- Form Card -->
      <view class="form-card">
        <!-- Auth Tabs -->
        <view class="auth-tabs">
          <view
            v-for="(tab, i) in tabs"
            :key="i"
            class="tab-item"
            :class="{ active: activeTab === i }"
            @tap="activeTab = i"
          >
            <text class="tab-text" :class="{ 'tab-active-text': activeTab === i }">{{ tab }}</text>
          </view>
        </view>

        <!-- 身份证（默认） -->
        <view v-if="activeTab === 0" class="inputs">
          <view class="input-group">
            <text class="input-label">姓名</text>
            <view class="input-field">
              <input v-model="idCardForm.name" placeholder="请输入真实姓名" class="the-input" />
            </view>
          </view>
          <view class="input-group">
            <text class="input-label">身份证号</text>
            <view class="input-field">
              <input v-model="idCardForm.idCard" maxlength="18" placeholder="请输入身份证号" class="the-input" />
            </view>
          </view>
        </view>

        <!-- 手机号 -->
        <view v-if="activeTab === 1" class="inputs">
          <view class="input-group">
            <text class="input-label">手机号码</text>
            <view class="input-field">
              <input v-model="phoneForm.phone" type="number" maxlength="11" placeholder="请输入手机号码" class="the-input" />
            </view>
          </view>
          <view class="input-group">
            <text class="input-label">验证码</text>
            <view class="code-row">
              <view class="input-field code-field">
                <input v-model="phoneForm.code" type="number" maxlength="6" placeholder="请输入验证码" class="the-input" />
              </view>
              <view class="code-btn" :class="{ disabled: countdown > 0 }" @tap="sendCode">
                <text class="code-btn-text">{{ countdown > 0 ? `${countdown}s` : '获取验证码' }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 就诊卡 -->
        <view v-if="activeTab === 2" class="inputs">
          <view class="input-group">
            <text class="input-label">就诊卡号</text>
            <view class="input-field">
              <input v-model="cardForm.cardNo" placeholder="请输入就诊卡号" class="the-input" />
            </view>
          </view>
        </view>

        <!-- Login Button -->
        <view class="login-btn" @tap="handleLogin">
          <text class="login-btn-text">登录 / 注册</text>
        </view>
      </view>

      <!-- 测试账号快捷登录 -->
      <view class="test-accounts">
        <text class="test-title">测试账号快捷登录</text>
        <view class="test-list">
          <view class="test-item" @tap="quickLogin('user-001')">
            <text class="test-name">陈雨萱</text>
            <text class="test-tag tag-data">个检·有数据</text>
          </view>
          <view class="test-item" @tap="quickLogin('user-002')">
            <text class="test-name">林浩然</text>
            <text class="test-tag tag-nodata">个检·无数据</text>
          </view>
          <view class="test-item" @tap="quickLogin('user-003')">
            <text class="test-name">王思琪</text>
            <text class="test-tag tag-group">团检</text>
          </view>
        </view>
      </view>

      <!-- Terms -->
      <view class="terms">
        <text class="terms-gray">登录即表示同意</text>
        <text class="terms-teal">服务条款</text>
        <text class="terms-gray">和</text>
        <text class="terms-teal">隐私政策</text>
      </view>
    </view>

  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { HeartPulse } from 'lucide-vue-next';
import { useUserStore } from '@/stores/user';
import { sendSmsCode, loginByPhone, loginByIdCard, loginByCard } from '@/api/auth';

const userStore = useUserStore();

// H5 环境没有原生状态栏，statusBarHeight 应为 0
const statusBarHeight = ref(0);
// #ifndef H5
statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0;
// #endif

const tabs = ['身份证', '手机号', '就诊卡'];
const activeTab = ref(0);
const countdown = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

const phoneForm = reactive({ phone: '', code: '' });
const idCardForm = reactive({ name: '', idCard: '' });
const cardForm = reactive({ cardNo: '' });

/** 测试账号数据映射 */
const testAccounts: Record<string, { name: string; idCard: string }> = {
  'user-001': { name: '陈雨萱', idCard: '320106199203154028' },
  'user-002': { name: '林浩然', idCard: '440305199508221015' },
  'user-003': { name: '王思琪', idCard: '110108198711063521' },
};

function quickLogin(userId: string) {
  const account = testAccounts[userId];
  if (!account) return;
  activeTab.value = 0; // 切换到身份证 Tab
  idCardForm.name = account.name;
  idCardForm.idCard = account.idCard;
  handleLogin();
}

async function sendCode() {
  if (countdown.value > 0) return;
  if (!phoneForm.phone || phoneForm.phone.length !== 11) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' });
    return;
  }
  try {
    await sendSmsCode(phoneForm.phone);
    uni.showToast({ title: '验证码已发送', icon: 'success' });
    countdown.value = 60;
    timer = setInterval(() => {
      countdown.value--;
      if (countdown.value <= 0 && timer) {
        clearInterval(timer);
        timer = null;
      }
    }, 1000);
  } catch (e: any) {
    uni.showToast({ title: e.message || '发送失败', icon: 'none' });
  }
}

async function handleLogin() {
  try {
    let result;
    if (activeTab.value === 0) {
      if (!idCardForm.name || !idCardForm.idCard) {
        uni.showToast({ title: '请填写完整信息', icon: 'none' });
        return;
      }
      result = await loginByIdCard(idCardForm);
    } else if (activeTab.value === 1) {
      if (!phoneForm.phone || !phoneForm.code) {
        uni.showToast({ title: '请填写完整信息', icon: 'none' });
        return;
      }
      result = await loginByPhone(phoneForm);
    } else {
      if (!cardForm.cardNo) {
        uni.showToast({ title: '请输入就诊卡号', icon: 'none' });
        return;
      }
      result = await loginByCard(cardForm);
    }
    userStore.login(result);
    uni.redirectTo({ url: '/pages/ai/chat' });
  } catch (e: any) {
    uni.showToast({ title: e.message || '登录失败', icon: 'none' });
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #B2DFDB 0%, #D5F0EC 30%, #E8F5F2 60%, #F0F7F5 100%);
  display: flex;
  flex-direction: column;
}

.status-bar {
  width: 100%;
}

.logo-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px 32px;
  gap: 12px;
}

.logo-bg {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  background: linear-gradient(225deg, #0D9488, #14B8A6);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(13, 148, 136, 0.19);
}

/* logo 使用 Lucide HeartPulse 图标 */

.logo-title {
  font-size: 22px;
  font-weight: 700;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
  letter-spacing: -0.3px;
}

.logo-sub {
  font-size: 14px;
  color: #6B7280;
  font-family: "Noto Sans SC", sans-serif;
}

.form-area {
  flex: 1;
  padding: 0 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-card {
  padding: 20px;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.auth-tabs {
  display: flex;
  height: 44px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.25);
  padding: 4px;
  gap: 4px;
  backdrop-filter: blur(12px);
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  transition: all 0.2s;

  &.active {
    background: rgba(255, 255, 255, 0.8);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    backdrop-filter: blur(8px);
  }
}

.tab-text {
  font-size: 13px;
  font-weight: 500;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

.tab-active-text {
  color: #1A1A1A;
  font-weight: 600;
}

.inputs {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-label {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.input-field {
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.31);
  padding: 0 16px;
  display: flex;
  align-items: center;
  backdrop-filter: blur(8px);
}

.the-input {
  flex: 1;
  font-size: 14px;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.code-row {
  display: flex;
  gap: 12px;
}

.code-field {
  flex: 1;
}

.code-btn {
  height: 48px;
  padding: 0 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid #0D9488;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);

  &.disabled {
    opacity: 0.5;
    border-color: rgba(255, 255, 255, 0.31);
  }
}

.code-btn-text {
  font-size: 13px;
  color: #0D9488;
  font-weight: 500;
  white-space: nowrap;
  font-family: "Noto Sans SC", sans-serif;
}

.login-btn {
  height: 50px;
  border-radius: 14px;
  background: linear-gradient(90deg, #0D9488, #14B8A6);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(13, 148, 136, 0.25);

  &:active { opacity: 0.9; }
}

.login-btn-text {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  font-family: "Noto Sans SC", sans-serif;
}

.terms {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex-wrap: wrap;
}

.terms-gray {
  font-size: 12px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
}

.terms-teal {
  font-size: 12px;
  color: #0D9488;
  font-weight: 500;
  font-family: "Noto Sans SC", sans-serif;
}

/* 测试账号 */
.test-accounts {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.test-title {
  font-size: 12px;
  color: #9CA3AF;
  font-family: "Noto Sans SC", sans-serif;
  text-align: center;
}

.test-list {
  display: flex;
  gap: 8px;
}

.test-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.31);
  backdrop-filter: blur(8px);

  &:active { background: rgba(255, 255, 255, 0.6); }
}

.test-name {
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
  font-family: "Noto Sans SC", sans-serif;
}

.test-tag {
  font-size: 10px;
  font-weight: 500;
  padding: 1px 6px;
  border-radius: 6px;
  font-family: "Noto Sans SC", sans-serif;
}

.tag-data {
  background: rgba(13, 148, 136, 0.12);
  color: #0D9488;
}

.tag-nodata {
  background: rgba(107, 114, 128, 0.12);
  color: #6B7280;
}

.tag-group {
  background: rgba(245, 158, 11, 0.12);
  color: #D97706;
}

</style>
