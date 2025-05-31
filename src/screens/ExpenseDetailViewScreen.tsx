import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  Linking
} from 'react-native';
import { 
  doc, 
  getDoc, 
  deleteDoc, 
  collection, 
  query, 
  limit, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Modal from 'react-native-modal';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

// Category mappings for colors and icons
const CATEGORY_COLORS = {
  'Ăn uống': '#FF6B6B',
  'Di chuyển': '#4ECDC4',
  'Mua sắm': '#FFD166',
  'Giải trí': '#6A0572',
  'Nhà cửa': '#1A535C',
  'Sức khỏe': '#FF6B6B',
  'Giáo dục': '#3BCEAC',
  'Quà tặng': '#EE6C4D',
  'Lương': '#06D6A0',
  'Thưởng': '#118AB2',
  'Đầu tư': '#073B4C',
  'Thu nhập khác': '#FFD166'
};

const CATEGORY_ICONS = {
  'Ăn uống': 'food',
  'Di chuyển': 'car',
  'Mua sắm': 'shopping',
  'Giải trí': 'gamepad-variant',
  'Nhà cửa': 'home',
  'Sức khỏe': 'medical-bag',
  'Giáo dục': 'school',
  'Quà tặng': 'gift',
  'Lương': 'cash',
  'Thưởng': 'cash-multiple',
  'Đầu tư': 'chart-line',
  'Thu nhập khác': 'cash-plus'
};

// Helper functions
const formatCurrency = (amount) => {
  if (typeof amount !== 'number') {
    console.warn('Invalid amount format:', amount);
    return 'N/A';
  }
  
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0
  }).format(amount);
};

const formatDate = (date) => {
  if (!date) return 'Không có thông tin';
  
  try {
    let dateObj = null;
    
    // Handle different date formats from Firestore
    if (date && typeof date === 'object') {
      // Case 1: Firestore Timestamp with toDate() method
      if (typeof date.toDate === 'function') {
        dateObj = date.toDate();
      } 
      // Case 2: Server timestamp format with seconds and nanoseconds
      else if (date.seconds !== undefined) {
        // Convert Firestore timestamp to milliseconds
        const milliseconds = date.seconds * 1000 + (date.nanoseconds || 0) / 1000000;
        dateObj = new Date(milliseconds);
      }
      // Case 3: Already a Date object
      else if (date instanceof Date) {
        dateObj = date;
      }
      // Case 4: Plain object with _seconds (some Firestore formats)
      else if (date._seconds !== undefined) {
        const milliseconds = date._seconds * 1000 + (date._nanoseconds || 0) / 1000000;
        dateObj = new Date(milliseconds);
      }
    } 
    // Case 5: String format
    else if (typeof date === 'string') {
      dateObj = new Date(date);
    }
    // Case 6: Number (timestamp in milliseconds)
    else if (typeof date === 'number') {
      dateObj = new Date(date);
    }
    
    // Validate the resulting date
    if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      console.warn('Invalid date after conversion:', date);
      return 'Ngày không hợp lệ';
    }
    
    // Format options for Vietnamese locale
     const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false // Use 24-hour format
    };
    
    // Format the date in Vietnamese
    return dateObj.toLocaleDateString('vi-VN', options);
    
  } catch (error) {
    console.error('Error in formatDate:', error, 'Original date:', date);
    return 'Lỗi định dạng ngày';
  }
};

// Alternative simple format function (if you prefer shorter format)
const formatDateSimple = (date) => {
  if (!date) return 'Không có thông tin';
  
  try {
    let dateObj = null;
    
    // Handle Firestore timestamp
    if (date && typeof date === 'object' && typeof date.toDate === 'function') {
      dateObj = date.toDate();
    } else if (date && typeof date === 'object' && date.seconds !== undefined) {
      dateObj = new Date(date.seconds * 1000 + (date.nanoseconds || 0) / 1000000);
    } else if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string' || typeof date === 'number') {
      dateObj = new Date(date);
    }
    
    if (!dateObj || isNaN(dateObj.getTime())) {
      return 'Ngày không hợp lệ';
    }
    
    // Simple format: DD/MM/YYYY HH:mm
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
    
  } catch (error) {
    console.error('Error in formatDateSimple:', error);
    return 'Lỗi định dạng ngày';
  }
};

// Function to open Google Maps
const openGoogleMaps = async (address) => {
  try {
    // Encode the address for URL
    const encodedAddress = encodeURIComponent(address);
    
    // Create Google Maps URL
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    
    // Check if Google Maps app is available
    const canOpenGoogleMaps = await Linking.canOpenURL('comgooglemaps://');
    
    if (canOpenGoogleMaps) {
      // Open in Google Maps app
      const googleMapsAppUrl = `comgooglemaps://?q=${encodedAddress}`;
      await Linking.openURL(googleMapsAppUrl);
    } else {
      // Open in browser
      await Linking.openURL(googleMapsUrl);
    }
  } catch (error) {
    console.error('Error opening Google Maps:', error);
    Alert.alert('Lỗi', 'Không thể mở Google Maps. Vui lòng thử lại.');
  }
};

// Component for Loading State
const LoadingView = ({ message = 'Đang tải chi tiết giao dịch...' }) => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#4CAF50" />
    <Text style={styles.loadingText}>{message}</Text>
  </View>
);

// Component for Error State
const ErrorView = ({ onRetry }) => (
  <View style={styles.errorContainer}>
    <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
    <Text style={styles.errorText}>Không thể tải thông tin giao dịch</Text>
    <TouchableOpacity 
      style={styles.retryButton}
      onPress={onRetry}
    >
      <Text style={styles.retryButtonText}>Thử lại</Text>
    </TouchableOpacity>
  </View>
);

// Component for Header
const Header = ({ type, onBack, onShare }) => (
  <View style={[styles.header, { backgroundColor: type === 'income' ? '#4CAF50' : '#FF6B6B' }]}>
    <TouchableOpacity 
      style={styles.backButton} 
      onPress={onBack}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="arrow-back" size={24} color="white" />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>Chi tiết giao dịch</Text>

    <TouchableOpacity 
      style={styles.shareButton} 
      onPress={onShare}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="share-outline" size={24} color="white" />
    </TouchableOpacity>
  </View>
);

// Component for Amount Card
const AmountCard = ({ expense, fadeAnim, translateY }) => (
  <Animated.View 
    style={[
      styles.amountCard,
      { 
        backgroundColor: expense.type === 'income' ? '#E7F5E8' : '#FFE8E8',
        transform: [{ translateY }],
        opacity: fadeAnim
      }
    ]}
  >
    <View style={styles.amountHeader}>
      <Text style={styles.amountLabel}>
        {expense.type === 'income' ? 'Thu nhập' : 'Chi tiêu'}
      </Text>
      <View style={[styles.typeBadge, { 
        backgroundColor: expense.type === 'income' ? '#4CAF50' : '#FF6B6B' 
      }]}>
        <Ionicons 
          name={expense.type === 'income' ? 'trending-up' : 'trending-down'} 
          size={16} 
          color="white" 
        />
        <Text style={styles.typeBadgeText}>
          {expense.type === 'income' ? 'Thu' : 'Chi'}
        </Text>
      </View>
    </View>
    
    <Text style={[styles.amountValue, { 
      color: expense.type === 'income' ? '#2E7D32' : '#C62828' 
    }]}>
      {formatCurrency(expense.amount)}
    </Text>
    
    <Text style={styles.dateValue}>
      {formatDate(expense.timestamp)}
    </Text>
  </Animated.View>
);

// Component for Info Row
const InfoRow = ({ icon, label, value, color = '#4CAF50', isLink = false, onPress }) => (
  <TouchableOpacity 
    style={styles.infoRow}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <View style={styles.infoIconContainer}>
      {icon}
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoValueContainer}>
        <Text style={[
          styles.infoValue, 
          isLink && styles.linkText
        ]}>
          {value}
        </Text>
        {isLink && (
          <Ionicons 
            name="open-outline" 
            size={16} 
            color="#4285F4" 
            style={styles.linkIcon}
          />
        )}
      </View>
    </View>
  </TouchableOpacity>
);

// Component for Delete Modal
const DeleteModal = ({ isVisible, onCancel, onConfirm }) => (
  <Modal
    isVisible={isVisible}
    onBackdropPress={onCancel}
    backdropOpacity={0.5}
    animationIn="fadeIn"
    animationOut="fadeOut"
    useNativeDriver
    style={styles.modal}
  >
    <View style={styles.modalContent}>
      <Ionicons name="alert-circle" size={56} color="#FF6B6B" />
      <Text style={styles.modalTitle}>Xác nhận xóa</Text>
      <Text style={styles.modalText}>
        Bạn có chắc chắn muốn xóa giao dịch này? Hành động này không thể hoàn tác.
      </Text>
      
      <View style={styles.modalButtons}>
        <TouchableOpacity 
          style={[styles.modalButton, styles.cancelButton]}
          onPress={onCancel}
        >
          <Text style={styles.cancelButtonText}>Hủy</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.modalButton, styles.confirmButton]}
          onPress={onConfirm}
        >
          <Text style={styles.confirmButtonText}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// Main Component
const ExpenseViewDetailScreen = ({ route, navigation }) => {
  const { expenseId } = route.params;
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [similarExpenses, setSimilarExpenses] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [accountName, setAccountName] = useState('');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;
  
  // Get category color based on category name
  const getCategoryColor = (categoryName) => {
    return CATEGORY_COLORS[categoryName] || '#4CAF50'; // Default color if category not found
  };
  
  // Get category icon based on category name
  const getCategoryIcon = (categoryName) => {
    return CATEGORY_ICONS[categoryName] || 'help-circle-outline';
  };

  const fetchAccountName = useCallback(async (accountId) => {
    try {
      if (!accountId) return 'Không có thông tin';
      
      const accountRef = doc(db, 'walletAccounts', accountId);
      const accountSnap = await getDoc(accountRef);
      
      if (accountSnap.exists()) {
        const accountData = accountSnap.data();
        return accountData.name || 'Không có tên';
      } else {
        return 'Không tìm thấy tài khoản';
      }
    } catch (error) {
      console.log('Lỗi khi lấy thông tin tài khoản:', error);
      return 'Lỗi tải dữ liệu';
    }
  }, []);

  const fetchSimilarExpenses = useCallback(async (currentExpense) => {
    try {
      setLoadingSimilar(true);
      
      // Xác định danh mục để tìm kiếm
      const categoryToSearch = typeof currentExpense.category === 'string' 
        ? currentExpense.category 
        : currentExpense.category?.name;
        
      if (!categoryToSearch) {
        setLoadingSimilar(false);
        return;
      }
      
      // Sử dụng giải pháp đơn giản không cần đợi index
      const expensesRef = collection(db, 'expenses');
      
      // Truy vấn đơn giản nhất - chỉ lấy các giao dịch mới nhất
      const simpleQuery = query(
        expensesRef,
        limit(50) // Lấy 50 giao dịch gần nhất để lọc
      );
      
      const querySnapshot = await getDocs(simpleQuery);
      
      // Lọc thủ công theo client-side
      const filteredExpenses = [];
      
      querySnapshot.forEach((doc) => {
        // Bỏ qua giao dịch hiện tại
        if (doc.id !== expenseId) {
          const data = doc.data();
          
          // Lấy category để so sánh
          const docCategory = typeof data.category === 'string'
            ? data.category
            : data.category?.name;
          
          // Chỉ lấy giao dịch cùng loại và cùng category
          if (data.type === currentExpense.type && docCategory === categoryToSearch) {
            filteredExpenses.push({
              ...data,
              id: doc.id
            });
          }
        }
      });
      
      // Sắp xếp theo thời gian giảm dần (mới nhất lên đầu)
      filteredExpenses.sort((a, b) => {
        const getTime = (timestamp) => {
          if (timestamp instanceof Date) {
            return timestamp.getTime();
          }
          if (timestamp && typeof timestamp.toDate === 'function') {
            return timestamp.toDate().getTime();
          }
          return 0;
        };

        const timeA = getTime(a.timestamp);
        const timeB = getTime(b.timestamp);

        return timeB - timeA;
      });
      
      // Chỉ lấy tối đa 3 giao dịch
      setSimilarExpenses(filteredExpenses.slice(0, 3));
    } catch (error) {
      console.log('Lỗi khi tìm giao dịch tương tự:', error);
      setSimilarExpenses([]);
    } finally {
      setLoadingSimilar(false);
    }
  }, [expenseId]);

  const fetchExpenseDetail = useCallback(async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'expenses', expenseId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const expenseData = docSnap.data();
        
        // Check if timestamp exists
        if (!expenseData.timestamp && typeof expenseData.timestamp !== 'object') {
          console.warn('Missing or invalid timestamp for expense:', expenseId);
          // Provide a default timestamp
          expenseData.timestamp = new Date();
        }
        
        console.log('Timestamp format:', expenseData.timestamp);
        
        // Fetch account name if account ID exists
        let accountNameValue = '';
        if (expenseData.account) {
          const accountId = typeof expenseData.account === 'string' 
            ? expenseData.account 
            : String(expenseData.account);
          
          accountNameValue = await fetchAccountName(accountId);
          setAccountName(accountNameValue);
        }
        
        setExpense({ ...expenseData, id: expenseId });
        
        // After getting the expense, fetch similar expenses
        fetchSimilarExpenses(expenseData);
      } else {
        Alert.alert('Thông báo', 'Không tìm thấy giao dịch');
        navigation.goBack();
      }
    } catch (error) {
      console.log('Lỗi khi lấy chi tiết giao dịch:', error);
      Alert.alert('Lỗi', 'Không thể tải chi tiết giao dịch. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [expenseId, navigation, fetchAccountName, fetchSimilarExpenses]);

  const handleShare = useCallback(async () => {
    if (!expense) return;
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const title = `Chi tiết giao dịch: ${expense.reason}`;
      const message = `
📊 CHI TIẾT GIAO DỊCH 📊
Lý do: ${expense.reason}
Số tiền: ${formatCurrency(expense.amount)}
Ngày: ${formatDate(expense.timestamp)}
Loại: ${expense.type === 'income' ? '💰 Thu nhập' : '💸 Chi tiêu'}
Danh mục: ${typeof expense.category === 'string' ? expense.category : expense.category?.name || 'Không có thông tin'}
      `;
      
      await Share.share({
        title,
        message,
      });
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chia sẻ giao dịch.');
    }
  }, [expense]);

  const handleEdit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('EditExpenseScreen', { expense: { ...expense, id: expenseId } });
  }, [expense, expenseId, navigation]);
  
  const confirmDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setDeleteModalVisible(true);
  }, []);

  const handleDelete = useCallback(async () => {
    try {
      setDeleteModalVisible(false);
      setLoading(true);
      
      await deleteDoc(doc(db, 'expenses', expenseId));
      
      Alert.alert('Thành công', 'Đã xóa giao dịch thành công.');
      navigation.goBack();
    } catch (error) {
      setLoading(false);
      Alert.alert('Lỗi', 'Không thể xóa giao dịch. Vui lòng thử lại sau.');
    }
  }, [expenseId, navigation]);

  // Handle location press
  const handleLocationPress = useCallback(async (address) => {
    if (!address || typeof address !== 'string') {
      Alert.alert('Thông báo', 'Không có thông tin địa điểm hợp lệ');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await openGoogleMaps(address);
    } catch (error) {
      console.error('Error handling location press:', error);
    }
  }, []);

  useEffect(() => {
    fetchExpenseDetail();
    
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [expenseId, fetchExpenseDetail, fadeAnim, translateY]);

  if (loading) {
    return <LoadingView />;
  }

  if (!expense) {
    return <ErrorView onRetry={fetchExpenseDetail} />;
  }
  
  // Get the category name
  const categoryName = typeof expense.category === 'string' 
    ? expense.category 
    : expense.category?.name || 'Khác';
  
  // Get the category color
  const categoryColor = getCategoryColor(categoryName);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <Header 
        type={expense.type}
        onBack={() => navigation.navigate('Main', { screen: 'History' })}
        onShare={handleShare}
      />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount Card */}
        <AmountCard 
          expense={expense}
          fadeAnim={fadeAnim}
          translateY={translateY}
        />
        
        {/* Details Card */}
        <Animated.View 
          style={[
            styles.detailCard,
            { 
              transform: [{ translateY }],
              opacity: fadeAnim
            }
          ]}
        >
          <Text style={styles.sectionTitle}>Thông tin chi tiết</Text>
          
          {/* Reason */}
          <InfoRow 
            icon={<Ionicons name="information-circle" size={24} color="#4CAF50" />}
            label="Lý do"
            value={expense.reason}
            onPress={null}
          />
          
          <View style={styles.divider} />
          
          {/* Category - Display only, no navigation */}
          <InfoRow 
            icon={
              <View style={[styles.categoryIcon, { backgroundColor: categoryColor }]}>
                <MaterialCommunityIcons 
                  name={getCategoryIcon(categoryName)} 
                  size={18} 
                  color="white" 
                />
              </View>
            }
            label="Danh mục"
            value={categoryName}
            onPress={null}
          />
          
          <View style={styles.divider} />
          
          {/* Account */}
          <InfoRow 
            icon={<Ionicons name="wallet-outline" size={24} color="#4CAF50" />}
            label="Tài khoản chi tiêu"
            value={accountName || 'Không có thông tin'}
            onPress={null}
          />
          
          {/* Location (if available) - Now clickable */}
          {expense.address && (
            <>
              <View style={styles.divider} />
              <InfoRow 
                icon={<Ionicons name="location-outline" size={24} color="#4CAF50" />}
                label="Địa điểm"
                value={typeof expense.address === 'string' ? expense.address : 'Không có thông tin'}
                isLink={true}
                onPress={() => handleLocationPress(expense.address)}
              />
            </>
          )}
          
          {/* Note (if available) */}
          {expense.note && (
            <>
              <View style={styles.divider} />
              <InfoRow 
                icon={<Ionicons name="document-text-outline" size={24} color="#4CAF50" />}
                label="Ghi chú"
                value={expense.note}
                onPress={null}
              />
            </>
          )}
        </Animated.View>
        
        {/* Extra spacing at bottom for action buttons */}
        <View style={{ height: 100 }} />
      </ScrollView>
      
      {/* Action buttons */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={handleEdit}
        >
          <Ionicons name="create-outline" size={24} color="white" />
          <Text style={styles.actionButtonText}>Chỉnh sửa</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={confirmDelete}
        >
          <Ionicons name="trash-outline" size={24} color="white" />
          <Text style={styles.actionButtonText}>Xóa</Text>
        </TouchableOpacity>
      </View>
      
      {/* Delete confirmation modal */}
      <DeleteModal 
        isVisible={isDeleteModalVisible}
        onCancel={() => setDeleteModalVisible(false)}
        onConfirm={handleDelete}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  backButton: {
    padding: 4,
  },
  shareButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  amountCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  amountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  amountLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#3C4043',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  typeBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  dateValue: {
    fontSize: 14,
    color: '#5F6368',
  },
  detailCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  infoIconContainer: {
    width: 36,
    marginRight: 12,
    alignItems: 'center',
  },
    infoValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
    linkIcon: {
    marginLeft: 8,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#5F6368',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#202124',
    fontWeight: '500',
  },
  linkText: {
    color: '#4285F4',
  },
  divider: {
    height: 1,
    backgroundColor: '#E8EAED',
    marginVertical: 12,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#5F6368',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
  },
  similarCard: {
    margin: 16,
    marginTop: 8,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  similarItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },
  similarItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  similarItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  similarItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#202124',
    marginBottom: 4,
  },
  similarItemDate: {
    fontSize: 14,
    color: '#5F6368',
  },
  similarItemAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingSection: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#5F6368',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#5F6368',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  editButton: {
    backgroundColor: '#4285F4',
    marginRight: 8,
  },
  deleteButton: {
    backgroundColor: '#EA4335',
    marginLeft: 8,
  },
  actionButtonText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#202124',
    marginTop: 16,
    marginBottom: 8,
  },
  modalText: {
    fontSize: 16,
    color: '#5F6368',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F1F3F4',
    marginRight: 8,
  },
  confirmButton: {
    backgroundColor: '#EA4335',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#202124',
    fontWeight: '600',
    fontSize: 16,
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  emptySection: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#5F6368',
    textAlign: 'center',
  }
});

export default ExpenseViewDetailScreen;
