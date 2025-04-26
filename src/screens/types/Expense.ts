export interface Expense {
  category: any;
  id: string;
  reason: string; // Lý do chi tiêu
  amount: number;
  date: string; // ISO date string
  categoryColor?: string; // Màu sắc của danh mục (tùy chọn)
}
