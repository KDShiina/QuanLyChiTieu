import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard
} from 'react-native';
import { doc, updateDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Modal from 'react-native-modal';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';

// Category data - same as in ExpenseViewDetailScreen
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

// Helper function to format amount
const formatAmountForDisplay = (amount) => {
  if (!amount) return '';
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Helper function to parse amount from display format to number
const parseAmountFromDisplay = (displayAmount) => {
  if (!displayAmount) return 0;
  return parseInt(displayAmount.replace(/\./g, ''), 10) || 0;
};

// Header Component
const Header = ({ onBack, onSave, saving }) => (
  <View style={styles.header}>
    <TouchableOpacity 
      style={styles.backButton} 
      onPress={onBack}
      disabled={saving}
    >
      <Ionicons name="arrow-back" size={24} color="white" />
    </TouchableOpacity>
    
    <Text style={styles.headerTitle}>Chỉnh sửa giao dịch</Text>
    
    <TouchableOpacity 
      style={styles.saveButton} 
      onPress={onSave}
      disabled={saving}
    >
      {saving ? (
        <ActivityIndicator size="small" color="white" />
      ) : (
        <Ionicons name="checkmark" size={24} color="white" />
      )}
    </TouchableOpacity>
  </View>
);

// Category Selector Modal
const CategoryModal = ({ visible, categories, selectedCategory, onSelectCategory, onClose, type }) => {
  // Filter categories based on transaction type
  const filteredCategories = categories.filter(category => {
    if (type === 'income') {
      return ['Lương', 'Thưởng', 'Đầu tư', 'Thu nhập khác'].includes(category);
    }
    return !['Lương', 'Thưởng', 'Đầu tư', 'Thu nhập khác'].includes(category);
  });

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      backdropOpacity={0.5}
      style={styles.modal}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      useNativeDriver
    >
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Chọn danh mục</Text>
        
        <ScrollView style={styles.categoryList}>
          {filteredCategories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryItem,
                selectedCategory === category && styles.selectedCategoryItem
              ]}
              onPress={() => onSelectCategory(category)}
            >
              <View style={[styles.categoryIcon, { backgroundColor: CATEGORY_COLORS[category] || '#4CAF50' }]}>
                <MaterialCommunityIcons 
                  name={CATEGORY_ICONS[category] || 'help-circle'} 
                  size={20} 
                  color="white" 
                />
              </View>
              <Text style={styles.categoryText}>{category}</Text>
              {selectedCategory === category && (
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={onClose}
        >
          <Text style={styles.closeButtonText}>Đóng</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

// Account Selector Modal
const AccountModal = ({ visible, accounts, selectedAccount, onSelectAccount, onClose }) => {
  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      backdropOpacity={0.5}
      style={styles.modal}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      useNativeDriver
    >
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Chọn tài khoản</Text>
        
        <ScrollView style={styles.accountList}>
          {accounts.map((account) => (
            <TouchableOpacity
              key={account.id}
              style={[
                styles.accountItem,
                selectedAccount === account.id && styles.selectedAccountItem
              ]}
              onPress={() => onSelectAccount(account.id)}
            >
              <View style={[styles.accountIcon, { backgroundColor: account.color || '#4CAF50' }]}>
                <Ionicons name={account.icon || "wallet-outline"} size={20} color="white" />
              </View>
              <Text style={styles.accountText}>{account.name}</Text>
              {selectedAccount === account.id && (
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={onClose}
        >
          <Text style={styles.closeButtonText}>Đóng</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

// TypeToggle Component
const TypeToggle = ({ type, onToggle, disabled }) => (
  <View style={styles.typeToggleContainer}>
    <TouchableOpacity
      style={[
        styles.typeButton,
        type === 'expense' && styles.typeButtonActive,
        type === 'expense' ? { backgroundColor: '#FFDBDB' } : {},
        disabled && { opacity: 0.5 }
      ]}
      onPress={() => !disabled && onToggle('expense')}
      disabled={disabled}
    >
      <Ionicons 
        name="trending-down" 
        size={20} 
        color={type === 'expense' ? '#FF6B6B' : '#5F6368'} 
      />
      <Text 
        style={[
          styles.typeButtonText,
          type === 'expense' && { color: '#FF6B6B', fontWeight: '600' }
        ]}
      >
        Chi tiêu
      </Text>
    </TouchableOpacity>
    
    <TouchableOpacity
      style={[
        styles.typeButton, 
        type === 'income' && styles.typeButtonActive,
        type === 'income' ? { backgroundColor: '#DBFFDC' } : {},
        disabled && { opacity: 0.5 }
      ]}
      onPress={() => !disabled && onToggle('income')}
      disabled={disabled}
    >
      <Ionicons 
        name="trending-up" 
        size={20} 
        color={type === 'income' ? '#4CAF50' : '#5F6368'} 
      />
      <Text 
        style={[
          styles.typeButtonText,
          type === 'income' && { color: '#4CAF50', fontWeight: '600' }
        ]}
      >
        Thu nhập
      </Text>
    </TouchableOpacity>
  </View>
);

// DateTimePicker Component
const DateSelector = ({ date, onChange }) => {
  const [showPicker, setShowPicker] = useState(false);
  
  const formatDate = (date) => {
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleDateString('vi-VN', options);
  };
  
  return (
    <View style={styles.dateContainer}>
      <Text style={styles.inputLabel}>Ngày giao dịch</Text>
      <TouchableOpacity 
        style={styles.dateButton}
        onPress={() => setShowPicker(true)}
      >
        <Ionicons name="calendar-outline" size={20} color="#4CAF50" style={styles.dateIcon} />
        <Text style={styles.dateText}>{formatDate(date)}</Text>
      </TouchableOpacity>
      
      {showPicker && (
        <DateTimePicker
          value={date}
          mode="datetime"
          display="default"
          onChange={(event, selectedDate) => {
            setShowPicker(false);
            if (selectedDate) {
              onChange(selectedDate);
            }
          }}
        />
      )}
    </View>
  );
};

const EditExpenseScreen = ({ route, navigation }) => {
  const { expense } = route.params;
  
  // Get category name from expense object
  const getCategoryName = () => {
    if (typeof expense.category === 'string') {
      return expense.category;
    } else if (expense.category && expense.category.name) {
      return expense.category.name;
    }
    return expense.type === 'income' ? 'Thu nhập khác' : 'Khác';
  };
  
  // State variables
  const [formData, setFormData] = useState({
    reason: expense.reason || '',
    amount: expense.amount || 0,
    type: expense.type || 'expense',
    category: getCategoryName(),
    account: expense.account || '',
    address: expense.address || '',
    note: expense.note || '',
    timestamp: expense.timestamp && typeof expense.timestamp.toDate === 'function' 
      ? expense.timestamp.toDate() 
      : new Date()
  });
  
  const [formattedAmount, setFormattedAmount] = useState(
    formatAmountForDisplay(formData.amount)
  );
  
  const [accounts, setAccounts] = useState([]);
  const [accountName, setAccountName] = useState('Đang tải...');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
  const [isAccountModalVisible, setAccountModalVisible] = useState(false);
  
  // List of all categories
  const allCategories = [
    'Ăn uống', 'Di chuyển', 'Mua sắm', 'Giải trí', 
    'Nhà cửa', 'Sức khỏe', 'Giáo dục', 'Quà tặng',
    'Lương', 'Thưởng', 'Đầu tư', 'Thu nhập khác'
  ];
  
  // Fetch accounts from Firestore
  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const accountsCollectionRef = collection(db, 'walletAccounts');
      const accountsSnapshot = await getDocs(accountsCollectionRef);
      
      if (!accountsSnapshot.empty) {
        const accountsList = accountsSnapshot.docs.map(doc => {
          const data = doc.data() as { name?: string; icon?: string; color?: string };
          return {
            id: doc.id,
            name: data.name || 'Không tên',
            icon: data.icon || 'wallet-outline',
            color: data.color || '#4CAF50'
          };
        });
        setAccounts(accountsList);
        
        // Find current account name if account is set
        if (formData.account) {
          const currentAccount = accountsList.find(acc => acc.id === formData.account);
          if (currentAccount) {
            setAccountName(currentAccount.name);
          } else {
            setAccountName('Không tìm thấy tài khoản');
          }
        } else {
          setAccountName('Chưa chọn tài khoản');
        }
      } else {
        // If no accounts, set default
        setAccounts([{ id: 'default', name: 'Ví tiền mặt', icon: 'wallet-outline', color: '#4CAF50' }]);
        setAccountName('Chưa có tài khoản nào');
      }
    } catch (error) {
      console.error('Lỗi khi lấy danh sách tài khoản:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách tài khoản. Vui lòng thử lại sau.');
      // Set default account in case of error
      setAccounts([{ id: 'default', name: 'Ví tiền mặt', icon: 'wallet-outline', color: '#4CAF50' }]);
      setAccountName('Chưa có tài khoản nào');
    } finally {
      setLoading(false);
    }
  }, [formData.account]);
  
  // Form validation
  const validateForm = () => {
    if (!formData.reason.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập lý do giao dịch');
      return false;
    }
    
    if (!formData.amount || formData.amount <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền hợp lệ');
      return false;
    }
    
    if (!formData.category) {
      Alert.alert('Lỗi', 'Vui lòng chọn danh mục');
      return false;
    }
    
    if (!formData.account) {
      Alert.alert('Lỗi', 'Vui lòng chọn tài khoản');
      return false;
    }
    
    return true;
  };
  
  // Handle save
  const handleSave = async () => {
    try {
      // Validate form
      if (!validateForm()) return;
      
      // Dismiss keyboard
      Keyboard.dismiss();
      
      // Show saving indicator
      setSaving(true);
      
      // Update document in Firestore
      const expenseRef = doc(db, 'expenses', expense.id);
      
      // Prepare update data
      const updateData: {
        reason: any;
        amount: any;
        type: any;
        category: any;
        timestamp: any;
        note: any;
        account: any;
        address?: any;
      } = {
        reason: formData.reason,
        amount: formData.amount,
        type: formData.type,
        category: formData.category,
        timestamp: formData.timestamp,
        note: formData.note || '',
        account: formData.account,
      };
      
      // Add address if available
      if (formData.address) {
        updateData.address = formData.address;
      }
      
      // Update document
      await updateDoc(expenseRef, updateData);
      
      // Success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Show success message
      Alert.alert(
        'Thành công',
        'Đã cập nhật giao dịch thành công!',
        [
          { 
            text: 'OK', 
            onPress: () => navigation.navigate('ExpenseViewDetailScreen', { expenseId: expense.id }) 
          }
        ]
      );
    } catch (error) {
      console.error('Lỗi khi cập nhật giao dịch:', error);
      
      // Error feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      // Show error message
      Alert.alert('Lỗi', 'Không thể cập nhật giao dịch. Vui lòng thử lại sau.');
    } finally {
      setSaving(false);
    }
  };
  
  // Handle back button press
  const handleBack = () => {
    // If form has been edited, show confirmation
    navigation.goBack();
  };
  
  // Handle amount change
  const handleAmountChange = (text) => {
    // Remove non-numeric chars
    const cleanText = text.replace(/[^0-9]/g, '');
    
    // Parse to number
    const numericAmount = parseInt(cleanText, 10) || 0;
    
    // Update formatted amount
    setFormattedAmount(formatAmountForDisplay(numericAmount));
    
    // Update form data
    setFormData({
      ...formData,
      amount: numericAmount
    });
  };
  
  // Handle category selection
  const handleCategorySelect = (category) => {
    setFormData({
      ...formData,
      category
    });
    setCategoryModalVisible(false);
  };
  
  // Handle account selection
  const handleAccountSelect = (accountId) => {
    // Find the selected account to update account name
    const selectedAccount = accounts.find(acc => acc.id === accountId);
    
    setFormData({
      ...formData,
      account: accountId
    });
    
    if (selectedAccount) {
      setAccountName(selectedAccount.name);
    }
    
    setAccountModalVisible(false);
  };
  
  // Handle type toggle
  const handleTypeToggle = (type) => {
    // If changing from income to expense or vice versa, 
    // update category to default for that type
    let newCategory = formData.category;
    
    if (type === 'income' && !['Lương', 'Thưởng', 'Đầu tư', 'Thu nhập khác'].includes(formData.category)) {
      newCategory = 'Thu nhập khác';
    } else if (type === 'expense' && ['Lương', 'Thưởng', 'Đầu tư', 'Thu nhập khác'].includes(formData.category)) {
      newCategory = 'Khác';
    }
    
    setFormData({
      ...formData,
      type,
      category: newCategory
    });
  };
  
  // Fetch account data on mount
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);
  
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <Header 
        onBack={handleBack}
        onSave={handleSave}
        saving={saving}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
            </View>
          ) : (
            <>
              {/* Type selector */}
              <TypeToggle 
                type={formData.type}
                onToggle={handleTypeToggle}
                disabled={false} // You can make it disabled if needed
              />
              
              {/* Reason input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Lý do giao dịch</Text>
                <TextInput 
                  style={styles.input}
                  value={formData.reason}
                  onChangeText={(text) => setFormData({ ...formData, reason: text })}
                  placeholder="Nhập lý do giao dịch"
                  placeholderTextColor="#9AA0A6"
                />
              </View>
              
              {/* Amount input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Số tiền</Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencySymbol}>₫</Text>
                  <TextInput 
                    style={styles.amountInput}
                    value={formattedAmount}
                    onChangeText={handleAmountChange}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#9AA0A6"
                  />
                </View>
              </View>
              
              {/* Category selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Danh mục</Text>
                <TouchableOpacity 
                  style={styles.selectorButton}
                  onPress={() => setCategoryModalVisible(true)}
                >
                  <View style={[styles.categoryIconSmall, { backgroundColor: CATEGORY_COLORS[formData.category] || '#4CAF50' }]}>
                    <MaterialCommunityIcons 
                      name={CATEGORY_ICONS[formData.category] || 'help-circle'} 
                      size={16} 
                      color="white" 
                    />
                  </View>
                  <Text style={styles.selectorText}>{formData.category}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9AA0A6" />
                </TouchableOpacity>
              </View>
              
              {/* Account selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tài khoản</Text>
                <TouchableOpacity 
                  style={styles.selectorButton}
                  onPress={() => setAccountModalVisible(true)}
                >
                  {accounts.find(acc => acc.id === formData.account) ? (
                    <View style={[
                      styles.categoryIconSmall, 
                      { backgroundColor: accounts.find(acc => acc.id === formData.account)?.color || '#4CAF50' }
                    ]}>
                      <Ionicons 
                        name={accounts.find(acc => acc.id === formData.account)?.icon || "wallet-outline"} 
                        size={16} 
                        color="white" 
                      />
                    </View>
                  ) : (
                    <Ionicons name="wallet-outline" size={20} color="#4CAF50" />
                  )}
                  <Text style={styles.selectorText}>{accountName}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9AA0A6" />
                </TouchableOpacity>
              </View>
              
              {/* Date selector */}
              <DateSelector 
                date={formData.timestamp}
                onChange={(date) => setFormData({ ...formData, timestamp: date })}
              />
              
              {/* Address input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Địa điểm (tùy chọn)</Text>
                <TextInput 
                  style={styles.input}
                  value={formData.address}
                  onChangeText={(text) => setFormData({ ...formData, address: text })}
                  placeholder="Nhập địa điểm giao dịch"
                  placeholderTextColor="#9AA0A6"
                />
              </View>
              <View style={{ height: 20 }} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Category Modal */}
      <CategoryModal 
        visible={isCategoryModalVisible}
        categories={allCategories}
        selectedCategory={formData.category}
        onSelectCategory={handleCategorySelect}
        onClose={() => setCategoryModalVisible(false)}
        type={formData.type}
      />
      
      {/* Account Modal */}
      <AccountModal 
        visible={isAccountModalVisible}
        accounts={accounts}
        selectedAccount={formData.account}
        onSelectAccount={handleAccountSelect}
        onClose={() => setAccountModalVisible(false)}
      />
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  backButton: {
    padding: 4,
  },
  saveButton: {
    padding: 4,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  typeToggleContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  typeButtonActive: {
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  typeButtonText: {
    marginLeft: 4,
    fontSize: 15,
    color: '#5F6368',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#202124',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  noteInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8EAED',
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    padding: 12,
    fontSize: 18,
    fontWeight: '500',
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  selectorText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: '#202124',
  },
  dateContainer: {
    marginBottom: 16,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  dateIcon: {
    marginRight: 8,
  },
  dateText: {
    fontSize: 16,
    color: '#202124',
  },
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#202124',
    marginBottom: 16,
    textAlign: 'center',
  },
  categoryList: {
    maxHeight: 400,
  },
  accountList: {
    maxHeight: 300,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  selectedCategoryItem: {
    backgroundColor: '#F1F8E9',
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryText: {
    flex: 1,
    fontSize: 16,
    color: '#202124',
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  selectedAccountItem: {
    backgroundColor: '#F1F8E9',
  },
  accountIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountText: {
    flex: 1,
    fontSize: 16,
    color: '#202124',
  },
  closeButton: {
    marginTop: 16,
    backgroundColor: '#F1F3F4',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#5F6368',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4CAF50',
  }
});

export default EditExpenseScreen;