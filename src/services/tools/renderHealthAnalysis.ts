import type { ToolImpl, ToolResult } from './types';
import type { RiskItem, FollowUpItem } from '@/types/chat';

export const renderHealthAnalysisTool: ToolImpl = {
  definition: {
    type: 'function',
    function: {
      name: 'render_health_analysis',
      description: '渲染完整的健康风险分析卡片，包括风险项、饮食/运动/复查建议。在分析用户健康数据后调用此工具，不要输出普通文本，所有分析结果通过此工具返回。',
      parameters: {
        type: 'object',
        properties: {
          summary: {
            type: 'string',
            description: '2-3句话的健康总结摘要，使用 **加粗** 标记关键异常指标',
          },
          risks: {
            type: 'array',
            description: '风险项列表，每项一个风险类别',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: '风险类别，如"血压偏高"' },
                level: { type: 'string', enum: ['low', 'medium', 'high'], description: '风险等级' },
                indicators: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '该类别下的异常指标值，如"收缩压 128 mmHg ↑"',
                },
                brief: { type: 'string', description: '一句话风险说明，不超过25字' },
              },
              required: ['name', 'level', 'indicators', 'brief'],
            },
          },
          recommendations: {
            type: 'object',
            description: '健康建议',
            properties: {
              diet: { type: 'string', description: '饮食建议，3-4条用\\n分隔，• 开头，每条格式：做什么——原因' },
              exercise: { type: 'string', description: '运动建议，3-4条，格式同上' },
              medical: { type: 'string', description: '复查就医建议，2-3条，格式：时间+科室——原因' },
            },
          },
          followUpItems: {
            type: 'array',
            description: '需要复查/就诊的项目列表',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                reason: { type: 'string', description: '简短原因，一句话' },
                suggestedTime: { type: 'string' },
                department: { type: 'string' },
                type: { type: 'string', enum: ['lifestyle', 'recheck', 'outpatient'] },
                doctor: { type: 'string', description: '推荐医生姓名+职称' },
                registrationFee: { type: 'number' },
                feeType: { type: 'string', enum: ['普通号', '专家号', '特需号'] },
              },
              required: ['name', 'reason', 'suggestedTime', 'department'],
            },
          },
          urgencyLevel: {
            type: 'string',
            enum: ['normal', 'soon', 'urgent'],
            description: '紧急程度：urgent=需就医，soon=≥3项异常，normal=轻微',
          },
          generalAdvice: { type: 'string', description: '总体健康管理建议，1-2句话' },
        },
        required: ['summary', 'risks', 'recommendations', 'urgencyLevel', 'generalAdvice'],
      },
    },
  },

  async execute(args): Promise<ToolResult> {
    const {
      summary,
      risks,
      recommendations,
      followUpItems,
      urgencyLevel,
      generalAdvice,
    } = args as {
      summary: string;
      risks: Array<{ name: string; level: string; indicators: string[]; brief: string }>;
      recommendations: { diet?: string; exercise?: string; medical?: string };
      followUpItems?: Array<{
        name: string; reason: string; suggestedTime: string; department: string;
        type?: string; doctor?: string; registrationFee?: number; feeType?: string;
      }>;
      urgencyLevel: string;
      generalAdvice: string;
    };

    // 规范化 riskItems
    const riskItems: RiskItem[] = (risks || []).map((r) => ({
      category: r.name,
      level: (['low', 'medium', 'high'].includes(r.level) ? r.level : 'medium') as RiskItem['level'],
      indicators: Array.isArray(r.indicators) ? r.indicators : [],
      brief: r.brief || '',
    }));

    // 规范化 followUpItems
    const items: FollowUpItem[] = (followUpItems || []).map((item) => {
      const type = (item.type || 'recheck') as FollowUpItem['type'];
      const defaultFee = type === 'lifestyle' ? 0 : type === 'outpatient' ? 50 : 25;
      return {
        name: item.name,
        reason: item.reason,
        suggestedTime: item.suggestedTime,
        department: item.department,
        type,
        doctor: item.doctor,
        registrationFee: typeof item.registrationFee === 'number' ? item.registrationFee : defaultFee,
        feeType: (item.feeType || (type === 'outpatient' ? '专家号' : '普通号')) as FollowUpItem['feeType'],
      };
    });

    const needFollowUp = items.length > 0;
    const validUrgency = (['normal', 'soon', 'urgent'].includes(urgencyLevel) ? urgencyLevel : 'normal') as 'normal' | 'soon' | 'urgent';

    return {
      display: 'follow-up-plan',
      data: {
        needFollowUp,
        urgencyLevel: validUrgency,
        followUpItems: items,
        generalAdvice: generalAdvice || '',
        dietAdvice: recommendations?.diet,
        exerciseAdvice: recommendations?.exercise,
        medicalAdvice: recommendations?.medical,
        riskItems,
        // 额外携带 summary 供 orchestrator 使用
        _summary: summary,
      },
      stateUpdate: { currentFlow: 'idle' },
      aiResponse: `已生成健康风险分析，发现${riskItems.length}项风险，${items.length}项需复查`,
    };
  },
};
