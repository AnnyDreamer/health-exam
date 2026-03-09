export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
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
}
