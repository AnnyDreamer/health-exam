export interface UserInfo {
  id: string;
  name: string;
  phone: string;
  idCard?: string;
  avatar?: string;
  gender?: 'male' | 'female';
  age?: number;
  hasGroupPackage?: boolean;
  hasPendingPackage?: boolean;
  companyName?: string;
}

export interface LoginByPhoneParams {
  phone: string;
  code: string;
}

export interface LoginByIdCardParams {
  idCard: string;
  name: string;
}

export interface LoginByCardParams {
  cardNo: string;
}

export interface AuthResponse {
  token: string;
  user: UserInfo;
}
