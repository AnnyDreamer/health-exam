/**
 * AI 对话服务封装
 *
 * 提供面向业务的 AI 对话接口，底层调用千问 API。
 * - sendChatMessage: 流式对话
 * - interpretReport: 多模态报告解读
 * - recommendPackage: 套餐推荐（结构化 JSON 返回）
 */
import { qwenChatStream, qwenVisionStream, qwenDocStream, qwenChat } from '@/api/qwen';
import type { QwenMessage, AIPackageRecommendation, FollowUpPlan } from '@/types/chat';

/** 系统提示词 */
const SYSTEM_PROMPT = `你是一位专业的健康体检顾问AI助手，服务于健康体检中心。你的职责是：
1. 分析用户的健康数据，给出专业但通俗的健康风险总结
2. 根据异常指标指出主要健康风险及严重程度
3. 解读体检报告中的各项指标

重要规则：
- 回复要简洁，控制在200字以内
- 使用 markdown 格式
- **绝对禁止使用表格（table）**，因为在手机端表格会溢出。请用列表、分段或加粗文字来展示信息
- **不要列举具体的体检项目或检查项目**，系统会自动根据你的分析推荐定制套餐
- 重点说明风险和原因，不要给出体检建议
- 适当使用 **加粗** 标记重点内容
- 不要使用 emoji 表情符号
- **用户的健康数据已经在对话上下文中提供，绝对不要要求用户再次提供体检报告或健康数据**
- 直接基于已有数据进行分析和回答，不要列举让用户提供的信息清单`;

/** 有数据用户定制体检方案的系统提示词 */
const MAKE_PACKAGE_WITH_DATA_PROMPT = `你是一位专业的健康体检顾问AI助手。用户的健康数据已经在对话中提供给你了。

你必须严格按以下格式输出：

第一部分：用1句话打招呼并概括健康评分和状态。

第二部分：用列表逐条列出异常指标，每条格式为：
- **指标名（数值）**：一句话风险说明

第三部分：用1句话总结正常指标。

第四部分：最后一句话固定说"我将根据您的风险项为您定制体检方案，请问您本次体检的**预算是多少**？"

绝对禁止的行为：
- **绝对不要让用户提供任何数据、报告、信息**，你已经有了全部数据
- **不要说"请提供"、"请告诉我"、"需要了解"之类的话**
- **不要列举需要用户提供的信息清单**
- 不要使用表格（table）
- 不要使用 emoji
- 回复控制在200字以内
- 适当使用 **加粗** 标记重点`;

/** 无数据引导式套餐定制的系统提示词 */
const GUIDED_PACKAGE_SYSTEM_PROMPT = `你是一位专业的健康体检顾问AI助手。用户没有历史体检数据，你需要通过逐步提问来了解用户情况，最终推荐合适的体检套餐。

极其重要的规则：
- **每次只回复一个问题**，不要一次问多个问题
- 回复要简短友好，控制在50字以内
- 系统会自动在你的回复下方展示选项按钮，你只需要提出问题即可
- 不要在回复中列举选项（如"A. xxx B. xxx"），系统会自动处理
- **禁止使用表格**，用简短的文字即可
- 不要使用 emoji 表情符号
- 适当使用 **加粗** 让对话更自然`;

/** 报告解读系统提示词 */
const REPORT_SYSTEM_PROMPT = `你是一位专业的体检报告解读AI助手。请根据用户上传的体检报告图片：
1. 识别图片中的各项体检指标
2. 对异常指标进行详细解读，说明可能的健康含义
3. 给出通俗易懂的健康建议
4. 如有需要，建议用户进行针对性的进一步检查

格式要求：
- **绝对禁止使用表格（table）**，在手机端表格会溢出显示不全
- 用列表（- 或 1.）来逐项展示指标分析，每项格式如：**指标名 数值** — 解读说明
- 适当使用 **加粗** 标记异常指标和重点内容
- 不要使用 emoji 表情符号
- 简洁友好的语气`;

/** PDF 报告解读系统提示词 */
const PDF_REPORT_SYSTEM_PROMPT = `你是一位专业的体检报告解读AI助手。请根据用户上传的体检报告PDF文件：
1. 仔细阅读文档中的各项体检指标
2. 对异常指标进行详细解读，说明可能的健康含义
3. 给出通俗易懂的健康建议
4. 如有需要，建议用户进行针对性的进一步检查

格式要求：
- **绝对禁止使用表格（table）**，在手机端表格会溢出显示不全
- 用列表（- 或 1.）来逐项展示指标分析，每项格式如：**指标名 数值** — 解读说明
- 适当使用 **加粗** 标记异常指标和重点内容
- 不要使用 emoji 表情符号
- 简洁友好的语气`;

/** 复查方案生成系统提示词 */
const FOLLOW_UP_PLAN_SYSTEM_PROMPT = `你是一位专业的体检随访管理AI助手。请根据体检报告解读结果，生成结构化的复查方案。
你必须严格以 JSON 格式返回复查方案，不要包含任何其他文字或 markdown 代码块标记。
JSON 格式如下：
{
  "needFollowUp": true,
  "urgencyLevel": "normal" | "soon" | "urgent",
  "followUpItems": [
    {
      "name": "复查项目名称",
      "reason": "需要复查的原因",
      "suggestedTime": "建议复查时间，如3个月后",
      "department": "相关科室"
    }
  ],
  "generalAdvice": "总体建议"
}

规则说明：
- urgencyLevel: "normal" 表示常规复查（3-6个月后），"soon" 表示尽快复查（1-3个月内），"urgent" 表示紧急（2周内）
- followUpItems 应只列出确实需要复查的项目，不要列出正常项目
- 如果所有指标正常，needFollowUp 设为 false，followUpItems 为空数组
- generalAdvice 应包含饮食、运动等生活方式建议`;

/** 套餐推荐系统提示词 */
const PACKAGE_SYSTEM_PROMPT = `你是一位专业的体检套餐推荐AI助手。请根据用户信息推荐个性化的体检套餐。
你必须严格以 JSON 格式返回推荐结果，不要包含任何其他文字或 markdown 代码块标记。
JSON 格式如下：
{
  "name": "套餐名称",
  "badge": "AI定制",
  "items": [
    {"name": "项目1", "price": 180, "reason": "推荐理由"},
    {"name": "项目2", "price": 120, "reason": "推荐理由"}
  ],
  "totalPrice": 1280,
  "originalPrice": 1580,
  "reason": "详细的推荐理由"
}

请确保：
- items 数组包含 5-10 个体检项目，每项都有 name、price 和 reason 字段
- 每个 price 应为该单项的参考市场价格（单位：元），所有 price 之和应等于 originalPrice
- totalPrice 应在用户预算范围内
- originalPrice 应略高于 totalPrice
- reason 必须使用 markdown 格式，结构清晰。格式要求：
  先用一句话总结方案定位，然后用列表逐条说明每个检查项目对应哪个风险指标，格式如：
  "根据您的健康数据，为您定制以下方案：\n\n- **心脏彩超、颈动脉彩超** ← 血压偏高(128/82)，排查血管病变\n- **血脂全套、同型半胱氨酸** ← 血脂三项超标，监测动脉硬化风险\n- **甲状腺功能全套、甲状腺彩超** ← TSH偏高，排查甲状腺功能异常\n\n整体方案覆盖您的主要风险点，帮助早发现早干预。"
  每条用 ← 箭头连接"检查项目"和"对应的风险原因"，让用户一目了然`;

/** 团检套餐推荐系统提示词 */
const GROUP_PACKAGE_SYSTEM_PROMPT = `你是一位专业的企业团检套餐推荐AI助手。用户是企业团检员工，企业提供1000元体检额度。
你需要推荐包含"标准项目"和"AI个性化加项"的体检方案。

规则：
- 标准项目（category: "standard"）：企业标配的常规检查，由企业额度支付
- AI个性化加项（category: "ai-addon"）：根据用户健康状况个性化推荐，享受85折优惠
- 企业额度1000元优先覆盖标准项目，剩余额度可抵扣AI加项
- 超出企业额度的部分由员工自付

你必须严格以 JSON 格式返回推荐结果，不要包含任何其他文字或 markdown 代码块标记。
JSON 格式如下：
{
  "name": "企业健康体检方案",
  "badge": "团检",
  "items": [
    {"name": "一般检查", "category": "standard", "price": 80, "reason": "基础体格检查"},
    {"name": "甲状腺彩超", "category": "ai-addon", "price": 180, "reason": "根据健康数据推荐"}
  ],
  "standardTotal": 680,
  "aiAddonTotal": 520,
  "aiAddonDiscount": 0.85,
  "totalPrice": 1122,
  "originalPrice": 1200,
  "enterpriseCoverage": 1000,
  "employeePayment": 122,
  "reason": "推荐理由"
}

请确保：
- items 中每项都有 name、category、price、reason 字段
- standardTotal 是所有 standard 项目价格之和
- aiAddonTotal 是所有 ai-addon 项目原价之和
- AI加项折后价 = aiAddonTotal * aiAddonDiscount
- enterpriseCoverage = min(1000, standardTotal + AI加项折后价)
- employeePayment = standardTotal + AI加项折后价 - enterpriseCoverage
- totalPrice = standardTotal + AI加项折后价`;

/** 对话历史最大保留条数 */
const MAX_HISTORY_LENGTH = 20;

/**
 * 裁剪对话历史，保留系统消息和最近的对话
 */
function trimHistory(messages: QwenMessage[]): QwenMessage[] {
  if (messages.length <= MAX_HISTORY_LENGTH + 1) {
    return messages;
  }

  const systemMessages = messages.filter((m) => m.role === 'system');
  const nonSystemMessages = messages.filter((m) => m.role !== 'system');
  const trimmed = nonSystemMessages.slice(-MAX_HISTORY_LENGTH);

  return [...systemMessages, ...trimmed];
}

/**
 * 构建带系统提示词的消息列表
 */
function buildMessages(
  history: QwenMessage[],
  systemPrompt: string = SYSTEM_PROMPT,
): QwenMessage[] {
  const hasSystemMsg = history.length > 0 && history[0].role === 'system';
  const msgs: QwenMessage[] = hasSystemMsg
    ? history
    : [{ role: 'system', content: systemPrompt }, ...history];
  return trimHistory(msgs);
}

/**
 * 流式对话
 *
 * @param messages - 对话历史（QwenMessage 格式）
 * @param onChunk  - 每收到文本增量时的回调
 * @returns 完整的 AI 回复文本
 */
export async function sendChatMessage(
  messages: QwenMessage[],
  onChunk: (chunk: string) => void,
  systemPrompt?: string,
): Promise<string> {
  const builtMessages = buildMessages(messages, systemPrompt || SYSTEM_PROMPT);
  return qwenChatStream(builtMessages, onChunk);
}

export { GUIDED_PACKAGE_SYSTEM_PROMPT, MAKE_PACKAGE_WITH_DATA_PROMPT, GROUP_PACKAGE_SYSTEM_PROMPT };

/**
 * 多模态报告解读（流式）
 *
 * @param imageBase64 - 图片 base64（含 data:image/... 前缀）
 * @param onChunk     - 流式回调
 * @param extraPrompt - 额外的用户提问（可选）
 * @returns 完整的 AI 回复文本
 */
export async function interpretReport(
  imageBase64: string,
  onChunk: (chunk: string) => void,
  extraPrompt?: string,
): Promise<string> {
  const prompt =
    extraPrompt || '请帮我解读这份体检报告，分析各项指标是否正常，并给出健康建议。';

  // 对于多模态请求，先插入系统提示再用 vision stream
  // 千问 VL 模型支持在消息列表中加入系统消息
  return qwenVisionStream(imageBase64, `${REPORT_SYSTEM_PROMPT}\n\n${prompt}`, onChunk);
}

/**
 * PDF 报告解读（流式）
 *
 * @param pdfBase64   - PDF 文件 base64（含 data:application/pdf;base64,... 前缀）
 * @param onChunk     - 流式回调
 * @param extraPrompt - 额外的用户提问（可选）
 * @returns 完整的 AI 回复文本
 */
export async function interpretPdfReport(
  pdfBase64: string,
  onChunk: (chunk: string) => void,
  extraPrompt?: string,
  fileName?: string,
): Promise<string> {
  const prompt =
    extraPrompt || '请帮我解读这份体检报告，分析各项指标是否正常，并给出健康建议。';

  return qwenDocStream(pdfBase64, `${PDF_REPORT_SYSTEM_PROMPT}\n\n${prompt}`, onChunk, fileName);
}

/**
 * 生成复查方案
 *
 * 基于体检报告解读结果，调用 AI 生成结构化的复查方案
 *
 * @param reportSummary - 报告解读的完整文本
 * @returns 结构化的复查方案数据
 */
export async function generateFollowUpPlan(
  reportSummary: string,
): Promise<FollowUpPlan> {
  const messages: QwenMessage[] = [
    { role: 'system', content: FOLLOW_UP_PLAN_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `以下是体检报告的解读结果，请根据这些信息生成复查方案：\n\n${reportSummary}`,
    },
  ];

  const response = await qwenChat(messages, {
    temperature: 0.3,
    maxTokens: 1024,
    responseFormat: { type: 'json_object' },
  });

  const content = response.choices?.[0]?.message?.content || '';

  try {
    const jsonStr = content.replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/, '');
    const parsed = JSON.parse(jsonStr) as FollowUpPlan;

    // 验证并规范化字段
    return {
      needFollowUp: !!parsed.needFollowUp,
      urgencyLevel: (['normal', 'soon', 'urgent'].includes(parsed.urgencyLevel)
        ? parsed.urgencyLevel
        : 'normal') as FollowUpPlan['urgencyLevel'],
      followUpItems: Array.isArray(parsed.followUpItems) ? parsed.followUpItems : [],
      generalAdvice: parsed.generalAdvice || '',
    };
  } catch (e) {
    console.error('复查方案 JSON 解析失败:', e, content);
    throw new Error('AI 返回数据格式异常，请重试');
  }
}

/**
 * 套餐推荐（返回结构化 JSON）
 *
 * @param userProfile - 用户画像
 * @param healthData  - 健康数据摘要
 * @param budget      - 预算范围
 * @returns 结构化的套餐推荐数据
 */
export async function recommendPackage(
  userProfile: { name?: string; gender?: string; age?: number },
  healthData: { indicators?: string[]; riskFactors?: string[] },
  budget: 'low' | 'mid' | 'high',
): Promise<AIPackageRecommendation> {
  const budgetMap: Record<string, string> = {
    low: '1000元以下',
    mid: '1000-2000元',
    high: '2000元以上',
  };

  const userDescription = [
    userProfile.name ? `姓名：${userProfile.name}` : '',
    userProfile.gender ? `性别：${userProfile.gender === 'male' ? '男' : '女'}` : '',
    userProfile.age ? `年龄：${userProfile.age}岁` : '',
    healthData.indicators?.length
      ? `近期体检指标：${healthData.indicators.join('、')}`
      : '',
    healthData.riskFactors?.length
      ? `健康风险因素：${healthData.riskFactors.join('、')}`
      : '',
    `预算范围：${budgetMap[budget] || '1000-2000元'}`,
  ]
    .filter(Boolean)
    .join('\n');

  const messages: QwenMessage[] = [
    { role: 'system', content: PACKAGE_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `请根据以下用户信息推荐体检套餐：\n\n${userDescription}`,
    },
  ];

  const response = await qwenChat(messages, {
    temperature: 0.3,
    maxTokens: 1024,
    responseFormat: { type: 'json_object' },
  });

  const content = response.choices?.[0]?.message?.content || '';

  try {
    // 尝试去除可能包裹的 markdown 代码块
    const jsonStr = content.replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/, '');
    const parsed = JSON.parse(jsonStr) as AIPackageRecommendation;

    // 验证必需字段
    if (!parsed.name || !Array.isArray(parsed.items) || typeof parsed.totalPrice !== 'number') {
      throw new Error('返回数据格式不完整');
    }

    return {
      name: parsed.name,
      badge: parsed.badge || 'AI定制',
      items: parsed.items,
      totalPrice: parsed.totalPrice,
      originalPrice: parsed.originalPrice,
      reason: parsed.reason || '',
    };
  } catch (e) {
    // JSON 解析失败时，构造一个默认推荐
    console.error('套餐推荐 JSON 解析失败:', e, content);
    throw new Error('AI 返回数据格式异常，请重试');
  }
}
