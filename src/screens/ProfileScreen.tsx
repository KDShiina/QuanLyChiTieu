import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Dimensions,
  Linking,
  Share,
  RefreshControl
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut, updateProfile } from 'firebase/auth';
import { auth, db } from '../config/firebaseConfig';
import { doc, updateDoc, getDoc, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import Icon from 'react-native-vector-icons/Ionicons';
import { StatusBar } from 'expo-status-bar';
import SHA1 from 'crypto-js/sha1';
import { enc } from 'crypto-js';

const DEFAULT_AVATAR = 'https://img.lovepik.com/png/20231123/logo-for-a-cute-kitty-vector-sketch-behance-hd_679973_wh1200.png';
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dktzlyu8i/image/upload';
const CLOUDINARY_API_KEY = '968827773374592';
const CLOUDINARY_API_SECRET = 'EfiznNBModV-nVJ3IPLgZuzJLQA';

const windowWidth = Dimensions.get('window').width;

const ProfileScreen = ({ navigation }) => {
  const user = auth.currentUser;

  // Basic user info state
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || DEFAULT_AVATAR);
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userInfo, setUserInfo] = useState({
    bio: '',
    phone: '',
    currency: 'VND',
    monthlyBudget: '0',
    createdAt: '',
    address: '',
    occupation: ''
  });

  // Stats and summary data - Cập nhật với các trường mới
  const [expenseStats, setExpenseStats] = useState({
    totalBudget: 0,         // Ngân sách hàng tháng
    thisMonthSpent: 0,      // Chi tiêu tháng này
    thisMonthIncome: 0,     // Thu nhập tháng này
    totalTransactions: 0,   // Tổng số giao dịch
    expenseTransactions: 0, // Số giao dịch chi tiêu
    incomeTransactions: 0,  // Số giao dịch thu nhập
    avgDaily: 0,            // Trung bình chi tiêu hàng ngày
    netBalance: 0,          // Số dư ròng (thu nhập - chi tiêu)
  });

  // Modal states
  const [editBudgetVisible, setEditBudgetVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [editValue, setEditValue] = useState('');

  // Fetch user data function - Không có dependencies
  const fetchUserData = useCallback(async () => {
    if (!user?.uid) return null;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const newUserInfo = {
          bio: userData.bio || '',
          phone: userData.phone || '',
          currency: userData.currency || 'VND',
          monthlyBudget: userData.monthlyBudget?.toString() || '0',
          createdAt: new Date(userData.createdAt?.toDate()).toLocaleDateString('vi-VN') || '',
          address: userData.address || '',
          occupation: userData.occupation || ''
        };
        setUserInfo(newUserInfo);
        return newUserInfo;
      }
      return null;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  }, [user?.uid]);

  // Fetch expense stats function - Đã được sửa để phân biệt income và expense
  const fetchExpenseStats = useCallback(async (budgetInfo = null) => {
    if (!user?.uid) return;
    
    try {
      // Get current month's data
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const expensesRef = collection(db, 'expenses');
      const expensesQuery = query(
        expensesRef,
        where('userId', '==', user.uid),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(expensesQuery);
      
      let totalExpenses = 0;
      let totalIncome = 0;
      let monthlyExpenses = 0;
      let monthlyIncome = 0;
      let expenseTransactionCount = 0;
      let incomeTransactionCount = 0;
      
      querySnapshot.forEach(doc => {
        const transaction = doc.data();
        const amount = parseFloat(transaction.amount) || 0;
        const type = transaction.type || 'expense'; // Mặc định là expense nếu không có type
        
        // Check if transaction is from current month
        const transactionDate = transaction.date?.toDate() || new Date();
        const isCurrentMonth = transactionDate >= startOfMonth;
        
        if (type === 'expense') {
          // Tính chi tiêu
          totalExpenses += amount;
          expenseTransactionCount++;
          
          if (isCurrentMonth) {
            monthlyExpenses += amount;
          }
        } else if (type === 'income') {
          // Tính thu nhập
          totalIncome += amount;
          incomeTransactionCount++;
          
          if (isCurrentMonth) {
            monthlyIncome += amount;
          }
        }
      });
      
      // Calculate average daily spending for current month (chỉ tính chi tiêu)
      const daysInMonth = now.getDate();
      const avgDailyExpense = daysInMonth > 0 ? monthlyExpenses / daysInMonth : 0;
      
      // Use passed budgetInfo or current userInfo
      const monthlyBudget = budgetInfo 
        ? parseFloat(budgetInfo.monthlyBudget) || 0 
        : parseFloat(userInfo.monthlyBudget) || 0;
      
      const newStats = {
        totalSpent: totalExpenses, // Chỉ tính chi tiêu
        totalIncome: totalIncome, // Thêm tổng thu nhập
        totalBudget: monthlyBudget,
        thisMonthSpent: monthlyExpenses, // Chỉ tính chi tiêu tháng này
        thisMonthIncome: monthlyIncome, // Thêm thu nhập tháng này
        totalTransactions: expenseTransactionCount + incomeTransactionCount, // Tổng số giao dịch
        expenseTransactions: expenseTransactionCount, // Số giao dịch chi tiêu
        incomeTransactions: incomeTransactionCount, // Số giao dịch thu nhập
        avgDaily: avgDailyExpense, // Trung bình chi tiêu hàng ngày
        netBalance: totalIncome - totalExpenses, // Số dư ròng
        monthlyNetBalance: monthlyIncome - monthlyExpenses // Số dư ròng tháng này
      };
      
      setExpenseStats(newStats);
      return newStats;
    } catch (error) {
      console.error("Error fetching expense stats:", error);
    }
  }, [user?.uid, userInfo.monthlyBudget]);

  // Combined refresh function - Sửa lại để đồng bộ
  const refreshAllData = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      setRefreshing(true);
      // First fetch user data
      const userData = await fetchUserData();
      // Then fetch expense stats with the fresh user data
      if (userData) {
        await fetchExpenseStats(userData);
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
  }, [user?.uid, fetchUserData, fetchExpenseStats]);

  // Initial load effect - Chỉ chạy một lần khi component mount
  useEffect(() => {
    if (user?.uid) {
      refreshAllData();
    }
  }, [user?.uid]); // Bỏ refreshAllData khỏi dependencies để tránh loop

  // Effect để update expense stats khi monthlyBudget thay đổi
  useEffect(() => {
    if (userInfo.monthlyBudget !== '0' && user?.uid) {
      // Update expense stats với budget mới
      setExpenseStats(prev => ({
        ...prev,
        totalBudget: parseFloat(userInfo.monthlyBudget) || 0
      }));
    }
  }, [userInfo.monthlyBudget, user?.uid]);

  const uploadImageToCloudinary = async (uri) => {
    try {
      // Direct upload approach without upload presets
      const formData = new FormData();
      
      // Get the file name from the URI
      const uriParts = uri.split('.');
      const fileType = uriParts[uriParts.length - 1];
      
      // Create a timestamp for the signature
      const timestamp = Math.floor(Date.now() / 1000).toString();
      
      // Create signature string exactly as Cloudinary expects it
      const stringToSign = `timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
      const signature = generateSHA1(stringToSign);
      
      // Append the image file to FormData
      formData.append('file', {
        uri: uri,
        name: `photo.${fileType}`,
        type: `image/${fileType}`,
      } as any);
      
      // Add required parameters
      formData.append('api_key', CLOUDINARY_API_KEY);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);
      
      // Make the API request to Cloudinary
      const response = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Check if the request was successful
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Cloudinary response error:', response.status, errorText);
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      // Parse the response
      const data = await response.json();
      
      if (data.secure_url) {
        return data.secure_url;
      } else {
        console.error('Cloudinary response missing secure_url:', data);
        throw new Error('Không nhận được URL từ Cloudinary');
      }
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  };
  
  // Helper function to generate SHA1 hash for Cloudinary signature
  const generateSHA1 = (data) => {
    return SHA1(data).toString(enc.Hex);
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần quyền truy cập', 'Ứng dụng cần quyền truy cập vào thư viện ảnh');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled) {
        setLoading(true);
        const uri = result.assets[0].uri;
        
        try {
          // Upload to Cloudinary
          const cloudinaryUrl = await uploadImageToCloudinary(uri);
          
          // Update Firebase profile
          if (!auth.currentUser) throw new Error('User not authenticated');
          await updateProfile(auth.currentUser, { photoURL: cloudinaryUrl });
          
          // Update local state
          setPhotoURL(cloudinaryUrl);
          
          // Update in Firestore if you have a users collection
          try {
            const userRef = doc(db, 'users', auth.currentUser.uid);
            await updateDoc(userRef, {
              photoURL: cloudinaryUrl,
              updatedAt: new Date()
            });
          } catch (firestoreError) {
            console.error('Firestore update error:', firestoreError);
          }
          
          Alert.alert('Thành công', 'Ảnh đại diện đã được cập nhật');
        } catch (error) {
          console.error('Avatar update error:', error);
          Alert.alert('Lỗi', 'Không thể cập nhật ảnh đại diện');
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Image pick error:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        {
          text: 'Hủy',
          style: 'cancel'
        },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              // Navigation handled by auth state listener in App.js
            } catch (error) {
              console.error('Error signing out: ', error);
              Alert.alert('Lỗi', 'Không thể đăng xuất. Vui lòng thử lại sau.');
            }
          }
        }
      ]
    );
  };

  const showBudgetModal = () => {
    setEditValue(userInfo.monthlyBudget);
    setEditBudgetVisible(true);
  };

  const handleUpdateBudget = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      const budget = parseFloat(editValue);
      
      if (isNaN(budget) || budget < 0) {
        Alert.alert('Lỗi', 'Vui lòng nhập số hợp lệ');
        return;
      }
      
      const userRef = doc(db, 'users', user.uid);
      
      await updateDoc(userRef, {
        monthlyBudget: budget,
        updatedAt: new Date()
      });
      
      // Update local state immediately
      const newUserInfo = { ...userInfo, monthlyBudget: editValue };
      setUserInfo(newUserInfo);
      
      // Update expense stats với budget mới ngay lập tức
      setExpenseStats(prev => ({ ...prev, totalBudget: budget }));
      
      Alert.alert('Thành công', 'Ngân sách hàng tháng đã được cập nhật');
      setEditBudgetVisible(false);
      
    } catch (error) {
      console.error("Error updating budget:", error);
      Alert.alert('Lỗi', 'Không thể cập nhật ngân sách');
    } finally {
      setLoading(false);
    }
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: 'Hãy thử ứng dụng quản lý chi tiêu Finance Manager - Giúp bạn theo dõi và kiểm soát chi tiêu hiệu quả!',
        title: 'Finance Manager'
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleRateApp = () => {
    Alert.alert(
      'Đánh giá ứng dụng',
      'Bạn có muốn đánh giá ứng dụng trên App Store/Google Play?',
      [
        { text: 'Để sau', style: 'cancel' },
        { text: 'Đánh giá', onPress: () => {
          // In real app, would open app store
          Alert.alert('Cảm ơn!', 'Cảm ơn bạn đã sử dụng ứng dụng!');
        }}
      ]
    );
  };

  const handleFeedback = () => {
    Alert.alert(
      'Gửi phản hồi',
      'Chọn cách thức gửi phản hồi:',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Email', onPress: () => {
          Linking.openURL('mailto:financemgr@example.com?subject=Phản hồi về ứng dụng');
        }},
        { text: 'Điện thoại', onPress: () => {
          Linking.openURL('tel:+84123456789');
        }}
      ]
    );
  };

  // Navigation to Edit Profile Screen
  const navigateToEditProfile = () => {
    navigation.navigate('EditProfile', {
      userInfo: userInfo,
      displayName: displayName,
      onProfileUpdate: refreshAllData // Pass refresh function to update data when coming back
    });
  };

  const MenuOption = ({ icon, label, onPress, color = "#333", showBadge = false }) => (
    <TouchableOpacity style={styles.menuOption} onPress={onPress}>
      <View style={styles.menuIconContainer}>
        <Icon name={icon} size={22} color={color} />
        {showBadge && <View style={styles.badge} />}
      </View>
      <Text style={[styles.menuOptionText, { color }]}>{label}</Text>
      <Icon name="chevron-forward" size={18} color="#7e7e7e" />
    </TouchableOpacity>
  );

  const StatItem = ({ label, value, icon, color = "#4c669f" }) => (
    <View style={styles.statItem}>
      <View style={[styles.statIconContainer, { backgroundColor: color }]}>
        <Icon name={icon} size={22} color="#fff" />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );

  // Format number to currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: userInfo.currency || 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculate budget progress
  const budgetProgress = expenseStats.totalBudget > 0 
    ? Math.min(100, (expenseStats.thisMonthSpent / expenseStats.totalBudget) * 100) 
    : 0;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#4c669f', '#3b5998', '#192f6a']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.avatarContainer} onPress={pickImage} disabled={loading}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ffffff" />
              </View>
            ) : (
              <>
                <Image
                  source={{ uri: photoURL }}
                  style={styles.avatar}
                />
                <View style={styles.editIconContainer}>
                  <Icon name="camera" size={16} color="#fff" />
                </View>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.name}>{displayName || 'Chưa có tên'}</Text>
          <Text style={styles.email}>{email}</Text>
          
          {/* Edit Profile Button */}
          <TouchableOpacity style={styles.editProfileButton} onPress={navigateToEditProfile}>
            <Icon name="create-outline" size={16} color="#4c669f" />
            <Text style={styles.editProfileText}>Chỉnh sửa hồ sơ</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshAllData}
            colors={['#4c669f']}
            tintColor="#4c669f"
          />
        }
      >

        {/* Monthly Budget Summary */}
        <View style={styles.budgetCard}>
          <View style={styles.budgetHeader}>
            <Text style={styles.budgetTitle}>Ngân sách tháng này</Text>
            <TouchableOpacity onPress={showBudgetModal}>
              <Icon name="create-outline" size={22} color="#4c669f" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.budgetInfo}>
            <Text style={styles.budgetAmount}>
              {formatCurrency(expenseStats.thisMonthSpent)} / {formatCurrency(expenseStats.totalBudget)}
            </Text>
          </View>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${budgetProgress}%`, backgroundColor: budgetProgress > 90 ? '#ff3b30' : '#4c669f' }]} />
            </View>
            <Text style={styles.progressText}>
              {budgetProgress.toFixed(1)}% đã sử dụng
            </Text>
          </View>
        </View>

        {/* Expense Statistics - Cập nhật với thông tin đầy đủ hơn */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Thống kê tài chính</Text>

          {/* Thống kê tháng hiện tại */}
          <View style={styles.statsGrid}>
            <StatItem
              icon="card-outline"
              label="Chi tiêu tháng này"
              value={formatCurrency(expenseStats.thisMonthSpent)}
              color="#4c669f"
            />
            <StatItem
              icon="cash-outline"
              label="Thu nhập tháng này"
              value={formatCurrency(expenseStats.thisMonthIncome)}
              color="#28a745"
            />
          </View>

          {/* Thống kê giao dịch */}
          <View style={styles.statsGrid}>
            <StatItem
              icon="receipt-outline"
              label="Tổng giao dịch"
              value={expenseStats.totalTransactions.toString()}
              color="#ffc107"
            />
            <StatItem
              icon="trending-down-outline"
              label="Trung bình/ngày"
              value={formatCurrency(expenseStats.avgDaily)}
              color="#17a2b8"
            />
          </View>

          {/* Thống kê chi tiết giao dịch */}
          <View style={styles.statsGrid}>
            <StatItem
              icon="remove-circle-outline"
              label="Giao dịch chi tiêu"
              value={expenseStats.expenseTransactions.toString()}
              color="#ff8787"
            />
            <StatItem
              icon="add-circle-outline"
              label="Giao dịch thu nhập"
              value={expenseStats.incomeTransactions.toString()}
              color="#69db7c"
            />
          </View>
        </View>

        {/* App Features */}
        <View style={styles.menuSection}>
          <Text style={styles.menuTitle}>Tính năng ứng dụng</Text>
          <View style={styles.menuCard}>
            <MenuOption 
              icon="share-outline" 
              label="Chia sẻ ứng dụng" 
              onPress={handleShareApp}
            />
            <MenuOption 
              icon="star-outline" 
              label="Đánh giá ứng dụng" 
              onPress={handleRateApp}
            />
          </View>
        </View>

        {/* Support & Help */}
        <View style={styles.menuSection}>
          <Text style={styles.menuTitle}>Trợ giúp & Hỗ trợ</Text>
          <View style={styles.menuCard}>
            <MenuOption 
              icon="help-buoy-outline" 
              label="Trung tâm trợ giúp" 
              onPress={() => Alert.alert('Liên hệ hỗ trợ', 'Email: nhom14@gmail.com\nHotline: 123-4567-890')} 
            />
            <MenuOption 
              icon="chatbubbles-outline" 
              label="Gửi phản hồi" 
              onPress={handleFeedback}
            />
            <MenuOption 
              icon="information-circle-outline" 
              label="Điều khoản sử dụng" 
              onPress={() => Alert.alert('Điều khoản', 'Phiên bản 1.0 - Cập nhật 22/05/2025')}
            />
            <MenuOption 
              icon="shield-checkmark-outline" 
              label="Chính sách bảo mật" 
              onPress={() => Alert.alert('Bảo mật', 'Dữ liệu của bạn được mã hóa và bảo vệ an toàn')}
            />
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.menuSection}>
          <View style={styles.menuCard}>
            <MenuOption 
              icon="log-out-outline" 
              label="Đăng xuất" 
              onPress={handleLogout} 
              color="#ff3b30"
            />
          </View>
        </View>

        {/* App Information */}
        <View style={styles.appInfo}>
          <Image 
            source={{ uri: DEFAULT_AVATAR }} 
            style={styles.appLogo} 
          />
          <Text style={styles.appName}>Finance Manager</Text>
          <Text style={styles.appVersion}>Phiên bản: 1.0.0</Text>
          <Text style={styles.appDeveloper}>Phát triển bởi Nhóm 14</Text>
          <Text style={styles.appDescription}>
            Ứng dụng quản lý chi tiêu cá nhân thông minh
          </Text>
          {userInfo.createdAt && (
            <Text style={styles.joinDate}>Ngày tham gia: {userInfo.createdAt}</Text>
          )}
        </View>
      </ScrollView>

      {/* Edit Budget Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editBudgetVisible}
        onRequestClose={() => setEditBudgetVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cập nhật ngân sách hàng tháng</Text>
            
            <TextInput
              style={styles.modalInput}
              value={editValue}
              onChangeText={setEditValue}
              placeholder="Nhập ngân sách mới"
              keyboardType="numeric"
            />

            <Text style={styles.budgetHint}>
              Đơn vị: {userInfo.currency || 'VND'}
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setEditBudgetVisible(false)}
              >
                <Text style={styles.buttonText}>Hủy</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={handleUpdateBudget}
              >
                <Text style={[styles.buttonText, styles.saveButtonText]}>Lưu</Text>
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
    backgroundColor: '#f8f9fa',
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#ffffff',
    backgroundColor: '#e9ecef',
  },
  loadingContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4c669f',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 15,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 10,
  },
  editProfileText: {
    color: '#4c669f',
    fontWeight: '600',
    marginLeft: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  budgetCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  budgetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  budgetInfo: {
    marginBottom: 15,
  },
  budgetAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4c669f',
    textAlign: 'center',
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  statsContainer: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    flex: 0.48,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  menuSection: {
    marginBottom: 25,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  menuCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e9ecef',
  },
  menuIconContainer: {
    width: 35,
    height: 35,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff3b30',
  },
  menuOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  appLogo: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginBottom: 10,
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  appVersion: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 3,
  },
  appDeveloper: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 10,
  },
  appDescription: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 10,
  },
  joinDate: {
    fontSize: 12,
    color: '#8e8e93',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 25,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    marginBottom: 10,
  },
  budgetHint: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 25,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  saveButton: {
    backgroundColor: '#4c669f',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
  },
  saveButtonText: {
    color: '#ffffff',
  },
  settingsContent: {
    maxHeight: 300,
  },
  settingItem: {
    paddingVertical: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e9ecef',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10,
  },
  dangerButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  exportButton: {
    backgroundColor: '#28a745',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  importButton: {
    backgroundColor: '#17a2b8',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  importButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  resetButton: {
    backgroundColor: '#ffc107',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default ProfileScreen;