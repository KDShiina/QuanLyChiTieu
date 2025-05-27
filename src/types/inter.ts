import { ReactNode } from "react";

export default interface Expense {
  note: ReactNode;
  description: string;
  id: string;
  reason: string;
  amount: number;
  date: string; // ISO date string
  timestamp: Date; // nếu bạn dùng Firebase Timestamp thì nên để là `firebase.firestore.Timestamp`
  category: {
    name: string;
    icon?: string;
    color?: string;
  } | string; // tùy bạn lưu object hay chỉ lưu tên category
  categoryColor?: string; // nếu đã có category.color thì cái này có thể bỏ
  type: 'income' | 'expense';
  userId: string;
  location?: string; // ví dụ: '10.1234,106.5678'
  address?: string;  // ví dụ: '123 Đường ABC, Quận 1'
  account?: string; // tài khoản thanh toán
}

// ============================================================================
// HOME SCREEN INTERFACES
// ============================================================================

export interface CategoryTotal {
  name: string;
  amount: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
  percentage: string;
}

export interface FinancialSummaryProps {
  balance: number;
  totalIncome: number;
  totalExpense: number;
  selectedMode: 'month' | 'week';
  selectedYear: number;
  selectedMonth?: number;
  dateDisplay: string;
  animatedStyle: any;
}

export interface ModeSelectorProps {
  selectedMode: 'month' | 'week';
  setSelectedMode: (mode: 'month' | 'week') => void;
  selectedDate: Date;
  setShowDatePicker: (show: boolean) => void;
  dateDisplay: string;
}

export interface ChartComponentProps {
  pieData: CategoryTotal[];
  animatedStyle: any;
}

export interface CategoryListProps {
  pieData: CategoryTotal[];
  totalExpense: number;
  animatedStyle: any;
}

// ============================================================================
// CHART CONFIGURATION TYPE
// ============================================================================

export interface ChartConfig {
  backgroundGradientFrom: string;
  backgroundGradientTo: string;
  color: (opacity?: number) => string;
  labelColor: (opacity?: number) => string;
  strokeWidth: number;
  useShadowColorFromDataset: boolean;
  decimalPlaces: number;
}

// ============================================================================
// DATE RANGE TYPE
// ============================================================================

export interface WeekRange {
  start: Date;
  end: Date;
}

// ============================================================================
// CATEGORY TOTALS TYPE FOR CALCULATIONS
// ============================================================================

export interface CategoryTotalCalculation {
  total: number;
  color: string;
}

export interface WalletAccount {
  id: string;
  userId: string;
  name: string;
  type: string;
  subType: string;
  accountNumber: string;
}