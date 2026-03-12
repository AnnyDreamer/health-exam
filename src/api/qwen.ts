/**
 * 通义千问 API 服务层
 *
 * 使用千问的 OpenAI 兼容接口，支持：
 * - 普通文本对话（qwen-plus）
 * - 流式响应（SSE）用于打字机效果
 * - 多模态图片解读（qwen-vl-plus）
 */
import type { QwenMessage, QwenResponse, ToolDef, ToolCall } from '@/types/chat';

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

/** tool_choice 类型 */
export type ToolChoice = 'auto' | 'none' | { type: 'function'; function: { name: string } };

/**
 * 发送非流式请求到千问 API
 */
export async function qwenChat(
  messages: (QwenMessage | { role: 'tool'; tool_call_id: string; content: string } | { role: 'assistant'; content: string | null; tool_calls: ToolCall[] })[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: { type: string };
    tools?: ToolDef[];
    tool_choice?: ToolChoice;
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

  if (options?.tools?.length) {
    body.tools = options.tools;
    if (options.tool_choice) {
      body.tool_choice = options.tool_choice;
    }
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

/** 流式请求的返回结果 */
export interface StreamResult {
  text: string;
  toolCalls: ToolCall[];
}

/**
 * 发送流式请求到千问 API（SSE）
 *
 * @param messages - 对话消息列表
 * @param onChunk  - 每收到一段文本增量时的回调
 * @param options  - 可选参数
 * @returns 完整的 AI 回复文本和 tool_calls
 */
export async function qwenChatStream(
  messages: (QwenMessage | { role: 'tool'; tool_call_id: string; content: string } | { role: 'assistant'; content: string | null; tool_calls: ToolCall[] })[],
  onChunk: (chunk: string) => void,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    tools?: ToolDef[];
    tool_choice?: ToolChoice;
  },
): Promise<StreamResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('VITE_QWEN_API_KEY 未配置');
  }

  const body: Record<string, unknown> = {
    model: options?.model || getModel(),
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 2048,
    stream: true,
  };

  if (options?.tools?.length) {
    body.tools = options.tools;
    if (options.tool_choice) {
      body.tool_choice = options.tool_choice;
    }
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

  if (!response.body) {
    throw new Error('浏览器不支持 ReadableStream');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let fullText = '';
  let buffer = '';

  // 累积 tool_calls（arguments 是分块拼接的）
  const toolCallsMap = new Map<number, { id: string; name: string; arguments: string }>();

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
          const choice = parsed.choices?.[0];
          if (!choice?.delta) continue;

          // 处理文本内容
          const textDelta = choice.delta.content;
          if (textDelta) {
            fullText += textDelta;
            onChunk(textDelta);
          }

          // 处理 tool_calls 增量
          const deltaToolCalls = choice.delta.tool_calls;
          if (deltaToolCalls) {
            for (const tc of deltaToolCalls) {
              const idx = tc.index ?? 0;
              if (!toolCallsMap.has(idx)) {
                toolCallsMap.set(idx, {
                  id: tc.id || '',
                  name: tc.function?.name || '',
                  arguments: tc.function?.arguments || '',
                });
              } else {
                const existing = toolCallsMap.get(idx)!;
                if (tc.id) existing.id = tc.id;
                if (tc.function?.name) existing.name = tc.function.name;
                if (tc.function?.arguments) existing.arguments += tc.function.arguments;
              }
            }
          }
        } catch {
          // 忽略解析失败的行（可能是不完整的 JSON）
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // 组装最终的 tool_calls
  const toolCalls: ToolCall[] = [];
  for (const [, tc] of toolCallsMap) {
    if (tc.id && tc.name) {
      toolCalls.push({
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: tc.arguments },
      });
    }
  }

  return { text: fullText, toolCalls };
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

  const result = await qwenChatStream(messages, onChunk, {
    model: getVLModel(),
    maxTokens: 4096,
  });
  return result.text;
}

const QWEN_FILES_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/files';

/**
 * 上传文件到千问文件接口，获取 file_id
 *
 * @param base64Data - 文件的 base64 编码（含 data:xxx;base64,... 前缀）
 * @param fileName   - 文件名
 * @returns file_id
 */
async function uploadFileToQwen(base64Data: string, fileName: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('VITE_QWEN_API_KEY 未配置');

  // base64 转 Blob
  const parts = base64Data.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
  const byteString = atob(parts[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: mime });

  const formData = new FormData();
  formData.append('file', blob, fileName);
  formData.append('purpose', 'file-extract');

  const response = await fetch(QWEN_FILES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`文件上传失败 (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  return result.id; // file-xxx
}

/**
 * 多模态请求：发送 PDF 文件到千问 VL 模型（流式）
 *
 * 流程：先通过千问文件接口上传 PDF，获取 file_id，再在对话中引用
 *
 * @param fileBase64 - PDF 文件的 base64 编码（含 data:application/pdf;base64,... 前缀）
 * @param prompt     - 文字提示
 * @param onChunk    - 流式回调
 * @param fileName   - 文件名（可选）
 * @returns 完整的 AI 回复文本
 */
export async function qwenDocStream(
  fileBase64: string,
  prompt: string,
  onChunk: (chunk: string) => void,
  fileName?: string,
): Promise<string> {
  // 1. 上传文件获取 file_id
  const fileId = await uploadFileToQwen(fileBase64, fileName || 'report.pdf');

  // 2. qwen-long 模型通过 system message 字符串引用文件
  const messages: QwenMessage[] = [
    {
      role: 'system',
      content: `fileid://${fileId}`,
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  const result = await qwenChatStream(messages, onChunk, {
    model: 'qwen-long',
    maxTokens: 4096,
  });
  return result.text;
}
