import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../config/firebaseConfig';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import Icon from 'react-native-vector-icons/Ionicons';
import { StatusBar } from 'expo-status-bar';

const EditProfileScreen = ({ navigation, route }) => {
  const user = auth.currentUser;
  const { userInfo: initialUserInfo, displayName: initialDisplayName, onProfileUpdate } = route.params || {};

  // Form state
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: initialDisplayName || '',
    bio: initialUserInfo?.bio || '',
    phone: initialUserInfo?.phone || '',
    address: initialUserInfo?.address || '',
    occupation: initialUserInfo?.occupation || '',
    currency: initialUserInfo?.currency || 'VND',
    monthlyBudget: initialUserInfo?.monthlyBudget || '0',
  });

  // Currency options
  const currencyOptions = [
    { value: 'VND', label: '🇻🇳 VND - Việt Nam Đồng' },
    { value: 'USD', label: '🇺🇸 USD - US Dollar' },
    { value: 'EUR', label: '🇪🇺 EUR - Euro' },
    { value: 'JPY', label: '🇯🇵 JPY - Japanese Yen' },
    { value: 'GBP', label: '🇬🇧 GBP - British Pound' },
  ];

  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  useEffect(() => {
    // Load current user data when component mounts
    loadUserData();
  }, []);

  const loadUserData = async () => {
    if (!user?.uid) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setFormData({
          displayName: user.displayName || '',
          bio: userData.bio || '',
          phone: userData.phone || '',
          address: userData.address || '',
          occupation: userData.occupation || '',
          currency: userData.currency || 'VND',
          monthlyBudget: userData.monthlyBudget?.toString() || '0',
        });
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.displayName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên hiển thị');
      return false;
    }

    if (formData.phone && !/^[0-9+\-\s()]+$/.test(formData.phone)) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ');
      return false;
    }

    const budget = parseFloat(formData.monthlyBudget);
    if (isNaN(budget) || budget < 0) {
      Alert.alert('Lỗi', 'Ngân sách phải là số dương');
      return false;
    }

    return true;
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) return;
    if (!user?.uid) return;

    try {
      setLoading(true);

      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: formData.displayName.trim()
      });

      // Update Firestore user document
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        bio: formData.bio.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        occupation: formData.occupation.trim(),
        currency: formData.currency,
        monthlyBudget: parseFloat(formData.monthlyBudget),
        updatedAt: new Date()
      });

      Alert.alert('Thành công', 'Thông tin cá nhân đã được cập nhật', [
        {
          text: 'OK',
          onPress: () => {
            // Call the refresh function from ProfileScreen
            if (onProfileUpdate) {
              onProfileUpdate();
            }
            navigation.goBack();
          }
        }
      ]);

    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert('Lỗi', 'Không thể cập nhật thông tin. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  type FormFieldOptions = {
    multiline?: boolean;
    keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'number-pad' | 'decimal-pad' | 'visible-password';
    maxLength?: number;
    numberOfLines?: number;
    editable?: boolean;
  };

  const renderFormField = (
    label: string,
    field: keyof typeof formData,
    placeholder: string,
    options: FormFieldOptions = {}
  ) => {
    const {
      multiline = false,
      keyboardType = 'default',
      maxLength,
      numberOfLines = 1,
      editable = true
    } = options;

    return (
      <View style={styles.formGroup}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={[
            styles.input,
            multiline && styles.textArea,
            !editable && styles.disabledInput
          ]}
          value={formData[field]}
          onChangeText={(value) => handleInputChange(field, value)}
          placeholder={placeholder}
          placeholderTextColor="#999"
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          maxLength={maxLength}
          editable={editable}
        />
        {maxLength && (
          <Text style={styles.characterCount}>
            {formData[field].length}/{maxLength}
          </Text>
        )}
      </View>
    );
  };

  const CurrencyPicker = () => (
    <View style={styles.formGroup}>
      <Text style={styles.label}>Đơn vị tiền tệ</Text>
      <TouchableOpacity
        style={styles.currencySelector}
        onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
      >
        <Text style={styles.currencyText}>
          {currencyOptions.find(c => c.value === formData.currency)?.label || 'Chọn tiền tệ'}
        </Text>
        <Icon 
          name={showCurrencyPicker ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#666" 
        />
      </TouchableOpacity>
      
      {showCurrencyPicker && (
        <View style={styles.currencyDropdown}>
          {currencyOptions.map((currency) => (
            <TouchableOpacity
              key={currency.value}
              style={[
                styles.currencyOption,
                formData.currency === currency.value && styles.selectedCurrency
              ]}
              onPress={() => {
                handleInputChange('currency', currency.value);
                setShowCurrencyPicker(false);
              }}
            >
              <Text style={[
                styles.currencyOptionText,
                formData.currency === currency.value && styles.selectedCurrencyText
              ]}>
                {currency.label}
              </Text>
              {formData.currency === currency.value && (
                <Icon name="checkmark" size={20} color="#4c669f" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <LinearGradient
        colors={['#4c669f', '#3b5998', '#192f6a']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Chỉnh sửa hồ sơ</Text>
          
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveProfile}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="checkmark" size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
            
            {renderFormField(
              'Tên hiển thị *',
              'displayName',
              'Nhập tên hiển thị của bạn',
              { maxLength: 50 }
            )}

            {renderFormField(
              'Tiểu sử',
              'bio',
              'Viết vài dòng về bản thân...',
              { multiline: true, numberOfLines: 3, maxLength: 200 }
            )}

            {renderFormField(
              'Số điện thoại',
              'phone',
              '+84 xxx xxx xxx',
              { keyboardType: 'phone-pad', maxLength: 15 }
            )}

            {renderFormField(
              'Nghề nghiệp',
              'occupation',
              'Công việc hiện tại của bạn',
              { maxLength: 100 }
            )}

            {renderFormField(
              'Địa chỉ',
              'address',
              'Địa chỉ nơi bạn sinh sống',
              { multiline: true, numberOfLines: 2, maxLength: 200 }
            )}
          </View>

          {/* Financial Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cài đặt tài chính</Text>
            
            <CurrencyPicker />

            {renderFormField(
              'Ngân sách hàng tháng',
              'monthlyBudget',
              '0',
              { keyboardType: 'numeric' }
            )}

            <Text style={styles.budgetNote}>
              💡 Ngân sách hàng tháng giúp bạn kiểm soát chi tiêu hiệu quả hơn
            </Text>
          </View>

          {/* Account Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin tài khoản</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>UID:</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {user?.uid}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tài khoản được tạo:</Text>
              <Text style={styles.infoValue}>
                {user?.metadata?.creationTime ? 
                  new Date(user.metadata.creationTime).toLocaleDateString('vi-VN') : 
                  'Không rõ'}
              </Text>
            </View>
          </View>

          {/* Tips Section */}
          <View style={styles.tipsSection}>
            <Text style={styles.tipsTitle}>💡 Mẹo sử dụng</Text>
            <Text style={styles.tipsText}>
              • Cập nhật thông tin đầy đủ để có trải nghiệm tốt nhất{'\n'}
              • Đặt ngân sách hàng tháng phù hợp với thu nhập{'\n'}
              • Thường xuyên kiểm tra và điều chỉnh ngân sách{'\n'}
              • Sử dụng tiểu sử để ghi chú mục tiêu tài chính
            </Text>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  disabledInput: {
    backgroundColor: '#f8f9fa',
    color: '#6c757d',
  },
  characterCount: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'right',
    marginTop: 5,
  },
  currencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  currencyText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  currencyDropdown: {
    marginTop: 5,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    maxHeight: 200,
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e9ecef',
  },
  selectedCurrency: {
    backgroundColor: '#f0f4ff',
  },
  currencyOptionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  selectedCurrencyText: {
    color: '#4c669f',
    fontWeight: '600',
  },
  budgetNote: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
    marginTop: 5,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e9ecef',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  tipsSection: {
    backgroundColor: '#fff3cd',
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 10,
  },
  tipsText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 22,
  },
  bottomPadding: {
    height: 30,
  },
});

export default EditProfileScreen;