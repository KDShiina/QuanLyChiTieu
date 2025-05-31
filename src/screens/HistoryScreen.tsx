import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import HistoryHeader from '../components/Header';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const HistoryScreen = ({ navigation }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDates, setSelectedDates] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showCalendar, setShowCalendar] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;
  const calendarOpacity = useRef(new Animated.Value(0)).current;
  const calendarScale = useRef(new Animated.Value(0.95)).current;

  // Helper function to get the display date (prioritize updatedAt, then createdAt, then date)
  const getDisplayDate = (data) => {
    // Priority: updatedAt > createdAt > date
    const dateFields = [data.updatedAt, data.createdAt, data.date];
    
    for (const field of dateFields) {
      if (field) {
        if (field instanceof Timestamp) {
          return field.toDate();
        } else if (typeof field === 'string') {
          const parsed = new Date(field);
          if (!isNaN(parsed.getTime())) return parsed;
        } else if (field instanceof Date) {
          return field;
        }
      }
    }
    
    return null; // No valid date found
  };

  // Load saved selected dates khi component mount
  useEffect(() => {
    loadSavedSelectedDates();
  }, []);

  const loadSavedSelectedDates = async () => {
    try {
      const savedDates = await AsyncStorage.getItem('selectedDates');
      if (savedDates) {
        const parsedDates = JSON.parse(savedDates);
        setSelectedDates(parsedDates);
        if (parsedDates.length === 0) {
          // Nếu không có ngày nào được lưu, mặc định chọn hôm nay
          const today = new Date().toISOString().split('T')[0];
          setSelectedDates([today]);
        }
      } else {
        // Lần đầu tiên, chọn hôm nay
        const today = new Date().toISOString().split('T')[0];
        setSelectedDates([today]);
      }
    } catch (error) {
      console.error('Error loading saved dates:', error);
      const today = new Date().toISOString().split('T')[0];
      setSelectedDates([today]);
    }
  };

  const saveSelectedDates = async (dates) => {
    try {
      await AsyncStorage.setItem('selectedDates', JSON.stringify(dates));
    } catch (error) {
      console.error('Error saving selected dates:', error);
    }
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, 'expenses'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedExpenses = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Get the display date using the new logic
        const displayDate = getDisplayDate(data);

        fetchedExpenses.push({
          id: doc.id,
          reason: data.reason ?? '',
          amount: Math.abs(data.amount ?? 0),
          date: data.date ?? '',
          category: data.category ?? '',
          categoryColor: data.categoryColor ?? '#22c55e',
          type: data.type ?? 'expense',
          userId: data.userId,
          timestamp: displayDate, // This will be used for sorting and filtering
          note: data.note ?? '',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          // Store raw data for debugging if needed
          rawData: {
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            date: data.date
          }
        });
      });

      // Sort by timestamp (which now uses updatedAt > createdAt > date priority)
      fetchedExpenses.sort((a, b) => {
        const timeA = a.timestamp ? a.timestamp.getTime() : 0;
        const timeB = b.timestamp ? b.timestamp.getTime() : 0;
        return timeB - timeA; // Newest first
      });

      setExpenses(fetchedExpenses);
      generateMarkedDates(fetchedExpenses);
      setLoading(false);
      
      // Delay animations to avoid insertion effect issues
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          })
        ]).start();
      });
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedDates.length > 0) {
      const filtered = expenses.filter((exp) => {
        const dateStr = exp.timestamp?.toISOString().split('T')[0];
        return selectedDates.includes(dateStr);
      });
      setFilteredExpenses(filtered);
      
      // Save selected dates whenever they change
      saveSelectedDates(selectedDates);
    }
  }, [selectedDates, expenses]);

  const generateMarkedDates = useCallback((expensesList) => {
    const marked = {};
    
    expensesList.forEach(expense => {
      if (expense.timestamp) {
        const dateStr = expense.timestamp.toISOString().split('T')[0];
        
        if (!marked[dateStr]) {
          marked[dateStr] = { dots: [] };
        }
        
        if (marked[dateStr].dots.length < 3) {
          const dotType = expense.type === 'income' ? 'income' : 'expense';
          const dotExists = marked[dateStr].dots.some(dot => dot.key === dotType);
          
          if (!dotExists) {
            marked[dateStr].dots.push({
              key: dotType,
              color: expense.type === 'income' ? '#10b981' : '#ef4444',
            });
          }
        }
      }
    });
    
    // Mark selected dates
    selectedDates.forEach(dateStr => {
      if (!marked[dateStr]) {
        marked[dateStr] = {};
      }
      marked[dateStr] = {
        ...marked[dateStr],
        selected: true,
        selectedColor: isMultiSelectMode ? '#3b82f6' : '#4CAF50',
      };
    });
    
    setMarkedDates(marked);
  }, [selectedDates, isMultiSelectMode]);

  useEffect(() => {
    generateMarkedDates(expenses);
  }, [generateMarkedDates, expenses]);

  const handleDayPress = (day) => {
    if (isMultiSelectMode) {
      // Multi-select mode
      const dateString = day.dateString;
      let newSelectedDates;
      
      if (selectedDates.includes(dateString)) {
        // Remove date if already selected
        newSelectedDates = selectedDates.filter(date => date !== dateString);
      } else {
        // Add date to selection
        newSelectedDates = [...selectedDates, dateString].sort();
      }
      
      setSelectedDates(newSelectedDates);
    } else {
      // Single select mode
      setSelectedDates([day.dateString]);
      
      setTimeout(() => {
        toggleCalendar();
      }, 300);
    }
  };

  const handleMonthChange = (month) => {
    setSelectedMonth(month.month - 1);
    setSelectedYear(month.year);
  };

  // Thay đổi hàm tính toán từ theo tháng sang theo ngày được chọn
  const calculateSelectedDatesTotal = () => {
    const totalIncome = filteredExpenses
      .filter(exp => exp.type === 'income')
      .reduce((sum, exp) => sum + Math.abs(exp.amount), 0);
      
    const totalExpense = filteredExpenses
      .filter(exp => exp.type === 'expense')
      .reduce((sum, exp) => sum + Math.abs(exp.amount), 0);

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense
    };
  };

  const toggleCalendar = () => {
    if (showCalendar) {
      Animated.parallel([
        Animated.timing(calendarOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(calendarScale, {
          toValue: 0.95,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start(() => {
        setShowCalendar(false);
      });
    } else {
      setShowCalendar(true);
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(calendarOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(calendarScale, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          })
        ]).start();
      });
    }
  };

  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(!isMultiSelectMode);
    if (isMultiSelectMode && selectedDates.length > 1) {
      // When exiting multi-select mode, keep only the first selected date
      setSelectedDates([selectedDates[0]]);
    }
  };

  const clearAllSelections = () => {
    setSelectedDates([]);
  };

  const selectToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDates([today]);
    setIsMultiSelectMode(false);
  };

  // Memoize item animations to prevent re-creation on every render
  const createItemAnimation = useCallback(() => ({
    scale: new Animated.Value(0.9),
    opacity: new Animated.Value(0.6)
  }), []);

  // Create animations for items only when needed
  const animateItems = useCallback((itemsLength) => {
    const animations = [];
    
    for (let i = 0; i < itemsLength; i++) {
      const anim = createItemAnimation();
      animations.push(anim);
      
      // Start animations with delay
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(anim.scale, {
            toValue: 1,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          })
        ]).start();
      }, i * 50);
    }
    
    return animations;
  }, [createItemAnimation]);
  
  const renderItem = ({ item, index }) => {
    // Simple static rendering without per-item animations to avoid insertion effect issues
    return (
      <TouchableOpacity
        style={[styles.item, {
          borderLeftWidth: 5,
          borderLeftColor: item.categoryColor || (item.type === 'income' ? '#10b981' : '#ef4444')
        }]}
        onPress={() =>
          navigation.navigate('ExpenseViewDetailScreen', { expenseId: item.id })
        }
        activeOpacity={0.7}
      >
        <View style={styles.itemRow}>
          <View style={[styles.iconContainer, {
            backgroundColor: hexToRgba(item.categoryColor || (item.type === 'income' ? '#10b981' : '#ef4444'), 0.15)
          }]}>
            <Ionicons 
              name={getIconName(item.category, item.type)} 
              size={24} 
              color={item.categoryColor || (item.type === 'income' ? '#10b981' : '#ef4444')} 
            />
          </View>
          <View style={styles.itemContent}>
            <View style={styles.itemHeader}>
              <Text style={styles.reason} numberOfLines={1}>
                {item.reason}
              </Text>
              <Text
                style={[
                  styles.amount,
                  { color: item.type === 'income' ? '#10b981' : '#ef4444' },
                ]}
              >
                {item.type === 'income' ? '+' : '-'}
                {Math.abs(item.amount).toLocaleString()} đ
              </Text>
            </View>
            <View style={styles.itemFooter}>
              <View style={styles.categoryContainer}>
                <Text style={styles.category}>
                  {typeof item.category === 'string' ? item.category : 'Không rõ danh mục'}
                </Text>
              </View>
              {item.note ? (
                <Text style={styles.note} numberOfLines={1}>
                  {item.note}
                </Text>
              ) : null}
              {item.timestamp ? (
                <Text style={styles.time}>
                  {formatTime(item.timestamp)} - {formatShortDate(item.timestamp)}
                  {/* Optional: Show if this was updated */}
                  {item.updatedAt && item.createdAt && item.updatedAt !== item.createdAt && (
                    <Text style={styles.updatedIndicator}></Text>
                  )}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const getIconName = (category, type) => {
    if (type === 'income') return 'arrow-down-circle';
    
    const categoryMap = {
      'Ăn uống': 'restaurant',
      'Di chuyển': 'car',
      'Mua sắm': 'cart',
      'Giải trí': 'game-controller',
      'Tiện ích': 'water',
      'Nhà cửa': 'home',
      'Y tế': 'medical',
      'Giáo dục': 'school',
      'Tiết kiệm': 'wallet',
      'Quà tặng': 'gift',
      'Thú cưng': 'paw', // Added for your sample data
    };
    
    return categoryMap[category] || 'cash';
  };

  const formatTime = (date) => {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const formatShortDate = (date) => {
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    const options = {
      weekday: 'long' as const,
      day: 'numeric' as const,
      month: 'long' as const,
      year: 'numeric' as const
    };
    return new Date(dateString).toLocaleDateString('vi-VN', options);
  };

  const formatSelectedDatesText = () => {
    if (selectedDates.length === 0) return "Chưa chọn ngày nào";
    if (selectedDates.length === 1) return formatDate(selectedDates[0]);
    
    const sortedDates = [...selectedDates].sort();
    const firstDate = new Date(sortedDates[0]);
    const lastDate = new Date(sortedDates[sortedDates.length - 1]);
    
    return `${selectedDates.length} ngày được chọn (${firstDate.getDate()}/${firstDate.getMonth() + 1} - ${lastDate.getDate()}/${lastDate.getMonth() + 1})`;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  // Sử dụng hàm tính toán mới
  const { totalIncome, totalExpense, balance } = calculateSelectedDatesTotal();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      {/* Sử dụng HistoryHeader component với props được cập nhật */}
      <HistoryHeader
        fadeAnim={fadeAnim}
        translateY={translateY}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        selectedDates={selectedDates}
        isMultiSelectMode={isMultiSelectMode}
        balance={balance}
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        showCalendar={showCalendar}
        onToggleCalendar={toggleCalendar}
      />
      
      <FlatList
        ListHeaderComponent={
          <View style={styles.listHeaderContainer}>
            {/* Multi-select controls */}
            <View style={styles.controlsContainer}>
              <TouchableOpacity
                style={[styles.controlButton, isMultiSelectMode && styles.activeControlButton]}
                onPress={toggleMultiSelectMode}
              >
                <Ionicons 
                  name={isMultiSelectMode ? "checkmark-done" : "albums-outline"} 
                  size={16} 
                  color={isMultiSelectMode ? "#fff" : "#065f46"} 
                />
                <Text style={[styles.controlButtonText, isMultiSelectMode && styles.activeControlButtonText]}>
                  {isMultiSelectMode ? "Chọn nhiều" : "Chọn đơn"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={selectToday}
              >
                <Ionicons name="today-outline" size={16} color="#065f46" />
                <Text style={styles.controlButtonText}>Hôm nay</Text>
              </TouchableOpacity>

              {selectedDates.length > 0 && (
                <TouchableOpacity
                  style={[styles.controlButton, styles.clearButton]}
                  onPress={clearAllSelections}
                >
                  <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
                  <Text style={[styles.controlButtonText, { color: '#ef4444' }]}>Xóa</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Animated Calendar */}
            {showCalendar && (
              <Animated.View style={[
                styles.calendarContainer,
                {
                  opacity: calendarOpacity,
                  transform: [{ scale: calendarScale }]
                }
              ]}>
                <View style={styles.calendarHeader}>
                  <Text style={styles.calendarHeaderText}>
                    {isMultiSelectMode ? "Chọn nhiều ngày (nhấn để thêm/bỏ)" : "Chọn một ngày"}
                  </Text>
                </View>
                <Calendar
                  onDayPress={handleDayPress}
                  onMonthChange={handleMonthChange}
                  markingType={'multi-dot'}
                  markedDates={markedDates}
                  theme={{
                    calendarBackground: '#fff',
                    textSectionTitleColor: '#065f46',
                    selectedDayBackgroundColor: isMultiSelectMode ? '#3b82f6' : '#4CAF50',
                    selectedDayTextColor: '#ffffff',
                    todayTextColor: '#4CAF50',
                    dayTextColor: '#333',
                    textDisabledColor: '#d9e1e8',
                    dotColor: '#4CAF50',
                    selectedDotColor: '#ffffff',
                    arrowColor: '#4CAF50',
                    monthTextColor: '#065f46',
                    indicatorColor: '#4CAF50',
                    textDayFontWeight: '500',
                    textMonthFontWeight: 'bold',
                    textDayHeaderFontWeight: '600',
                  }}
                />
              </Animated.View>
            )}

            {/* Selected Date Section */}
            <View style={styles.dateSection}>
              <TouchableOpacity 
                style={styles.dateBadge}
                onPress={toggleCalendar}
              >
                <Ionicons name="calendar-outline" size={20} color="#065f46" style={styles.dateBadgeIcon} />
                <Text style={styles.dateBadgeText}>
                  {formatSelectedDatesText()}
                </Text>
                <Ionicons 
                  name={showCalendar ? "chevron-up" : "chevron-down"} 
                  size={18} 
                  color="#065f46" 
                />
              </TouchableOpacity>
            </View>

            <View style={styles.transactionsHeader}>
              <Text style={styles.recentTransactionsText}>
                {selectedDates.length > 1 ? "Giao dịch các ngày đã chọn" : "Giao dịch trong ngày"}
              </Text>
              <View style={styles.transactionCount}>
                <Text style={styles.transactionCountText}>
                  {filteredExpenses.length} giao dịch
                </Text>
              </View>
            </View>
          </View>
        }
        data={filteredExpenses}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="receipt-outline" size={60} color="#cbd5e1" />
            </View>
            <Text style={styles.emptyText}>
              {selectedDates.length > 1 
                ? "Không có giao dịch trong các ngày đã chọn"
                : "Không có giao dịch trong ngày"
              }
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  listHeaderContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 16,
  },
  controlsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e2f8ea',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 4,
  },
  activeControlButton: {
    backgroundColor: '#065f46',
  },
  controlButtonText: {
    color: '#065f46',
    fontSize: 12,
    fontWeight: '500',
  },
  activeControlButtonText: {
    color: '#fff',
  },
  clearButton: {
    backgroundColor: '#fee2e2',
  },
  calendarContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  calendarHeader: {
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  calendarHeaderText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  dateSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e2f8ea',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    maxWidth: width - 32,
  },
  dateBadgeIcon: {
    marginRight: 6,
  },
  dateBadgeText: {
    color: '#065f46',
    fontSize: 15,
    fontWeight: '500',
    marginRight: 6,
    flex: 1,
    textAlign: 'center',
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recentTransactionsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#065f46',
  },
  transactionCount: {
    backgroundColor: '#f0fdf4',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  transactionCountText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '600',
  },
  item: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reason: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
    marginRight: 8,
  },
  amount: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryContainer: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
  },
  category: {
    fontSize: 12,
    color: '#64748b',
  },
  note: {
    fontSize: 12,
    color: '#94a3b8',
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 4,
  },
  updatedIndicator: {
    fontSize: 10,
    color: '#6366f1',
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 16,
    marginBottom: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
});

export default HistoryScreen;