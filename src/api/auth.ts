import { request } from './request';
import type { AuthResponse, LoginByPhoneParams, LoginByIdCardParams, LoginByCardParams } from '@/types/user';

export function sendSmsCode(phone: string) {
  return request<{ success: boolean }>({
    url: '/auth/sms-code',
    method: 'POST',
    data: { phone },
  });
}

export function loginByPhone(params: LoginByPhoneParams) {
  return request<AuthResponse>({
    url: '/auth/login-phone',
    method: 'POST',
    data: params,
  });
}

export function loginByIdCard(params: LoginByIdCardParams) {
  return request<AuthResponse>({
    url: '/auth/login-idcard',
    method: 'POST',
    data: params,
  });
}

export function loginByCard(params: LoginByCardParams) {
  return request<AuthResponse>({
    url: '/auth/login-card',
    method: 'POST',
    data: params,
  });
}
