import type { ToolImpl, ToolResult } from './types';

export const generateFollowUpTool: ToolImpl = {
  definition: {
    type: 'function',
    function: {
      name: 'generate_followup_plan',
      description: '根据体检报告解读生成复查方案',
      parameters: {
        type: 'object',
        properties: {
          needFollowUp: { type: 'boolean', description: '是否需要复查' },
          urgencyLevel: {
            type: 'string',
            enum: ['normal', 'soon', 'urgent'],
            description: '紧急程度',
          },
          followUpItems: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                reason: { type: 'string' },
                suggestedTime: { type: 'string' },
                department: { type: 'string' },
                type: { type: 'string', enum: ['lifestyle', 'recheck', 'outpatient'] },
                doctor: { type: 'string' },
                registrationFee: { type: 'number' },
                feeType: { type: 'string', enum: ['普通号', '专家号', '特需号'] },
              },
              required: ['name', 'reason', 'suggestedTime', 'department'],
            },
          },
          generalAdvice: { type: 'string', description: '总体健康管理建议' },
        },
        required: ['needFollowUp', 'urgencyLevel', 'followUpItems', 'generalAdvice'],
      },
    },
  },

  async execute(args): Promise<ToolResult> {
    const { needFollowUp, urgencyLevel, followUpItems, generalAdvice } = args as {
      needFollowUp: boolean;
      urgencyLevel: 'normal' | 'soon' | 'urgent';
      followUpItems: Array<{
        name: string;
        reason: string;
        suggestedTime: string;
        department: string;
        type?: 'lifestyle' | 'recheck' | 'outpatient';
        doctor?: string;
        registrationFee?: number;
        feeType?: '普通号' | '专家号' | '特需号';
      }>;
      generalAdvice: string;
    };

    // 规范化 followUpItems
    const items = (followUpItems || []).map((item) => {
      const type = item.type || 'recheck';
      const defaultFee = type === 'lifestyle' ? 0 : type === 'outpatient' ? 50 : 25;
      return {
        ...item,
        type,
        registrationFee: typeof item.registrationFee === 'number' ? item.registrationFee : defaultFee,
        feeType: item.feeType || (type === 'outpatient' ? '专家号' as const : '普通号' as const),
      };
    });

    return {
      display: 'follow-up-plan',
      data: {
        needFollowUp: !!needFollowUp,
        urgencyLevel: ['normal', 'soon', 'urgent'].includes(urgencyLevel) ? urgencyLevel : 'normal',
        followUpItems: items,
        generalAdvice: generalAdvice || '',
      },
      stateUpdate: { currentFlow: 'idle' },
      aiResponse: needFollowUp
        ? `已生成复查方案，共${items.length}项，紧急程度：${urgencyLevel}`
        : '各项指标基本正常，暂无需复查',
    };
  },
};
