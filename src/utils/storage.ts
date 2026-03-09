const TOKEN_KEY = 'health_exam_token';
const USER_KEY = 'health_exam_user';
const GROUP_PKG_CONFIRMED_KEY = 'health_exam_group_pkg_confirmed';

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

export function clearAll(): void {
  removeToken();
  removeUser();
  removeGroupPackageConfirmed();
}
