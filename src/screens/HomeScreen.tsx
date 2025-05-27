import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { db, auth } from '../config/firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { PieChart } from 'react-native-chart-kit';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withSpring,
  Easing
} from 'react-native-reanimated';

// Types and Interfaces
import Expense, {
    CategoryTotal,
  FinancialSummaryProps,
  ModeSelectorProps,
  ChartComponentProps,
  CategoryListProps,
  ChartConfig,
  WeekRange,
  CategoryTotalCalculation
} from '../types/inter';
import categoryColors from '../types/categoryColors';

const { width: screenWidth } = Dimensions.get('window');

// ============================================================================
// CONSTANTS
// ============================================================================
const CARD_SHADOW = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  android: {
    elevation: 8,
  },
});

const chartConfig: ChartConfig = {
  backgroundGradientFrom: "#fff",
  backgroundGradientTo: "#fff",
  color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  strokeWidth: 2,
  useShadowColorFromDataset: false,
  decimalPlaces: 0,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const getWeekRange = (date: Date): WeekRange => {
  const day = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
};

const categorySpendingPercent = (amount: number, totalExpense: number): number => {
  return Math.round((amount / totalExpense) * 100);
};

const getMonthName = (month: number): string => {
  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];
  return monthNames[month];
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Header Component
const Header: React.FC = () => (
  <View style={styles.header}>
    <Text style={styles.headerTitle}>Tổng Quan Tài Chính</Text>
  </View>
);

// Mode Selector Component
const ModeSelector: React.FC<ModeSelectorProps> = ({
  selectedMode,
  setSelectedMode,
  setShowDatePicker,
  dateDisplay
}) => (
  <View style={styles.modeSelector}>
    <TouchableOpacity
      style={[styles.modeButton, selectedMode === 'month' && styles.selectedModeButton]}
      onPress={() => setSelectedMode('month')}
    >
      <Text style={[
        styles.modeButtonText, 
        selectedMode === 'month' && styles.selectedModeButtonText
      ]}>Tháng</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.modeButton, selectedMode === 'week' && styles.selectedModeButton]}
      onPress={() => setSelectedMode('week')}
    >
      <Text style={[
        styles.modeButtonText, 
        selectedMode === 'week' && styles.selectedModeButtonText
      ]}>Tuần</Text>
    </TouchableOpacity>
    <View style={styles.datePickerButton}>
      <TouchableOpacity 
        onPress={() => setShowDatePicker(true)}
        style={styles.dateSelector}
      >
        <Ionicons name="calendar-outline" size={20} color="#22c55e" />
        <Text style={styles.selectDateText}>{dateDisplay}</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// Financial Summary Component
const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  balance,
  totalIncome,
  totalExpense,
  selectedMode,
  selectedYear,
  selectedMonth,
  dateDisplay,
  animatedStyle
}) => (
  <Animated.View style={[styles.summaryCard, animatedStyle]}>
    <View style={styles.summaryTopRow}>
      <View>
        <Text style={styles.periodText}>
          {selectedMode === 'month' && selectedMonth !== undefined 
            ? `${getMonthName(selectedMonth)} / ${selectedYear}`
            : dateDisplay
          }
        </Text>
        <Text style={styles.balanceLabel}>
          {selectedMode === 'month' ? 'Số dư cuối tháng' : 'Số dư cuối tuần'}
        </Text>
      </View>
      <View style={styles.balanceBadge}>
        <Ionicons 
          name={balance >= 0 ? "trending-up" : "trending-down"} 
          size={18} 
          color={balance >= 0 ? '#10b981' : '#ef4444'} 
        />
        <Text style={[
          styles.balanceBadgeText,
          { color: balance >= 0 ? '#10b981' : '#ef4444' }
        ]}>
          {balance >= 0 ? 'Dương' : 'Âm'}
        </Text>
      </View>
    </View>
    
    <Text style={[
      styles.balanceAmount,
      { color: balance >= 0 ? '#10b981' : '#ef4444' }
    ]}>
      {balance >= 0 ? '+' : ''}{balance.toLocaleString()} đ
    </Text>
    
    <View style={styles.statsRow}>
      <View style={styles.statBox}>
        <View style={styles.incomeIconContainer}>
          <Ionicons name="arrow-down-circle" size={20} color="#10b981" />
        </View>
        <View>
          <Text style={styles.statLabel}>Thu nhập</Text>
          <Text style={styles.income}>+{totalIncome.toLocaleString()} đ</Text>
        </View>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statBox}>
        <View style={styles.expenseIconContainer}>
          <Ionicons name="arrow-up-circle" size={20} color="#ef4444" />
        </View>
        <View>
          <Text style={styles.statLabel}>Chi tiêu</Text>
          <Text style={styles.expense}>-{totalExpense.toLocaleString()} đ</Text>
        </View>
      </View>
    </View>
  </Animated.View>
);

// Chart Component
const ChartComponent: React.FC<ChartComponentProps> = ({ pieData, animatedStyle }) => (
  <Animated.View style={[styles.chartWrapper, animatedStyle]}>
    <PieChart
      data={pieData}
      width={screenWidth - 48}
      height={200}
      chartConfig={chartConfig}
      accessor="amount"
      backgroundColor="transparent"
      paddingLeft="15"
      absolute
      hasLegend={false}
      center={[screenWidth / 4, 0]}
      avoidFalseZero
    />
    
    <View style={styles.topCategoriesContainer}>
      {pieData
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3)
        .map((item, index) => (
          <View key={`top-${index}`} style={styles.topCategoryItem}>
            <View style={[styles.categoryDot, { backgroundColor: item.color }]} />
            <Text style={styles.topCategoryName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.topCategoryPercent}>{item.percentage}%</Text>
          </View>
        ))
      }
    </View>
  </Animated.View>
);

// Category List Component
const CategoryList: React.FC<CategoryListProps> = ({ 
  pieData, 
  totalExpense, 
  animatedStyle 
}) => (
  <Animated.View style={[styles.categoryList, animatedStyle]}>
    {pieData
      .sort((a, b) => b.amount - a.amount)
      .map((item, index) => (
        <View key={index} style={styles.categoryCard}>
          <View style={styles.categoryHeader}>
            <View style={[styles.categoryIcon, { backgroundColor: item.color }]} />
            <Text style={styles.categoryName}>{item.name}</Text>
            <View style={styles.categoryAmount}>
              <Text style={styles.categoryAmountText}>
                {item.amount.toLocaleString()}đ
              </Text>
            </View>
          </View>
          
          <View style={styles.percentageBar}>
            <View 
              style={[
                styles.percentageFill, 
                { 
                  width: `${categorySpendingPercent(item.amount, totalExpense)}%`,
                  backgroundColor: item.color
                }
              ]} 
            />
          </View>
          
          <Text style={styles.percentageText}>
            {item.percentage}%
          </Text>
        </View>
      ))}
  </Animated.View>
);

// Empty State Component
const EmptyState: React.FC = () => (
  <View style={styles.emptyStateContainer}>
    <Ionicons name="wallet-outline" size={60} color="#d1d5db" />
    <Text style={styles.emptyState}>
      Không có dữ liệu chi tiêu
    </Text>
    <Text style={styles.emptyStateHint}>
      Thêm các khoản chi tiêu để xem biểu đồ tại đây
    </Text>
    <TouchableOpacity style={styles.emptyStateButton}>
      <Text style={styles.emptyStateButtonText}>+ Thêm chi tiêu</Text>
    </TouchableOpacity>
  </View>
);

// Loading Component
const LoadingComponent: React.FC = () => (
  <SafeAreaView style={styles.container}>
    <StatusBar barStyle="dark-content" backgroundColor="#fff" />
    <View style={styles.loaderContainer}>
      <ActivityIndicator size="large" color="#22c55e" />
      <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
    </View>
  </SafeAreaView>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const HomeScreen: React.FC = () => {
  // ==================== ANIMATED VALUES ====================
  const summaryCardScale = useSharedValue(0.95);
  const summaryCardOpacity = useSharedValue(0);
  const chartOpacity = useSharedValue(0);
  const listItemOpacity = useSharedValue(0);
  
  // ==================== STATE ====================
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [totalExpense, setTotalExpense] = useState<number>(0);
  const [selectedMode, setSelectedMode] = useState<'month' | 'week'>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // ==================== EFFECTS ====================
  
  // Fetch expenses from Firestore
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const expensesQuery = query(
      collection(db, 'expenses'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(expensesQuery, (snapshot) => {
      const expensesList = snapshot.docs.map((doc) => {
        const data = doc.data() as Expense;
        return {
          id: doc.id,
          ...data,
          date: (data.date as any).toDate(),
        };
      });
      
      setExpenses(expensesList);
      setLoading(false);
      startAnimations();
    });

    return () => unsubscribe();
  }, []);

  // Calculate totals whenever filtered expenses change
  useEffect(() => {
    const income = filteredExpenses
      .filter(expense => expense.type === 'income')
      .reduce((sum, expense) => sum + expense.amount, 0);
      
    const expense = filteredExpenses
      .filter(expense => expense.type === 'expense')
      .reduce((sum, expense) => sum + expense.amount, 0);
      
    setTotalIncome(income);
    setTotalExpense(expense);
  }, [expenses, selectedDate, selectedMode]);

  // ==================== COMPUTED VALUES ====================
  
  // Filter expenses based on selected mode and date
  const filteredExpenses = useMemo(() => {
    if (selectedMode === 'month') {
      return expenses.filter((expense) => {
        const date = new Date(expense.date);
        return (
          date.getFullYear() === selectedDate.getFullYear() &&
          date.getMonth() === selectedDate.getMonth()
        );
      });
    } else {
      const { start, end } = getWeekRange(selectedDate);
      return expenses.filter((expense) => {
        const date = new Date(expense.date);
        return date >= start && date <= end;
      });
    }
  }, [expenses, selectedDate, selectedMode]);

  const balance = totalIncome - totalExpense;

  // Generate pie chart data
  const pieData = useMemo<CategoryTotal[]>(() => {
    const categoryTotals: { [key: string]: CategoryTotalCalculation } = {};
  
    filteredExpenses.forEach((expense) => {
      if (expense.type === 'expense') {
        const category = String(expense.category || 'Khác');
        const categoryColor = expense.categoryColor || categoryColors[category] || categoryColors['Khác'];
  
        if (!categoryTotals[category]) {
          categoryTotals[category] = {
            total: 0,
            color: categoryColor,
          };
        }
        categoryTotals[category].total += expense.amount;
      }
    });
  
    const totalAmount = Object.values(categoryTotals).reduce((sum, cat) => sum + cat.total, 0);
  
    return Object.keys(categoryTotals).map((category) => ({
      name: category,
      amount: categoryTotals[category].total,
      color: categoryTotals[category].color,
      legendFontColor: '#333',
      legendFontSize: 12,
      percentage: ((categoryTotals[category].total / totalAmount) * 100).toFixed(1),
    }));
  }, [filteredExpenses]);

  // Date display format
  const dateDisplay = selectedMode === 'month'
    ? `Tháng ${selectedDate.getMonth() + 1}/${selectedDate.getFullYear()}`
    : `${getWeekRange(selectedDate).start.toLocaleDateString()} - ${getWeekRange(selectedDate).end.toLocaleDateString()}`;

  // ==================== ANIMATION FUNCTIONS ====================
  const startAnimations = () => {
    summaryCardOpacity.value = withTiming(1, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
    
    summaryCardScale.value = withSpring(1, {
      damping: 15,
      stiffness: 100,
    });
    
    setTimeout(() => {
      chartOpacity.value = withTiming(1, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      });
    }, 200);
    
    setTimeout(() => {
      listItemOpacity.value = withTiming(1, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      });
    }, 400);
  };

  // ==================== EVENT HANDLERS ====================
  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      const now = new Date();
      if (selectedMode === 'month' && date > now) return;
      setSelectedDate(date);
    }
  };

  const toggleExpandDetails = () => setIsExpanded(!isExpanded);

  // ==================== ANIMATED STYLES ====================
  const summaryCardStyle = useAnimatedStyle(() => ({
    opacity: summaryCardOpacity.value,
    transform: [{ scale: summaryCardScale.value }],
  }));

  const chartWrapperStyle = useAnimatedStyle(() => ({
    opacity: chartOpacity.value,
    transform: [{ scale: chartOpacity.value }],
  }));

  const listItemStyle = useAnimatedStyle(() => ({
    opacity: listItemOpacity.value,
  }));

  // ==================== RENDER ====================
  if (loading) {
    return <LoadingComponent />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
      
      <Header />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <ModeSelector
          selectedMode={selectedMode}
          setSelectedMode={setSelectedMode}
          selectedDate={selectedDate}
          setShowDatePicker={setShowDatePicker}
          dateDisplay={dateDisplay}
        />

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}

        <FinancialSummary
          balance={balance}
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          selectedMode={selectedMode}
          selectedYear={selectedDate.getFullYear()}
          selectedMonth={selectedMode === 'month' ? selectedDate.getMonth() : undefined}
          dateDisplay={dateDisplay}
          animatedStyle={summaryCardStyle}
        />

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Chi tiêu theo danh mục</Text>
            {pieData.length > 0 && (
              <TouchableOpacity onPress={toggleExpandDetails} style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>
                  {isExpanded ? 'Thu gọn' : 'Xem tất cả'}
                </Text>
                <Ionicons 
                  name={isExpanded ? "chevron-up-outline" : "chevron-down-outline"} 
                  size={16} 
                  color="#22c55e" 
                />
              </TouchableOpacity>
            )}
          </View>

          {pieData.length > 0 ? (
            <>
              <ChartComponent pieData={pieData} animatedStyle={chartWrapperStyle} />
              
              {isExpanded && (
                <CategoryList
                  pieData={pieData}
                  totalExpense={totalExpense}
                  animatedStyle={listItemStyle}
                />
              )}
            </>
          ) : (
            <EmptyState />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  // Main container
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  statBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  periodText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.05)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 30,
    backgroundColor: '#f9fafb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  settingsButton: {
    padding: 6,
  },
  
  // Mode & Date Selector
  modeSelector: {
    flexDirection: 'row',
    marginVertical: 16,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
  },
  modeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  selectedModeButton: {
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  selectedModeButtonText: {
    color: '#22c55e',
    fontWeight: '600',
  },
  datePickerButton: {
    flex: 1,
    alignItems: 'flex-end',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  selectDateText: {
    marginLeft: 4,
    fontSize: 13,
    color: '#22c55e',
    fontWeight: '500',
  },
  
  // Summary Cards
  summaryCardsContainer: {
    marginBottom: 20,
  },
  balanceCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...CARD_SHADOW,
  },
  balanceContent: {
    alignItems: 'flex-start',
  },
  balanceTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  transactionCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  transactionCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.05)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  incomeCard: {
    marginRight: 8,
  },
  expenseCard: {
    marginLeft: 8,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 8,
    marginBottom: 4,
  },
  incomeAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16a34a',
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
  },
  incomeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expenseIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Section styling
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '500',
    marginRight: 4,
  },
  
  // Chart styling
  chartWrapper: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.05)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  topCategoriesContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 16,
  },
  topCategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  topCategoryName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  topCategoryPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  
  // Category list
  categoryList: {
    marginBottom: 16,
  },
  categoryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.03)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 12,
  },
  categoryName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  categoryAmount: {
    alignItems: 'flex-end',
  },
  categoryAmountText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  percentageBar: {
    height: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  percentageFill: {
    height: '100%',
    borderRadius: 3,
  },
  percentageText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'right',
  },
  
  // Empty state
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    marginVertical: 16,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.05)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  emptyState: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateHint: {
    fontSize: 14,
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  
  // Loading state
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  balanceLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '400',
    marginBottom: 2,
  },
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  balanceBadgeText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '400',
    marginBottom: 2,
  },
  income: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16a34a',
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: '#e5e7eb',
    marginHorizontal: 12,
    alignSelf: 'center',
  },
  expense: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
  },
});

export default HomeScreen;