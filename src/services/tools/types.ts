import type { ToolDef } from '@/types/chat';

/** Tool 执行上下文 */
export interface ToolContext {
  hasHealthData: boolean;
  currentFlow: 'idle' | 'guided' | 'package' | 'report' | 'followup' | 'risk';
  guidedStep: number;
  guidedProfile: Record<string, string>;
  userName: string;
  isGroupUser: boolean;
}

/** Tool 执行结果 — 前端渲染 */
export interface ToolResult {
  /** 展示类型 */
  display: 'options' | 'package-card' | 'health-card' | 'follow-up-plan' | 'appointment-card' | 'navigate' | 'text' | 'none';
  /** 结构化数据（根据 display 类型不同） */
  data?: unknown;
  /** 更新流程状态 */
  stateUpdate?: Partial<ToolContext>;
  /** 回传给 AI 的 tool result 内容 */
  aiResponse: string;
}

/** Tool 实现接口 */
export interface ToolImpl {
  definition: ToolDef;
  execute(args: Record<string, unknown>, context: ToolContext): Promise<ToolResult>;
}
