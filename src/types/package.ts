export interface CheckItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category?: 'standard' | 'ai-addon';
  aiReason?: string;
}

export interface ExamPackage {
  id: string;
  name: string;
  description: string;
  items: CheckItem[];
  totalPrice: number;
  originalPrice?: number;
  discount?: number;
  badge?: string;
  isGroupPackage?: boolean;
  notice?: string[];
}
