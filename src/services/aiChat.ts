/**
 * AI 对话服务封装
 *
 * 提供面向业务的 AI 对话接口，底层调用千问 API。
 * - sendChatMessage: 流式对话
 * - interpretReport: 多模态报告解读
 * - recommendPackageStream: 套餐推荐（流式输出推荐理由 + 结构化 JSON）
 */
import { qwenChatStream, qwenVisionStream, qwenDocStream, qwenChat } from '@/api/qwen';
import type { QwenMessage, AIPackageRecommendation, FollowUpPlan, RiskItem } from '@/types/chat';

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
const REPORT_SYSTEM_PROMPT = `你是一位专业的体检报告解读AI助手。请根据用户上传的体检报告图片进行精简解读。

输出结构（总字数控制在300字以内）：

1. **总览**：先用一句话概括报告问题，格式如："本次报告共发现 **X项高风险**、**X项低风险** 异常指标"或"本次报告各项指标均正常"
2. **异常指标**：按风险等级分组列出
   - 高风险指标（需要关注/就医的），每项格式：- **指标名（数值）** — 一句话说明风险
   - 低风险指标（偏离正常但不紧急的），每项格式：- **指标名（数值）** — 一句话说明
3. 正常指标一句话带过（如"其余XX项指标均在正常范围内"），不要逐条列出
4. **建议**：最后1-2句话给出就医或复查建议。如有紧急情况请以"**建议立即就医**"开头；如需复查请以"**建议X个月内复查**"开头

格式要求：
- **绝对禁止使用表格（table）**，在手机端表格会溢出显示不全
- 适当使用 **加粗** 标记异常指标和重点内容
- 不要使用 emoji 表情符号
- 简洁友好的语气`;

/** PDF 报告解读系统提示词 */
const PDF_REPORT_SYSTEM_PROMPT = `你是一位专业的体检报告解读AI助手。请根据用户上传的体检报告PDF文件进行精简解读。

输出结构（总字数控制在300字以内）：

1. **总览**：先用一句话概括报告问题，格式如："本次报告共发现 **X项高风险**、**X项低风险** 异常指标"或"本次报告各项指标均正常"
2. **异常指标**：按风险等级分组列出
   - 高风险指标（需要关注/就医的），每项格式：- **指标名（数值）** — 一句话说明风险
   - 低风险指标（偏离正常但不紧急的），每项格式：- **指标名（数值）** — 一句话说明
3. 正常指标一句话带过（如"其余XX项指标均在正常范围内"），不要逐条列出
4. **建议**：最后1-2句话给出就医或复查建议。如有紧急情况请以"**建议立即就医**"开头；如需复查请以"**建议X个月内复查**"开头

格式要求：
- **绝对禁止使用表格（table）**，在手机端表格会溢出显示不全
- 适当使用 **加粗** 标记异常指标和重点内容
- 不要使用 emoji 表情符号
- 简洁友好的语气`;

/** 复查方案生成系统提示词 */
/** 第一步：生成复查方案结构化数据（followUpItems + urgencyLevel） */
const FOLLOW_UP_ITEMS_PROMPT = `你是三甲医院健康管理中心的主任医师，有20年临床经验。请根据体检报告解读结果，生成专业的复查方案。
你必须严格以 JSON 格式返回，不要包含任何其他文字或 markdown 代码块标记。

JSON 格式：
{
  "needFollowUp": true,
  "urgencyLevel": "normal" | "soon" | "urgent",
  "followUpItems": [
    {
      "name": "项目名称",
      "reason": "简短原因，一句话说明为什么需要这项检查",
      "suggestedTime": "建议时间",
      "department": "相关科室",
      "doctor": "推荐就诊医生姓名+职称（如'张主任/主任医师'），根据科室合理虚拟一位专家",
      "type": "lifestyle" | "recheck" | "outpatient",
      "registrationFee": 挂号费(整数元。recheck: 25; outpatient: 50或200; lifestyle: 0),
      "feeType": "普通号" | "专家号" | "特需号"
    }
  ],
  "generalAdvice": "总体健康管理建议（1-2句话概括）"
}

urgencyLevel 判断：
- "urgent"：存在 outpatient 项目，或报告有高风险异常（严重超标、病变）
- "soon"：存在 recheck 项目，或 ≥3项异常
- "normal"：仅轻微异常或全部正常
- 报告提到"高风险"→ 至少 "soon"；建议就医 → "urgent"

followUpItems type：
- "lifestyle": 生活方式干预（饮食、运动、作息）
- "recheck": 需复查的检验检查项目
- "outpatient": 需门诊就医的科室
- 只列异常项，正常项不列
- 全部正常时 needFollowUp=false, followUpItems=[]`;

/** 第二步：生成简明健康建议（diet/exercise/medical） */
const FOLLOW_UP_ADVICE_PROMPT = `你是三甲医院健康管理中心的主任医师。请根据体检报告解读结果，生成简明的健康干预建议。
你必须严格以 JSON 格式返回，不要包含任何其他文字或 markdown 代码块标记。

JSON 格式：
{
  "dietAdvice": "饮食建议",
  "exerciseAdvice": "运动建议",
  "medicalAdvice": "复查就医建议"
}

【核心要求】每条建议必须精简！格式为"关键行动——简短原因"，每条不超过30个字。用户在手机上阅读，大段文字没人看。

dietAdvice（3-4条，用"\\n"分隔，"• "开头）：
- 每条只说"做什么——为什么"，不展开细节
- 示例："• 每日钠盐控制在5克以内——降低血压\\n• 多吃深色蔬菜和深海鱼——补充钾和Omega-3\\n• 减少精制碳水主食——控制血糖波动\\n• 戒酒——保护肝功能"

exerciseAdvice（3-4条，格式同上）：
- 只写运动类型+频率+关联指标
- 示例："• 每周快走或慢跑150分钟——改善血压血脂\\n• 餐后1小时散步30分钟——辅助控制血糖\\n• 每周2次力量训练——提高代谢率"

medicalAdvice（2-3条，格式同上）：
- 只写时间+科室+原因
- 示例："• 2周内心血管内科就诊——血压达高血压标准\\n• 3个月后复查血脂和肝功能——评估干预效果\\n• 6个月后复查肺部CT——随访肺结节变化"

注意：必须根据实际报告内容生成针对性建议，引用具体异常指标。不要照抄示例。`;

/** 风险分析统一提示词（一次返回完整结构化数据） */
const RISK_ANALYSIS_PROMPT = `你是三甲医院健康管理中心的主任医师，有20年临床经验。请根据用户的健康数据，一次性生成完整的风险分析和健康管理方案。
你必须严格以 JSON 格式返回，不要包含任何其他文字或 markdown 代码块标记。

JSON 格式：
{
  "riskItems": [
    {
      "category": "风险类别名称（如'血压偏高'）",
      "level": "low" | "medium" | "high",
      "indicators": ["具体指标值，如'收缩压 128 mmHg ↑'"],
      "brief": "一句话风险说明，不超过25字"
    }
  ],
  "needFollowUp": true,
  "urgencyLevel": "normal" | "soon" | "urgent",
  "followUpItems": [
    {
      "name": "项目名称",
      "reason": "简短原因，一句话",
      "suggestedTime": "建议时间",
      "department": "相关科室",
      "doctor": "推荐医生姓名+职称",
      "type": "lifestyle" | "recheck" | "outpatient",
      "registrationFee": 25,
      "feeType": "普通号" | "专家号" | "特需号"
    }
  ],
  "generalAdvice": "总体建议（1-2句话）",
  "dietAdvice": "饮食建议（3-4条，用\\n分隔，• 开头，每条不超过30字，格式：做什么——原因）",
  "exerciseAdvice": "运动建议（3-4条，格式同上）",
  "medicalAdvice": "复查就医建议（2-3条，格式：时间+科室——原因）"
}

riskItems 规则：
- 每项只针对一个风险类别，indicators 列出该类别下的异常指标值
- level 判断：严重超标或病变=high，中度异常=medium，轻微偏离=low
- brief 精简到一句话核心风险说明
- 只列异常项，正常项不列

urgencyLevel 判断：
- "urgent"：存在 outpatient 项目或高风险异常
- "soon"：存在 recheck 项目或 ≥3项异常
- "normal"：仅轻微异常或全部正常

followUpItems type / registrationFee / feeType：
- "lifestyle": 生活方式干预，registrationFee=0
- "recheck": 复查项目，registrationFee=25，feeType="普通号"
- "outpatient": 门诊就医，registrationFee=50或200，feeType="专家号"或"特需号"`;

/** 套餐推荐系统提示词（流式版：先输出推荐理由文字，再输出 JSON） */
const PACKAGE_SYSTEM_PROMPT = `你是一位专业的体检套餐推荐AI助手。请根据用户信息推荐个性化的体检套餐。

你的回复必须分为两部分：

第一部分（推荐理由）：
用 markdown 格式输出推荐理由，结构清晰。格式要求：
先用一句话总结方案定位，然后用列表逐条说明每个检查项目对应哪个风险指标，格式如：
"根据您的健康数据，为您定制以下方案：

- **心脏彩超、颈动脉彩超** ← 血压偏高(128/82)，排查血管病变
- **血脂全套、同型半胱氨酸** ← 血脂三项超标，监测动脉硬化风险
- **甲状腺功能全套、甲状腺彩超** ← TSH偏高，排查甲状腺功能异常

整体方案覆盖您的主要风险点，帮助早发现早干预。"
每条用 ← 箭头连接"检查项目"和"对应的风险原因"，让用户一目了然。

第二部分（结构化数据）：
在推荐理由之后，用 \`\`\`json 代码块输出结构化的套餐数据，格式如下：
\`\`\`json
{
  "name": "套餐名称",
  "badge": "AI定制",
  "items": [
    {"name": "项目1", "price": 180, "reason": "推荐理由"},
    {"name": "项目2", "price": 120, "reason": "推荐理由"}
  ],
  "totalPrice": 1280,
  "originalPrice": 1580
}
\`\`\`

请确保：
- 先输出推荐理由文字，再输出 JSON 代码块
- items 数组包含 5-10 个体检项目，每项都有 name、price 和 reason 字段
- 每个 price 应为该单项的参考市场价格（单位：元），所有 price 之和应等于 originalPrice
- totalPrice 应在用户预算范围内
- originalPrice 应略高于 totalPrice
- JSON 中不需要 reason 字段，推荐理由已经在第一部分文字中输出了
- **绝对禁止使用表格（table）**`;

/** 无数据用户套餐推荐系统提示词 */
const PACKAGE_SYSTEM_PROMPT_NO_DATA = `你是一位专业的体检套餐推荐AI助手。用户没有历史体检数据，请根据用户通过问答提供的基本信息推荐个性化的体检套餐。

你的回复必须分为两部分：

第一部分（推荐理由）：
用 markdown 格式输出推荐理由，结构清晰。格式要求：
先用一句话总结，然后用列表逐条说明每个检查项目的推荐原因，格式如：
"根据您的基本情况和对话信息，为您推荐以下体检项目：

- **血脂全套** ← 办公室久坐+缺少运动，需关注代谢指标
- **甲状腺功能全套** ← 经常失眠，排查甲状腺功能异常
- **幽门螺杆菌呼气试验** ← 饮食不规律，筛查胃部健康

整体方案结合您的年龄、职业和生活习惯，帮助全面了解健康状况。"
每条用 ← 箭头连接"检查项目"和"推荐原因"，让用户一目了然。

第二部分（结构化数据）：
在推荐理由之后，用 \`\`\`json 代码块输出结构化的套餐数据，格式如下：
\`\`\`json
{
  "name": "套餐名称",
  "badge": "AI定制",
  "items": [
    {"name": "项目1", "price": 180, "reason": "推荐理由"},
    {"name": "项目2", "price": 120, "reason": "推荐理由"}
  ],
  "totalPrice": 1280,
  "originalPrice": 1580
}
\`\`\`

请确保：
- 先输出推荐理由文字，再输出 JSON 代码块
- items 数组包含 5-10 个体检项目，每项都有 name、price 和 reason 字段
- 每个 price 应为该单项的参考市场价格（单位：元），所有 price 之和应等于 originalPrice
- totalPrice 应在用户预算范围内
- originalPrice 应略高于 totalPrice
- **绝对不要说"根据您的健康数据"，用户没有健康数据**
- **绝对禁止使用表格（table）**`;

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
  const result = await qwenChatStream(builtMessages, onChunk);
  return result.text;
}

// 以下提示词在 Tool 模式下不再外部使用，由 chatOrchestrator 内置精简版替代
// 保留定义供 aiChat.ts 内部函数使用（recommendPackageStream 等）
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

/** 解析 AI 返回的 JSON 字符串 */
function parseAIJson<T>(content: string): T {
  const jsonStr = content.replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/, '');
  return JSON.parse(jsonStr) as T;
}

/**
 * 生成复查方案
 *
 * 拆为两次 AI 调用，避免单次返回内容过长被截断：
 * 1. 第一次：生成 followUpItems + urgencyLevel（结构化数据）
 * 2. 第二次：生成 dietAdvice + exerciseAdvice + medicalAdvice（健康建议）
 *
 * @param reportSummary - 报告解读的完整文本
 * @returns 结构化的复查方案数据
 */
export async function generateFollowUpPlan(
  reportSummary: string,
): Promise<FollowUpPlan> {
  const userContent = `以下是体检报告的解读结果，请根据这些信息生成内容：\n\n${reportSummary}`;

  // ---- 第一步：获取复查项目 ----
  const itemsResponse = await qwenChat(
    [
      { role: 'system', content: FOLLOW_UP_ITEMS_PROMPT },
      { role: 'user', content: userContent },
    ],
    { temperature: 0.3, maxTokens: 3000, responseFormat: { type: 'json_object' } },
  );
  const itemsContent = itemsResponse.choices?.[0]?.message?.content || '';

  let itemsData: any;
  try {
    itemsData = parseAIJson(itemsContent);
  } catch (e) {
    console.error('复查方案（项目）JSON 解析失败:', e, itemsContent);
    throw new Error('AI 返回数据格式异常，请重试');
  }

  const items = Array.isArray(itemsData.followUpItems)
    ? itemsData.followUpItems.map((item: any) => {
        const type = item.type || 'recheck';
        const defaultFee = type === 'lifestyle' ? 0 : type === 'outpatient' ? 50 : 25;
        return {
          ...item,
          type,
          registrationFee: typeof item.registrationFee === 'number' ? item.registrationFee : defaultFee,
          feeType: item.feeType || (type === 'outpatient' ? '专家号' : '普通号'),
        };
      })
    : [];

  // ---- 第二步：获取健康建议 ----
  const adviceResponse = await qwenChat(
    [
      { role: 'system', content: FOLLOW_UP_ADVICE_PROMPT },
      { role: 'user', content: userContent },
    ],
    { temperature: 0.3, maxTokens: 3000, responseFormat: { type: 'json_object' } },
  );
  const adviceContent = adviceResponse.choices?.[0]?.message?.content || '';

  let adviceData: any = {};
  try {
    adviceData = parseAIJson(adviceContent);
  } catch (e) {
    console.error('复查方案（建议）JSON 解析失败:', e, adviceContent);
    // 建议部分解析失败不阻塞，降级为空
  }

  return {
    needFollowUp: !!itemsData.needFollowUp,
    urgencyLevel: (['normal', 'soon', 'urgent'].includes(itemsData.urgencyLevel)
      ? itemsData.urgencyLevel
      : 'normal') as FollowUpPlan['urgencyLevel'],
    followUpItems: items,
    generalAdvice: itemsData.generalAdvice || '',
    dietAdvice: adviceData.dietAdvice,
    exerciseAdvice: adviceData.exerciseAdvice,
    medicalAdvice: adviceData.medicalAdvice,
  };
}

/**
 * 统一风险分析（1 次 AI 调用返回完整结构化数据）
 *
 * @param healthInfo - 用户健康数据摘要
 * @returns 完整的风险分析 + 复查方案
 */
export async function generateRiskAnalysis(
  healthInfo: string,
): Promise<FollowUpPlan & { summary?: string }> {
  const userContent = `以下是用户的健康数据，请生成完整的风险分析和健康管理方案：\n\n${healthInfo}`;

  const response = await qwenChat(
    [
      { role: 'system', content: RISK_ANALYSIS_PROMPT },
      { role: 'user', content: userContent },
    ],
    { temperature: 0.3, maxTokens: 4000, responseFormat: { type: 'json_object' } },
  );
  const content = response.choices?.[0]?.message?.content || '';

  let data: any;
  try {
    data = parseAIJson(content);
  } catch (e) {
    console.error('风险分析 JSON 解析失败:', e, content);
    throw new Error('AI 返回数据格式异常，请重试');
  }

  const riskItems: RiskItem[] = Array.isArray(data.riskItems)
    ? data.riskItems.map((item: any) => ({
        category: item.category || '',
        level: (['low', 'medium', 'high'].includes(item.level) ? item.level : 'medium') as RiskItem['level'],
        indicators: Array.isArray(item.indicators) ? item.indicators : [],
        brief: item.brief || '',
      }))
    : [];

  const followUpItems = Array.isArray(data.followUpItems)
    ? data.followUpItems.map((item: any) => {
        const type = item.type || 'recheck';
        const defaultFee = type === 'lifestyle' ? 0 : type === 'outpatient' ? 50 : 25;
        return {
          ...item,
          type,
          registrationFee: typeof item.registrationFee === 'number' ? item.registrationFee : defaultFee,
          feeType: item.feeType || (type === 'outpatient' ? '专家号' : '普通号'),
        };
      })
    : [];

  return {
    needFollowUp: !!data.needFollowUp,
    urgencyLevel: (['normal', 'soon', 'urgent'].includes(data.urgencyLevel)
      ? data.urgencyLevel
      : 'normal') as FollowUpPlan['urgencyLevel'],
    followUpItems,
    generalAdvice: data.generalAdvice || '',
    dietAdvice: data.dietAdvice,
    exerciseAdvice: data.exerciseAdvice,
    medicalAdvice: data.medicalAdvice,
    riskItems,
  };
}

/**
 * 从 AI 返回的完整文本中提取推荐理由和 JSON 数据
 *
 * AI 返回格式：先是推荐理由文字，然后是 ```json ... ``` 代码块
 */
export function parsePackageResponse(fullText: string): {
  reason: string;
  packageData: AIPackageRecommendation | null;
} {
  // 尝试匹配 ```json ... ``` 代码块
  const jsonBlockMatch = fullText.match(/```json\s*\n?([\s\S]*?)\n?\s*```/);

  let reason = fullText;
  let packageData: AIPackageRecommendation | null = null;

  if (jsonBlockMatch) {
    // 提取 JSON 代码块之前的文字作为推荐理由
    const jsonBlockStart = fullText.indexOf(jsonBlockMatch[0]);
    reason = fullText.slice(0, jsonBlockStart).trim();

    try {
      const parsed = JSON.parse(jsonBlockMatch[1]) as AIPackageRecommendation;

      // 验证必需字段
      if (!parsed.name || !Array.isArray(parsed.items) || typeof parsed.totalPrice !== 'number') {
        console.error('套餐推荐 JSON 数据格式不完整:', parsed);
      } else {
        packageData = {
          name: parsed.name,
          badge: parsed.badge || 'AI定制',
          items: parsed.items,
          totalPrice: parsed.totalPrice,
          originalPrice: parsed.originalPrice,
          reason: reason,
        };
      }
    } catch (e) {
      console.error('套餐推荐 JSON 解析失败:', e, jsonBlockMatch[1]);
    }
  } else {
    // 没有 json 代码块，尝试直接从文本中提取 JSON（兼容旧格式）
    try {
      const jsonStr = fullText.replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/, '');
      const parsed = JSON.parse(jsonStr) as AIPackageRecommendation;
      if (parsed.name && Array.isArray(parsed.items) && typeof parsed.totalPrice === 'number') {
        reason = parsed.reason || '';
        packageData = {
          name: parsed.name,
          badge: parsed.badge || 'AI定制',
          items: parsed.items,
          totalPrice: parsed.totalPrice,
          originalPrice: parsed.originalPrice,
          reason: reason,
        };
      }
    } catch {
      // 完全无法解析 JSON，reason 保持为全文
    }
  }

  return { reason, packageData };
}

/**
 * 套餐推荐（流式返回）
 *
 * AI 先输出推荐理由文字（流式展示），再输出 JSON 代码块（解析为套餐数据）。
 * onReasonChunk 回调用于实时展示推荐理由的文字增量。
 *
 * @param userProfile    - 用户画像
 * @param healthData     - 健康数据摘要
 * @param budget         - 预算范围
 * @param onReasonChunk  - 推荐理由文字的流式回调（仅回调 JSON 代码块之前的文字部分）
 * @returns 结构化的套餐推荐数据
 */
export async function recommendPackageStream(
  userProfile: { name?: string; gender?: string; age?: number },
  healthData: { indicators?: string[]; riskFactors?: string[] },
  budget: 'low' | 'mid' | 'high',
  onReasonChunk: (chunk: string) => void,
  onJsonBlockStart?: () => void,
  options?: { noData?: boolean },
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

  const systemPrompt = options?.noData ? PACKAGE_SYSTEM_PROMPT_NO_DATA : PACKAGE_SYSTEM_PROMPT;
  const messages: QwenMessage[] = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `请根据以下用户信息推荐体检套餐：\n\n${userDescription}`,
    },
  ];

  // 跟踪是否已经进入 JSON 代码块区域，以及已发送给回调的字符数
  let inJsonBlock = false;
  let accumulatedText = '';
  let sentLength = 0; // 已通过 onReasonChunk 发送的字符数

  const streamResult = await qwenChatStream(messages, (chunk: string) => {
    accumulatedText += chunk;

    if (inJsonBlock) return; // JSON 代码块内的 chunk 不回调

    // 检查累积文本中是否出现了 ```json 标记
    const jsonBlockStart = accumulatedText.indexOf('```json');
    if (jsonBlockStart !== -1) {
      // 进入 JSON 代码块，先把标记之前尚未发送的文字发出去，再通知
      inJsonBlock = true;
      if (jsonBlockStart > sentLength) {
        onReasonChunk(accumulatedText.slice(sentLength, jsonBlockStart));
        sentLength = jsonBlockStart;
      }
      onJsonBlockStart?.();
      return;
    }

    // 还没进入 JSON 块。为防止 ``` 被截断（跨 chunk 边界），
    // 保留末尾最多 7 个字符（```json 长度）不发送
    const holdBack = 7; // "```json" 的长度
    const safeEnd = Math.max(sentLength, accumulatedText.length - holdBack);
    if (safeEnd > sentLength) {
      onReasonChunk(accumulatedText.slice(sentLength, safeEnd));
      sentLength = safeEnd;
    }
  }, {
    temperature: 0.3,
    maxTokens: 2048,
  });

  const fullText = streamResult.text;

  // 流式结束后，如果没有进入 JSON 块，把剩余未发送的文字发出去
  if (!inJsonBlock && sentLength < accumulatedText.length) {
    onReasonChunk(accumulatedText.slice(sentLength));
  }

  // 流式完成后，解析完整文本
  const { reason, packageData } = parsePackageResponse(fullText);

  if (packageData) {
    return packageData;
  }

  // JSON 解析失败，抛出错误但保留 reason 文字（已经流式展示了）
  console.error('套餐推荐完整文本:', fullText);
  throw new Error('AI 返回数据格式异常，请重试');
}
