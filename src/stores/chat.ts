import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ChatMessage, ChatOption, QwenMessage, PackageCardData, FollowUpPlan } from '@/types/chat';
import type { ExamPackage } from '@/types/package';
import { isQwenAvailable } from '@/api/qwen';
import { sendChatMessage, interpretReport, interpretPdfReport, recommendPackageStream, generateFollowUpPlan, GUIDED_PACKAGE_SYSTEM_PROMPT, MAKE_PACKAGE_WITH_DATA_PROMPT, GROUP_PACKAGE_SYSTEM_PROMPT } from '@/services/aiChat';
import { useUserStore } from '@/stores/user';
import { useReportStore } from '@/stores/report';
import { useHealthStore } from '@/stores/health';
import { useAppointmentStore } from '@/stores/appointment';
import { usePackageStore } from '@/stores/package';

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

// ============================================================
// 辅助函数：将 PackageCardData 转换为 ExamPackage 并存入 store
// ============================================================

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

/** 引导流程总步数 */
const GUIDED_TOTAL_STEPS = 10;

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

  // 构建指标列表（不用表格，用列表格式）
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

/** 根据异常指标生成套餐项目 */
function generatePackageItems(abnormalIndicators: Array<{ name: string; status: string }>): string[] {
  const baseItems = ['一般检查', '血常规', '尿常规'];
  const extraItems: string[] = [];

  for (const ind of abnormalIndicators) {
    const name = ind.name;
    if (name.includes('血压')) extraItems.push('心电图', '心脏彩超', '颈动脉彩超');
    if (name.includes('胆固醇') || name.includes('脂蛋白') || name.includes('甘油三酯')) extraItems.push('血脂全套', '同型半胱氨酸');
    if (name.includes('血糖')) extraItems.push('糖化血红蛋白', '胰岛素释放试验');
    if (name.includes('TSH') || name.includes('甲状腺')) extraItems.push('甲状腺功能全套', '甲状腺彩超');
    if (name.includes('BMI')) extraItems.push('腹部B超', '体脂率检测');
    if (name.includes('肝功能') || name.includes('ALT')) extraItems.push('肝脏彩超', '乙肝五项');
    if (name.includes('肾功能') || name.includes('肌酐')) extraItems.push('肾脏彩超', '尿微量白蛋白');
    if (name.includes('幽门螺杆菌') || name.includes('C14')) extraItems.push('胃镜检查', '腹部B超');
    if (name.includes('颈椎')) extraItems.push('颈椎X光', '颈椎MRI');
    if (name.includes('维生素D')) extraItems.push('骨密度检测', '维生素D复查');
  }

  // 去重并合并
  const allItems = [...baseItems, ...new Set(extraItems)];
  return allItems;
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
  const lastFollowUpPlan = ref<FollowUpPlan | null>(null);
  /** 会话归档版本号，递增触发 sessionList 刷新 */
  const sessionVersion = ref(0);

  /** AI 对话上下文（发送给千问 API 的消息历史） */
  const conversationHistory = ref<QwenMessage[]>([]);

  /** 当前正在流式输出的消息 ID（用于逐字更新内容） */
  const streamingMessageId = ref<string | null>(null);

  /** 当前对话入口 key（用于生成上下文相关的快捷选项） */
  const currentKey = ref('');

  /** AI 回复轮次计数 */
  const aiTurnCount = ref(0);

  /** 引导式套餐定制 - 当前步骤（0=未开始, 1~10=各问题, >10=完成） */
  const guidedStep = ref(0);

  /** 引导式采集的用户画像 */
  const guidedProfile = ref<{
    gender?: string;
    ageRange?: string;
    concerns?: string;
    familyHistory?: string;
    jobType?: string;
    exercise?: string;
    sleepQuality?: string;
    habits?: string;
    focus?: string;
    budget?: 'low' | 'mid' | 'high';
  }>({});

  // ============================================================
  // 对话历史持久化
  // ============================================================

  /** 获取当前用户的 storage key 后缀 */
  function _getUserId(): string {
    const userStore = useUserStore();
    return userStore.userInfo?.id || 'anonymous';
  }

  /** 将对话历史写入 storage（按用户隔离） */
  function _saveChatHistory() {
    try {
      const key = `${CHAT_HISTORY_KEY}_${_getUserId()}`;
      uni.setStorageSync(key, JSON.stringify(messages.value));
    } catch (e) {
      console.warn('保存对话历史失败:', e);
    }
  }

  /** 从 storage 加载对话历史（按用户隔离） */
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

  /** 恢复对话历史到当前 store */
  function restoreHistory(): boolean {
    const history = loadHistory();
    if (history && history.length > 0) {
      messages.value = history;
      // 恢复 msgId 计数器，避免 ID 冲突
      const maxId = history.reduce((max, msg) => {
        const match = msg.id.match(/^msg-(\d+)-/);
        return match ? Math.max(max, parseInt(match[1])) : max;
      }, 0);
      msgId = maxId;
      return true;
    }
    return false;
  }

  /** 清除 storage 中的对话历史（按用户隔离） */
  function clearHistory() {
    try {
      const key = `${CHAT_HISTORY_KEY}_${_getUserId()}`;
      uni.removeStorageSync(key);
    } catch (e) {
      console.warn('清除对话历史失败:', e);
    }
  }

  /** 当前用户是否有已保存的对话历史 */
  function hasStoredHistory(): boolean {
    const history = loadHistory();
    return !!(history && history.length > 0);
  }

  // ============================================================
  // 会话归档管理
  // ============================================================

  /** 加载所有已归档的会话 */
  function loadAllSessions(): ChatSession[] {
    try {
      const stored = uni.getStorageSync(CHAT_SESSIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /** 归档当前会话 */
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

  /** 获取当前用户的会话列表（不含完整消息体） */
  function getSessionList(): Array<{ id: string; preview: string; timestamp: number; messageCount: number }> {
    // 读取 sessionVersion 使 computed 能感知归档变化
    void sessionVersion.value;
    const userId = _getUserId();
    return loadAllSessions()
      .filter(s => s.userId === userId)
      .map(({ id, preview, timestamp, messageCount }) => ({
        id, preview, timestamp, messageCount,
      }));
  }

  /** 恢复某个归档会话到当前视图（只读查看） */
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

  /** 开始新对话：归档当前会话并重置 */
  function startNewChat() {
    archiveCurrentSession();
    messages.value = [];
    currentScript.value = [];
    scriptIndex.value = 0;
    isTyping.value = false;
    conversationHistory.value = [];
    streamingMessageId.value = null;
    currentKey.value = '';
    aiTurnCount.value = 0;
    guidedStep.value = 0;
    guidedProfile.value = {};
    msgId = 0;
    clearHistory();
  }

  // ============================================================
  // 核心方法
  // ============================================================

  /** 是否使用真实 AI */
  function useRealAI(): boolean {
    return isQwenAvailable();
  }

  function reset() {
    messages.value = [];
    currentScript.value = [];
    scriptIndex.value = 0;
    isTyping.value = false;
    conversationHistory.value = [];
    streamingMessageId.value = null;
    currentKey.value = '';
    aiTurnCount.value = 0;
    guidedStep.value = 0;
    guidedProfile.value = {};
    msgId = 0;
    // 重置时清除 storage 中的对话历史
    clearHistory();
  }

  function addMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>): string {
    const id = genId();
    messages.value.push({
      ...msg,
      id,
      timestamp: Date.now(),
    });
    // 在关键节点持久化对话历史（非流式消息才立即保存，流式消息在完成后保存）
    if (!streamingMessageId.value) {
      _saveChatHistory();
    }
    return id;
  }

  /** 更新指定消息的内容（用于流式打字效果） */
  function updateMessageContent(id: string, content: string) {
    const msg = messages.value.find((m) => m.id === id);
    if (msg) {
      msg.content = content;
    }
  }

  // ============================================================
  // Mock 模式方法
  // ============================================================

  async function simulateAIReply(step: ScriptStep) {
    isTyping.value = true;
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 800));

    // 如果是套餐卡片消息，先将套餐数据保存到 package store
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
    if (hasHealthData) {
      if (key === 'view-risk') {
        currentScript.value = buildRiskScript();
      } else if (key === 'make-package') {
        const greeting = buildHasDataGreeting(userName || '用户');
        await simulateAIReply(greeting);
        currentScript.value = makePackageWithDataScript;
        scriptIndex.value = 0;
        return;
      } else {
        currentScript.value = makePackageWithDataScript;
      }
    } else {
      currentScript.value = noDataScript[key] || makePackageGuidedScript;
    }
    scriptIndex.value = 0;

    if (currentScript.value.length > 0) {
      await simulateAIReply(currentScript.value[0]);
      scriptIndex.value = 1;
      if (currentScript.value[0].contentType === 'text' && currentScript.value[1]) {
        await simulateAIReply(currentScript.value[1]);
        scriptIndex.value = 2;
      }
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

    // 关注方向选项 - mock 模式下推进脚本
    if (value && value.startsWith('focus_')) {
      const nextStep = currentScript.value[scriptIndex.value];
      if (nextStep) {
        await simulateAIReply(nextStep);
        scriptIndex.value++;
      }
      return;
    }

    // 引导式流程的选项 - mock 模式下直接推进脚本
    if (value && value.startsWith('guided_')) {
      const nextStep = currentScript.value[scriptIndex.value];
      if (nextStep) {
        await simulateAIReply(nextStep);
        scriptIndex.value++;
      }
      return;
    }

    if (value === 'dismiss') {
      await simulateAIReply({ aiMessage: '好的，有需要随时找我~' });
      return;
    }

    // 预约复查：直接根据复查方案生成套餐并预约
    if (value === 'book-followup') {
      await handleBookFollowUp();
      return;
    }

    if (value === 'make-package') {
      const healthStore = useHealthStore();
      currentScript.value = healthStore.hasData ? makePackageWithDataScript : makePackageGuidedScript;
      scriptIndex.value = 0;
      await simulateAIReply(currentScript.value[0]);
      scriptIndex.value = 1;
      return;
    }

    const nextStep = currentScript.value[scriptIndex.value];
    if (nextStep) {
      await simulateAIReply(nextStep);
      scriptIndex.value++;
    } else {
      await simulateAIReply({
        aiMessage: '我理解你的需求。需要我帮你制定体检方案吗？',
        contentType: 'options',
        options: [
          { label: '制定体检方案', value: 'make-package', primary: true },
          { label: '暂时不用', value: 'dismiss' },
        ],
      });
    }
  }

  // ============================================================
  // 真实 AI 模式方法
  // ============================================================

  /** 获取引导步骤对应的选项按钮 */
  function getGuidedStepOptions(step: number): ChatOption[] | null {
    const options: ChatOption[] | null = (() => {
      switch (step) {
        case 1: // 性别
          return [
            { label: '男性', value: 'guided_gender_male' },
            { label: '女性', value: 'guided_gender_female' },
          ];
        case 2: // 年龄段
          return [
            { label: '30岁以下', value: 'guided_age_under30' },
            { label: '30-45岁', value: 'guided_age_30to45', primary: true },
            { label: '45-60岁', value: 'guided_age_45to60' },
            { label: '60岁以上', value: 'guided_age_over60' },
          ];
        case 3: // 健康状况
          return [
            { label: '没有特殊情况', value: 'guided_concern_none' },
            { label: '三高相关', value: 'guided_concern_metabolic' },
            { label: '消化系统', value: 'guided_concern_digest' },
            { label: '颈椎/腰椎', value: 'guided_concern_spine' },
          ];
        case 4: // 家族病史
          return [
            { label: '没有', value: 'guided_family_none' },
            { label: '高血压', value: 'guided_family_hypertension' },
            { label: '糖尿病', value: 'guided_family_diabetes' },
            { label: '癌症家族史', value: 'guided_family_cancer' },
          ];
        case 5: // 职业类型
          return [
            { label: '办公室久坐', value: 'guided_job_office' },
            { label: '体力劳动', value: 'guided_job_labor' },
            { label: '经常出差', value: 'guided_job_travel' },
            { label: '户外作业', value: 'guided_job_outdoor' },
          ];
        case 6: // 运动习惯
          return [
            { label: '很少运动', value: 'guided_exercise_rarely' },
            { label: '每周1-2次', value: 'guided_exercise_1to2' },
            { label: '每周3次以上', value: 'guided_exercise_3plus' },
            { label: '每天运动', value: 'guided_exercise_daily' },
          ];
        case 7: // 睡眠质量
          return [
            { label: '良好', value: 'guided_sleep_good' },
            { label: '一般偶尔失眠', value: 'guided_sleep_fair' },
            { label: '经常失眠', value: 'guided_sleep_poor' },
            { label: '长期用药助眠', value: 'guided_sleep_medicated' },
          ];
        case 8: // 烟酒习惯
          return [
            { label: '不吸烟不喝酒', value: 'guided_habit_none' },
            { label: '吸烟', value: 'guided_habit_smoke' },
            { label: '饮酒', value: 'guided_habit_drink' },
            { label: '烟酒都有', value: 'guided_habit_both' },
          ];
        case 9: // 关注方向
          return [
            { label: '全面筛查', value: 'guided_focus_comprehensive', primary: true },
            { label: '心脑血管', value: 'guided_focus_cardio' },
            { label: '肿瘤早筛', value: 'guided_focus_tumor' },
            { label: '职场亚健康', value: 'guided_focus_office' },
          ];
        case 10: // 预算
          return [
            { label: '1000以下 · 基础筛查', value: 'guided_budget_low' },
            { label: '1000-2000 · 重点专项', value: 'guided_budget_mid', primary: true },
            { label: '2000以上 · 深度全面', value: 'guided_budget_high' },
          ];
        default:
          return null;
      }
    })();

    if (!options) return null;

    // 回答 3 题后追加"提前结束"选项
    if (step >= 4 && step <= GUIDED_TOTAL_STEPS) {
      options.push({ label: '跳过，直接生成方案', value: 'guided_early_finish' });
    }

    return options;
  }

  /** 根据当前对话上下文生成快捷选项 */
  function getFollowUpOptions(key: string, turn: number, afterPackage?: boolean): ChatOption[] | null {
    // 套餐卡片已展示后，不需要额外选项（卡片自带按钮）
    if (afterPackage) return null;

    // 引导式流程中，返回当前步骤对应的选项
    if (guidedStep.value > 0 && guidedStep.value <= GUIDED_TOTAL_STEPS) {
      return getGuidedStepOptions(guidedStep.value);
    }

    if (key === 'view-risk') {
      if (turn <= 1) {
        return [
          { label: '定制体检方案', value: 'make-package', primary: true },
          { label: '查看完整报告', value: 'view-report' },
        ];
      }
    }

    // 有数据用户选 make-package：AI 已基于数据分析，直接问预算
    if (key === 'make-package') {
      const healthStore = useHealthStore();
      if (healthStore.hasData) {
        // 如果已经有套餐卡片，不再显示预算选项
        const hasPackageCard = messages.value.some(m => m.contentType === 'package-card');
        if (hasPackageCard) return null;
        if (turn <= 1) {
          return [
            { label: '1000以下 · 基础筛查', value: 'low' },
            { label: '1000-2000 · 重点专项', value: 'mid', primary: true },
            { label: '2000以上 · 深度全面', value: 'high' },
          ];
        }
      }
    }

    if (key === 'report-interpret') {
      // 用户还没上传报告时，不显示后续选项，等报告解读完后由 handleFollowUpPlanGeneration 追加
      const hasUploadedReport = messages.value.some(m => m.contentType === 'image' || m.contentType === 'pdf');
      if (!hasUploadedReport) return null;
    }

    if (key === 'exam-process') {
      if (turn <= 1) {
        return [
          { label: '选择体检套餐', value: 'make-package', primary: true },
          { label: '暂时不用', value: 'dismiss' },
        ];
      }
    }

    if (key === 'consult') {
      if (turn <= 1) {
        return [
          { label: '体检项目介绍', value: 'exam-process' },
          { label: '套餐推荐', value: 'make-package' },
        ];
      }
    }

    // 默认：通用后续选项
    return [
      { label: '制定体检方案', value: 'make-package', primary: true },
      { label: '暂时不用', value: 'dismiss' },
    ];
  }

  /** 在 AI 回复后追加快捷操作选项（附加到最后一条 AI 消息上） */
  function appendFollowUpOptions(afterPackage?: boolean) {
    const options = getFollowUpOptions(currentKey.value, aiTurnCount.value, afterPackage);
    if (options && options.length > 0) {
      // 判断是否为预算选项，添加提示标签
      const isBudgetOptions = options.some(o => o.value === 'low' || o.value === 'mid' || o.value === 'high'
        || o.value === 'guided_budget_low' || o.value === 'guided_budget_mid' || o.value === 'guided_budget_high');
      const label = isBudgetOptions ? '请选择您的体检预算：' : undefined;

      // 找到最后一条 AI 消息，将选项附加上去（同一个气泡显示）
      const lastAiMsg = [...messages.value].reverse().find(m => m.role === 'ai' && m.contentType !== 'options');
      if (lastAiMsg) {
        lastAiMsg.options = options;
        lastAiMsg.optionsLabel = label;
      } else {
        // fallback：没有找到 AI 消息时，单独创建
        addMessage({
          role: 'ai',
          content: '',
          contentType: 'options',
          options,
          optionsLabel: label,
        });
      }
    }
  }

  /** 引导式步骤的提问内容（用于构建对 AI 的指令） */
  const guidedStepPrompts: Record<number, string> = {
    2: '好的，我已告知性别。请接下来只问我一个问题：我的年龄段是什么？不要问其他问题。',
    3: '好的，我已告知年龄段。请接下来只问我一个问题：我近期有没有什么健康不适或慢性病？不要问其他问题。',
    4: '好的，我已告知健康状况。请接下来只问我一个问题：我的家族有没有遗传性疾病？不要问其他问题。',
    5: '好的，我已告知家族病史。请接下来只问我一个问题：我的职业类型是什么？不要问其他问题。',
    6: '好的，我已告知职业类型。请接下来只问我一个问题：我平时运动频率怎么样？不要问其他问题。',
    7: '好的，我已告知运动习惯。请接下来只问我一个问题：我的睡眠质量如何？不要问其他问题。',
    8: '好的，我已告知睡眠质量。请接下来只问我一个问题：我有没有烟酒习惯？不要问其他问题。',
    9: '好的，我已告知烟酒习惯。请接下来只问我一个问题：这次体检我主要关注什么方向？不要问其他问题。',
    10: '好的，我已告知关注方向。请接下来只问我最后一个问题：我的体检预算大概多少？不要问其他问题。',
  };

  /** 构建引导式画像汇总文本 */
  function buildGuidedProfileSummary(): string {
    const p = guidedProfile.value;
    const parts: string[] = [];
    if (p.gender) parts.push(`性别${p.gender}`);
    if (p.ageRange) parts.push(`年龄段${p.ageRange}`);
    if (p.concerns) parts.push(`健康状况：${p.concerns}`);
    if (p.familyHistory) parts.push(`家族病史：${p.familyHistory}`);
    if (p.jobType) parts.push(`职业类型：${p.jobType}`);
    if (p.exercise) parts.push(`运动习惯：${p.exercise}`);
    if (p.sleepQuality) parts.push(`睡眠质量：${p.sleepQuality}`);
    if (p.habits) parts.push(`烟酒习惯：${p.habits}`);
    if (p.focus) parts.push(`关注方向：${p.focus}`);
    return parts.join('，');
  }

  /** 提前结束引导流程，直接生成套餐 */
  async function handleGuidedEarlyFinish() {
    const profile = guidedProfile.value;
    const summary = buildGuidedProfileSummary();
    guidedStep.value = 0;

    conversationHistory.value.push({
      role: 'user',
      content: `我已经提供了足够信息，请直接生成方案。我的信息汇总：${summary}`,
    });

    await handlePackageRecommendation(
      `我的信息：${summary}，预算：1000-2000元`,
      profile.budget || 'mid',
    );
  }

  /** 处理引导式流程中用户选择的选项 */
  async function handleGuidedStep(content: string, value: string) {
    const step = guidedStep.value;

    // 提前结束
    if (value === 'guided_early_finish') {
      await handleGuidedEarlyFinish();
      return;
    }

    // 解析用户选择并存入 profile
    if (value.startsWith('guided_gender_')) {
      guidedProfile.value.gender = value === 'guided_gender_male' ? '男' : '女';
    } else if (value.startsWith('guided_age_')) {
      const ageMap: Record<string, string> = {
        'guided_age_under30': '30岁以下',
        'guided_age_30to45': '30-45岁',
        'guided_age_45to60': '45-60岁',
        'guided_age_over60': '60岁以上',
      };
      guidedProfile.value.ageRange = ageMap[value] || '30-45岁';
    } else if (value.startsWith('guided_concern_')) {
      const concernMap: Record<string, string> = {
        'guided_concern_none': '没有特殊情况',
        'guided_concern_metabolic': '三高相关（高血压/高血糖/高血脂）',
        'guided_concern_digest': '消化系统问题',
        'guided_concern_spine': '颈椎/腰椎问题',
      };
      guidedProfile.value.concerns = concernMap[value] || '';
    } else if (value.startsWith('guided_family_')) {
      const familyMap: Record<string, string> = {
        'guided_family_none': '没有',
        'guided_family_hypertension': '高血压家族史',
        'guided_family_diabetes': '糖尿病家族史',
        'guided_family_cancer': '癌症家族史',
      };
      guidedProfile.value.familyHistory = familyMap[value] || '';
    } else if (value.startsWith('guided_job_')) {
      const jobMap: Record<string, string> = {
        'guided_job_office': '办公室久坐',
        'guided_job_labor': '体力劳动',
        'guided_job_travel': '经常出差',
        'guided_job_outdoor': '户外作业',
      };
      guidedProfile.value.jobType = jobMap[value] || '';
    } else if (value.startsWith('guided_exercise_')) {
      const exerciseMap: Record<string, string> = {
        'guided_exercise_rarely': '很少运动',
        'guided_exercise_1to2': '每周1-2次',
        'guided_exercise_3plus': '每周3次以上',
        'guided_exercise_daily': '每天运动',
      };
      guidedProfile.value.exercise = exerciseMap[value] || '';
    } else if (value.startsWith('guided_sleep_')) {
      const sleepMap: Record<string, string> = {
        'guided_sleep_good': '良好',
        'guided_sleep_fair': '一般偶尔失眠',
        'guided_sleep_poor': '经常失眠',
        'guided_sleep_medicated': '长期用药助眠',
      };
      guidedProfile.value.sleepQuality = sleepMap[value] || '';
    } else if (value.startsWith('guided_habit_')) {
      const habitMap: Record<string, string> = {
        'guided_habit_none': '不吸烟不喝酒',
        'guided_habit_smoke': '吸烟',
        'guided_habit_drink': '饮酒',
        'guided_habit_both': '烟酒都有',
      };
      guidedProfile.value.habits = habitMap[value] || '';
    } else if (value.startsWith('guided_focus_')) {
      const focusMap: Record<string, string> = {
        'guided_focus_comprehensive': '全面筛查',
        'guided_focus_cardio': '心脑血管风险',
        'guided_focus_tumor': '肿瘤早筛',
        'guided_focus_office': '职场亚健康',
      };
      guidedProfile.value.focus = focusMap[value] || '全面筛查';
    } else if (value.startsWith('guided_budget_')) {
      const budgetMap: Record<string, 'low' | 'mid' | 'high'> = {
        'guided_budget_low': 'low',
        'guided_budget_mid': 'mid',
        'guided_budget_high': 'high',
      };
      guidedProfile.value.budget = budgetMap[value] || 'mid';
    }

    // 前进到下一步
    guidedStep.value = step + 1;

    // 如果是最后一步（预算），直接生成套餐推荐
    if (guidedStep.value > GUIDED_TOTAL_STEPS) {
      guidedStep.value = 0; // 引导结束
      const profile = guidedProfile.value;
      const summary = buildGuidedProfileSummary();

      conversationHistory.value.push({
        role: 'user',
        content: `${content}。我的信息汇总：${summary}，预算：${content}`,
      });

      await handlePackageRecommendation(
        `我的信息：${summary}，预算：${content}`,
        profile.budget || 'mid',
      );
      return;
    }

    // 否则让 AI 问下一个问题
    const nextPrompt = guidedStepPrompts[guidedStep.value];
    if (nextPrompt) {
      conversationHistory.value.push({
        role: 'user',
        content: `${content}。${nextPrompt}`,
      });
      await sendAIStream(conversationHistory.value, GUIDED_PACKAGE_SYSTEM_PROMPT);
      aiTurnCount.value++;
      appendFollowUpOptions();
    }
  }

  /** 流式发送 AI 消息，实现打字机效果 */
  async function sendAIStream(
    historyMessages: QwenMessage[],
    systemPrompt?: string,
  ): Promise<string> {
    isTyping.value = true;

    // 先添加一条空的 AI 消息
    const aiMsgId = addMessage({
      role: 'ai',
      content: '',
      contentType: 'text',
    });
    streamingMessageId.value = aiMsgId;
    isTyping.value = false; // 停止 typing dots，开始打字效果

    let fullText = '';
    try {
      fullText = await sendChatMessage(historyMessages, (chunk: string) => {
        // 逐步追加 chunk 到消息内容，实现打字机效果
        const msg = messages.value.find((m) => m.id === aiMsgId);
        if (msg) {
          msg.content += chunk;
        }
      }, systemPrompt);

      // sendChatMessage 返回完整文本，确保最终内容一致
      updateMessageContent(aiMsgId, fullText);

      // 记录到对话历史
      conversationHistory.value.push({
        role: 'assistant',
        content: fullText,
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : '未知错误';
      updateMessageContent(aiMsgId, `网络连接失败，请重试\n\n(错误信息: ${errMsg})`);
    } finally {
      streamingMessageId.value = null;
      // 流式输出完成后持久化对话历史
      _saveChatHistory();
    }

    return fullText;
  }

  /** 将健康数据格式化为文本描述 */
  function formatHealthDataForAI(): string {
    const healthStore = useHealthStore();
    if (!healthStore.hasData || !healthStore.healthData) return '';

    const data = healthStore.healthData;
    const lines: string[] = [];

    lines.push(`上次体检日期：${data.lastCheckDate}`);
    lines.push(`健康评分：${data.score.score}/${data.score.maxScore}（状态：${data.score.status === 'normal' ? '健康良好' : data.score.status === 'attention' ? '需要关注' : '注意风险'}）`);

    if (data.indicators.length > 0) {
      lines.push('体检指标：');
      for (const ind of data.indicators) {
        lines.push(`  - ${ind.name}：${ind.value}（${ind.label}）`);
      }
    }

    return lines.join('\n');
  }

  /** 根据入口 key 构建 AI 的初始提示 */
  function buildInitialPrompt(
    key: string,
    hasHealthData: boolean,
    userName?: string,
  ): string {
    const name = userName || '用户';

    if (hasHealthData) {
      const healthInfo = formatHealthDataForAI();
      const healthBlock = healthInfo ? `\n\n以下是我的体检数据：\n${healthInfo}` : '';

      if (key === 'view-risk') {
        return `我叫${name}，请帮我分析最近的体检报告中的健康风险，重点关注异常指标。${healthBlock}`;
      }
      if (key === 'make-package') {
        return `我叫${name}，我想定制体检方案。以下是我的全部健康数据，你已经拥有了，直接用就行：${healthBlock}\n\n请按照系统提示词的格式要求回复：先逐条列出异常指标和风险说明，再总结正常指标，最后问我预算。绝对不要让我提供任何资料。`;
      }
      return `我叫${name}，请根据我的健康数据给出建议。${healthBlock}`;
    }

    switch (key) {
      case 'report-interpret':
        return `我叫${name}，我想解读体检报告，但目前还没有上传。请告诉我如何操作。`;
      case 'make-package':
        // 无数据用户：启动引导流程，只问第一个问题（性别）
        guidedStep.value = 1;
        return `我叫${name}，我没有体检记录，想定制一个体检套餐。请只问我一个问题：我的性别是什么？不要问其他问题。`;
      case 'exam-process':
        return `我叫${name}，请介绍一下体检的完整流程。`;
      case 'consult':
        return `我叫${name}，我想咨询关于体检的问题。`;
      default:
        return `我叫${name}，请帮我推荐体检服务。`;
    }
  }

  async function startScriptAI(key: string, hasHealthData: boolean, userName?: string) {
    // 初始化对话历史
    conversationHistory.value = [];
    currentKey.value = key;
    aiTurnCount.value = 0;

    const initialPrompt = buildInitialPrompt(key, hasHealthData, userName);

    // 将初始用户提示加入历史（但不在 UI 上显示，作为隐含上下文）
    conversationHistory.value.push({
      role: 'user',
      content: initialPrompt,
    });

    // 根据场景选择系统提示词
    let systemPrompt: string | undefined;
    if (key === 'make-package') {
      const userStore = useUserStore();
      if (userStore.userInfo?.hasGroupPackage) {
        systemPrompt = MAKE_PACKAGE_WITH_DATA_PROMPT; // 团检有数据用户也用数据分析提示词
      } else {
        systemPrompt = hasHealthData ? MAKE_PACKAGE_WITH_DATA_PROMPT : GUIDED_PACKAGE_SYSTEM_PROMPT;
      }
    }
    await sendAIStream(conversationHistory.value, systemPrompt);
    aiTurnCount.value++;

    // 追加快捷操作选项
    appendFollowUpOptions();
  }

  async function sendUserMessageAI(content: string, value?: string) {
    addMessage({ role: 'user', content, contentType: 'text' });

    // 处理特殊导航值
    if (value === 'view-report') {
      uni.navigateTo({ url: '/pages/report/detail?id=report-001' });
      return;
    }

    if (value === 'view-appointment') {
      uni.navigateTo({ url: '/pages/appointment/index' });
      return;
    }

    if (value === 'dismiss') {
      conversationHistory.value.push({ role: 'user', content });
      conversationHistory.value.push({
        role: 'assistant',
        content: '好的，有需要随时找我~',
      });
      addMessage({
        role: 'ai',
        content: '好的，有需要随时找我~',
        contentType: 'text',
      });
      return;
    }

    // 预约复查：直接根据复查方案生成套餐并预约
    if (value === 'book-followup') {
      await handleBookFollowUp();
      return;
    }

    // 处理关注方向选项（有数据用户的 make-package 流程）
    if (value && value.startsWith('focus_')) {
      conversationHistory.value.push({ role: 'user', content });
      await sendAIStream(conversationHistory.value);
      aiTurnCount.value++;
      appendFollowUpOptions();
      return;
    }

    // 处理引导式流程的选项
    if (value && value.startsWith('guided_')) {
      await handleGuidedStep(content, value);
      return;
    }

    // 切换入口 key（用户选择了新的功能方向）
    if (value === 'make-package') {
      currentKey.value = 'make-package';
      aiTurnCount.value = 0;
      // 无数据用户进入引导流程
      const healthStore = useHealthStore();
      if (!healthStore.hasData) {
        guidedStep.value = 1;
        guidedProfile.value = {};
        conversationHistory.value.push({
          role: 'user',
          content: '我想定制一个体检套餐',
        });
        await sendAIStream(conversationHistory.value, GUIDED_PACKAGE_SYSTEM_PROMPT);
        aiTurnCount.value++;
        appendFollowUpOptions();
        return;
      }
    }
    if (value === 'exam-process') {
      currentKey.value = 'exam-process';
      aiTurnCount.value = 0;
    }

    // 特殊处理：套餐推荐预算选择（有数据用户直接选预算）
    const budgetValues = ['low', 'mid', 'high'];
    if (value && budgetValues.includes(value)) {
      await handlePackageRecommendation(content, value as 'low' | 'mid' | 'high');
      return;
    }

    // 如果还没有入口 key（用户直接输入），设为 consult
    if (!currentKey.value) {
      currentKey.value = 'consult';
      aiTurnCount.value = 0;
    }

    // 一般对话：将用户消息加入历史并流式获取回复
    conversationHistory.value.push({ role: 'user', content });
    await sendAIStream(conversationHistory.value);
    aiTurnCount.value++;

    // 追加快捷操作选项
    appendFollowUpOptions();
  }

  /** 处理套餐推荐流程（流式展示推荐理由） */
  async function handlePackageRecommendation(
    userContent: string,
    budget: 'low' | 'mid' | 'high',
  ) {
    conversationHistory.value.push({ role: 'user', content: userContent });
    isTyping.value = true;

    // 先添加一条空的 AI 消息用于流式展示推荐理由
    const reasonMsgId = addMessage({
      role: 'ai',
      content: '',
      contentType: 'text',
    });
    streamingMessageId.value = reasonMsgId;
    isTyping.value = false; // 停止 typing dots，开始打字效果

    try {
      // 收集健康数据传给套餐推荐
      const healthStore = useHealthStore();
      const userStore = useUserStore();
      const isGroupUser = userStore.userInfo?.hasGroupPackage || false;
      const healthIndicators = healthStore.indicators
        .map((ind) => `${ind.name}${ind.value}(${ind.label})`)
        ;
      const riskFactors = healthStore.indicators
        .filter((ind) => ind.status !== 'normal')
        .map((ind) => `${ind.name}${ind.label}`)
        ;

      // 如果有引导式采集的画像信息，传入用户画像
      const profile = guidedProfile.value;
      const userProfile: { name?: string; gender?: string; age?: number } = {
        name: userStore.userName || undefined,
        gender: profile.gender === '男' ? 'male' : profile.gender === '女' ? 'female' : (userStore.userInfo?.gender || undefined),
        age: userStore.userInfo?.age || undefined,
      };

      // 无健康数据时，用引导采集的信息作为风险因素
      const hasData = healthIndicators.length > 0;
      const guidedInfo: string[] = [];
      if (profile.concerns && profile.concerns !== '没有特殊情况') guidedInfo.push(`健康状况：${profile.concerns}`);
      if (profile.familyHistory && profile.familyHistory !== '没有') guidedInfo.push(`家族病史：${profile.familyHistory}`);
      if (profile.jobType) guidedInfo.push(`职业类型：${profile.jobType}`);
      if (profile.exercise) guidedInfo.push(`运动习惯：${profile.exercise}`);
      if (profile.sleepQuality) guidedInfo.push(`睡眠质量：${profile.sleepQuality}`);
      if (profile.habits && profile.habits !== '不吸烟不喝酒') guidedInfo.push(`烟酒习惯：${profile.habits}`);
      if (profile.focus) guidedInfo.push(`关注方向：${profile.focus}`);

      const result = await recommendPackageStream(
        userProfile,
        {
          indicators: hasData ? healthIndicators : guidedInfo,
          riskFactors: hasData ? riskFactors : guidedInfo,
        },
        budget,
        (chunk: string) => {
          // 流式追加推荐理由文字到消息内容
          const msg = messages.value.find((m) => m.id === reasonMsgId);
          if (msg) {
            msg.content += chunk;
          }
        },
        () => {
          // JSON 代码块开始：文字流式结束，新气泡显示生成提示
          streamingMessageId.value = null;
          addMessage({
            role: 'ai',
            content: '正在为您生成体检方案',
            contentType: 'loading',
          });
        },
        { noData: !hasData },
      );

      // 流式输出完成，确保 reason 消息内容最终一致
      const reasonMsg = result.reason || '根据你的需求和预算，我为你生成了这个方案：';
      updateMessageContent(reasonMsgId, reasonMsg);

      // 构建套餐卡片数据
      const packageData: PackageCardData = {
        id: `pkg-ai-${Date.now()}`,
        name: result.name,
        badge: result.badge || 'AI定制',
        items: result.items,
        totalPrice: result.totalPrice,
        originalPrice: result.originalPrice,
      };

      // 团检用户：计算企业承担/员工自付/折扣
      if (isGroupUser) {
        const enterpriseBudget = 1000;
        // 根据 AI 返回的结构化数据或 fallback 计算
        const aiResult = result as any;
        const standardTotal = aiResult.standardTotal || Math.round(result.totalPrice * 0.6);
        const aiAddonTotal = aiResult.aiAddonTotal || (result.totalPrice - standardTotal);
        const discount = aiResult.aiAddonDiscount || 0.85;
        const aiAddonDiscounted = Math.round(aiAddonTotal * discount);
        const totalAfterDiscount = standardTotal + aiAddonDiscounted;
        const enterpriseCoverage = Math.min(enterpriseBudget, totalAfterDiscount);
        const employeePayment = Math.max(0, totalAfterDiscount - enterpriseCoverage);

        packageData.isGroupPackage = true;
        packageData.badge = '团检';
        packageData.enterpriseBudget = enterpriseBudget;
        packageData.enterpriseCoverage = enterpriseCoverage;
        packageData.employeePayment = employeePayment;
        packageData.aiAddonDiscount = discount;
        packageData.totalPrice = totalAfterDiscount;
      }

      // 将 AI 生成的套餐保存到 package store
      savePackageToStore(packageData);
      isTyping.value = false;

      // 删除"正在生成"加载消息
      const loadingIdx = messages.value.findIndex(m => m.contentType === 'loading');
      if (loadingIdx !== -1) messages.value.splice(loadingIdx, 1);

      addMessage({
        role: 'ai',
        content: '',
        contentType: 'package-card',
        packageCard: packageData,
      });

      // 记录到对话历史
      const itemNames = result.items.map((i: string | { name: string }) => typeof i === 'string' ? i : i.name);
      conversationHistory.value.push({
        role: 'assistant',
        content: `${reasonMsg}\n\n推荐套餐：${result.name}，包含${itemNames.join('、')}，价格${packageData.totalPrice}元`,
      });
      aiTurnCount.value++;
    } catch (error: unknown) {
      isTyping.value = false;
      const errLoadingIdx = messages.value.findIndex(m => m.contentType === 'loading');
      if (errLoadingIdx !== -1) messages.value.splice(errLoadingIdx, 1);
      const errMsg = error instanceof Error ? error.message : '未知错误';
      // 如果流式输出已经有内容了，在已有内容后追加错误信息
      const currentMsg = messages.value.find((m) => m.id === reasonMsgId);
      if (currentMsg && currentMsg.content) {
        updateMessageContent(reasonMsgId, currentMsg.content + `\n\n抱歉，套餐方案生成失败，请重试。(${errMsg})`);
      } else {
        updateMessageContent(reasonMsgId, `抱歉，套餐推荐生成失败，请重试。\n\n(${errMsg})`);
      }
    } finally {
      streamingMessageId.value = null;
      // 流式输出完成后持久化对话历史
      _saveChatHistory();
    }
  }

  /**
   * 报告解读完成后，自动生成复查方案
   * @param reportText - 报告解读的完整文本
   */
  async function handleFollowUpPlanGeneration(reportText: string) {
    if (!reportText) return;

    isTyping.value = true;
    try {
      const plan: FollowUpPlan = await generateFollowUpPlan(reportText);
      isTyping.value = false;

      // 插入复查方案卡片消息
      addMessage({
        role: 'ai',
        content: '',
        contentType: 'follow-up-plan',
        followUpPlan: plan,
      });

      // 复查方案后追加操作选项
      // 保存最近的复查方案，供预约复查时使用
      lastFollowUpPlan.value = plan;

      const options = plan.needFollowUp && plan.followUpItems.length > 0
        ? [
            { label: '预约复查', value: 'book-followup', primary: true },
            { label: '继续咨询', value: 'consult' },
          ]
        : [
            { label: '制定体检方案', value: 'make-package', primary: true },
            { label: '暂时不用', value: 'dismiss' },
          ];
      addMessage({
        role: 'ai',
        content: '',
        contentType: 'options',
        options,
      });
    } catch (error: unknown) {
      isTyping.value = false;
      console.error('复查方案生成失败:', error);
      // 复查方案生成失败不影响主流程，仅追加常规后续操作
      appendFollowUpOptions();
    }
  }

  /** 预约复查：直接根据复查方案生成套餐并显示套餐卡片 */
  async function handleBookFollowUp() {
    const plan = lastFollowUpPlan.value;
    if (!plan || !plan.followUpItems.length) {
      await simulateAIReply({ aiMessage: '暂无复查方案，请先上传报告进行解读。' });
      return;
    }

    isTyping.value = true;

    // 根据复查方案项目直接生成套餐
    const items = plan.followUpItems.map((item, i) => ({
      name: item.name,
      reason: item.reason,
      category: 'standard' as const,
      price: 0, // 复查项目不设单价
    }));

    const packageId = `pkg-followup-${Date.now()}`;
    const packageCard: PackageCardData = {
      id: packageId,
      name: '复查体检方案',
      badge: '复查',
      items,
      totalPrice: 0,
    };

    // 保存到 package store
    savePackageToStore(packageCard);

    isTyping.value = false;

    // 显示提示消息
    addMessage({
      role: 'ai',
      content: `已根据您的报告解读结果生成复查方案，包含 **${items.length}** 项检查。请选择预约时间。`,
      contentType: 'text',
    });

    // 显示套餐卡片
    addMessage({
      role: 'ai',
      content: '',
      contentType: 'package-card',
      packageCard,
    });
    _saveChatHistory();
  }

  /** 发送图片进行报告解读（流式） */
  async function sendImageForInterpretation(imageBase64: string, imageUrl: string) {
    // 在聊天中显示用户上传的图片
    addMessage({
      role: 'user',
      content: '请帮我解读这份体检报告',
      contentType: 'image',
      imageUrl,
    });

    isTyping.value = true;

    // 添加空的 AI 消息，准备流式输出
    const aiMsgId = addMessage({
      role: 'ai',
      content: '',
      contentType: 'text',
    });
    streamingMessageId.value = aiMsgId;
    isTyping.value = false;

    try {
      const fullText = await interpretReport(imageBase64, (chunk: string) => {
        const msg = messages.value.find((m) => m.id === aiMsgId);
        if (msg) {
          msg.content += chunk;
        }
      });

      updateMessageContent(aiMsgId, fullText);

      // 记录到对话历史（图片消息用文字替代）
      conversationHistory.value.push({
        role: 'user',
        content: '请帮我解读这份体检报告（已上传图片）',
      });
      conversationHistory.value.push({
        role: 'assistant',
        content: fullText,
      });
      aiTurnCount.value++;
      streamingMessageId.value = null;
      _saveChatHistory();

      // 保存报告解读记录
      try {
        const reportStore = useReportStore();
        reportStore.addReport({
          title: '体检报告解读',
          summary: fullText.slice(0, 200),
          fullContent: fullText,
          imageUrl,
        });
      } catch (_e) { /* ignore */ }

      // 报告解读完成后，自动生成复查方案
      await handleFollowUpPlanGeneration(fullText);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : '未知错误';
      updateMessageContent(aiMsgId, `报告解读失败，请重试\n\n(错误信息: ${errMsg})`);
      streamingMessageId.value = null;
      _saveChatHistory();
    }
  }

  /** 发送 PDF 进行报告解读（流式） */
  async function sendPdfForInterpretation(pdfBase64: string, fileName: string) {
    // 在聊天中显示用户上传的 PDF 文件信息
    addMessage({
      role: 'user',
      content: `请帮我解读这份体检报告`,
      contentType: 'pdf',
      pdfFileName: fileName,
    });

    isTyping.value = true;

    // 添加空的 AI 消息，准备流式输出
    const aiMsgId = addMessage({
      role: 'ai',
      content: '',
      contentType: 'text',
    });
    streamingMessageId.value = aiMsgId;
    isTyping.value = false;

    try {
      const fullText = await interpretPdfReport(pdfBase64, (chunk: string) => {
        const msg = messages.value.find((m) => m.id === aiMsgId);
        if (msg) {
          msg.content += chunk;
        }
      });

      updateMessageContent(aiMsgId, fullText);

      // 记录到对话历史
      conversationHistory.value.push({
        role: 'user',
        content: `请帮我解读这份体检报告（已上传PDF文件：${fileName}）`,
      });
      conversationHistory.value.push({
        role: 'assistant',
        content: fullText,
      });
      aiTurnCount.value++;
      streamingMessageId.value = null;
      _saveChatHistory();

      // 保存报告解读记录
      try {
        const reportStore = useReportStore();
        reportStore.addReport({
          title: '体检报告解读',
          summary: fullText.slice(0, 200),
          fullContent: fullText,
          pdfFileName: fileName,
        });
      } catch (_e) { /* ignore */ }

      // 报告解读完成后，自动生成复查方案
      await handleFollowUpPlanGeneration(fullText);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : '未知错误';
      updateMessageContent(aiMsgId, `PDF 报告解读失败，请重试\n\n(错误信息: ${errMsg})`);
      streamingMessageId.value = null;
      _saveChatHistory();
    }
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

  /** 从聊天中直接预约体检套餐 */
  async function bookFromChat(packageCard: PackageCardData, date: string, time: string) {
    // 预约前确保套餐数据已保存到 package store
    savePackageToStore(packageCard);

    isTyping.value = true;

    try {
      const appointmentStore = useAppointmentStore();

      const apt = await appointmentStore.create({
        packageId: packageCard.id,
        date,
        time,
      });

      isTyping.value = false;

      // 回写预约成功消息
      addMessage({
        role: 'ai',
        content: `## 预约成功\n\n| 项目 | 详情 |\n|------|------|\n| 套餐 | **${packageCard.name}** |\n| 日期 | ${date} |\n| 时间 | ${time} |\n| 地点 | 健康体检中心3楼 |\n| 费用 | **¥${packageCard.totalPrice.toLocaleString()}** |\n| 项目数 | ${packageCard.items.length}项 |\n\n> 请提前 **8小时空腹**，携带身份证到前台登记。如需改约或取消，请前往「我的预约」操作。`,
        contentType: 'text',
      });

      // 提供后续操作
      addMessage({
        role: 'ai',
        content: '',
        contentType: 'options',
        options: [
          { label: '查看预约详情', value: 'view-appointment', primary: true },
          { label: '继续咨询', value: 'consult' },
        ],
      });

      void apt; // 避免 unused 警告
    } catch (error: unknown) {
      isTyping.value = false;
      const errMsg = error instanceof Error ? error.message : '未知错误';
      addMessage({
        role: 'ai',
        content: `预约失败，请重试。(${errMsg})`,
        contentType: 'text',
      });
    }
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
  };
});
