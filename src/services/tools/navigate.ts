import type { ToolImpl, ToolResult } from './types';

const PAGE_MAP: Record<string, string> = {
  report: '/pages/report/detail?id=report-001',
  appointment: '/pages/appointment/index',
  'package-list': '/pages/package/list',
};

export const navigateTool: ToolImpl = {
  definition: {
    type: 'function',
    function: {
      name: 'navigate_to',
      description: '导航到指定页面',
      parameters: {
        type: 'object',
        properties: {
          page: {
            type: 'string',
            enum: ['report', 'appointment', 'package-list'],
            description: '目标页面',
          },
        },
        required: ['page'],
      },
    },
  },

  async execute(args): Promise<ToolResult> {
    const { page } = args as { page: string };
    const url = PAGE_MAP[page];

    if (!url) {
      return {
        display: 'none',
        aiResponse: `未知页面: ${page}`,
      };
    }

    return {
      display: 'navigate',
      data: { url },
      aiResponse: `正在导航到${page}页面`,
    };
  },
};
