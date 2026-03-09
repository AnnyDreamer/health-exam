export function navigateTo(url: string): void {
  uni.navigateTo({ url });
}

export function redirectTo(url: string): void {
  uni.redirectTo({ url });
}

export function navigateBack(delta = 1): void {
  uni.navigateBack({ delta });
}

export function switchTab(url: string): void {
  uni.switchTab({ url });
}
