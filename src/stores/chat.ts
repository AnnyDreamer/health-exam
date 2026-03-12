import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ChatMessage, ChatOption, PackageCardData, FollowUpPlan } from '@/types/chat';
import type { ExamPackage } from '@/types/package';
import { isQwenAvailable } from '@/api/qwen';
import { useUserStore } from '@/stores/user';
import { useHealthStore } from '@/stores/health';
import { useAppointmentStore } from '@/stores/appointment';
import { usePackageStore } from '@/stores/package';
import { ChatOrchestrator } from '@/services/chatOrchestrator';
import type { ChatStoreOps } from '@/services/chatOrchestrator';

// Storage key 常量
const CHAT_HISTORY_KEY = 'health_exam_chat_history';
const CHAT_SESSIONS_KEY = 'health_exam_chat_sessions';
const MAX_SESSIONS = 10;

interface ChatSession {
  id: string;
  userId: string;
  userName: string;
  preview: string;
  timestamp: number;
  messageCount: number;
  messages: ChatMessage[];
}

let msgId = 0;
function genId() {
  return `msg-${++msgId}-${Date.now()}`;
}

/** 将 AI 生成的套餐卡片数据保存到 package store */
function savePackageToStore(packageCard: PackageCardData) {
  const packageStore = usePackageStore();
  const examPackage: ExamPackage = {
    id: packageCard.id,
    name: packageCard.name,
    description: packageCard.isGroupPackage ? '企业团检 AI 定制方案' : 'AI 为您量身定制的体检方案',
    badge: packageCard.badge || 'AI定制',
    items: packageCard.items.map((item, index) => {
      const itemName = typeof item === 'string' ? item : item.name;
      const aiReason = typeof item === 'string' ? undefined : item.reason;
      const category = typeof item === 'string' ? undefined : item.category;
      const price = typeof item === 'string' ? 0 : (item.price || 0);
      return {
        id: `item-ai-${index}`,
        name: itemName,
        description: '',
        price,
        aiReason,
        category,
      };
    }),
    totalPrice: packageCard.totalPrice,
    originalPrice: packageCard.originalPrice,
    isGroupPackage: packageCard.isGroupPackage,
    enterpriseBudget: packageCard.enterpriseBudget,
    enterpriseCoverage: packageCard.enterpriseCoverage,
    employeePayment: packageCard.employeePayment,
    aiAddonDiscount: packageCard.aiAddonDiscount,
    notice: [
      '体检前一天请清淡饮食，晚上10点后禁食禁水',
      '体检当天空腹前往',
      '如有长期服用药物请携带药物清单',
      '女性请避开月经期',
    ],
  };
  packageStore.addCustomPackage(examPackage);
}

// ============================================================
// Mock 脚本引擎（保留作为 fallback）
// ============================================================

type ScriptStep = {
  aiMessage: string;
  contentType?: ChatMessage['contentType'];
  options?: ChatOption[];
  packageCard?: ChatMessage['packageCard'];
};

/** 引导流程总步数 */
const GUIDED_TOTAL_STEPS = 10;

/** 有数据用户：AI 基于就诊数据分析，直接问预算 */
const makePackageWithDataScript: ScriptStep[] = [
  {
    aiMessage: '好的！那你的 **体检预算** 大概是多少？',
    contentType: 'options',
    options: [
      { label: '1000以下 · 基础筛查', value: 'low' },
      { label: '1000-2000 · 重点专项', value: 'mid', primary: true },
      { label: '2000以上 · 深度全面', value: 'high' },
    ],
  },
  {
    aiMessage: '根据你的健康数据和偏好，我为你生成了这个方案：',
    contentType: 'package-card',
    packageCard: {
      id: 'pkg-ai-001',
      name: '心脑血管专项套餐',
      badge: 'AI定制',
      items: [
        { name: '心脏彩超', price: 260, reason: '血压偏高，需评估心脏结构和功能' },
        { name: '颈动脉彩超', price: 180, reason: '血压偏高，筛查颈动脉斑块和狭窄' },
        { name: '血脂全套', price: 120, reason: '总胆固醇、甘油三酯、低密度脂蛋白均偏高' },
        { name: '同型半胱氨酸', price: 90, reason: '高同型半胱氨酸是心脑血管疾病独立风险因素' },
        { name: '甲状腺功能全套', price: 220, reason: 'TSH偏高，需全面评估甲状腺功能' },
        { name: '甲状腺彩超', price: 150, reason: 'TSH异常，排查甲状腺结节等器质性病变' },
        { name: '空腹血糖+胰岛素释放试验', price: 180, reason: 'BMI接近超重，筛查胰岛素抵抗' },
        { name: '肝脂肪定量超声（FibroScan可选）', price: 350, reason: '甘油三酯升高伴BMI偏高，精准评估非酒精性脂肪肝' },
        { name: '生化全套', price: 280, reason: '综合评估肝肾功能及代谢指标' },
        { name: '一般检查', price: 150, reason: '基础体格检查，监测血压和BMI变化' },
      ],
      totalPrice: 1680,
      originalPrice: 1980,
    },
  },
];

/** 无数据用户分步引导脚本 */
const makePackageGuidedScript: ScriptStep[] = [
  {
    aiMessage: '好的，我来帮你定制体检方案！先了解一下你的基本情况吧~\n\n请问你的 **性别** 是？',
    contentType: 'options',
    options: [
      { label: '男性', value: 'guided_gender_male' },
      { label: '女性', value: 'guided_gender_female' },
    ],
  },
  {
    aiMessage: '了解！那你的 **年龄段** 大概是？',
    contentType: 'options',
    options: [
      { label: '30岁以下', value: 'guided_age_under30' },
      { label: '30-45岁', value: 'guided_age_30to45', primary: true },
      { label: '45-60岁', value: 'guided_age_45to60' },
      { label: '60岁以上', value: 'guided_age_over60' },
    ],
  },
  {
    aiMessage: '好的！你近期有没有什么 **健康不适或慢性病史**？',
    contentType: 'options',
    options: [
      { label: '没有特殊情况', value: 'guided_concern_none' },
      { label: '三高相关', value: 'guided_concern_metabolic' },
      { label: '消化系统', value: 'guided_concern_digest' },
      { label: '颈椎/腰椎', value: 'guided_concern_spine' },
    ],
  },
  {
    aiMessage: '你的 **家族** 有没有什么遗传性疾病？',
    contentType: 'options',
    options: [
      { label: '没有', value: 'guided_family_none' },
      { label: '高血压', value: 'guided_family_hypertension' },
      { label: '糖尿病', value: 'guided_family_diabetes' },
      { label: '癌症家族史', value: 'guided_family_cancer' },
    ],
  },
  {
    aiMessage: '你的 **职业类型** 是？',
    contentType: 'options',
    options: [
      { label: '办公室久坐', value: 'guided_job_office' },
      { label: '体力劳动', value: 'guided_job_labor' },
      { label: '经常出差', value: 'guided_job_travel' },
      { label: '户外作业', value: 'guided_job_outdoor' },
    ],
  },
  {
    aiMessage: '平时 **运动** 频率怎么样？',
    contentType: 'options',
    options: [
      { label: '很少运动', value: 'guided_exercise_rarely' },
      { label: '每周1-2次', value: 'guided_exercise_1to2' },
      { label: '每周3次以上', value: 'guided_exercise_3plus' },
      { label: '每天运动', value: 'guided_exercise_daily' },
    ],
  },
  {
    aiMessage: '你的 **睡眠质量** 如何？',
    contentType: 'options',
    options: [
      { label: '良好', value: 'guided_sleep_good' },
      { label: '一般偶尔失眠', value: 'guided_sleep_fair' },
      { label: '经常失眠', value: 'guided_sleep_poor' },
      { label: '长期用药助眠', value: 'guided_sleep_medicated' },
    ],
  },
  {
    aiMessage: '有 **烟酒习惯** 吗？',
    contentType: 'options',
    options: [
      { label: '不吸烟不喝酒', value: 'guided_habit_none' },
      { label: '吸烟', value: 'guided_habit_smoke' },
      { label: '饮酒', value: 'guided_habit_drink' },
      { label: '烟酒都有', value: 'guided_habit_both' },
    ],
  },
  {
    aiMessage: '了解！那这次体检你最 **关注哪个方向**？',
    contentType: 'options',
    options: [
      { label: '全面筛查', value: 'guided_focus_comprehensive', primary: true },
      { label: '心脑血管', value: 'guided_focus_cardio' },
      { label: '肿瘤早筛', value: 'guided_focus_tumor' },
      { label: '职场亚健康', value: 'guided_focus_office' },
    ],
  },
  {
    aiMessage: '最后一个问题～你的 **体检预算** 大概是多少？',
    contentType: 'options',
    options: [
      { label: '1000以下 · 基础筛查', value: 'guided_budget_low' },
      { label: '1000-2000 · 重点专项', value: 'guided_budget_mid', primary: true },
      { label: '2000以上 · 深度全面', value: 'guided_budget_high' },
    ],
  },
  {
    aiMessage: '综合你的情况，我为你生成了专属方案：',
    contentType: 'package-card',
    packageCard: {
      id: 'pkg-ai-guided-001',
      name: '个性化健康筛查套餐',
      badge: 'AI定制',
      items: [
        { name: '一般检查', price: 150, reason: '基础体格检查，评估身高体重血压等基本指标' },
        { name: '血常规', price: 35, reason: '筛查贫血、感染、血液系统疾病' },
        { name: '尿常规', price: 25, reason: '评估肾脏功能和泌尿系统健康' },
        { name: '生化全套', price: 280, reason: '全面评估肝肾功能、血糖血脂等代谢指标' },
        { name: '心电图', price: 40, reason: '筛查心律失常和心肌缺血' },
        { name: '腹部B超', price: 200, reason: '检查肝胆脾胰双肾是否有器质性病变' },
        { name: '甲状腺彩超', price: 150, reason: '筛查甲状腺结节等常见甲状腺疾病' },
        { name: '胸部CT', price: 500, reason: '低剂量螺旋CT筛查肺部结节和早期肺癌' },
      ],
      totalPrice: 1380,
      originalPrice: 1780,
    },
  },
];

/** 动态生成有数据用户的问候语 */
function buildHasDataGreeting(userName: string): ScriptStep {
  const healthStore = useHealthStore();
  const indicators = healthStore.indicators;
  const abnormal = indicators.filter((ind) => ind.status !== 'normal');

  let abnormalLines = '';
  for (const ind of abnormal) {
    abnormalLines += `\n- **${ind.name} ${ind.value}** — ${ind.label}`;
  }

  return {
    aiMessage: `你好${userName}！我分析了你最近的体检数据，发现以下异常指标：${abnormalLines}\n\n综合评估你存在一定的 **健康风险**，建议尽快做一次有针对性的专项体检。需要我帮你定制方案吗？`,
    contentType: 'options',
    options: [
      { label: '好的，帮我定制', value: 'make-package', primary: true },
      { label: '先看看报告', value: 'view-report' },
    ],
  };
}

/** 动态生成风险分析脚本 */
function buildRiskScript(): ScriptStep[] {
  const healthStore = useHealthStore();
  const indicators = healthStore.indicators;

  const abnormal = indicators.filter((ind) => ind.status !== 'normal');
  const normal = indicators.filter((ind) => ind.status === 'normal');

  let abnormalList = '';
  abnormal.forEach((ind) => {
    abnormalList += `- **${ind.name} ${ind.value}** — ${ind.label}\n`;
  });

  let normalList = '';
  if (normal.length > 0) {
    const normalNames = normal.map((ind) => ind.name).join('、');
    normalList = `\n${normalNames} 均在正常范围内。\n`;
  }

  let riskLines = '';
  abnormal.forEach((ind, i) => {
    riskLines += `${i + 1}. **${ind.name}${ind.label}**：需要重点关注\n`;
  });

  return [
    {
      aiMessage: `## 健康风险总结\n\n以下指标存在异常：\n\n${abnormalList}${normalList}\n### 主要风险\n\n${riskLines}\n建议针对以上风险做一次专项体检，需要我帮你定制方案吗？`,
      contentType: 'options',
      options: [
        { label: '定制体检方案', value: 'make-package', primary: true },
        { label: '查看完整报告', value: 'view-report' },
      ],
    },
  ];
}

const noDataScript: Record<string, ScriptStep[]> = {
  'report-interpret': [
    {
      aiMessage: '目前暂无体检报告。建议你先进行一次全面体检，之后我可以为你解读报告。需要我推荐合适的体检套餐吗？',
      contentType: 'options',
      options: [{ label: '推荐体检套餐', value: 'make-package', primary: true }],
    },
  ],
  'make-package': makePackageGuidedScript,
  'exam-process': [
    {
      aiMessage: '体检流程如下：\n\n**1. 预约登记** - 选择套餐并预约时间\n**2. 体检当天** - 空腹到达，前台领取体检单\n**3. 分科检查** - 按照体检单依次前往各科室\n**4. 报告领取** - 一般3-5个工作日出报告\n**5. 报告解读** - AI智能解读或医生面对面解读',
      contentType: 'text',
    },
    {
      aiMessage: '需要我帮你预约体检吗？',
      contentType: 'options',
      options: [
        { label: '选择体检套餐', value: 'make-package', primary: true },
        { label: '暂时不用', value: 'dismiss' },
      ],
    },
  ],
  'consult': [
    {
      aiMessage: '欢迎咨询！请问你想了解什么内容？',
      contentType: 'options',
      options: [
        { label: '体检项目介绍', value: 'exam-process' },
        { label: '套餐推荐', value: 'make-package' },
      ],
    },
  ],
};

// ============================================================
// Store
// ============================================================

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([]);
  const currentScript = ref<ScriptStep[]>([]);
  const scriptIndex = ref(0);
  const isTyping = ref(false);
  /** 会话归档版本号，递增触发 sessionList 刷新 */
  const sessionVersion = ref(0);

  /** 当前正在流式输出的消息 ID */
  const streamingMessageId = ref<string | null>(null);

  /** 引导式套餐定制 - 当前步骤（用于 UI 进度条） */
  const guidedStep = computed(() => orchestrator?.guidedStep ?? 0);

  // ============================================================
  // Orchestrator — 真实 AI 模式的核心调度器
  // ============================================================

  let orchestrator: ChatOrchestrator | null = null;

  /** 获取或创建 Orchestrator */
  function getOrchestrator(): ChatOrchestrator {
    if (!orchestrator) {
      const storeOps: ChatStoreOps = {
        get messages() { return messages.value; },
        addMessage,
        updateMessageContent,
        updateMessage: _updateMessage,
        setTyping(val: boolean) { isTyping.value = val; },
        setStreamingId(id: string | null) { streamingMessageId.value = id; },
        saveChatHistory: _saveChatHistory,
      };
      orchestrator = new ChatOrchestrator(storeOps);
    }
    return orchestrator;
  }

  // ============================================================
  // 对话历史持久化
  // ============================================================

  function _getUserId(): string {
    const userStore = useUserStore();
    return userStore.userInfo?.id || 'anonymous';
  }

  function _saveChatHistory() {
    try {
      const key = `${CHAT_HISTORY_KEY}_${_getUserId()}`;
      uni.setStorageSync(key, JSON.stringify(messages.value));
    } catch (e) {
      console.warn('保存对话历史失败:', e);
    }
  }

  function loadHistory(): ChatMessage[] | null {
    try {
      const key = `${CHAT_HISTORY_KEY}_${_getUserId()}`;
      const stored = uni.getStorageSync(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('读取对话历史失败:', e);
    }
    return null;
  }

  function restoreHistory(): boolean {
    const history = loadHistory();
    if (history && history.length > 0) {
      history.forEach((msg) => {
        if (msg.planGenerating) msg.planGenerating = false;
        if (msg.options?.some((o) => o.value === 'book-followup')) {
          msg.options = undefined;
        }
      });
      messages.value = history;
      const maxId = history.reduce((max, msg) => {
        const match = msg.id.match(/^msg-(\d+)-/);
        return match ? Math.max(max, parseInt(match[1])) : max;
      }, 0);
      msgId = maxId;
      return true;
    }
    return false;
  }

  function clearHistory() {
    try {
      const key = `${CHAT_HISTORY_KEY}_${_getUserId()}`;
      uni.removeStorageSync(key);
    } catch (e) {
      console.warn('清除对话历史失败:', e);
    }
  }

  function hasStoredHistory(): boolean {
    const history = loadHistory();
    return !!(history && history.length > 0);
  }

  // ============================================================
  // 会话归档管理
  // ============================================================

  function loadAllSessions(): ChatSession[] {
    try {
      const stored = uni.getStorageSync(CHAT_SESSIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  function archiveCurrentSession() {
    if (messages.value.length === 0) return;

    try {
      const sessions = loadAllSessions();
      const userStore = useUserStore();
      const userId = userStore.userInfo?.id || 'anonymous';
      const sessionUserName = userStore.userName || '用户';
      const firstAiMsg = messages.value.find(m => m.role === 'ai' && m.content && m.contentType === 'text');
      const preview = firstAiMsg?.content?.replace(/[#*\n]/g, '').slice(0, 40) || '对话记录';

      sessions.unshift({
        id: `session-${Date.now()}`,
        userId,
        userName: sessionUserName,
        preview,
        timestamp: Date.now(),
        messageCount: messages.value.length,
        messages: [...messages.value],
      });

      if (sessions.length > MAX_SESSIONS) {
        sessions.splice(MAX_SESSIONS);
      }

      uni.setStorageSync(CHAT_SESSIONS_KEY, JSON.stringify(sessions));
      sessionVersion.value++;
    } catch (e) {
      console.warn('归档会话失败:', e);
    }
  }

  function getSessionList(): Array<{ id: string; preview: string; timestamp: number; messageCount: number }> {
    void sessionVersion.value;
    const userId = _getUserId();
    return loadAllSessions()
      .filter(s => s.userId === userId)
      .map(({ id, preview, timestamp, messageCount }) => ({
        id, preview, timestamp, messageCount,
      }));
  }

  function restoreSession(sessionId: string): boolean {
    const sessions = loadAllSessions();
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      messages.value = session.messages;
      const maxId = session.messages.reduce((max, msg) => {
        const match = msg.id.match(/^msg-(\d+)-/);
        return match ? Math.max(max, parseInt(match[1])) : max;
      }, 0);
      msgId = maxId;
      return true;
    }
    return false;
  }

  function startNewChat() {
    archiveCurrentSession();
    messages.value = [];
    currentScript.value = [];
    scriptIndex.value = 0;
    isTyping.value = false;
    streamingMessageId.value = null;
    msgId = 0;
    clearHistory();
    // 重置 orchestrator
    if (orchestrator) orchestrator.reset();
  }

  // ============================================================
  // 核心方法
  // ============================================================

  function useRealAI(): boolean {
    return isQwenAvailable();
  }

  function reset() {
    messages.value = [];
    currentScript.value = [];
    scriptIndex.value = 0;
    isTyping.value = false;
    streamingMessageId.value = null;
    msgId = 0;
    clearHistory();
    if (orchestrator) orchestrator.reset();
  }

  function addMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>): string {
    const id = genId();
    messages.value.push({
      ...msg,
      id,
      timestamp: Date.now(),
    });
    if (!streamingMessageId.value) {
      _saveChatHistory();
    }
    return id;
  }

  function updateMessageContent(id: string, content: string) {
    const msg = messages.value.find((m) => m.id === id);
    if (msg) {
      msg.content = content;
    }
  }

  function _updateMessage(id: string, fields: Partial<ChatMessage>) {
    const idx = messages.value.findIndex((m) => m.id === id);
    if (idx !== -1) {
      messages.value[idx] = { ...messages.value[idx], ...fields };
    }
  }

  // ============================================================
  // Mock 模式方法（保留作为 fallback）
  // ============================================================

  async function simulateAIReply(step: ScriptStep) {
    isTyping.value = true;
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 800));

    if (step.contentType === 'package-card' && step.packageCard) {
      savePackageToStore(step.packageCard);
    }

    addMessage({
      role: 'ai',
      content: step.aiMessage,
      contentType: step.contentType || 'text',
      options: step.options,
      packageCard: step.packageCard,
    });
    isTyping.value = false;
  }

  async function startScriptMock(key: string, hasHealthData: boolean, userName?: string) {
    const name = userName || '用户';

    let script: ScriptStep[];

    if (hasHealthData) {
      if (key === 'view-risk') {
        script = buildRiskScript();
      } else if (key === 'make-package') {
        const greeting = buildHasDataGreeting(name);
        script = [greeting, ...makePackageWithDataScript];
      } else {
        const greeting = buildHasDataGreeting(name);
        script = [greeting];
      }
    } else {
      script = noDataScript[key] || noDataScript['consult'];
    }

    currentScript.value = script;
    scriptIndex.value = 0;

    if (script.length > 0) {
      await simulateAIReply(script[0]);
      scriptIndex.value = 1;
    }
  }

  async function sendUserMessageMock(content: string, value?: string) {
    addMessage({ role: 'user', content, contentType: 'text' });

    if (value === 'view-report') {
      uni.navigateTo({ url: '/pages/report/detail?id=report-001' });
      return;
    }
    if (value === 'view-appointment') {
      uni.navigateTo({ url: '/pages/appointment/index' });
      return;
    }
    if (value === 'dismiss') {
      addMessage({ role: 'ai', content: '好的，有需要随时找我~', contentType: 'text' });
      return;
    }

    // 按脚本推进
    if (value === 'make-package' && !currentScript.value.length) {
      const healthStore = useHealthStore();
      currentScript.value = healthStore.hasData ? makePackageWithDataScript : makePackageGuidedScript;
      scriptIndex.value = 0;
    }

    if (scriptIndex.value < currentScript.value.length) {
      await simulateAIReply(currentScript.value[scriptIndex.value]);
      scriptIndex.value++;
    } else {
      await simulateAIReply({ aiMessage: '收到你的消息，我会根据你的情况给出建议。' });
    }
  }

  // ============================================================
  // 真实 AI 模式 — 委托 Orchestrator
  // ============================================================

  async function startScriptAI(key: string, hasHealthData: boolean, userName?: string) {
    await getOrchestrator().startFlow(key, hasHealthData, userName);
  }

  async function sendUserMessageAI(content: string, value?: string) {
    await getOrchestrator().processUserMessage(content, value);
  }

  // ============================================================
  // 统一入口：自动选择 Mock 或 AI 模式
  // ============================================================

  async function startScript(key: string, hasHealthData: boolean, userName?: string) {
    if (useRealAI()) {
      await startScriptAI(key, hasHealthData, userName);
    } else {
      await startScriptMock(key, hasHealthData, userName);
    }
  }

  async function sendUserMessage(content: string, value?: string) {
    if (useRealAI()) {
      await sendUserMessageAI(content, value);
    } else {
      await sendUserMessageMock(content, value);
    }
  }

  /** 发送图片进行报告解读（流式） */
  async function sendImageForInterpretation(imageBase64: string, imageUrl: string) {
    if (useRealAI()) {
      await getOrchestrator().sendImageForInterpretation(imageBase64, imageUrl);
    } else {
      addMessage({ role: 'user', content: '请帮我解读这份体检报告', contentType: 'image', imageUrl });
      await simulateAIReply({
        aiMessage: '这是一份体检报告的模拟解读结果。报告显示各项指标基本正常，建议定期复查。',
      });
    }
  }

  /** 发送 PDF 进行报告解读（流式） */
  async function sendPdfForInterpretation(pdfBase64: string, fileName: string) {
    if (useRealAI()) {
      await getOrchestrator().sendPdfForInterpretation(pdfBase64, fileName);
    } else {
      addMessage({ role: 'user', content: '请帮我解读这份体检报告', contentType: 'pdf', pdfFileName: fileName });
      await simulateAIReply({
        aiMessage: '这是一份PDF体检报告的模拟解读结果。报告显示各项指标基本正常，建议定期复查。',
      });
    }
  }

  /** 从聊天中直接预约体检套餐 */
  async function bookFromChat(packageCard: PackageCardData, date: string, time: string) {
    if (useRealAI()) {
      await getOrchestrator().bookFromChat(packageCard, date, time);
    } else {
      // Mock 模式下的预约
      savePackageToStore(packageCard);
      isTyping.value = true;

      try {
        const appointmentStore = useAppointmentStore();
        await appointmentStore.create({ packageId: packageCard.id, date, time });
        isTyping.value = false;

        addMessage({
          role: 'ai',
          content: `## 预约成功\n\n| 项目 | 详情 |\n|------|------|\n| 套餐 | **${packageCard.name}** |\n| 日期 | ${date} |\n| 时间 | ${time} |\n| 地点 | 健康体检中心3楼 |\n| 费用 | **¥${packageCard.totalPrice.toLocaleString()}** |\n| 项目数 | ${packageCard.items.length}项 |\n\n> 请提前 **8小时空腹**，携带身份证到前台登记。`,
          contentType: 'text',
        });

        addMessage({
          role: 'ai',
          content: '',
          contentType: 'options',
          options: [
            { label: '查看预约详情', value: 'view-appointment', primary: true },
            { label: '继续咨询', value: 'consult' },
          ],
        });
      } catch (error: unknown) {
        isTyping.value = false;
        const errMsg = error instanceof Error ? error.message : '未知错误';
        addMessage({ role: 'ai', content: `预约失败，请重试。(${errMsg})`, contentType: 'text' });
      }
    }
  }

  /** 获取最近生成的健康管理方案（供弹窗使用） */
  function getLastFollowUpPlan(): FollowUpPlan | null {
    return orchestrator?.getLastFollowUpPlan() ?? null;
  }

  return {
    messages,
    isTyping,
    streamingMessageId,
    guidedStep,
    GUIDED_TOTAL_STEPS,
    reset,
    addMessage,
    startScript,
    sendUserMessage,
    sendImageForInterpretation,
    sendPdfForInterpretation,
    bookFromChat,
    loadHistory,
    restoreHistory,
    clearHistory,
    hasStoredHistory,
    startNewChat,
    getSessionList,
    restoreSession,
    getLastFollowUpPlan,
  };
});
