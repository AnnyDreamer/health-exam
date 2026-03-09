import { getToken } from '@/utils/storage';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  header?: Record<string, string>;
}

interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
}

let mockHandlers: Record<string, (data?: any) => any> = {};

export function registerMock(url: string, handler: (data?: any) => any) {
  mockHandlers[url] = handler;
}

function findMockHandler(key: string): { handler: (data?: any, url?: string) => any; url: string } | null {
  // 精确匹配
  if (mockHandlers[key]) return { handler: mockHandlers[key], url: key };
  // 前缀匹配（从长到短），支持 /appointment/detail/:id 风格
  const parts = key.split('/');
  for (let i = parts.length - 1; i >= 1; i--) {
    const prefix = parts.slice(0, i).join('/');
    if (mockHandlers[prefix]) return { handler: mockHandlers[prefix], url: key };
  }
  return null;
}

function handleMock<T>(options: RequestOptions): Promise<ApiResponse<T>> {
  const key = options.url.replace(BASE_URL, '');
  const match = findMockHandler(key);
  if (match) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ code: 0, data: match.handler(options.data, key), message: 'ok' });
      }, 300 + Math.random() * 500);
    });
  }
  return Promise.reject(new Error(`No mock handler for ${options.url}`));
}

export function request<T = any>(options: RequestOptions): Promise<T> {
  const token = getToken();
  const url = options.url.startsWith('http') ? options.url : `${BASE_URL}${options.url}`;

  if (USE_MOCK) {
    return handleMock<T>({ ...options, url }).then((res) => {
      if (res.code === 0) return res.data;
      throw new Error(res.message);
    });
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.header,
      },
      success: (res: any) => {
        const data = res.data as ApiResponse<T>;
        if (data.code === 0) {
          resolve(data.data);
        } else if (data.code === 401) {
          uni.redirectTo({ url: '/pages/auth/login' });
          reject(new Error('未授权'));
        } else {
          reject(new Error(data.message || '请求失败'));
        }
      },
      fail: (err: any) => {
        reject(new Error(err.errMsg || '网络错误'));
      },
    });
  });
}
