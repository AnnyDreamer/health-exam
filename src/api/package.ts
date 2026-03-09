import { request } from './request';
import type { ExamPackage } from '@/types/package';

export function getPackageList() {
  return request<ExamPackage[]>({
    url: '/package/list',
    method: 'GET',
  });
}

export function getPackageDetail(id: string) {
  return request<ExamPackage>({
    url: `/package/detail/${id}`,
    method: 'GET',
  });
}

export function getAIRecommendPackage(budget: string) {
  return request<ExamPackage>({
    url: '/package/ai-recommend',
    method: 'POST',
    data: { budget },
  });
}

export function getGroupPackage() {
  return request<ExamPackage>({
    url: '/package/group',
    method: 'GET',
  });
}
