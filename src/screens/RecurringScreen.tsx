import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  FlatList, TouchableOpacity, Alert, Modal,
  ActivityIndicator, StatusBar, Dimensions
} from 'react-native';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const db = getFirestore();
const { width } = Dimensions.get('window');

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Color palette
const COLORS = {
  primary: '#6259FF',
  secondary: '#FF6B6B',
  accent: '#40E0D0',
  background: '#f5f7ff',
  card: '#FFFFFF',
  text: '#333',
  border: '#E0E0E0',
  success: '#4CAF50',
  error: '#F44336',
  gray: '#757575',
  lightGray: '#F5F5F5',
  modalBackground: 'rgba(0,0,0,0.6)',
};

// Define the RecurringScreen component
type RecurringTransaction = {
  id: string;
  name: string;
  amount: number;
  startDate: any;
  repeatMonths: number;
  notificationTime: string;
  createdAt?: any;
};

const RecurringScreen = () => {
  const navigation = useNavigation();
  const [transactionName, setTransactionName] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [repeatMonths, setRepeatMonths] = useState('1');
  const [notificationTime, setNotificationTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [transactions, setTransactions] = useState<RecurringTransaction[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    requestNotificationPermission();
    fetchTransactions();
  }, []);

  const requestNotificationPermission = async () => {
    if (Device.isDevice) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Cần quyền thông báo',
          'Bạn cần cho phép thông báo để được nhắc nhở về các giao dịch định kỳ',
          [{ text: 'Đã hiểu', style: 'default' }]
        );
      }
    }
  };

  const fetchTransactions = async () => {
    setRefreshing(true);
    try {
      const snapshot = await getDocs(collection(db, 'recurringTransactions'));
      const data: RecurringTransaction[] = snapshot.docs.map(
        docSnap => ({ id: docSnap.id, ...(docSnap.data() as Omit<RecurringTransaction, 'id'>) })
      );
      
      // Sort by creation date (newest first)
      data.sort((a, b) => {
        const dateA = a.createdAt && 'seconds' in a.createdAt ? new Date((a.createdAt).seconds * 1000) : new Date();
        const dateB = b.createdAt && 'seconds' in b.createdAt ? new Date((b.createdAt).seconds * 1000) : new Date();
        return dateB.getTime() - dateA.getTime();
      });
      
      setTransactions(data);
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách giao dịch định kỳ");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const scheduleNotification = async (date, name, amount) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "💰 Giao dịch định kỳ sắp đến hạn",
          body: `${name}: ${amount.toLocaleString('vi-VN')} VND`,
          sound: true,
          vibrate: [0, 250, 250, 250],
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          date: date,
          channelId: 'recurring-transactions',
        },
      });
      console.log("Thông báo đã được lên lịch:", date.toLocaleString());
    } catch (error) {
      console.error("Lỗi đặt lịch thông báo:", error);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '';
    
    // Keep only numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    
    // Format with thousand separators
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleAmountChange = (value) => {
    const formatted = formatCurrency(value);
    setAmount(formatted);
  };

  const handleAddTransaction = async () => {
    if (!transactionName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên giao dịch');
      return;
    }

    if (!amount) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số tiền');
      return;
    }

    const numericAmount = parseFloat(amount.replace(/\./g, ''));
    const repeat = parseInt(repeatMonths) || 1;

    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Lỗi nhập liệu', 'Số tiền không hợp lệ');
      return;
    }

    if (repeat <= 0) {
      Alert.alert('Lỗi nhập liệu', 'Chu kỳ lặp lại phải lớn hơn 0');
      return;
    }

    setLoading(true);

    const newTransaction = {
      name: transactionName.trim(),
      amount: numericAmount,
      startDate,
      repeatMonths: repeat,
      notificationTime: notificationTime.toISOString(),
      createdAt: new Date(),
    };

    try {
      await addDoc(collection(db, 'recurringTransactions'), newTransaction);

      const scheduledDateTime = new Date(startDate);
      scheduledDateTime.setHours(notificationTime.getHours());
      scheduledDateTime.setMinutes(notificationTime.getMinutes());
      scheduledDateTime.setSeconds(0);
      scheduledDateTime.setMilliseconds(0);

      await scheduleNotification(scheduledDateTime, transactionName, numericAmount);

      // Reset form fields
      setTransactionName('');
      setAmount('');
      setStartDate(new Date());
      setRepeatMonths('1');
      setNotificationTime(new Date());
      
      fetchTransactions();
      setIsModalVisible(false);
      
      Alert.alert(
        "Thành công", 
        "Đã thêm giao dịch định kỳ mới và đặt lịch thông báo",
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error) {
      console.error("Lỗi khi thêm giao dịch:", error);
      Alert.alert("Lỗi", "Không thể thêm giao dịch, vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc muốn xóa giao dịch "${name}" không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await deleteDoc(doc(db, 'recurringTransactions', id));
              fetchTransactions();
              Alert.alert("Thành công", "Đã xóa giao dịch định kỳ");
            } catch (error) {
              console.error("Lỗi khi xóa giao dịch:", error);
              Alert.alert("Lỗi", "Không thể xóa giao dịch, vui lòng thử lại.");
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const getNextDueDate = (startDate, repeatMonths) => {
    if (!startDate) return 'Chưa xác định';
    
    try {
      const start = startDate.seconds ? new Date(startDate.seconds * 1000) : new Date(startDate);
      const now = new Date();
      const months = repeatMonths || 1;
      
      let nextDate = new Date(start);
      while (nextDate < now) {
        nextDate.setMonth(nextDate.getMonth() + months);
      }
      
      return nextDate.toLocaleDateString('vi-VN');
    } catch (error) {
      console.error("Lỗi tính ngày:", error);
      return 'Chưa xác định';
    }
  };
  
  const getFormattedDate = (dateObj) => {
    if (!dateObj) return '';
    
    try {
      const date = dateObj.seconds ? new Date(dateObj.seconds * 1000) : new Date(dateObj);
      return date.toLocaleDateString('vi-VN');
    } catch (e) {
      return '';
    }
  };

  const getFormattedTime = (timeString) => {
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-outline" size={70} color={COLORS.gray} />
      <Text style={styles.emptyText}>Chưa có giao dịch định kỳ nào</Text>
      <Text style={styles.emptySubText}>
        Thêm giao dịch định kỳ để nhận thông báo nhắc nhở tự động
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => setIsModalVisible(true)}
      >
        <Text style={styles.emptyButtonText}>Thêm giao dịch mới</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }) => {
    const nextDueDate = getNextDueDate(item.startDate, item.repeatMonths);
    
    return (
      <TouchableOpacity 
        style={styles.transactionCard}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.nameContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="repeat" size={18} color="#FFF" />
            </View>
            <Text style={styles.transactionName} numberOfLines={1}>{item.name}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => handleDelete(item.id, item.name)}
          >
            <Ionicons name="trash-outline" size={22} color={COLORS.error} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.amountContainer}>
          <Text style={styles.amountText}>
            {item.amount.toLocaleString('vi-VN')} VND
          </Text>
        </View>
        
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.gray} />
            <Text style={styles.detailText}>
              Bắt đầu: {getFormattedDate(item.startDate)}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color={COLORS.gray} />
            <Text style={styles.detailText}>
              Thông báo: {getFormattedTime(item.notificationTime)}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="sync-outline" size={16} color={COLORS.gray} />
            <Text style={styles.detailText}>
              Lặp lại: {item.repeatMonths} tháng/lần
            </Text>
          </View>
          
          <View style={styles.nextDueContainer}>
            <Text style={styles.nextDueLabel}>Lần tiếp theo:</Text>
            <Text style={styles.nextDueDate}>{nextDueDate}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Giao dịch định kỳ</Text>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setIsModalVisible(true)}
        >
          <Ionicons name="add-circle" size={28} color="#FFF" />
        </TouchableOpacity>
      </View>
      
      {/* Main Content */}
      <View style={styles.content}>
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
          </View>
        ) : (
          <FlatList
            data={transactions}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            onRefresh={fetchTransactions}
            refreshing={refreshing}
          />
        )}
      </View>
      
      {/* Add Transaction Button */}
      {!isModalVisible && transactions.length > 0 && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => setIsModalVisible(true)}
        >
          <Ionicons name="add" size={30} color="#FFF" />
        </TouchableOpacity>
      )}
      
      {/* Add Transaction Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm giao dịch định kỳ</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tên giao dịch</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="create-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập tên giao dịch"
                  placeholderTextColor="#AAA"
                  value={transactionName}
                  onChangeText={setTransactionName}
                  maxLength={50}
                />
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Số tiền</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="cash-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor="#AAA"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={handleAmountChange}
                />
                <Text style={styles.currencyLabel}>VND</Text>
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Ngày bắt đầu</Text>
              <TouchableOpacity 
                onPress={() => setShowDatePicker(true)}
                style={styles.datePickerButton}
              >
                <Ionicons name="calendar-outline" size={20} color={COLORS.gray} />
                <Text style={styles.datePickerText}>
                  {startDate.toLocaleDateString('vi-VN')}
                </Text>
                <Ionicons name="chevron-down" size={16} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Chu kỳ (tháng)</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="sync-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="1"
                  placeholderTextColor="#AAA"
                  keyboardType="numeric"
                  value={repeatMonths}
                  onChangeText={setRepeatMonths}
                  maxLength={2}
                />
                <Text style={styles.unitLabel}>tháng/lần</Text>
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Giờ thông báo</Text>
              <TouchableOpacity 
                onPress={() => setShowTimePicker(true)}
                style={styles.datePickerButton}
              >
                <Ionicons name="time-outline" size={20} color={COLORS.gray} />
                <Text style={styles.datePickerText}>
                  {notificationTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Ionicons name="chevron-down" size={16} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            
            {/* Date & Time Pickers */}
            {showDatePicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setStartDate(selectedDate);
                }}
              />
            )}
            
            {showTimePicker && (
              <DateTimePicker
                value={notificationTime}
                mode="time"
                display="default"
                onChange={(event, selectedTime) => {
                  setShowTimePicker(false);
                  if (selectedTime) setNotificationTime(selectedTime);
                }}
              />
            )}
            
            <View style={styles.buttonGroup}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Huỷ</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleAddTransaction}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color="#FFF" style={styles.buttonIcon} />
                    <Text style={styles.saveButtonText}>Lưu</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 15,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    marginTop: StatusBar.currentHeight || 0,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  actionButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  listContainer: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  transactionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  transactionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  deleteButton: {
    padding: 4,
  },
  amountContainer: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  detailsContainer: {
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.gray,
    marginLeft: 8,
  },
  nextDueContainer: {
    marginTop: 10,
    backgroundColor: 'rgba(98, 89, 255, 0.08)',
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nextDueLabel: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  nextDueDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.gray,
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 12,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  floatingButton: {
    backgroundColor: COLORS.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 20,
    right: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.modalBackground,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FFF',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: COLORS.text,
  },
  currencyLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray,
  },
  unitLabel: {
    fontSize: 14,
    color: COLORS.gray,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: '#FFF',
  },
  datePickerText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    color: COLORS.text,
  },
  buttonGroup: {
    flexDirection: 'row',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: COLORS.gray,
    fontWeight: '500',
  },
  saveButton: {
    flex: 2,
    height: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
  },
  buttonIcon: {
    marginRight: 8,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.gray,
    fontWeight: '500',
  },
});

// Make sure to export the component!
export default RecurringScreen;