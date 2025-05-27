import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Header = ({ 
  fadeAnim, 
  translateY, 
  selectedMonth, 
  selectedYear, 
  balance, 
  totalIncome, 
  totalExpense, 
  showCalendar, 
  onToggleCalendar 
}) => {
  const getMonthName = (month) => {
    const monthNames = [
      'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
      'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ];
    return monthNames[month];
  };

  return (
    <>
      {/* Main Header */}
      <Animated.View 
        style={[
          styles.header,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: translateY }]
          }
        ]}
      >
        <Text style={styles.headerTitle}>Lịch sử chi tiêu</Text>
      </Animated.View>

      {/* Summary Card Header */}
      <Animated.View style={[
        styles.headerContainer, 
        { 
          opacity: fadeAnim,
          transform: [{ translateY: translateY }]
        }
      ]}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View>
              <Text style={styles.monthText}>
                {getMonthName(selectedMonth)} / {selectedYear}
              </Text>
              <Text style={styles.balanceLabel}>Số dư cuối tháng</Text>
            </View>
            <TouchableOpacity 
              style={styles.calendarButton}
              onPress={onToggleCalendar}
            >
              <Ionicons name="calendar" size={18} color="#065f46" />
              <Text style={styles.calendarButtonText}>
                {showCalendar ? "Ẩn lịch" : "Xem lịch"}
              </Text>
            </TouchableOpacity>
          </View>
          
          <Text style={[
            styles.balanceText,
            { color: balance >= 0 ? '#10b981' : '#ef4444' }
          ]}>
            {balance >= 0 ? '+' : ''}{balance.toLocaleString()} đ
          </Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <View style={styles.statIconContainer}>
                <Ionicons name="arrow-down-circle" size={20} color="#10b981" />
              </View>
              <View>
                <Text style={styles.statLabel}>Thu nhập</Text>
                <Text style={styles.income}>+{totalIncome.toLocaleString()} đ</Text>
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <View style={styles.statIconContainer}>
                <Ionicons name="arrow-up-circle" size={20} color="#ef4444" />
              </View>
              <View>
                <Text style={styles.statLabel}>Chi tiêu</Text>
                <Text style={styles.expense}>-{totalExpense.toLocaleString()} đ</Text>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(203, 213, 225, 0.3)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#065f46',
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 16,
  },
  summaryCard: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  monthText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#065f46',
    marginBottom: 4,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e2f8ea',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  calendarButtonText: {
    color: '#065f46',
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '500',
  },
  balanceText: {
    fontSize: 30,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
  },
  statBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#cbd5e1',
    marginHorizontal: 10,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  income: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
  },
  expense: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ef4444',
  },
});

export default Header;