export type MessageRole = 'ai' | 'user';
export type MessageContentType = 'text' | 'health-card' | 'package-card' | 'options' | 'image' | 'pdf' | 'follow-up-plan' | 'appointment-card' | 'loading';

/** 预约确认卡片数据 */
export interface AppointmentCardData {
  appointmentId: string;
  date: string;
  time: string;
  items: string[];
  location: string;
  registrationFee: number;
  isFollowUp?: boolean;
  /** 每个项目的科室+医生详情 */
  details?: Array<{ name: string; department: string; doctor: string; feeType: string; registrationFee: number }>;
}

export interface ChatOption {
  label: string;
  value: string;
  primary?: boolean;
}

export interface HealthCardData {
  score: number;
  maxScore: number;
  status: string;
  indicators: Array<{
    name: string;
    value: string;
    status: string;
  }>;
}

export interface PackageItemWithReason {
  name: string;
  price?: number;
  reason?: string;
  category?: 'standard' | 'ai-addon';
}

export interface PackageCardData {
  id: string;
  name: string;
  badge?: string;
  items: (string | PackageItemWithReason)[];
  totalPrice: number;
  originalPrice?: number;
  isGroupPackage?: boolean;
  enterpriseBudget?: number;
  enterpriseCoverage?: number;
  employeePayment?: number;
  aiAddonDiscount?: number;
}

/** 复查方案项目 */
export interface FollowUpItem {
  name: string;
  reason: string;
  suggestedTime: string;
  department: string;
  type?: 'lifestyle' | 'recheck' | 'outpatient';
  doctor?: string;
  registrationFee?: number;
  feeType?: '普通号' | '专家号' | '特需号';
}

/** 复查方案 */
export interface FollowUpPlan {
  needFollowUp: boolean;
  urgencyLevel: 'normal' | 'soon' | 'urgent';
  followUpItems: FollowUpItem[];
  generalAdvice: string;
  dietAdvice?: string;
  exerciseAdvice?: string;
  medicalAdvice?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  contentType: MessageContentType;
  options?: ChatOption[];
  optionsLabel?: string;
  selectedOption?: string;
  healthCard?: HealthCardData;
  packageCard?: PackageCardData;
  followUpPlan?: FollowUpPlan;
  appointmentCard?: AppointmentCardData;
  imageUrl?: string;
  /** PDF 文件名（用于 contentType 为 pdf 时展示） */
  pdfFileName?: string;
  /** 标记此消息为报告解读结果 */
  isReportInterpretation?: boolean;
  /** 关联的报告解读记录 ID */
  reportId?: string;
  /** 标记报告详情（复查方案）正在生成中 */
  planGenerating?: boolean;
  timestamp: number;
}

/** 千问 API 消息格式 */
export interface QwenTextContent {
  type: 'text';
  text: string;
}

export interface QwenImageContent {
  type: 'image_url';
  image_url: { url: string };
}

export interface QwenFileContent {
  type: 'file';
  file_url: { url: string };
}

export type QwenContent = QwenTextContent | QwenImageContent | QwenFileContent;

export interface QwenMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | QwenContent[];
}

/** 千问 API 响应格式 */
export interface QwenChoice {
  index: number;
  message?: { role: string; content: string };
  delta?: { role?: string; content?: string };
  finish_reason: string | null;
}

export interface QwenResponse {
  id: string;
  choices: QwenChoice[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/** 套餐推荐的结构化返回 */
export interface AIPackageRecommendation {
  name: string;
  badge: string;
  items: (string | PackageItemWithReason)[];
  totalPrice: number;
  originalPrice?: number;
  reason: string;
}
