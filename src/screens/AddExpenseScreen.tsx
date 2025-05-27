import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import * as Location from 'expo-location';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../config/firebaseConfig';
import { addDoc, collection, Timestamp, getDocs, updateDoc, doc } from 'firebase/firestore';

const NOMINATIM_API_URL = 'https://nominatim.openstreetmap.org/reverse';

// Hàm định dạng số tiền với dấu phân cách hàng nghìn
const formatNumber = (num) => {
  if (!num) return '';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const AddExpenseScreen = ({ route, navigation }) => {
  const { type, category, categoryColor, selectedAddress, selectedLocation } = route.params;

  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [location, setLocation] = useState('');
  const [coords, setCoords] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [walletAccounts, setWalletAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('cash');
  const [submitting, setSubmitting] = useState(false);

  const isExpense = type === 'expense';
  const screenTitle = isExpense ? 'Chi tiêu mới' : 'Thu nhập mới';

  // Lắng nghe sự thay đổi từ route params khi quay lại từ SelectLocation
  useEffect(() => {
    if (selectedAddress && selectedLocation) {
      setLocation(selectedAddress);
      const [lat, lon] = selectedLocation.split(',').map(Number);
      setCoords({ latitude: lat, longitude: lon });
    }
  }, [selectedAddress, selectedLocation]);

  // Thêm focus listener để cập nhật khi quay lại từ màn hình khác
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Kiểm tra lại params khi màn hình được focus
      const params = route.params;
      if (params?.selectedAddress && params?.selectedLocation) {
        setLocation(params.selectedAddress);
        const [lat, lon] = params.selectedLocation.split(',').map(Number);
        setCoords({ latitude: lat, longitude: lon });
      }
    });

    return unsubscribe;
  }, [navigation, route.params]);

  useEffect(() => {
    const fetchWalletAccounts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'walletAccounts'));
        const accountsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setWalletAccounts(accountsData);
      } catch (error) {
        console.error('Lỗi lấy tài khoản ví:', error);
        Alert.alert('Thông báo', 'Không thể tải danh sách tài khoản. Vui lòng thử lại sau.');
      }
    };
    fetchWalletAccounts();
  }, []);

  // Format số tiền khi nhập
  const handleAmountChange = (text) => {
    // Chỉ cho phép nhập số
    const cleanedText = text.replace(/[^0-9]/g, '');
    setAmount(cleanedText);
    
    // Hiển thị định dạng số có dấu phân cách hàng nghìn
    if (cleanedText) {
      const formattedAmount = formatNumber(cleanedText);
      setDisplayAmount(formattedAmount);
    } else {
      setDisplayAmount('');
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLoadingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Quyền truy cập',
          'Ứng dụng cần quyền truy cập vị trí để hoạt động chính xác.',
          [{ text: 'Đóng' }]
        );
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const { latitude, longitude } = currentLocation.coords;
      setCoords({ latitude, longitude });

      // Lấy địa chỉ từ tọa độ
      try {
        const response = await axios.get(NOMINATIM_API_URL, {
          params: {
            lat: latitude,
            lon: longitude,
            format: 'json',
            'accept-language': 'vi',
          },
          headers: {
            'User-Agent': 'FinanceTrackerApp/1.0',
          },
        });

        const address = response.data.display_name;
        setLocation(address);
      } catch (error) {
        console.error('Lỗi khi lấy địa chỉ:', error);
        setLocation(`${latitude}, ${longitude}`);
      }
    } catch (error) {
      console.error('Lỗi lấy vị trí:', error);
      Alert.alert('Thông báo', 'Không thể lấy vị trí hiện tại. Vui lòng thử lại sau.');
    } finally {
      setLoadingLocation(false);
    }
  };

  const openMapToSelectLocation = () => {
    navigation.navigate('SelectLocation', {
      categoryType: type,
      category: category,
      currentCoords: coords,
      // Truyền callback function để nhận dữ liệu
      onLocationSelected: (selectedAddress, selectedLocation) => {
        setLocation(selectedAddress);
        const [lat, lon] = selectedLocation.split(',').map(Number);
        setCoords({ latitude: lat, longitude: lon });
      }
    });
  };

  const validateInput = () => {
    if (!reason.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập lý do cho giao dịch này');
      return false;
    }
    
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Thông báo', 'Vui lòng nhập số tiền hợp lệ');
      return false;
    }
    
    if (!selectedAccount) {
      Alert.alert('Thông báo', 'Vui lòng chọn tài khoản thanh toán');
      return false;
    }
    
    return true;
  };

  const handleAddTransaction = async () => {
    if (!validateInput()) return;

    // Hiển thị dialog xác nhận
    Alert.alert(
      'Xác nhận giao dịch',
      `Bạn có chắc chắn muốn thêm ${isExpense ? 'khoản chi' : 'khoản thu'} này?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đồng ý', onPress: () => addTransaction() },
      ],
      { cancelable: true }
    );
  };

  const addTransaction = async () => {
    try {
      setSubmitting(true);
      const finalLocation = location || 'Không có địa chỉ';
      const finalCoords = coords ? `${coords.latitude},${coords.longitude}` : null;
      const amountValue = parseFloat(amount);
      
      const userId = auth.currentUser?.uid;
      if (!userId) {
        Alert.alert('Lỗi xác thực', 'Vui lòng đăng nhập lại để thực hiện giao dịch');
        navigation.navigate('Login');
        return;
      }

      // Tạo document mới trong collection expenses
      const docRef = await addDoc(collection(db, 'expenses'), {
        reason,
        amount: amountValue,
        category,
        categoryColor,
        address: finalLocation,
        location: finalCoords,
        date: Timestamp.now(),
        type,
        userId,
        account: selectedAccount,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Cập nhật số dư tài khoản
      if (selectedAccount !== 'cash') {
        const accountRef = doc(db, 'walletAccounts', selectedAccount);
        const accountDoc = walletAccounts.find(acc => acc.id === selectedAccount);
        
        if (accountDoc) {
          const newBalance = isExpense 
            ? accountDoc.balance - amountValue 
            : accountDoc.balance + amountValue;
            
          await updateDoc(accountRef, {
            balance: newBalance,
            updatedAt: Timestamp.now()
          });
        }
      }

      Alert.alert(
        'Thành công',
        'Giao dịch đã được lưu thành công',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Lỗi khi thêm giao dịch:', error);
      Alert.alert('Lỗi', 'Không thể lưu giao dịch. Vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderAccountItem = (account) => {
    let icon = 'money-bill-wave';
    let color = '#2ecc71';

    if (account.type === 'bank') {
      icon = 'university';
      color = '#3498db';
    } else if (account.type === 'ewallet') {
      icon = 'wallet';
      color = '#9b59b6';
    } else if (account.type === 'credit') {
      icon = 'credit-card';
      color = '#e74c3c';
    }

    return (
      <View style={styles.accountItem}>
        <FontAwesome5 name={icon} size={16} color={color} style={styles.accountIcon} />
        <Text style={styles.accountText}>
          {account.name} {account.balance ? `(${formatNumber(account.balance)} đ)` : ''}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{screenTitle}</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Category Badge */}
          <View style={styles.categoryContainer}>
            <View
              style={[styles.categoryIndicator, { backgroundColor: categoryColor }]}
            />
            <Text style={styles.categoryText}>{category}</Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {/* Reason Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Lý do</Text>
              <View style={styles.inputWithIcon}>
                <MaterialCommunityIcons name="text-short" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  placeholder="Nhập lý do giao dịch"
                  placeholderTextColor="#999"
                  style={styles.textInput}
                  value={reason}
                  onChangeText={setReason}
                  maxLength={100}
                />
              </View>
            </View>

            {/* Amount Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Số tiền</Text>
              <View style={styles.inputWithIcon}>
                <MaterialCommunityIcons name="currency-usd" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  placeholder="0"
                  placeholderTextColor="#999"
                  style={[styles.textInput, styles.amountInput]}
                  value={displayAmount}
                  onChangeText={handleAmountChange}
                  keyboardType="numeric"
                />
                <Text style={styles.currencyLabel}>đ</Text>
              </View>
            </View>

            {/* Location Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Địa điểm (tùy chọn)</Text>
              <View style={styles.inputWithButtons}>
                <View style={[styles.inputWithIcon, { flex: 1 }]}>
                  <Ionicons name="location-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    placeholder="Nhập hoặc chọn địa điểm"
                    placeholderTextColor="#999"
                    style={[styles.textInput, { flex: 1 }]}
                    value={location}
                    onChangeText={setLocation}
                    multiline={true}
                    numberOfLines={2}
                  />
                </View>
                <TouchableOpacity 
                  style={styles.locationButton} 
                  onPress={getCurrentLocation}
                  disabled={loadingLocation}
                >
                  {loadingLocation ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="locate" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.mapButton} onPress={openMapToSelectLocation}>
                  <Ionicons name="map-outline" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Account Picker */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tài khoản thanh toán</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedAccount}
                  onValueChange={setSelectedAccount}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                  dropdownIconColor="#666"
                >
                  <Picker.Item 
                    label="Tiền mặt" 
                    value="cash" 
                    style={styles.pickerItemText}
                  />
                  {walletAccounts.map((account) => (
                    <Picker.Item
                      key={account.id}
                      label={`${account.name} (${account.type})`}
                      value={account.id}
                      style={styles.pickerItemText}
                    />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          {/* Debug info - có thể xóa sau khi test */}
          {location && (
            <View style={styles.debugContainer}>
              <Text style={styles.debugText}>Địa chỉ đã chọn: {location}</Text>
              {coords && (
                <Text style={styles.debugText}>
                  Tọa độ: {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
                </Text>
              )}
            </View>
          )}
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: isExpense ? '#e74c3c' : '#2ecc71' },
              submitting && styles.disabledButton
            ]}
            onPress={handleAddTransaction}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons
                  name={isExpense ? 'arrow-down-outline' : 'arrow-up-outline'}
                  size={20}
                  color="#fff"
                  style={styles.buttonIcon}
                />
                <Text style={styles.buttonText}>
                  {isExpense ? 'Lưu khoản chi' : 'Lưu khoản thu'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 10,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 34,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  categoryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 8,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  amountInput: {
    fontWeight: '600',
    textAlign: 'right',
  },
  currencyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginLeft: 8,
  },
  inputWithButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationButton: {
    backgroundColor: '#3498db',
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  mapButton: {
    backgroundColor: '#9b59b6',
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  pickerItem: {
    height: 50,
  },
  pickerItemText: {
    fontSize: 16,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountIcon: {
    marginRight: 8,
  },
  accountText: {
    fontSize: 16,
  },
  debugContainer: {
    backgroundColor: '#e8f4f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  debugText: {
    fontSize: 12,
    color: '#2c3e50',
    marginBottom: 4,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddExpenseScreen;