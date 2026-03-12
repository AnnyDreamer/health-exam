import type { ToolImpl, ToolResult } from './types';

export const recommendPackageTool: ToolImpl = {
  definition: {
    type: 'function',
    function: {
      name: 'recommend_package',
      description: '根据用户画像和健康数据推荐个性化体检套餐',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '套餐名称' },
          reason: { type: 'string', description: '推荐理由，markdown 格式' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                price: { type: 'number' },
                reason: { type: 'string' },
              },
              required: ['name', 'price'],
            },
            description: '体检项目列表，5-10项',
          },
          totalPrice: { type: 'number', description: '套餐总价' },
          originalPrice: { type: 'number', description: '原价' },
        },
        required: ['name', 'items', 'totalPrice'],
      },
    },
  },

  async execute(args): Promise<ToolResult> {
    const { name, reason, items, totalPrice, originalPrice } = args as {
      name: string;
      reason?: string;
      items: Array<{ name: string; price: number; reason?: string }>;
      totalPrice: number;
      originalPrice?: number;
    };

    // 校验数据完整性
    if (!name || !Array.isArray(items) || items.length === 0 || typeof totalPrice !== 'number') {
      return {
        display: 'text',
        data: { error: '套餐数据不完整' },
        aiResponse: '套餐数据不完整，请重新生成',
      };
    }

    const packageId = `pkg-ai-${Date.now()}`;

    return {
      display: 'package-card',
      data: {
        id: packageId,
        name,
        badge: 'AI定制',
        items,
        totalPrice,
        originalPrice,
        reason,
      },
      stateUpdate: { currentFlow: 'idle' },
      aiResponse: `已生成套餐「${name}」，共${items.length}项，总价${totalPrice}元`,
    };
  },
};
