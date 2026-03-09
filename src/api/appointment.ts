import { request } from './request';
import type { Appointment } from '@/types/appointment';

export function getAppointmentList() {
  return request<Appointment[]>({
    url: '/appointment/list',
    method: 'GET',
  });
}

export function getAppointmentDetail(id: string) {
  return request<Appointment>({
    url: `/appointment/detail/${id}`,
    method: 'GET',
  });
}

export function createAppointment(data: { packageId: string; date: string; time: string }) {
  return request<Appointment>({
    url: '/appointment/create',
    method: 'POST',
    data,
  });
}

export function cancelAppointment(id: string) {
  return request<{ success: boolean }>({
    url: `/appointment/cancel/${id}`,
    method: 'POST',
  });
}
