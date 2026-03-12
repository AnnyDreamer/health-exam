import type { ToolDef } from '@/types/chat';
import type { ToolContext } from './tools/types';
import type { ToolChoice } from '@/api/qwen';
import { askQuestionTool } from './tools/askQuestion';
import { recommendPackageTool } from './tools/recommendPackage';
import { generateFollowUpTool } from './tools/generateFollowUp';
import { showHealthRiskTool } from './tools/showHealthRisk';
import { renderHealthAnalysisTool } from './tools/renderHealthAnalysis';
import { navigateTool } from './tools/navigate';

/**
 * 根据当前上下文动态过滤可用 tool 列表
 */
export function getAvailableTools(context: ToolContext): ToolDef[] {
  const { currentFlow, guidedStep, hasHealthData } = context;

  switch (currentFlow) {
    case 'guided':
      // 引导流程中：只允许 ask_guided_question
      // 最后一步或提前结束后：切换到 recommend_package
      if (guidedStep > 0 && guidedStep <= 10) {
        return [askQuestionTool.definition];
      }
      return [recommendPackageTool.definition];

    case 'package':
      return [recommendPackageTool.definition];

    case 'report':
      // 报告解读中：不注入 tool（流式文本）
      return [];

    case 'followup':
      return [generateFollowUpTool.definition];

    case 'risk':
      return [renderHealthAnalysisTool.definition];

    case 'idle':
    default: {
      // 空闲状态：根据用户数据决定可用 tool
      const tools: ToolDef[] = [navigateTool.definition];
      if (hasHealthData) {
        tools.push(showHealthRiskTool.definition, recommendPackageTool.definition);
      }
      return tools;
    }
  }
}

/**
 * 根据当前上下文返回 tool_choice 建议
 */
export function getToolChoice(context: ToolContext): ToolChoice {
  if (context.currentFlow === 'guided' && context.guidedStep > 0 && context.guidedStep <= 10) {
    // 引导流程中，强制调用 ask_guided_question
    return { type: 'function', function: { name: 'ask_guided_question' } };
  }
  if (context.currentFlow === 'package') {
    // 套餐推荐阶段，强制生成套餐
    return { type: 'function', function: { name: 'recommend_package' } };
  }
  if (context.currentFlow === 'risk') {
    return { type: 'function', function: { name: 'render_health_analysis' } };
  }
  return 'auto';
}
