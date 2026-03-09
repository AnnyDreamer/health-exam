import { registerMock } from '@/api/request';
import type { AuthResponse } from '@/types/user';

/**
 * 测试账号 1：个检 - 有健康数据
 * 姓名：陈雨萱 | 身份证：320106199203154028
 */
const userWithData: AuthResponse = {
  token: 'mock-token-chen-yuxuan',
  user: {
    id: 'user-001',
    name: '陈雨萱',
    phone: '13812345678',
    idCard: '320106199203154028',
    gender: 'female',
    age: 34,
    hasGroupPackage: false,
    hasPendingPackage: false,
  },
};

/**
 * 测试账号 2：个检 - 无健康数据
 * 姓名：林浩然 | 身份证：440305199508221015
 */
const userNoData: AuthResponse = {
  token: 'mock-token-lin-haoran',
  user: {
    id: 'user-002',
    name: '林浩然',
    phone: '13698765432',
    idCard: '440305199508221015',
    gender: 'male',
    age: 31,
    hasGroupPackage: false,
    hasPendingPackage: false,
  },
};

/**
 * 测试账号 3：团检
 * 姓名：王思琪 | 身份证：110108198711063521
 */
const userGroup: AuthResponse = {
  token: 'mock-token-wang-siqi',
  user: {
    id: 'user-003',
    name: '王思琪',
    phone: '13567890123',
    idCard: '110108198711063521',
    gender: 'female',
    age: 39,
    hasGroupPackage: true,
    hasPendingPackage: false,
    companyName: '杭州科技有限公司',
  },
};

/** 根据身份证号匹配用户 */
function findUserByIdCard(idCard: string): AuthResponse | null {
  if (idCard === userWithData.user.idCard) return userWithData;
  if (idCard === userNoData.user.idCard) return userNoData;
  if (idCard === userGroup.user.idCard) return userGroup;
  return null;
}

/** 根据手机号匹配用户 */
function findUserByPhone(phone: string): AuthResponse | null {
  if (phone === userWithData.user.phone) return userWithData;
  if (phone === userNoData.user.phone) return userNoData;
  if (phone === userGroup.user.phone) return userGroup;
  return null;
}

export function setupAuthMock() {
  registerMock('/auth/sms-code', () => ({ success: true }));

  registerMock('/auth/login-phone', (data: any) => {
    const match = findUserByPhone(data?.phone);
    return match || userWithData; // 默认返回有数据的用户
  });

  registerMock('/auth/login-idcard', (data: any) => {
    const match = findUserByIdCard(data?.idCard);
    return match || userWithData;
  });

  registerMock('/auth/login-card', () => userWithData);
}

/** 导出用户 ID 常量，供其他 mock 模块使用 */
export const MOCK_USER_IDS = {
  WITH_DATA: 'user-001',
  NO_DATA: 'user-002',
  GROUP: 'user-003',
};
