export const COLORS = {
  primary: '#22c55e',        // Màu xanh lá chính
  primaryDark: '#16a34a',    // Màu xanh lá đậm hơn
  primaryLight: '#86efac',   // Màu xanh lá nhạt
  secondary: '#3b82f6',      // Màu xanh dương
  
  success: '#10b981',        // Màu xanh lục
  warning: '#f59e0b',        // Màu vàng cam
  danger: '#ef4444',         // Màu đỏ
  info: '#06b6d4',           // Màu xanh dương nhạt
  
  background: '#f8fafc',     // Màu nền chính (trắng xám nhẹ)
  card: '#ffffff',           // Màu nền thẻ
  
  text: '#1e293b',           // Màu văn bản chính
  textSecondary: '#64748b',  // Màu văn bản phụ
  textLight: '#94a3b8',      // Màu văn bản nhạt
  
  border: '#e2e8f0',         // Màu viền
  input: '#f1f5f9',          // Màu nền input
  
  white: '#ffffff',          // Màu trắng
  black: '#0f172a',          // Màu đen
  gray: '#cbd5e1',           // Màu xám
  darkGray: '#475569',       // Màu xám đậm
  
  green: '#22c55e',          // Màu xanh lá (cho khoản thu)
  red: '#ef4444',            // Màu đỏ (cho khoản chi)
  
  transparent: 'transparent', // Màu trong suốt
};

export const SIZES = {
  // Kích thước chữ
  xxxs: 10,
  xxs: 12,
  xs: 14,
  sm: 16,
  md: 18,
  lg: 20,
  xl: 24,
  xxl: 30,
  xxxl: 36,
  
  // Kích thước padding
  padding: 16,
  paddingSmall: 10,
  paddingLarge: 24,
  
  // Kích thước border radius
  radiusSmall: 4,
  radius: 8,
  radiusLarge: 12,
  radiusXL: 20,
  radiusRound: 50,
  
  // Kích thước chiều rộng tối đa
  maxWidth: 450,
};

export const FONTS = {
  regular: {
    fontFamily: 'System',
    fontWeight: '400',
  },
  medium: {
    fontFamily: 'System',
    fontWeight: '500',
  },
  semiBold: {
    fontFamily: 'System',
    fontWeight: '600',
  },
  bold: {
    fontFamily: 'System',
    fontWeight: '700',
  },
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
};