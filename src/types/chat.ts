export type MessageRole = 'ai' | 'user';
export type MessageContentType = 'text' | 'health-card' | 'package-card' | 'options' | 'image' | 'pdf' | 'follow-up-plan';

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

export interface PackageCardData {
  id: string;
  name: string;
  badge?: string;
  items: string[];
  totalPrice: number;
  originalPrice?: number;
}

/** 复查方案项目 */
export interface FollowUpItem {
  name: string;
  reason: string;
  suggestedTime: string;
  department: string;
}

/** 复查方案 */
export interface FollowUpPlan {
  needFollowUp: boolean;
  urgencyLevel: 'normal' | 'soon' | 'urgent';
  followUpItems: FollowUpItem[];
  generalAdvice: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  contentType: MessageContentType;
  options?: ChatOption[];
  healthCard?: HealthCardData;
  packageCard?: PackageCardData;
  followUpPlan?: FollowUpPlan;
  imageUrl?: string;
  /** PDF 文件名（用于 contentType 为 pdf 时展示） */
  pdfFileName?: string;
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
  items: string[];
  totalPrice: number;
  originalPrice?: number;
  reason: string;
}
