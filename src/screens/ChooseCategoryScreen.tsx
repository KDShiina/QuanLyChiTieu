import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type RootStackParamList = {
  AddExpenseScreen: { type: 'expense' | 'income'; category: string; categoryColor: string };
};

const fixedCategories = {
  expense: [
    { label: 'Mua sắm', value: 'Mua sắm', color: '#4ade80', gradient: ['#86efac', '#4ade80'], icon: 'shopping' },
    { label: 'Ăn uống', value: 'Ăn uống', color: '#f87171', gradient: ['#fca5a5', '#ef4444'], icon: 'silverware-fork-knife' },
    { label: 'Đi lại', value: 'Đi lại', color: '#fb923c', gradient: ['#fdba74', '#f97316'], icon: 'car' },
    { label: 'Giải trí', value: 'Giải trí', color: '#a78bfa', gradient: ['#c4b5fd', '#8b5cf6'], icon: 'gamepad-variant' },
    { label: 'Học tập', value: 'Học tập', color: '#facc15', gradient: ['#fde68a', '#eab308'], icon: 'book-open-page-variant' },
    { label: 'Y tế', value: 'Y tế', color: '#f87171', gradient: ['#fca5a5', '#ef4444'], icon: 'medical-bag' },
    { label: 'Hóa đơn', value: 'Hóa đơn', color: '#60a5fa', gradient: ['#93c5fd', '#3b82f6'], icon: 'receipt' },
    { label: 'Gia đình', value: 'Gia đình', color: '#fbbf24', gradient: ['#fcd34d', '#f59e0b'], icon: 'human-male-female-child' },
    { label: 'Nhà cửa', value: 'Nhà cửa', color: '#c084fc', gradient: ['#d8b4fe', '#a855f7'], icon: 'home-variant' },
    { label: 'Thú cưng', value: 'Thú cưng', color: '#fb923c', gradient: ['#fdba74', '#f97316'], icon: 'paw' },
    { label: 'Du lịch', value: 'Du lịch', color: '#22d3ee', gradient: ['#67e8f9', '#06b6d4'], icon: 'airplane' },
    { label: 'Quà tặng', value: 'Quà tặng', color: '#f472b6', gradient: ['#fbcfe8', '#ec4899'], icon: 'gift-outline' },
    { label: 'Khác', value: 'Khác', color: '#a78bfa', gradient: ['#c4b5fd', '#8b5cf6'], icon: 'dots-horizontal-circle' },
  ],
  income: [
    { label: 'Lương', value: 'Lương', color: '#38bdf8', gradient: ['#7dd3fc', '#0ea5e9'], icon: 'cash-multiple' },
    { label: 'Thưởng', value: 'Thưởng', color: '#f472b6', gradient: ['#fbcfe8', '#ec4899'], icon: 'star-circle' },
    { label: 'Bán hàng', value: 'Bán hàng', color: '#86efac', gradient: ['#bbf7d0', '#22c55e'], icon: 'store-outline' },
    { label: 'Đầu tư', value: 'Đầu tư', color: '#facc15', gradient: ['#fef08a', '#eab308'], icon: 'chart-line-variant' },
    { label: 'Cho thuê', value: 'Cho thuê', color: '#fbbf24', gradient: ['#fcd34d', '#f59e0b'], icon: 'home-city-outline' },
    { label: 'Trúng thưởng', value: 'Trúng thưởng', color: '#facc15', gradient: ['#fef08a', '#eab308'], icon: 'trophy-outline' },
    { label: 'Quà tặng', value: 'Quà tặng', color: '#818cf8', gradient: ['#a5b4fc', '#6366f1'], icon: 'gift' },
    { label: 'Khác', value: 'Khác', color: '#fbbf24', gradient: ['#fde68a', '#f59e0b'], icon: 'dots-horizontal-circle-outline' },
  ]
};

const ChooseCategoryScreen = () => {
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const screenWidth = Dimensions.get('window').width;
  const tabPosition = useRef(new Animated.Value(0)).current;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const scaleAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animate tab indicator
    Animated.timing(tabPosition, {
      toValue: type === 'expense' ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [type]);

  const handleCategoryPress = (category: string, color: string, index: number) => {
    setSelectedIndex(index);
    
    // Animate scale effect
    Animated.sequence([
      Animated.timing(scaleAnimation, {
        toValue: 0.9,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Navigate after animation completes
      setTimeout(() => {
        navigation.navigate('AddExpenseScreen', { 
          type, 
          category, 
          categoryColor: color 
        });
      }, 100);
    });
  };

  const tabWidth = (screenWidth - 48) / 2;
  const tabLeft = tabPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, tabWidth],
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
    
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Danh Mục Giao Dịch</Text>
        <Text style={styles.headerSubtitle}>Chọn loại giao dịch phù hợp</Text>
      </View>

      {/* Custom tab switch */}
      <View style={styles.tabContainer}>
        <View style={styles.tabBackground}>
          <Animated.View 
            style={[
              styles.tabIndicator, 
              { 
                width: tabWidth, 
                transform: [{ translateX: tabLeft }],
                backgroundColor: type === 'expense' ? '#ef4444' : '#22c55e'
              }
            ]} 
          />
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setType('expense')}
            style={[styles.tab, { width: tabWidth }]}
          >
            <MaterialCommunityIcons 
              name="arrow-up-circle" 
              size={18} 
              color={type === 'expense' ? '#ffffff' : '#64748b'} 
            />
            <Text style={type === 'expense' ? styles.activeTabText : styles.tabText}>
              Chi tiêu
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setType('income')}
            style={[styles.tab, { width: tabWidth }]}
          >
            <MaterialCommunityIcons 
              name="arrow-down-circle" 
              size={18} 
              color={type === 'income' ? '#ffffff' : '#64748b'} 
            />
            <Text style={type === 'income' ? styles.activeTabText : styles.tabText}>
              Thu nhập
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Category grid */}
      <ScrollView 
        contentContainerStyle={styles.categoryList}
        showsVerticalScrollIndicator={false}
      >
        {fixedCategories[type].map((cat, index) => (
          <TouchableOpacity
            key={cat.value}
            activeOpacity={0.7}
            onPress={() => handleCategoryPress(cat.value, cat.color, index)}
            style={styles.categoryBox}
          >
            <Animated.View 
              style={[
                { transform: [{ scale: selectedIndex === index ? scaleAnimation : 1 }] }
              ]}
            >
              <LinearGradient
                colors={cat.gradient as [import('react-native').ColorValue, import('react-native').ColorValue, ...import('react-native').ColorValue[]]}
                style={styles.iconCircle}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name={cat.icon as any} size={24} color="#ffffff" />
              </LinearGradient>
            </Animated.View>
            <Text style={styles.categoryLabel}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#ffffff'
  },
  headerContainer: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#1e293b',
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '400'
  },
  tabContainer: {
    paddingHorizontal: 24,
    marginTop: 20,
    marginBottom: 16
  },
  tabBackground: {
    height: 48,
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
    position: 'relative',
    overflow: 'hidden'
  },
  tabIndicator: {
    position: 'absolute',
    height: '100%',
    borderRadius: 24,
    backgroundColor: '#22c55e' // Default color, will be updated dynamically
  },
  tab: {
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748b',
    marginLeft: 6
  },
  activeTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 6
  },
  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  categoryBox: {
    width: '30%',
    marginVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
    textAlign: 'center',
    marginTop: 4
  },
});

export default ChooseCategoryScreen;