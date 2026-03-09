import { setupAuthMock } from './auth';
import { setupHealthMock } from './health';
import { setupPackageMock } from './package';
import { setupAppointmentMock } from './appointment';

export function setupMock() {
  setupAuthMock();
  setupHealthMock();
  setupPackageMock();
  setupAppointmentMock();
}
