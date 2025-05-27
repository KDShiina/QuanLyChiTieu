import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, FlatList,
  SafeAreaView, StatusBar, KeyboardAvoidingView, Platform, Modal, ScrollView
} from 'react-native';
import {
  collection, addDoc, getDocs, deleteDoc, doc, query, where
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../config/firebaseConfig';
import {
  Ionicons, FontAwesome5, MaterialCommunityIcons, AntDesign, 
  Feather, MaterialIcons
} from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { WalletAccount } from '../types/inter';

const WalletScreen = () => {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [subType, setSubType] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterType, setFilterType] = useState('Tất cả');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const subTypeOptions: Record<string, string[]> = {
    'Ví điện tử': ['Momo', 'ZaloPay', 'VNPay', 'ShopeePay', 'Viettel Money', 'GrabPay', 'AirPay'],
    'Ngân hàng': ['Vietcombank', 'Techcombank', 'Vietinbank', 'BIDV', 'ACB', 'TPBank', 'MB Bank', 'Sacombank', 'VPBank', 'HDBank', 'Agribank', 'OCB']
  };

  const fetchAccounts = async () => {
    setIsRefreshing(true);
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      Alert.alert('Lỗi', 'Không tìm thấy người dùng!');
      setIsRefreshing(false);
      return;
    }

    const q = query(collection(db, 'walletAccounts'), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    const data: WalletAccount[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as WalletAccount),
    }));
    setAccounts(data);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const validateInputs = () => {
    if (!type) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn loại tài khoản.');
      return false;
    }

    if (!subType) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn phân loại.');
      return false;
    }

    if (!name.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên tài khoản.');
      return false;
    }

    if (!accountNumber.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số tài khoản.');
      return false;
    }

    // Validation cho số tài khoản ngân hàng
    if (type === 'Ngân hàng') {
      const accountNum = accountNumber.trim();
      if (!/^\d+$/.test(accountNum)) {
        Alert.alert('Lỗi định dạng', 'Số tài khoản ngân hàng chỉ được chứa số.');
        return false;
      }
      if (accountNum.length < 6 || accountNum.length > 20) {
        Alert.alert('Lỗi định dạng', 'Số tài khoản ngân hàng phải từ 6-20 chữ số.');
        return false;
      }
    }

    // Validation cho số điện thoại ví điện tử
    if (type === 'Ví điện tử') {
      const phoneNum = accountNumber.trim();
      if (!/^(0|\+84)[3-9]\d{8}$/.test(phoneNum)) {
        Alert.alert('Lỗi định dạng', 'Số điện thoại không hợp lệ (VD: 0912345678).');
        return false;
      }
    }

    return true;
  };

  const confirmAddAccount = () => {
    if (!validateInputs()) return;

    Alert.alert(
      'Xác nhận',
      `Bạn muốn thêm tài khoản "${name.trim()}"?`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xác nhận',
          style: 'default',
          onPress: addAccount,
        },
      ]
    );
  };

  const addAccount = async () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      Alert.alert('Lỗi', 'Người dùng chưa đăng nhập.');
      return;
    }

    await addDoc(collection(db, 'walletAccounts'), {
      userId: user.uid,
      name: name.trim(),
      type,
      subType,
      accountNumber: accountNumber.trim(),
    });

    Alert.alert('Thành công', 'Đã thêm tài khoản!');
    setName('');
    setType('');
    setSubType('');
    setAccountNumber('');
    setModalVisible(false);
    fetchAccounts();
  };

  const deleteAccount = async (id: string, accountName: string) => {
    Alert.alert(
      'Xác nhận xoá',
      `Bạn có chắc chắn muốn xoá tài khoản "${accountName}"?`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá',
          style: 'destructive',
          onPress: async () => {
            await deleteDoc(doc(db, 'walletAccounts', id));
            fetchAccounts();
          },
        },
      ]
    );
  };

  const getIconForAccount = (type: string, subType: string) => {
    if (type === 'Ví điện tử') {
      switch(subType) {
        case 'Momo':
          return <FontAwesome5 name="money-check" size={24} color="#a435f0" />;
        case 'ZaloPay':
          return <MaterialCommunityIcons name="wallet-plus" size={24} color="#0284c7" />;
        case 'VNPay':
          return <MaterialCommunityIcons name="wallet-outline" size={24} color="#0ea5e9" />;
        case 'ShopeePay':
          return <FontAwesome5 name="shopping-bag" size={24} color="#f97316" />;
        case 'GrabPay':
          return <MaterialCommunityIcons name="wallet" size={24} color="#00b14f" />;
        case 'Viettel Money':
          return <MaterialCommunityIcons name="cellphone-wireless" size={24} color="#dc2626" />;
        default:
          return <MaterialCommunityIcons name="wallet" size={24} color="#10b981" />;
      }
    }
    
    if (type === 'Ngân hàng') {
      switch(subType) {
        case 'Vietcombank':
          return <FontAwesome5 name="university" size={24} color="#059669" />;
        case 'Techcombank':
          return <MaterialCommunityIcons name="bank" size={24} color="#dc2626" />;
        case 'BIDV':
          return <FontAwesome5 name="landmark" size={24} color="#2563eb" />;
        case 'Vietinbank':
          return <FontAwesome5 name="money-check-alt" size={24} color="#7c3aed" />;
        case 'ACB':
          return <Ionicons name="card" size={24} color="#059669" />;
        case 'TPBank':
          return <MaterialCommunityIcons name="bank-outline" size={24} color="#f59e0b" />;
        case 'MB Bank':
          return <FontAwesome5 name="credit-card" size={24} color="#1d4ed8" />;
        case 'Agribank':
          return <FontAwesome5 name="seedling" size={24} color="#059669" />;
        default:
          return <Ionicons name="card" size={24} color="#3b82f6" />;
      }
    }
    
    return <Ionicons name="wallet-outline" size={24} color="#6b7280" />;
  };
  
  const getBackgroundColor = (type: string): [string, string] => {
    switch (type) {
      case 'Ví điện tử':
        return ['#dcfce7', '#86efac'];
      case 'Ngân hàng':
        return ['#dbeafe', '#93c5fd'];
      default:
        return ['#f3f4f6', '#d1d5db'];
    }
  };
  
  const renderAccountItem = ({ item }: { item: WalletAccount }) => (
    <LinearGradient
      colors={getBackgroundColor(item.type)}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.accountItem}
    >
      <View style={styles.accountDetails}>
        <View style={styles.iconContainer}>
          {getIconForAccount(item.type, item.subType)}
        </View>
        <View style={styles.accountInfo}>
          <Text style={styles.accountName}>{item.name}</Text>
          <Text style={styles.accountType}>
            {item.type}{item.subType ? ` - ${item.subType}` : ''}
          </Text>
          <Text style={styles.accountSubText}>
            <Text style={styles.accountLabel}>
              {item.type === 'Ngân hàng' ? 'SỐ TK: ' : 'SĐT: '}
            </Text>
            {item.accountNumber}
          </Text>
        </View>
      </View>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => Alert.alert('Thông báo', 'Tính năng sửa sẽ được cập nhật trong phiên bản tiếp theo!')}
        >
          <Feather name="edit-2" size={18} color="#0369a1" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => deleteAccount(item.id, item.name)}
        >
          <Feather name="trash-2" size={18} color="#b91c1c" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  const filteredAccounts = filterType === 'Tất cả' 
    ? accounts 
    : accounts.filter(account => account.type === filterType);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1d4ed8" />
        </TouchableOpacity>
        <Text style={styles.title}>Quản lý Tài khoản</Text>
        <View style={{width: 24}} />
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterType === 'Tất cả' && styles.filterButtonActive
            ]}
            onPress={() => setFilterType('Tất cả')}
          >
            <Text style={[
              styles.filterText,
              filterType === 'Tất cả' && styles.filterTextActive
            ]}>Tất cả</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterType === 'Ngân hàng' && styles.filterButtonActive
            ]}
            onPress={() => setFilterType('Ngân hàng')}
          >
            <Ionicons name="card" size={14} color={filterType === 'Ngân hàng' ? "#fff" : "#3b82f6"} />
            <Text style={[
              styles.filterText,
              filterType === 'Ngân hàng' && styles.filterTextActive
            ]}>Ngân hàng</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterType === 'Ví điện tử' && styles.filterButtonActive
            ]}
            onPress={() => setFilterType('Ví điện tử')}
          >
            <MaterialCommunityIcons name="wallet" size={14} color={filterType === 'Ví điện tử' ? "#fff" : "#10b981"} />
            <Text style={[
              styles.filterText,
              filterType === 'Ví điện tử' && styles.filterTextActive
            ]}>Ví điện tử</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Account List */}
      <FlatList
        data={filteredAccounts}
        keyExtractor={(item) => item.id}
        renderItem={renderAccountItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshing={isRefreshing}
        onRefresh={fetchAccounts}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="account-balance-wallet" size={60} color="#d1d5db" />
            <Text style={styles.emptyText}>Chưa có tài khoản nào</Text>
            <Text style={styles.emptySubText}>Thêm tài khoản ngân hàng hoặc ví điện tử để bắt đầu</Text>
          </View>
        }
      />

      {/* Add Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <AntDesign name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Add Account Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm tài khoản mới</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <AntDesign name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Loại tài khoản</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={type}
                  onValueChange={(val) => {
                    setType(val);
                    setSubType('');
                  }}
                >
                  <Picker.Item label="Chọn loại tài khoản" value="" />
                  <Picker.Item label="Ngân hàng" value="Ngân hàng" />
                  <Picker.Item label="Ví điện tử" value="Ví điện tử" />
                </Picker>
              </View>

              {type !== '' && (
                <>
                  <Text style={styles.label}>Phân loại</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={subType}
                      onValueChange={(val) => setSubType(val)}
                    >
                      <Picker.Item label="Chọn phân loại" value="" />
                      {(subTypeOptions[type] || []).map((item) => (
                        <Picker.Item key={item} label={item} value={item} />
                      ))}
                    </Picker>
                  </View>
                </>
              )}

              <Text style={styles.label}>Tên tài khoản</Text>
              <TextInput
                placeholder="Nhập tên tài khoản (VD: Tài khoản chính, Tài khoản tiết kiệm)"
                value={name}
                onChangeText={setName}
                style={styles.input}
              />

              <Text style={styles.label}>
                {type === 'Ngân hàng' ? 'Số tài khoản' : 'Số điện thoại'}
              </Text>
              <TextInput
                placeholder={
                  type === 'Ngân hàng' 
                    ? "Nhập số tài khoản ngân hàng" 
                    : "Nhập số điện thoại (VD: 0912345678)"
                }
                value={accountNumber}
                onChangeText={setAccountNumber}
                style={styles.input}
                keyboardType={type === 'Ngân hàng' ? 'numeric' : 'phone-pad'}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Huỷ bỏ</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={confirmAddAccount}
              >
                <Text style={styles.saveButtonText}>Lưu tài khoản</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  filterText: {
    fontSize: 14,
    color: '#4b5563',
    marginLeft: 4,
  },
  filterTextActive: {
    color: '#fff',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  accountItem: {
    borderRadius: 12,
    marginVertical: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  accountDetails: {
    flexDirection: 'row',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  accountType: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 2,
  },
  accountSubText: {
    fontSize: 13,
    color: '#6b7280',
  },
  accountLabel: {
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: '#fff',
  },
  editButton: {
    backgroundColor: '#e0f2fe',
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1d4ed8',
    justifyContent: 'center',
    alignItems: 'center',
    bottom: 24,
    right: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalBody: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  pickerWrapper: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    marginBottom: 16,
    overflow: 'hidden',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#4b5563',
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4b5563',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default WalletScreen;