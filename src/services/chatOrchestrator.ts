/**
 * Chat Orchestrator — 流程调度中心
 *
 * 替代 chat.ts 中的所有 AI 逻辑，处理 Tool Call 循环。
 * 代码控制流程，AI 只负责自然语言生成。
 */
import { qwenChat, qwenChatStream } from '@/api/qwen';
import type { QwenMessage, ToolCall, ChatMessage, PackageCardData, FollowUpPlan } from '@/types/chat';
import type { ToolContext, ToolResult } from './tools/types';
import { getTool } from './tools/registry';
import { getAvailableTools, getToolChoice } from './toolGuard';
import {
  processGuidedSelection,
  buildGuidedProfileSummary,
  GUIDED_TOTAL_STEPS,
} from './tools/askQuestion';
import {
  sendChatMessage,
  interpretReport,
  interpretPdfReport,
  generateFollowUpPlan,
  generateRiskAnalysis,
  recommendPackageStream,
  parsePackageResponse,
} from './aiChat';
import { useHealthStore } from '@/stores/health';
import { useUserStore } from '@/stores/user';
import { usePackageStore } from '@/stores/package';
import { useReportStore } from '@/stores/report';
import { useAppointmentStore } from '@/stores/appointment';
import type { ExamPackage } from '@/types/package';

/** Orchestrator 依赖的 Store 操作接口 */
export interface ChatStoreOps {
  messages: ChatMessage[];
  addMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>): string;
  updateMessageContent(id: string, content: string): void;
  updateMessage(id: string, fields: Partial<ChatMessage>): void;
  setTyping(val: boolean): void;
  setStreamingId(id: string | null): void;
  saveChatHistory(): void;
}

/** 将 PackageCardData 转换为 ExamPackage 并存入 store */
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
// 精简后的系统提示词
// ============================================================

/** 通用系统提示词（移除格式约束，由 tool schema 控制） */
const SYSTEM_PROMPT = `你是一位专业的健康体检顾问AI助手，服务于健康体检中心。
回复要简洁，使用 markdown 格式，不使用表格和 emoji。
不要主动列举体检项目，系统会自动推荐。`;

/** 引导式提问系统提示词 */
const GUIDED_SYSTEM_PROMPT = `你是一位专业的健康体检顾问AI助手。用户没有历史体检数据，你通过调用 ask_guided_question 工具逐步了解用户情况。
每次只问一个问题，保持简短友好，50字以内。不要列举选项，系统自动展示按钮。不使用表格和 emoji。`;

/** 有数据用户分析系统提示词 */
/** 风险分析：直接调用 tool，不输出文本（文本由前置打字机消息处理） */
const RISK_TOOL_PROMPT = `你是三甲医院健康管理中心的主任医师，有20年临床经验。

直接调用 render_health_analysis 工具生成结构化健康风险分析方案，不要输出任何普通文本。

工具参数填写要求：
- summary：2-3句话概括主要健康风险，用通俗语言
- risks：每个风险类别只列异常项，level 按严重程度判断（严重超标=high，中度异常=medium，轻微偏离=low）
- recommendations.diet/exercise/medical：每条不超过30字，3-4条用\\n分隔，• 开头，格式"做什么——原因"
- followUpItems：只列需要复查或就诊的项目
- urgencyLevel：存在高风险=urgent，≥3项异常=soon，轻微=normal`;

/** 套餐推荐系统提示词 */
const PACKAGE_SYSTEM_PROMPT = `你是一位专业的体检套餐推荐AI助手。
根据用户的健康数据和风险分析，调用 recommend_package 工具生成个性化体检套餐。
items 数组包含 5-10 个体检项目，每项有 name、price 和 reason。
reason 是推荐理由（如"针对您的血脂异常进行追踪监测"），不要写"建议增补"。
totalPrice 在用户预算内，originalPrice 略高于 totalPrice。`;

export class ChatOrchestrator {
  private context: ToolContext;
  private conversationHistory: (QwenMessage | { role: 'tool'; tool_call_id: string; content: string } | { role: 'assistant'; content: string | null; tool_calls: ToolCall[] })[] = [];
  private store: ChatStoreOps;
  private aiTurnCount = 0;
  private lastFollowUpPlan: FollowUpPlan | null = null;

  constructor(store: ChatStoreOps) {
    this.store = store;
    this.context = {
      hasHealthData: false,
      currentFlow: 'idle',
      guidedStep: 0,
      guidedProfile: {},
      userName: '',
      isGroupUser: false,
    };
  }

  /** 获取当前引导步骤（供 UI 展示进度条） */
  get guidedStep(): number { return this.context.guidedStep; }
  get guidedTotalSteps(): number { return GUIDED_TOTAL_STEPS; }
  get currentFlow(): string { return this.context.currentFlow; }

  /** 获取最近一次的复查方案（供 UI 弹窗使用） */
  getLastFollowUpPlan(): FollowUpPlan | null { return this.lastFollowUpPlan; }

  /** 重置状态 */
  reset() {
    this.conversationHistory = [];
    this.aiTurnCount = 0;
    this.lastFollowUpPlan = null;
    this.context = {
      hasHealthData: false,
      currentFlow: 'idle',
      guidedStep: 0,
      guidedProfile: {},
      userName: '',
      isGroupUser: false,
    };
  }

  /** 启动对话流程 */
  async startFlow(key: string, hasHealthData: boolean, userName?: string) {
    this.conversationHistory = [];
    this.aiTurnCount = 0;
    this.context.hasHealthData = hasHealthData;
    this.context.userName = userName || '用户';

    const userStore = useUserStore();
    this.context.isGroupUser = userStore.userInfo?.hasGroupPackage || false;

    // 所有入口先展示用户消息
    const userLabels: Record<string, string> = {
      'view-risk': '帮我了解一下我的健康风险',
      'make-package': '帮我制定体检套餐',
      'report-interpret': '我想解读体检报告',
      'exam-process': '了解一下体检流程',
      'consult': '我想预约咨询',
    };
    if (userLabels[key]) {
      this.store.addMessage({ role: 'user', content: userLabels[key], contentType: 'text' });
    }

    if (key === 'make-package') {
      if (hasHealthData) {
        this.context.currentFlow = 'package';
        await this._startWithDataPackageFlow();
      } else {
        this.context.currentFlow = 'guided';
        this.context.guidedStep = 1;
        this.context.guidedProfile = {};
        await this._startGuidedFlow();
      }
    } else if (key === 'view-risk') {
      await this._startRiskAnalysis();
    } else if (key === 'report-interpret') {
      this.context.currentFlow = 'report';
      await this._startReportInterpretFlow();
    } else if (key === 'exam-process') {
      await this._startGeneralFlow(key);
    } else if (key === 'consult') {
      await this._startGeneralFlow(key);
    } else {
      await this._startGeneralFlow(key);
    }
  }

  /** 处理用户消息（含选项值） */
  async processUserMessage(content: string, value?: string) {
    // 1. 特殊路由直接处理
    if (this._handleSpecialValue(value)) return;

    // 2. 快捷入口（在已有对话中切换流程）
    if (value === 'view-risk') {
      this.store.addMessage({ role: 'user', content, contentType: 'text' });
      await this._startRiskAnalysis();
      return;
    }
    if (value === 'report-interpret') {
      this.store.addMessage({ role: 'user', content, contentType: 'text' });
      this.context.currentFlow = 'report';
      await this._startReportInterpretFlow();
      return;
    }
    if (value === 'exam-process' || value === 'consult') {
      this.store.addMessage({ role: 'user', content, contentType: 'text' });
      await this._startGeneralFlow(value);
      return;
    }

    if (value === 'make-package') {
      this.store.addMessage({ role: 'user', content, contentType: 'text' });
      const healthStore = useHealthStore();
      if (!healthStore.hasData) {
        this.context.currentFlow = 'guided';
        this.context.guidedStep = 1;
        this.context.guidedProfile = {};
        await this._startGuidedFlow();
      } else {
        this.context.currentFlow = 'package';
        this.context.hasHealthData = true;
        await this._startWithDataPackageFlow();
      }
      return;
    }

    // 3. 引导流程中处理用户选择
    if (value && value.startsWith('guided_') && this.context.currentFlow === 'guided') {
      this.store.addMessage({ role: 'user', content, contentType: 'text' });
      await this._handleGuidedSelection(content, value);
      return;
    }

    // 4. 预算选择（有数据用户）
    const budgetValues = ['low', 'mid', 'high'];
    if (value && budgetValues.includes(value)) {
      this.store.addMessage({ role: 'user', content, contentType: 'text' });
      await this._handlePackageRecommendation(content, value as 'low' | 'mid' | 'high');
      return;
    }

    // 5. 预约复查
    if (value === 'book-followup') {
      this.store.addMessage({ role: 'user', content, contentType: 'text' });
      await this._handleBookFollowUp();
      return;
    }

    // 6. 一般对话 — 使用 Tool Call 模式
    this.store.addMessage({ role: 'user', content, contentType: 'text' });
    this.conversationHistory.push({ role: 'user', content });

    const tools = getAvailableTools(this.context);
    const toolChoice = getToolChoice(this.context);

    if (tools.length > 0) {
      await this._callWithTools(tools, toolChoice);
    } else {
      await this._sendAIStream(this.conversationHistory);
    }

    this.aiTurnCount++;
    this._appendFollowUpOptions();
  }

  /** 发送图片进行报告解读 */
  async sendImageForInterpretation(imageBase64: string, imageUrl: string) {
    this.context.currentFlow = 'report';

    this.store.addMessage({
      role: 'user',
      content: '请帮我解读这份体检报告',
      contentType: 'image',
      imageUrl,
    });

    this.store.setTyping(false);

    // 显示加载卡片
    const cardMsgId = this.store.addMessage({
      role: 'ai',
      content: '',
      contentType: 'risk-summary',
      isReportInterpretation: true,
      planGenerating: true,
    });

    try {
      // 后台获取报告解读全文（不再流式显示）
      const fullText = await interpretReport(imageBase64, () => {});

      this.conversationHistory.push(
        { role: 'user', content: '请帮我解读这份体检报告（已上传图片）' },
        { role: 'assistant', content: fullText },
      );
      this.aiTurnCount++;

      // 保存报告解读记录
      try {
        const reportStore = useReportStore();
        const record = reportStore.addReport({
          title: '体检报告解读',
          summary: fullText.slice(0, 200),
          fullContent: fullText,
          imageUrl,
        });
        const msg = this.store.messages.find((m) => m.id === cardMsgId);
        if (msg) msg.reportId = record.id;
      } catch (_e) { /* ignore */ }

      // 生成风险分析 + 复查方案（1次AI调用，含 riskItems）
      const plan = await generateRiskAnalysis(fullText);
      this._finishReportCard(cardMsgId, fullText, plan);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : '未知错误';
      this.store.updateMessage(cardMsgId, {
        planGenerating: false,
        content: `报告解读失败，请重试 (${errMsg})`,
      });
      this.store.saveChatHistory();
    }
  }

  /** 发送 PDF 进行报告解读 */
  async sendPdfForInterpretation(pdfBase64: string, fileName: string) {
    this.context.currentFlow = 'report';

    this.store.addMessage({
      role: 'user',
      content: '请帮我解读这份体检报告',
      contentType: 'pdf',
      pdfFileName: fileName,
    });

    this.store.setTyping(false);

    // 显示加载卡片
    const cardMsgId = this.store.addMessage({
      role: 'ai',
      content: '',
      contentType: 'risk-summary',
      isReportInterpretation: true,
      planGenerating: true,
    });

    try {
      // 后台获取报告解读全文（不再流式显示）
      const fullText = await interpretPdfReport(pdfBase64, () => {}, undefined, fileName);

      this.conversationHistory.push(
        { role: 'user', content: `请帮我解读这份体检报告（已上传PDF文件：${fileName}）` },
        { role: 'assistant', content: fullText },
      );
      this.aiTurnCount++;

      // 保存报告解读记录
      try {
        const reportStore = useReportStore();
        const record = reportStore.addReport({
          title: '体检报告解读',
          summary: fullText.slice(0, 200),
          fullContent: fullText,
          pdfFileName: fileName,
        });
        const msg = this.store.messages.find((m) => m.id === cardMsgId);
        if (msg) msg.reportId = record.id;
      } catch (_e) { /* ignore */ }

      // 生成风险分析 + 复查方案（1次AI调用，含 riskItems）
      const plan = await generateRiskAnalysis(fullText);
      this._finishReportCard(cardMsgId, fullText, plan);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : '未知错误';
      this.store.updateMessage(cardMsgId, {
        planGenerating: false,
        content: `报告解读失败，请重试 (${errMsg})`,
      });
      this.store.saveChatHistory();
    }
  }

  /** 从聊天中直接预约 */
  async bookFromChat(packageCard: PackageCardData, date: string, time: string) {
    savePackageToStore(packageCard);
    this.store.setTyping(true);

    try {
      const appointmentStore = useAppointmentStore();
      await appointmentStore.create({
        packageId: packageCard.id,
        date,
        time,
      });

      this.store.setTyping(false);

      this.store.addMessage({
        role: 'ai',
        content: `## 预约成功\n\n| 项目 | 详情 |\n|------|------|\n| 套餐 | **${packageCard.name}** |\n| 日期 | ${date} |\n| 时间 | ${time} |\n| 地点 | 健康体检中心3楼 |\n| 费用 | **¥${packageCard.totalPrice.toLocaleString()}** |\n| 项目数 | ${packageCard.items.length}项 |\n\n> 请提前 **8小时空腹**，携带身份证到前台登记。如需改约或取消，请前往「我的预约」操作。`,
        contentType: 'text',
      });

      this.store.addMessage({
        role: 'ai',
        content: '',
        contentType: 'options',
        options: [
          { label: '查看预约详情', value: 'view-appointment', primary: true },
          { label: '继续咨询', value: 'consult' },
        ],
      });
    } catch (error: unknown) {
      this.store.setTyping(false);
      const errMsg = error instanceof Error ? error.message : '未知错误';
      this.store.addMessage({
        role: 'ai',
        content: `预约失败，请重试。(${errMsg})`,
        contentType: 'text',
      });
    }
  }

  // ============================================================
  // 私有方法
  // ============================================================

  /** 处理特殊导航值 */
  private _handleSpecialValue(value?: string): boolean {
    if (value === 'view-report') {
      uni.navigateTo({ url: '/pages/report/detail?id=report-001' });
      return true;
    }
    if (value === 'view-appointment') {
      uni.navigateTo({ url: '/pages/appointment/index' });
      return true;
    }
    if (value === 'dismiss') {
      this.store.addMessage({ role: 'user', content: '暂时不用', contentType: 'text' });
      this.conversationHistory.push({ role: 'user', content: '暂时不用' });
      this.conversationHistory.push({ role: 'assistant', content: '好的，有需要随时找我~' });
      this.store.addMessage({
        role: 'ai',
        content: '好的，有需要随时找我~',
        contentType: 'text',
      });
      return true;
    }
    return false;
  }

  /** 启动引导式问卷流程 */
  private async _startGuidedFlow() {
    const name = this.context.userName;
    const initialPrompt = `我叫${name}，我没有体检记录，想定制一个体检套餐。请只问我一个问题：我的性别是什么？`;
    this.conversationHistory = [{ role: 'user', content: initialPrompt }];

    // 使用 Tool Call 模式：强制 AI 调用 ask_guided_question
    const tools = getAvailableTools(this.context);
    const toolChoice = getToolChoice(this.context);

    await this._callWithTools(tools, toolChoice, GUIDED_SYSTEM_PROMPT);
    this.aiTurnCount++;
  }

  /** 启动有数据用户套餐推荐流程：确认 → 分析风险 → 问预算 */
  private async _startWithDataPackageFlow() {
    const name = this.context.userName;
    const healthInfo = this._formatHealthDataForAI();
    const initialPrompt = `我叫${name}，我想定制体检方案。以下是我的全部健康数据：\n${healthInfo}`;
    this.conversationHistory = [{ role: 'user', content: initialPrompt }];

    // 第1步：本地打字机确认（不经过 AI，确保不会提前分析数据）
    await this._typewriterMessage(`好的，${name}，我将根据您的健康记录和关联风险，为您制定针对性的体检套餐方案。`);

    // 第2步：分析风险（打字机输出，结构化列表）
    const riskPrompt = `你是一位专业的健康体检顾问AI助手。用户的健康数据已在对话中提供。

请用简短的列表分析主要健康风险，严格按以下格式输出，2-4项：

• **异常指标关键词** → 一句话风险说明（不超过20字）

示例：
• **血压偏高 + 血脂异常** → 需强化心血管风险评估
• **TSH升高** → 需完善甲状腺功能及抗体检查

最后另起一行总结："我将根据以上风险为您定制针对性的体检方案。"

要求：
- 每项只写一行，用 **加粗** 标记关键指标名称
- 不要写具体数值和单位
- 不使用表格、emoji、编号
- 不要让用户提供数据，不要直接推荐套餐`;
    await this._sendAIStream(this.conversationHistory, riskPrompt);
    this.aiTurnCount++;

    // 第3步：追加预算选项
    const lastAiMsg = [...this.store.messages].reverse().find(m => m.role === 'ai' && m.contentType !== 'options');
    if (lastAiMsg) {
      lastAiMsg.options = [
        { label: '1000以下 · 基础筛查', value: 'low' },
        { label: '1000-2000 · 重点专项', value: 'mid', primary: true },
        { label: '2000以上 · 深度全面', value: 'high' },
      ];
      lastAiMsg.optionsLabel = '请选择您的体检预算：';
    }
  }

  /** 启动风险分析流程：打字机回应 → 加载卡片 → tool call → 风险摘要卡片 */
  private async _startRiskAnalysis() {
    this.context.currentFlow = 'risk';
    this.store.setTyping(false);
    const name = this.context.userName;
    const healthInfo = this._formatHealthDataForAI();
    const initialPrompt = `我叫${name}，请帮我分析最近的体检报告中的健康风险。\n${healthInfo}`;
    this.conversationHistory = [{ role: 'user', content: initialPrompt }];

    // 本地打字机确认（不经过 AI，确保不会提前分析数据）
    const ackMsgId = await this._typewriterMessage(`收到，${name}，我将检索您的就诊记录和体检报告，为您生成健康风险分析报告。`);

    // 显示风险分析加载卡片（带进度动画）
    const loadingMsgId = this.store.addMessage({
      role: 'ai',
      content: '',
      contentType: 'risk-summary',
      planGenerating: true,
    });

    // 调用 tool 获取结构化数据（skipTyping + skipTextOutput 避免 AI 文本重复展示）
    const tools = getAvailableTools(this.context);
    const toolChoice = getToolChoice(this.context);
    await this._callWithTools(tools, toolChoice, RISK_TOOL_PROMPT, { maxTokens: 4000, skipTyping: true, skipTextOutput: true });
    this.aiTurnCount++;

    // 更新卡片：loading → 真实数据，移除过渡语
    if (this.lastFollowUpPlan) {
      // 移除过渡语
      const ackIdx = this.store.messages.findIndex(m => m.id === ackMsgId);
      if (ackIdx !== -1) this.store.messages.splice(ackIdx, 1);

      this.store.updateMessage(loadingMsgId, {
        content: '',
        contentType: 'risk-summary',
        followUpPlan: this.lastFollowUpPlan,
        planGenerating: false,
      });
    } else {
      // 失败时移除加载卡片
      const idx = this.store.messages.findIndex(m => m.id === loadingMsgId);
      if (idx !== -1) this.store.messages.splice(idx, 1);
    }

    this.store.saveChatHistory();
  }

  /** 启动报告解读提示流程 */
  private async _startReportInterpretFlow() {
    const name = this.context.userName;
    const initialPrompt = `我叫${name}，我想解读体检报告，但目前还没有上传。请告诉我如何操作。`;
    this.conversationHistory = [{ role: 'user', content: initialPrompt }];
    await this._sendAIStream(this.conversationHistory);
    this.aiTurnCount++;
  }

  /** 启动通用对话流程 */
  private async _startGeneralFlow(key: string) {
    const name = this.context.userName;
    let initialPrompt: string;
    switch (key) {
      case 'exam-process':
        initialPrompt = `我叫${name}，请介绍一下体检的完整流程。`;
        break;
      case 'consult':
        initialPrompt = `我叫${name}，我想咨询关于体检的问题。`;
        break;
      default:
        initialPrompt = `我叫${name}，请帮我推荐体检服务。`;
    }
    this.conversationHistory = [{ role: 'user', content: initialPrompt }];
    await this._sendAIStream(this.conversationHistory);
    this.aiTurnCount++;
    this._appendFollowUpOptions();
  }

  /** 处理引导式问卷中用户的选择 */
  private async _handleGuidedSelection(content: string, value: string) {
    const step = this.context.guidedStep;
    const { finished, earlyFinish } = processGuidedSelection(value, step, this.context.guidedProfile);

    if (earlyFinish) {
      // 提前结束，直接生成套餐
      const summary = buildGuidedProfileSummary(this.context.guidedProfile);
      this.context.guidedStep = 0;
      this.context.currentFlow = 'package';
      this.conversationHistory.push({
        role: 'user',
        content: `我已经提供了足够信息，请直接生成方案。我的信息汇总：${summary}`,
      });
      await this._handlePackageRecommendation(
        `我的信息：${summary}，预算：1000-2000元`,
        this.context.guidedProfile.budget as 'low' | 'mid' | 'high' || 'mid',
      );
      return;
    }

    if (finished) {
      // 最后一步完成，生成套餐
      const summary = buildGuidedProfileSummary(this.context.guidedProfile);
      this.context.guidedStep = 0;
      this.context.currentFlow = 'package';
      this.conversationHistory.push({
        role: 'user',
        content: `${content}。我的信息汇总：${summary}，预算：${content}`,
      });
      await this._handlePackageRecommendation(
        `我的信息：${summary}，预算：${content}`,
        this.context.guidedProfile.budget as 'low' | 'mid' | 'high' || 'mid',
      );
      return;
    }

    // 前进到下一步
    this.context.guidedStep = step + 1;
    this.conversationHistory.push({ role: 'user', content });

    // 让 AI 问下一个问题（Tool Call 模式）
    const tools = getAvailableTools(this.context);
    const toolChoice = getToolChoice(this.context);
    await this._callWithTools(tools, toolChoice, GUIDED_SYSTEM_PROMPT);
    this.aiTurnCount++;
  }

  /** 带 Tool 的 AI 调用 */
  private async _callWithTools(
    tools: import('@/types/chat').ToolDef[],
    toolChoice: import('@/api/qwen').ToolChoice,
    systemPrompt?: string,
    options?: { maxTokens?: number; skipTyping?: boolean; skipTextOutput?: boolean },
  ) {
    if (!options?.skipTyping) this.store.setTyping(true);

    const messages = this._buildMessages(systemPrompt || SYSTEM_PROMPT);

    try {
      const response = await qwenChat(messages, {
        tools,
        tool_choice: toolChoice,
        temperature: 0.7,
        maxTokens: options?.maxTokens || 2048,
      });

      const choice = response.choices?.[0];
      const textContent = choice?.message?.content || '';
      const toolCalls = choice?.message?.tool_calls;

      if (toolCalls?.length) {
        // 有 tool_calls → 执行 tool → 渲染结果
        // 先渲染 AI 的文本部分（如果有），skipTextOutput 时跳过 UI 展示但保留历史
        if (textContent) {
          if (!options?.skipTextOutput) {
            this.store.addMessage({ role: 'ai', content: textContent, contentType: 'text' });
          }
          this.conversationHistory.push({ role: 'assistant', content: textContent });
        }

        // 记录 assistant 的 tool_calls 到历史
        this.conversationHistory.push({
          role: 'assistant',
          content: textContent || null,
          tool_calls: toolCalls,
        });

        for (const call of toolCalls) {
          const tool = getTool(call.function.name);
          if (!tool) {
            console.warn(`未知 tool: ${call.function.name}`);
            continue;
          }

          let args: Record<string, unknown>;
          try {
            args = this._safeParseToolArgs(call.function.arguments);
          } catch (parseErr) {
            console.error(`tool arguments 解析失败:`, call.function.arguments);
            continue;
          }

          const result: ToolResult = await tool.execute(args, this.context);

          // 更新上下文状态
          if (result.stateUpdate) {
            Object.assign(this.context, result.stateUpdate);
          }

          // 将 tool result 回传到历史（用于多轮 tool call）
          this.conversationHistory.push({
            role: 'tool',
            tool_call_id: call.id,
            content: result.aiResponse,
          });

          // 渲染 UI
          this._renderToolResult(result, textContent);
        }
      } else {
        // 普通文本回复
        this.store.setTyping(false);
        if (textContent) {
          if (!options?.skipTextOutput) {
            this.store.addMessage({ role: 'ai', content: textContent, contentType: 'text' });
          }
          this.conversationHistory.push({ role: 'assistant', content: textContent });
        }
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : '未知错误';
      this.store.addMessage({
        role: 'ai',
        content: `网络连接失败，请重试\n\n(错误信息: ${errMsg})`,
        contentType: 'text',
      });
    } finally {
      this.store.setTyping(false);
      this.store.saveChatHistory();
    }
  }

  /** 渲染 Tool 执行结果 */
  private _renderToolResult(result: ToolResult, questionText?: string) {
    switch (result.display) {
      case 'options': {
        const data = result.data as {
          options: import('@/types/chat').ChatOption[];
          progress?: { current: number; total: number };
          label?: string;
        };
        // AI 的问题文本作为消息内容，选项附加在上面
        const content = questionText || '';
        // 找到刚添加的 AI 文本消息，追加选项
        const lastAiMsg = [...this.store.messages].reverse().find(
          m => m.role === 'ai' && m.contentType === 'text'
        );
        if (lastAiMsg && content === '') {
          // tool call 模式下 AI 文本已经渲染，直接追加选项
          lastAiMsg.options = data.options;
          lastAiMsg.optionsLabel = data.label;
        } else {
          this.store.addMessage({
            role: 'ai',
            content: content || '',
            contentType: 'options',
            options: data.options,
            optionsLabel: data.label,
          });
        }
        break;
      }
      case 'package-card': {
        const data = result.data as PackageCardData & { reason?: string };
        const packageCard: PackageCardData = {
          id: data.id,
          name: data.name,
          badge: data.badge || 'AI定制',
          items: data.items,
          totalPrice: data.totalPrice,
          originalPrice: data.originalPrice,
        };

        // 团检用户处理
        if (this.context.isGroupUser) {
          const enterpriseBudget = 1000;
          const standardTotal = Math.round(packageCard.totalPrice * 0.6);
          const aiAddonTotal = packageCard.totalPrice - standardTotal;
          const discount = 0.85;
          const aiAddonDiscounted = Math.round(aiAddonTotal * discount);
          const totalAfterDiscount = standardTotal + aiAddonDiscounted;
          const enterpriseCoverage = Math.min(enterpriseBudget, totalAfterDiscount);
          const employeePayment = Math.max(0, totalAfterDiscount - enterpriseCoverage);

          packageCard.isGroupPackage = true;
          packageCard.badge = '团检';
          packageCard.enterpriseBudget = enterpriseBudget;
          packageCard.enterpriseCoverage = enterpriseCoverage;
          packageCard.employeePayment = employeePayment;
          packageCard.aiAddonDiscount = discount;
          packageCard.totalPrice = totalAfterDiscount;
        }

        savePackageToStore(packageCard);

        // 如果有推荐理由，先显示理由
        if (data.reason) {
          this.store.addMessage({
            role: 'ai',
            content: data.reason,
            contentType: 'text',
          });
        }

        this.store.addMessage({
          role: 'ai',
          content: '',
          contentType: 'package-card',
          packageCard,
        });
        break;
      }
      case 'follow-up-plan': {
        const plan = result.data as FollowUpPlan;
        this.lastFollowUpPlan = plan;
        // follow-up plan 不单独渲染消息，会被回写到报告解读消息上
        break;
      }
      case 'navigate': {
        const data = result.data as { url: string };
        uni.navigateTo({ url: data.url });
        break;
      }
      case 'text': {
        const data = result.data as { summary?: string; error?: string } | undefined;
        const text = data?.summary || data?.error || '';
        if (text) {
          this.store.addMessage({ role: 'ai', content: text, contentType: 'text' });
        }
        break;
      }
      // 'none' 不渲染
    }
  }

  /** 流式发送 AI 消息（不带 tool） */
  private async _sendAIStream(
    historyMessages: typeof this.conversationHistory,
    systemPrompt?: string,
  ): Promise<string> {
    this.store.setTyping(true);

    const aiMsgId = this.store.addMessage({
      role: 'ai',
      content: '',
      contentType: 'text',
    });
    this.store.setStreamingId(aiMsgId);
    this.store.setTyping(false);

    let fullText = '';
    try {
      // 构建消息列表，转换为 QwenMessage 格式（过滤 tool 消息）
      const qwenMessages: QwenMessage[] = [
        { role: 'system', content: systemPrompt || SYSTEM_PROMPT },
      ];
      for (const msg of historyMessages) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          if (typeof msg.content === 'string' && msg.content) {
            qwenMessages.push({ role: msg.role, content: msg.content });
          }
        }
      }

      fullText = await sendChatMessage(qwenMessages, (chunk: string) => {
        const msg = this.store.messages.find((m) => m.id === aiMsgId);
        if (msg) msg.content += chunk;
      }, systemPrompt);

      this.store.updateMessageContent(aiMsgId, fullText);
      this.conversationHistory.push({ role: 'assistant', content: fullText });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : '未知错误';
      this.store.updateMessageContent(aiMsgId, `网络连接失败，请重试\n\n(错误信息: ${errMsg})`);
    } finally {
      this.store.setStreamingId(null);
      this.store.saveChatHistory();
    }

    return fullText;
  }

  /** 本地打字机效果（不调 AI，逐字输出固定文本） */
  private async _typewriterMessage(text: string, charDelay = 30): Promise<string> {
    const msgId = this.store.addMessage({ role: 'ai', content: '', contentType: 'text' });
    this.store.setStreamingId(msgId);
    for (let i = 0; i < text.length; i++) {
      const msg = this.store.messages.find(m => m.id === msgId);
      if (msg) msg.content = text.slice(0, i + 1);
      await new Promise(r => setTimeout(r, charDelay));
    }
    this.store.updateMessageContent(msgId, text);
    this.store.setStreamingId(null);
    this.conversationHistory.push({ role: 'assistant', content: text });
    return msgId;
  }

  /** 处理套餐推荐流程（流式展示推荐理由） */
  private async _handlePackageRecommendation(userContent: string, budget: 'low' | 'mid' | 'high') {
    this.conversationHistory.push({ role: 'user', content: userContent });
    this.store.setTyping(true);

    const reasonMsgId = this.store.addMessage({
      role: 'ai',
      content: '',
      contentType: 'text',
    });
    this.store.setStreamingId(reasonMsgId);
    this.store.setTyping(false);

    try {
      const healthStore = useHealthStore();
      const userStore = useUserStore();
      const isGroupUser = userStore.userInfo?.hasGroupPackage || false;
      const healthIndicators = healthStore.indicators
        .map((ind) => `${ind.name}${ind.value}(${ind.label})`);
      const riskFactors = healthStore.indicators
        .filter((ind) => ind.status !== 'normal')
        .map((ind) => `${ind.name}${ind.label}`);

      const profile = this.context.guidedProfile;
      const userProfile: { name?: string; gender?: string; age?: number } = {
        name: userStore.userName || undefined,
        gender: profile.gender === '男' ? 'male' : profile.gender === '女' ? 'female' : (userStore.userInfo?.gender || undefined),
        age: userStore.userInfo?.age || undefined,
      };

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
          const msg = this.store.messages.find((m) => m.id === reasonMsgId);
          if (msg) msg.content += chunk;
        },
        () => {
          this.store.setStreamingId(null);
          this.store.addMessage({
            role: 'ai',
            content: '正在为您生成体检方案',
            contentType: 'loading',
          });
        },
        { noData: !hasData },
      );

      const reasonMsg = result.reason || '根据你的需求和预算，我为你生成了这个方案：';
      this.store.updateMessageContent(reasonMsgId, reasonMsg);

      const packageData: PackageCardData = {
        id: `pkg-ai-${Date.now()}`,
        name: result.name,
        badge: result.badge || 'AI定制',
        items: result.items,
        totalPrice: result.totalPrice,
        originalPrice: result.originalPrice,
      };

      if (isGroupUser) {
        const enterpriseBudget = 1000;
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

      savePackageToStore(packageData);
      this.store.setTyping(false);

      // 删除 loading 消息
      const loadingIdx = this.store.messages.findIndex(m => m.contentType === 'loading');
      if (loadingIdx !== -1) this.store.messages.splice(loadingIdx, 1);

      this.store.addMessage({
        role: 'ai',
        content: '',
        contentType: 'package-card',
        packageCard: packageData,
      });

      const itemNames = result.items.map((i: string | { name: string }) => typeof i === 'string' ? i : i.name);
      this.conversationHistory.push({
        role: 'assistant',
        content: `${reasonMsg}\n\n推荐套餐：${result.name}，包含${itemNames.join('、')}，价格${packageData.totalPrice}元`,
      });
      this.aiTurnCount++;
      this.context.currentFlow = 'idle';
    } catch (error: unknown) {
      this.store.setTyping(false);
      const errLoadingIdx = this.store.messages.findIndex(m => m.contentType === 'loading');
      if (errLoadingIdx !== -1) this.store.messages.splice(errLoadingIdx, 1);
      const errMsg = error instanceof Error ? error.message : '未知错误';
      const currentMsg = this.store.messages.find((m) => m.id === reasonMsgId);
      if (currentMsg && currentMsg.content) {
        this.store.updateMessageContent(reasonMsgId, currentMsg.content + `\n\n抱歉，套餐方案生成失败，请重试。(${errMsg})`);
      } else {
        this.store.updateMessageContent(reasonMsgId, `抱歉，套餐推荐生成失败，请重试。\n\n(${errMsg})`);
      }
    } finally {
      this.store.setStreamingId(null);
      this.store.saveChatHistory();
    }
  }

  /** 报告解读卡片：loading → 完成摘要 */
  private _finishReportCard(cardMsgId: string, fullText: string, plan: FollowUpPlan | null) {
    // 1. 报告解读结果卡片（点击查看解读全文）
    const riskCount = plan?.riskItems?.length || 0;
    const highCount = plan?.riskItems?.filter(r => r.level === 'high').length || 0;
    const medCount = plan?.riskItems?.filter(r => r.level === 'medium').length || 0;
    const lowCount = plan?.riskItems?.filter(r => r.level === 'low').length || 0;
    const riskParts: string[] = [];
    if (highCount > 0) riskParts.push(`${highCount}项高风险`);
    if (medCount > 0) riskParts.push(`${medCount}项中风险`);
    if (lowCount > 0) riskParts.push(`${lowCount}项低风险`);
    const summary = riskCount > 0
      ? `报告解读完成，共发现${riskParts.join('、')}异常指标。`
      : '报告解读完成，暂未发现明显异常。';

    this.store.updateMessage(cardMsgId, {
      content: summary,
      contentType: 'risk-summary',
      planGenerating: false,
      isReportInterpretation: true,
      reportFullText: fullText,
      followUpPlan: plan || undefined,
    });
    this.store.saveChatHistory();
  }

  /** 生成复查方案（skipUI=true 时不显示 typing 和追加选项） */
  private async _handleFollowUpPlanGeneration(reportText: string, skipUI = false): Promise<FollowUpPlan | null> {
    if (!reportText) return null;
    if (!skipUI) this.store.setTyping(true);

    try {
      const plan: FollowUpPlan = await generateFollowUpPlan(reportText);
      if (!skipUI) this.store.setTyping(false);
      this.lastFollowUpPlan = plan;

      if (!skipUI && !(plan.needFollowUp && plan.followUpItems.length > 0)) {
        this.store.addMessage({
          role: 'ai',
          content: '',
          contentType: 'options',
          options: [
            { label: '制定体检方案', value: 'make-package', primary: true },
            { label: '暂时不用', value: 'dismiss' },
          ],
        });
      }

      return plan;
    } catch (error: unknown) {
      if (!skipUI) this.store.setTyping(false);
      console.error('复查方案生成失败:', error);
      if (!skipUI) this._appendFollowUpOptions();
      return null;
    }
  }

  /** 预约复查 */
  private async _handleBookFollowUp() {
    const plan = this.lastFollowUpPlan;
    if (!plan || !plan.followUpItems.length) {
      this.store.addMessage({
        role: 'ai',
        content: '暂无复查方案，请先上传报告进行解读。',
        contentType: 'text',
      });
      return;
    }

    this.store.setTyping(true);

    const items = plan.followUpItems.map((item) => ({
      name: item.name,
      reason: item.reason,
      category: 'standard' as const,
      price: 0,
    }));

    const packageId = `pkg-followup-${Date.now()}`;
    const packageCard: PackageCardData = {
      id: packageId,
      name: '复查体检方案',
      badge: '复查',
      items,
      totalPrice: 0,
    };

    savePackageToStore(packageCard);
    this.store.setTyping(false);

    this.store.addMessage({
      role: 'ai',
      content: `已根据您的报告解读结果生成复查方案，包含 **${items.length}** 项检查。请选择预约时间。`,
      contentType: 'text',
    });

    this.store.addMessage({
      role: 'ai',
      content: '',
      contentType: 'package-card',
      packageCard,
    });
    this.store.saveChatHistory();
  }

  /** 追加快捷操作选项 */
  private _appendFollowUpOptions() {
    const hasPackageCard = this.store.messages.some(m => m.contentType === 'package-card');
    if (hasPackageCard) return;

    const options = [
      { label: '制定体检方案', value: 'make-package', primary: true },
      { label: '暂时不用', value: 'dismiss' },
    ];

    const lastAiMsg = [...this.store.messages].reverse().find(
      m => m.role === 'ai' && m.contentType !== 'options'
    );
    if (lastAiMsg && !lastAiMsg.options) {
      lastAiMsg.options = options;
    }
  }

  /**
   * 容错解析 tool arguments JSON
   * LLM 常见问题：多余的尾部 `}` 或 `]`、缺少闭合
   */
  private _safeParseToolArgs(raw: string): Record<string, unknown> {
    // 1. 先直接尝试
    try { return JSON.parse(raw); } catch { /* continue */ }

    // 2. 去掉 markdown 代码块包裹
    let cleaned = raw.replace(/^```json?\s*\n?/i, '').replace(/\n?\s*```\s*$/, '').trim();
    try { return JSON.parse(cleaned); } catch { /* continue */ }

    // 3. 修复多余的尾部花括号/方括号
    // 逐步去掉尾部多余的 } 或 ] 直到能解析
    for (let i = 0; i < 3; i++) {
      if (cleaned.endsWith('}') || cleaned.endsWith(']')) {
        cleaned = cleaned.slice(0, -1).trim();
        try { return JSON.parse(cleaned); } catch { /* continue */ }
      }
    }

    // 4. 都不行，抛出原始错误
    throw new Error(`JSON 解析失败: ${raw.slice(0, 200)}...`);
  }

  /** 格式化健康数据 */
  private _formatHealthDataForAI(): string {
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

  /** 构建消息列表（包含系统提示词） */
  private _buildMessages(systemPrompt: string): typeof this.conversationHistory {
    const MAX_HISTORY = 20;
    const systemMsg = { role: 'system' as const, content: systemPrompt };
    const history = this.conversationHistory.slice(-MAX_HISTORY);
    return [systemMsg, ...history];
  }
}
