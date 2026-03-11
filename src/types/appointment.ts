export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

/** 复查预约的项目详情 */
export interface FollowUpDetail {
  name: string;
  department: string;
  doctor: string;
  registrationFee: number;
  feeType: string;
}

export interface Appointment {
  id: string;
  userId?: string;
  packageId: string;
  packageName: string;
  date: string;
  time: string;
  location: string;
  status: AppointmentStatus;
  items: string[];
  totalPrice: number;
  createdAt: string;
  notice?: string[];
  /** 是否为复查预约 */
  isFollowUp?: boolean;
  /** 复查科室列表 */
  departments?: string[];
  /** 挂号费合计 */
  registrationFee?: number;
  /** 复查项目结构化详情 */
  followUpDetails?: FollowUpDetail[];
}
