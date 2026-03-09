import { request } from './request';
import type { ReportRecord } from '@/types/report';

export function getReportList() {
  return request<ReportRecord[]>({
    url: '/report/list',
    method: 'GET',
  });
}

export function getReportDetail(id: string) {
  return request<ReportRecord>({
    url: `/report/detail/${id}`,
    method: 'GET',
  });
}
