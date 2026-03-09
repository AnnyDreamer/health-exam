/**
 * 通义千问 API 服务层
 *
 * 使用千问的 OpenAI 兼容接口，支持：
 * - 普通文本对话（qwen-plus）
 * - 流式响应（SSE）用于打字机效果
 * - 多模态图片解读（qwen-vl-plus）
 */
import type { QwenMessage, QwenResponse } from '@/types/chat';

const QWEN_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

function getApiKey(): string {
  return import.meta.env.VITE_QWEN_API_KEY || '';
}

function getModel(): string {
  return import.meta.env.VITE_QWEN_MODEL || 'qwen-plus';
}

function getVLModel(): string {
  return import.meta.env.VITE_QWEN_VL_MODEL || 'qwen-vl-plus';
}

/** 检查千问 API 是否可用（只要 API Key 已配置即可，与 VITE_USE_MOCK 无关） */
export function isQwenAvailable(): boolean {
  return !!getApiKey();
}

/**
 * 发送非流式请求到千问 API
 */
export async function qwenChat(
  messages: QwenMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: { type: string };
  },
): Promise<QwenResponse> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('VITE_QWEN_API_KEY 未配置');
  }

  const body: Record<string, unknown> = {
    model: options?.model || getModel(),
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 2048,
  };

  if (options?.responseFormat) {
    body.response_format = options.responseFormat;
  }

  const response = await fetch(QWEN_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`千问 API 请求失败 (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<QwenResponse>;
}

/**
 * 发送流式请求到千问 API（SSE）
 *
 * @param messages - 对话消息列表
 * @param onChunk  - 每收到一段文本增量时的回调
 * @param options  - 可选参数
 * @returns 完整的 AI 回复文本
 */
export async function qwenChatStream(
  messages: QwenMessage[],
  onChunk: (chunk: string) => void,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  },
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('VITE_QWEN_API_KEY 未配置');
  }

  const response = await fetch(QWEN_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options?.model || getModel(),
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2048,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`千问 API 请求失败 (${response.status}): ${errorText}`);
  }

  if (!response.body) {
    throw new Error('浏览器不支持 ReadableStream');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let fullText = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // 按行解析 SSE 数据
      const lines = buffer.split('\n');
      // 保留最后一行（可能不完整）
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') continue;

        try {
          const parsed: QwenResponse = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            onChunk(delta);
          }
        } catch {
          // 忽略解析失败的行（可能是不完整的 JSON）
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullText;
}

/**
 * 多模态请求：发送图片 + 文本到千问 VL 模型（流式）
 *
 * @param imageBase64 - 图片的 base64 编码（含 data:image/... 前缀）
 * @param prompt      - 文字提示
 * @param onChunk     - 流式回调
 * @returns 完整的 AI 回复文本
 */
export async function qwenVisionStream(
  imageBase64: string,
  prompt: string,
  onChunk: (chunk: string) => void,
): Promise<string> {
  const messages: QwenMessage[] = [
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: imageBase64 },
        },
        {
          type: 'text',
          text: prompt,
        },
      ],
    },
  ];

  return qwenChatStream(messages, onChunk, {
    model: getVLModel(),
    maxTokens: 4096,
  });
}

/**
 * 多模态请求：发送 PDF 文件到千问 VL 模型（流式）
 *
 * 千问 VL 模型支持直接传入 PDF 文件进行文档理解
 *
 * @param fileBase64 - PDF 文件的 base64 编码（含 data:application/pdf;base64,... 前缀）
 * @param prompt     - 文字提示
 * @param onChunk    - 流式回调
 * @returns 完整的 AI 回复文本
 */
export async function qwenDocStream(
  fileBase64: string,
  prompt: string,
  onChunk: (chunk: string) => void,
): Promise<string> {
  const messages: QwenMessage[] = [
    {
      role: 'user',
      content: [
        {
          type: 'file',
          file_url: { url: fileBase64 },
        },
        {
          type: 'text',
          text: prompt,
        },
      ],
    },
  ];

  return qwenChatStream(messages, onChunk, {
    model: getVLModel(),
    maxTokens: 4096,
  });
}
