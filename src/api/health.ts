import { request } from './request';
import type { HealthData, HealthReport, HealthProfile } from '@/types/health';

export function getHealthData() {
  return request<HealthData>({
    url: '/health/data',
    method: 'GET',
  });
}

export function getHealthReport(id: string) {
  return request<HealthReport>({
    url: `/health/report/${id}`,
    method: 'GET',
  });
}

/** 获取当前用户的健康档案（就医记录 + 体检记录 + 风险评估） */
export function getHealthProfile() {
  return request<HealthProfile>({
    url: '/health/profile',
    method: 'GET',
  });
}
