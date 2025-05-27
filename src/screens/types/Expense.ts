export default interface Expense {
  note: string | { name: string; icon?: string; color?: string; };
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
