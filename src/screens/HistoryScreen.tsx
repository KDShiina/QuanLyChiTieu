import React, { useEffect, useState, useRef } from 'react';
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

const { width } = Dimensions.get('window');

const HistoryScreen = ({ navigation }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dailyExpenses, setDailyExpenses] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showCalendar, setShowCalendar] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;
  const calendarOpacity = useRef(new Animated.Value(0)).current;
  const calendarScale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, 'expenses'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedExpenses = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        let timestamp = null;

        if (data.date instanceof Timestamp) {
          timestamp = data.date.toDate();
        } else if (typeof data.date === 'string') {
          const parsed = new Date(data.date);
          if (!isNaN(parsed.getTime())) timestamp = parsed;
        }

        fetchedExpenses.push({
          id: doc.id,
          reason: data.reason ?? '',
          amount: Math.abs(data.amount ?? 0),
          date: data.date ?? '',
          category: data.category ?? '',
          categoryColor: data.categoryColor ?? '#22c55e',
          type: data.type ?? 'expense',
          userId: data.userId,
          timestamp,
          note: data.note ?? ''
        });
      });

      fetchedExpenses.sort((a, b) => {
        const timeA = a.timestamp ? a.timestamp.getTime() : 0;
        const timeB = b.timestamp ? b.timestamp.getTime() : 0;
        return timeB - timeA;
      });

      setExpenses(fetchedExpenses);
      generateMarkedDates(fetchedExpenses);
      setLoading(false);
      
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

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedDate && expenses.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
    }
  }, [expenses]);

  useEffect(() => {
    if (selectedDate) {
      const filtered = expenses.filter((exp) => {
        const dateStr = exp.timestamp?.toISOString().split('T')[0];
        return dateStr === selectedDate;
      });
      setDailyExpenses(filtered);
    }
  }, [selectedDate, expenses]);

  const generateMarkedDates = (expensesList) => {
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
    
    if (selectedDate) {
      if (!marked[selectedDate]) {
        marked[selectedDate] = {};
      }
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: '#4CAF50',
      };
    }
    
    setMarkedDates(marked);
  };

  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
    
    const newMarkedDates = { ...markedDates };
    
    if (selectedDate && newMarkedDates[selectedDate]) {
      const { selected, selectedColor, ...rest } = newMarkedDates[selectedDate];
      newMarkedDates[selectedDate] = rest;
    }
    
    if (!newMarkedDates[day.dateString]) {
      newMarkedDates[day.dateString] = {};
    }
    
    newMarkedDates[day.dateString] = {
      ...newMarkedDates[day.dateString],
      selected: true,
      selectedColor: '#4CAF50',
    };
    
    setMarkedDates(newMarkedDates);
    
    setTimeout(() => {
      toggleCalendar();
    }, 300);
  };

  const handleMonthChange = (month) => {
    setSelectedMonth(month.month - 1);
    setSelectedYear(month.year);
  };

  const calculateMonthlyTotal = () => {
    let totalIncome = 0;
    let totalExpense = 0;

    expenses.forEach((exp) => {
      const date = exp.timestamp;
      if (
        date &&
        date.getMonth() === selectedMonth &&
        date.getFullYear() === selectedYear
      ) {
        if (exp.type === 'income') totalIncome += Math.abs(exp.amount);
        else totalExpense += Math.abs(exp.amount);
      }
    });

    return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
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
    }
  };

  const [itemAnimations, setItemAnimations] = useState([]);
  
  useEffect(() => {
    const newAnimations = dailyExpenses.map(() => ({
      scale: new Animated.Value(0.9),
      opacity: new Animated.Value(0.6)
    }));
    
    setItemAnimations(newAnimations);
    
    const animations = newAnimations.flatMap((anim, index) => [
      Animated.spring(anim.scale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(anim.opacity, {
        toValue: 1,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
      })
    ]);
    
    Animated.parallel(animations).start();
  }, [dailyExpenses]);
  
  const renderItem = ({ item, index }) => {
    const animation = itemAnimations[index] || { scale: new Animated.Value(1), opacity: new Animated.Value(1) };
    
    return (
      <Animated.View style={[
        { transform: [{ scale: animation.scale }] },
        { opacity: animation.opacity }
      ]}>
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
                    {formatTime(item.timestamp)}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
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
    };
    
    return categoryMap[category] || 'cash';
  };

  const formatTime = (date) => {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
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

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  const { totalIncome, totalExpense, balance } = calculateMonthlyTotal();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      {/* Sử dụng HistoryHeader component */}
      <HistoryHeader
        fadeAnim={fadeAnim}
        translateY={translateY}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        balance={balance}
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        showCalendar={showCalendar}
        onToggleCalendar={toggleCalendar}
      />
      
      <FlatList
        ListHeaderComponent={
          <View style={styles.listHeaderContainer}>
            {/* Animated Calendar */}
            {showCalendar && (
              <Animated.View style={[
                styles.calendarContainer,
                {
                  opacity: calendarOpacity,
                  transform: [{ scale: calendarScale }]
                }
              ]}>
                <Calendar
                  onDayPress={handleDayPress}
                  onMonthChange={handleMonthChange}
                  markingType={'multi-dot'}
                  markedDates={markedDates}
                  theme={{
                    calendarBackground: '#fff',
                    textSectionTitleColor: '#065f46',
                    selectedDayBackgroundColor: '#4CAF50',
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
                  {selectedDate ? formatDate(selectedDate) : "Hãy chọn ngày"}
                </Text>
                <Ionicons 
                  name={showCalendar ? "chevron-up" : "chevron-down"} 
                  size={18} 
                  color="#065f46" 
                />
              </TouchableOpacity>
            </View>

            <View style={styles.transactionsHeader}>
              <Text style={styles.recentTransactionsText}>Giao dịch trong ngày</Text>
              <View style={styles.transactionCount}>
                <Text style={styles.transactionCountText}>
                  {dailyExpenses.length} giao dịch
                </Text>
              </View>
            </View>
          </View>
        }
        data={dailyExpenses}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="receipt-outline" size={60} color="#cbd5e1" />
            </View>
            <Text style={styles.emptyText}>
              Không có giao dịch trong ngày
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
  },
  dateBadgeIcon: {
    marginRight: 6,
  },
  dateBadgeText: {
    color: '#065f46',
    fontSize: 15,
    fontWeight: '500',
    marginRight: 6,
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