import type { ToolImpl, ToolResult } from './types';

export const showHealthRiskTool: ToolImpl = {
  definition: {
    type: 'function',
    function: {
      name: 'show_health_risk',
      description: '展示用户的健康风险分析结果',
      parameters: {
        type: 'object',
        properties: {
          summary: {
            type: 'string',
            description: '风险总结，markdown 格式，简明扼要',
          },
        },
        required: ['summary'],
      },
    },
  },

  async execute(args): Promise<ToolResult> {
    const { summary } = args as { summary: string };

    return {
      display: 'text',
      data: { summary },
      aiResponse: '已展示健康风险分析',
    };
  },
};
