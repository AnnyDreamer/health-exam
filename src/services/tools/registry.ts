import type { ToolImpl } from './types';
import { askQuestionTool } from './askQuestion';
import { recommendPackageTool } from './recommendPackage';
import { generateFollowUpTool } from './generateFollowUp';
import { showHealthRiskTool } from './showHealthRisk';
import { renderHealthAnalysisTool } from './renderHealthAnalysis';
import { navigateTool } from './navigate';

/** Tool 注册表 */
const registry = new Map<string, ToolImpl>();

function register(tool: ToolImpl) {
  registry.set(tool.definition.function.name, tool);
}

// 注册所有 Tool
register(askQuestionTool);
register(recommendPackageTool);
register(generateFollowUpTool);
register(showHealthRiskTool);
register(renderHealthAnalysisTool);
register(navigateTool);

export function getTool(name: string): ToolImpl | undefined {
  return registry.get(name);
}

export { registry as toolRegistry };
