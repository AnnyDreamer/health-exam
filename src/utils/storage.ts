const TOKEN_KEY = 'health_exam_token';
const USER_KEY = 'health_exam_user';
const GROUP_PKG_CONFIRMED_KEY = 'health_exam_group_pkg_confirmed';
const DATA_AUTH_KEY = 'health_exam_data_auth';

export function getToken(): string {
  return uni.getStorageSync(TOKEN_KEY) || '';
}

export function setToken(token: string): void {
  uni.setStorageSync(TOKEN_KEY, token);
}

export function removeToken(): void {
  uni.removeStorageSync(TOKEN_KEY);
}

export function getUser<T>(): T | null {
  const data = uni.getStorageSync(USER_KEY);
  return data ? JSON.parse(data) : null;
}

export function setUser(user: object): void {
  uni.setStorageSync(USER_KEY, JSON.stringify(user));
}

export function removeUser(): void {
  uni.removeStorageSync(USER_KEY);
}

export function getGroupPackageConfirmed(): boolean {
  return uni.getStorageSync(GROUP_PKG_CONFIRMED_KEY) === 'true';
}

export function setGroupPackageConfirmed(confirmed: boolean): void {
  uni.setStorageSync(GROUP_PKG_CONFIRMED_KEY, confirmed ? 'true' : '');
}

export function removeGroupPackageConfirmed(): void {
  uni.removeStorageSync(GROUP_PKG_CONFIRMED_KEY);
}

export interface DataAuthRecord {
  authorized: boolean;
  timestamp: number;
}

export function getDataAuth(userId: string): DataAuthRecord | null {
  const data = uni.getStorageSync(`${DATA_AUTH_KEY}_${userId}`);
  return data ? JSON.parse(data) : null;
}

export function setDataAuth(userId: string, record: DataAuthRecord): void {
  uni.setStorageSync(`${DATA_AUTH_KEY}_${userId}`, JSON.stringify(record));
}

export function removeDataAuth(userId: string): void {
  uni.removeStorageSync(`${DATA_AUTH_KEY}_${userId}`);
}

export function clearAll(): void {
  removeToken();
  removeUser();
  removeGroupPackageConfirmed();
}
