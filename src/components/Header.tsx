import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface HistoryHeaderProps {
  fadeAnim: Animated.Value;
  translateY: Animated.Value;
  selectedMonth: number;
  selectedYear: number;
  selectedDates: string[];
  isMultiSelectMode: boolean;
  balance: number;
  totalIncome: number;
  totalExpense: number;
  showCalendar: boolean;
  onToggleCalendar: () => void;
}

const HistoryHeader: React.FC<HistoryHeaderProps> = ({
  fadeAnim,
  translateY,
  selectedMonth,
  selectedYear,
  selectedDates,
  isMultiSelectMode,
  balance,
  totalIncome,
  totalExpense,
  showCalendar,
  onToggleCalendar,
}) => {
  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  const formatSelectedDatesText = () => {
    if (selectedDates.length === 0) return "Chưa chọn ngày nào";
    if (selectedDates.length === 1) {
      const date = new Date(selectedDates[0]);
      return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    }
    
    const sortedDates = [...selectedDates].sort();
    const firstDate = new Date(sortedDates[0]);
    const lastDate = new Date(sortedDates[sortedDates.length - 1]);
    
    return `${selectedDates.length} ngày (${firstDate.getDate()}/${firstDate.getMonth() + 1} - ${lastDate.getDate()}/${lastDate.getMonth() + 1})`;
  };

  return (
    <Animated.View
      style={[
        styles.header,
        {
          opacity: fadeAnim,
          transform: [{ translateY: translateY }],
        },
      ]}
    >
      <View style={styles.headerContent}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Lịch sử giao dịch</Text>
          <TouchableOpacity
            style={styles.calendarToggle}
            onPress={onToggleCalendar}
          >
            <Text style={styles.periodText}>
              {isMultiSelectMode ? formatSelectedDatesText() : `${monthNames[selectedMonth]} ${selectedYear}`}
            </Text>
            <Ionicons
              name={showCalendar ? "chevron-up" : "chevron-down"}
              size={18}
              color="#065f46"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryItem, styles.incomeItem]}>
              <View style={styles.summaryIconContainer}>
                <Ionicons name="trending-up" size={18} color="#10b981" />
              </View>
              <View>
                <Text style={styles.summaryLabel}>Thu nhập</Text>
                <Text style={[styles.summaryValue, { color: '#10b981' }]}>
                  +{totalIncome.toLocaleString()} đ
                </Text>
              </View>
            </View>

            <View style={[styles.summaryItem, styles.expenseItem]}>
              <View style={styles.summaryIconContainer}>
                <Ionicons name="trending-down" size={18} color="#ef4444" />
              </View>
              <View>
                <Text style={styles.summaryLabel}>Chi tiêu</Text>
                <Text style={[styles.summaryValue, { color: '#ef4444' }]}>
                  -{totalExpense.toLocaleString()} đ
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.balanceContainer}>
            <View style={styles.balanceItem}>
              <View style={styles.balanceIconContainer}>
                <Ionicons
                  name={balance >= 0 ? "wallet" : "warning"}
                  size={20}
                  color={balance >= 0 ? "#065f46" : "#f59e0b"}
                />
              </View>
              <View>
                <Text style={styles.balanceLabel}>Số dư</Text>
                <Text
                  style={[
                    styles.balanceValue,
                    { color: balance >= 0 ? '#065f46' : '#f59e0b' },
                  ]}
                >
                  {balance >= 0 ? '+' : ''}{balance.toLocaleString()} đ
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  headerContent: {
    width: '100%',
  },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#065f46',
  },
  calendarToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e2f8ea',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  periodText: {
    color: '#065f46',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  summaryContainer: {
    backgroundColor: '#f8fffe',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2f8ea',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  incomeItem: {
    backgroundColor: '#f0fdf4',
  },
  expenseItem: {
    backgroundColor: '#fef2f2',
  },
  summaryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  balanceContainer: {
    alignItems: 'center',
  },
  balanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#bbf7d0',
  },
  balanceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 2,
  },
});

export default HistoryHeader;