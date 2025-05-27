
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ScrollView, 
  ActivityIndicator,
  Animated,
  Dimensions,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../config/firebaseConfig';
import moment from 'moment';
import 'moment/locale/vi'; // Cài đặt tiếng Việt
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');
moment.locale('vi');

// Replace VictoryPie with a custom circular progress component
const CircularProgress = ({ progress, size = 250, strokeWidth = 15 }) => {
  // Đảm bảo progress luôn là một số không âm và không lớn hơn 100
  const safeProgress = Math.max(0, Math.min(100, isNaN(progress) ? 0 : progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (safeProgress / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ 
        width: size, 
        height: size, 
        borderRadius: size/2,
        position: 'absolute',
        borderWidth: strokeWidth,
        borderColor: '#e0e0e0'
      }} />
      
      <View style={{ 
        width: size, 
        height: size, 
        borderRadius: size/2,
        position: 'absolute',
        borderWidth: strokeWidth,
        borderColor: '#6a11cb',
        borderTopColor: safeProgress > 25 ? '#6a11cb' : 'transparent',
        borderRightColor: safeProgress > 50 ? '#6a11cb' : 'transparent',
        borderBottomColor: safeProgress > 75 ? '#6a11cb' : 'transparent',
        transform: [{ rotate: `-${90 - (safeProgress * 3.6)}deg` }],
      }} />
      
      <View style={{ 
        backgroundColor: 'white', 
        width: size - strokeWidth * 2 - 10, 
        height: size - strokeWidth * 2 - 10, 
        borderRadius: (size - strokeWidth * 2 - 10) / 2,
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#6a11cb' }}>
          {safeProgress.toFixed(1)}%
        </Text>
        <Text style={{ fontSize: 16, color: '#333' }}>
          hoàn thành
        </Text>
      </View>
    </View>
  );
};

const GoalScreen = ({ navigation }) => {
  // States
  const [goalAmount, setGoalAmount] = useState('');
  const [goalName, setGoalName] = useState('');
  const [goalTime, setGoalTime] = useState('');
  const [progress, setProgress] = useState(0);
  const [savedAmount, setSavedAmount] = useState('0');
  const [loading, setLoading] = useState(false);
  const [goals, setGoals] = useState([]);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Animated values
  const progressAnimation = new Animated.Value(0);
  const scaleAnim = useState(new Animated.Value(1))[0];
  
  // Set navigation options - điều chỉnh cấu hình header
  useEffect(() => {
    // Thiết lập trực tiếp options của navigation thay vì sử dụng useNavigation
    navigation.setOptions({
      headerShown: true,
      headerTitle: 'Mục tiêu tài chính',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
      headerLeft: () => (
        <TouchableOpacity
          style={{ marginLeft: 15 }}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1d4ed8" />
        </TouchableOpacity>
      ),
      headerStyle: {
        backgroundColor: '#fff', 
        elevation: 5, // Tăng độ nổi cho Android
        shadowOpacity: 0.3, // Tăng độ đổ bóng cho iOS
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
      },
    });
  }, [navigation]);
  
  useEffect(() => {
    loadGoals();
  }, []);

  useEffect(() => {
    if (selectedGoal) {
      // Đảm bảo progress là số hợp lệ
      const safeProgress = Math.max(0, Math.min(100, isNaN(selectedGoal.progress) ? 0 : selectedGoal.progress));
      
      Animated.timing(progressAnimation, {
        toValue: safeProgress,
        duration: 1000,
        useNativeDriver: false
      }).start();
    }
  }, [selectedGoal]);

  // Tải mục tiêu từ Firestore - ĐÃ SỬA
  const loadGoals = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        Alert.alert('Lỗi', 'Bạn cần đăng nhập để xem mục tiêu');
        setLoading(false);
        return;
      }
      
      const goalsRef = collection(db, 'financialGoals');
      // Chỉ dùng where, không dùng orderBy để tránh phải tạo composite index
      const q = query(
        goalsRef, 
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const goalsData = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        
        // Đảm bảo savedAmount và goalAmount là số hợp lệ
        const savedAmount = typeof data.savedAmount === 'number' ? data.savedAmount : 0;
        const goalAmount = typeof data.goalAmount === 'number' && data.goalAmount > 0 ? data.goalAmount : 1;
        
        // Tính toán tiến độ và đảm bảo giá trị hợp lệ
        const calculatedProgress = (savedAmount / goalAmount) * 100;
        const progress = Math.max(0, Math.min(100, calculatedProgress));
        
        return {
          id: docSnap.id,
          ...data,
          savedAmount: savedAmount,
          goalAmount: goalAmount,
          createdAt: data.createdAt, // Ensure createdAt is present
          endDate: data.endDate,     // Ensure endDate is present if used elsewhere
          progress: progress
        };
      });
      
      // Sắp xếp phía client thay vì dùng orderBy trên server
      goalsData.sort((a, b) => {
        const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
        const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
        return dateB - dateA; // Sắp xếp giảm dần (mới nhất trước)
      });
      
      setGoals(goalsData);
      
      if (goalsData.length > 0) {
        setSelectedGoal(goalsData[0]);
      }
      
    } catch (error) {
      console.error('Error loading goals:', error);
      Alert.alert('Lỗi', 'Không thể tải mục tiêu của bạn. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  // Lưu mục tiêu mới vào Firestore
  const handleSetGoal = async () => {
    try {
      if (!goalAmount || !goalTime || !goalName) {
        Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ tên, số tiền và thời gian mục tiêu');
        return;
      }
      
      // Kiểm tra số tiền và thời gian hợp lệ
      const parsedAmount = parseFloat(goalAmount);
      const parsedTime = parseInt(goalTime);
      
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        Alert.alert('Lỗi', 'Vui lòng nhập số tiền hợp lệ (lớn hơn 0)');
        return;
      }
      
      if (isNaN(parsedTime) || parsedTime <= 0) {
        Alert.alert('Lỗi', 'Vui lòng nhập thời gian hợp lệ (lớn hơn 0)');
        return;
      }
      
      setIsSubmitting(true);
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        Alert.alert('Lỗi', 'Bạn cần đăng nhập để tạo mục tiêu');
        setIsSubmitting(false);
        return;
      }
      
      const goalData = {
        goalName: goalName,
        goalAmount: parsedAmount,
        goalTime: parsedTime,
        savedAmount: 0,
        progress: 0,
        userId: userId,
        createdAt: new Date(),
        endDate: moment().add(parsedTime, 'months').toDate(),
        transactions: []
      };
      
      const docRef = await addDoc(collection(db, 'financialGoals'), goalData);
      
      // Animate button
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      
      Alert.alert('Thành công', 'Đã tạo mục tiêu tài chính mới');
      
      // Reset form
      setGoalName('');
      setGoalAmount('');
      setGoalTime('');
      setShowGoalForm(false);
      
      // Reload goals
      loadGoals();
      
    } catch (error) {
      console.error('Error creating goal:', error);
      Alert.alert('Lỗi', 'Không thể tạo mục tiêu. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cập nhật tiến độ
  const handleUpdateProgress = async () => {
    try {
      if (!selectedGoal) {
        Alert.alert('Lỗi', 'Vui lòng chọn một mục tiêu');
        return;
      }
      
      if (!depositAmount || parseFloat(depositAmount) <= 0) {
        Alert.alert('Thiếu thông tin', 'Vui lòng nhập số tiền hợp lệ');
        return;
      }
      
      setIsSubmitting(true);
      
      const depositValue = parseFloat(depositAmount);
      
      // Đảm bảo savedAmount là số hợp lệ
      const currentSavedAmount = typeof selectedGoal.savedAmount === 'number' ? selectedGoal.savedAmount : 0;
      const goalAmountValue = typeof selectedGoal.goalAmount === 'number' && selectedGoal.goalAmount > 0 
        ? selectedGoal.goalAmount : 1;
      
      const newSavedAmount = currentSavedAmount + depositValue;
      
      // Tính toán tiến độ và đảm bảo không âm hoặc vượt quá 100%
      const calculatedProgress = (newSavedAmount / goalAmountValue) * 100;
      const newProgress = Math.max(0, Math.min(100, calculatedProgress));
      
      const transaction = {
        amount: depositValue,
        date: new Date(),
        type: 'deposit'
      };
      
      // Đảm bảo transactions là một mảng
      const currentTransactions = Array.isArray(selectedGoal.transactions) ? selectedGoal.transactions : [];
      
      // Update Firestore document
      const goalRef = doc(db, 'financialGoals', selectedGoal.id);
      await updateDoc(goalRef, {
        savedAmount: newSavedAmount,
        transactions: [...currentTransactions, transaction]
      });
      
      // Update local state
      const updatedGoal = {
        ...selectedGoal,
        savedAmount: newSavedAmount,
        progress: newProgress,
        transactions: [...currentTransactions, transaction]
      };
      
      setSelectedGoal(updatedGoal);
      
      // Update goals list
      const updatedGoals = goals.map(goal => 
        goal.id === selectedGoal.id ? updatedGoal : goal
      );
      setGoals(updatedGoals);
      
      // Animate progress
      Animated.timing(progressAnimation, {
        toValue: newProgress,
        duration: 1000,
        useNativeDriver: false
      }).start();
      
      setDepositAmount('');
      
      Alert.alert('Thành công', 'Đã cập nhật tiến độ mục tiêu');
      
    } catch (error) {
      console.error('Error updating progress:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật tiến độ. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Định dạng số tiền thành VND - Sửa để xử lý đúng các giá trị
  const formatCurrency = (amount) => {
    // Đảm bảo amount là số hợp lệ
    const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    
    try {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
      }).format(safeAmount);
    } catch (error) {
      console.error('Error formatting currency:', error);
      return `${safeAmount.toLocaleString()} VND`;
    }
  };

  // Định dạng phần trăm - Sửa để xử lý đúng các giá trị
  const formatPercentage = (value) => {
    // Đảm bảo value là số hợp lệ và nằm trong khoảng 0-100
    const safeValue = typeof value === 'number' && !isNaN(value) 
      ? Math.max(0, Math.min(100, value))
      : 0;
    
    return `${safeValue.toFixed(1)}%`;
  };

  // Helper function to safely format dates
  const formatTransactionDate = (dateObj) => {
    try {
      // Check if dateObj exists and has toDate method (Firebase Timestamp)
      if (dateObj && typeof dateObj.toDate === 'function') {
        return moment(dateObj.toDate()).format('DD/MM/YYYY HH:mm');
      } 
      // Check if dateObj is a Date object
      else if (dateObj instanceof Date) {
        return moment(dateObj).format('DD/MM/YYYY HH:mm');
      }
      // Default case for missing or invalid date
      else {
        console.warn("Invalid date object encountered", dateObj);
        return "Không xác định";
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return "Không xác định";
    }
  };

  const renderGoalCard = (goal) => {
    const isSelected = selectedGoal && selectedGoal.id === goal.id;
    // Safely handle endDate - it might be a Firebase Timestamp or a JavaScript Date
    let endDate;
    try {
      if (goal.endDate) {
        if (typeof goal.endDate.toDate === 'function') {
          endDate = goal.endDate.toDate();
        } else if (goal.endDate instanceof Date) {
          endDate = goal.endDate;
        } else {
          endDate = new Date(); // Fallback
        }
      } else {
        endDate = new Date(); // Default to current date if endDate is missing
      }
      
      const daysLeft = moment(endDate).diff(moment(), 'days');
      
      // Đảm bảo progress là số hợp lệ
      const progress = typeof goal.progress === 'number' && !isNaN(goal.progress) 
        ? Math.max(0, Math.min(100, goal.progress))
        : 0;
      
      return (
        <TouchableOpacity
          key={goal.id}
          style={[
            styles.goalCard,
            isSelected && styles.selectedGoalCard
          ]}
          onPress={() => setSelectedGoal(goal)}
        >
          <View style={styles.goalCardHeader}>
            <Text style={styles.goalCardTitle} numberOfLines={1}>{goal.goalName}</Text>
            <View style={[
              styles.statusBadge, 
              {backgroundColor: progress >= 100 ? '#4CAF50' : '#FFA000'}
            ]}>
              <Text style={styles.statusText}>
                {progress >= 100 ? 'Hoàn thành' : 'Đang tiến hành'}
              </Text>
            </View>
          </View>
          
          <View style={styles.goalProgressContainer}>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  {width: `${progress}%`}
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {formatPercentage(progress)}
            </Text>
          </View>
          
          <View style={styles.goalDetailsRow}>
            <View style={styles.goalDetailItem}>
              <Text style={styles.goalDetailLabel}>Mục tiêu</Text>
              <Text style={styles.goalDetailValue}>{formatCurrency(goal.goalAmount)}</Text>
            </View>
            <View style={styles.goalDetailItem}>
              <Text style={styles.goalDetailLabel}>Đã tiết kiệm</Text>
              <Text style={styles.goalDetailValue}>{formatCurrency(goal.savedAmount)}</Text>
            </View>
            <View style={styles.goalDetailItem}>
              <Text style={styles.goalDetailLabel}>Còn lại</Text>
              <Text style={styles.goalDetailValue}>{Math.max(0, daysLeft)} ngày</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    } catch (error) {
      console.error('Error rendering goal card:', error);
      return null; // Return null on error to prevent rendering issues
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView style={styles.container}>
        <LinearGradient
          colors={['#6a11cb', '#2575fc']}
          style={styles.headerGradient}
        >
          <Text style={styles.headerTitle}>Mục tiêu tài chính</Text>
          <Text style={styles.headerSubtitle}>Lập kế hoạch và theo dõi tiết kiệm của bạn</Text>
        </LinearGradient>
        
        {/* Danh sách mục tiêu */}
        <View style={styles.goalsListContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Các mục tiêu của bạn</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowGoalForm(true)}
            >
              <FontAwesome name="plus" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <ActivityIndicator size="large" color="#6a11cb" style={styles.loader} />
          ) : goals.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.goalsList}
            >
              {goals.map(goal => renderGoalCard(goal))}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="savings" size={60} color="#ccc" />
              <Text style={styles.emptyStateText}>Bạn chưa có mục tiêu nào</Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={() => setShowGoalForm(true)}
              >
                <Text style={styles.emptyStateButtonText}>Tạo mục tiêu đầu tiên</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {/* Form tạo mục tiêu mới */}
        {showGoalForm && (
          <View style={styles.formContainer}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Tạo mục tiêu mới</Text>
              <TouchableOpacity onPress={() => setShowGoalForm(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tên mục tiêu</Text>
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: Mua xe máy, Du lịch Đà Lạt..."
                value={goalName}
                onChangeText={setGoalName}
                maxLength={50}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Số tiền mục tiêu (VND)</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập số tiền cần tiết kiệm"
                value={goalAmount}
                keyboardType="numeric"
                onChangeText={(text) => setGoalAmount(text.replace(/[^0-9]/g, ''))}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Thời gian (tháng)</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập số tháng cần để đạt mục tiêu"
                value={goalTime}
                keyboardType="numeric"
                onChangeText={(text) => setGoalTime(text.replace(/[^0-9]/g, ''))}
                maxLength={3}
              />
            </View>
            
            <Animated.View style={{transform: [{scale: scaleAnim}]}}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSetGoal}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Tạo mục tiêu</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}
        
        {/* Chi tiết mục tiêu được chọn */}
        {selectedGoal && (
          <View style={styles.detailsContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Chi tiết mục tiêu</Text>
            </View>
            
            <View style={styles.goalDetailCard}>
              <Text style={styles.detailTitle}>{selectedGoal.goalName}</Text>
              
              <View style={styles.chartContainer}>
                {/* Đảm bảo truyền giá trị progress hợp lệ */}
                <CircularProgress 
                  progress={typeof selectedGoal.progress === 'number' && !isNaN(selectedGoal.progress) 
                    ? Math.max(0, Math.min(100, selectedGoal.progress)) 
                    : 0} 
                  size={250} 
                  strokeWidth={15} 
                />
              </View>
              
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <MaterialIcons name="attach-money" size={24} color="#6a11cb" />
                  <View>
                    <Text style={styles.detailLabel}>Mục tiêu</Text>
                    <Text style={styles.detailValue}>
                      {formatCurrency(selectedGoal.goalAmount)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.detailItem}>
                  <MaterialIcons name="savings" size={24} color="#6a11cb" />
                  <View>
                    <Text style={styles.detailLabel}>Đã tiết kiệm</Text>
                    <Text style={styles.detailValue}>
                      {formatCurrency(selectedGoal.savedAmount)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.detailItem}>
                  <MaterialIcons name="account-balance-wallet" size={24} color="#6a11cb" />
                  <View>
                    <Text style={styles.detailLabel}>Còn thiếu</Text>
                    <Text style={styles.detailValue}>
                      {formatCurrency(Math.max(0, selectedGoal.goalAmount - selectedGoal.savedAmount))}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.detailItem}>
                  <MaterialIcons name="event" size={24} color="#6a11cb" />
                  <View>
                    <Text style={styles.detailLabel}>Ngày kết thúc</Text>
                    <Text style={styles.detailValue}>
                      {selectedGoal.endDate && typeof selectedGoal.endDate.toDate === 'function' 
                        ? moment(selectedGoal.endDate.toDate()).format('DD/MM/YYYY')
                        : selectedGoal.endDate instanceof Date 
                          ? moment(selectedGoal.endDate).format('DD/MM/YYYY')
                          : "Không xác định"}
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.updateSection}>
                <Text style={styles.updateTitle}>Cập nhật tiến độ</Text>
                <View style={styles.updateInputContainer}>
                  <TextInput
                    style={styles.updateInput}
                    placeholder="Nhập số tiền tiết kiệm thêm"
                    value={depositAmount}
                    keyboardType="numeric"
                    onChangeText={(text) => setDepositAmount(text.replace(/[^0-9]/g, ''))}
                  />
                  <TouchableOpacity
                    style={styles.updateButton}
                    onPress={handleUpdateProgress}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.updateButtonText}>Cập nhật</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
              
              {selectedGoal.transactions && selectedGoal.transactions.length > 0 && (
                <View style={styles.transactionsSection}>
                  <Text style={styles.transactionsTitle}>Lịch sử giao dịch</Text>
                  <View style={styles.transactionsList}>
                    {selectedGoal.transactions.slice(0, 5).map((transaction, index) => (
                      <View key={index} style={styles.transactionItem}>
                        <View style={styles.transactionIconContainer}>
                          <MaterialIcons name="add-circle" size={20} color="#4CAF50" />
                        </View>
                        <View style={styles.transactionDetails}>
                          <Text style={styles.transactionAmount}>
                            +{formatCurrency(transaction.amount)}
                          </Text>
                          <Text style={styles.transactionDate}>
                            {formatTransactionDate(transaction.date)}
                          </Text>
                        </View>
                      </View>
                    ))}
                    
                    {selectedGoal.transactions.length > 5 && (
                      <TouchableOpacity style={styles.viewMoreButton}>
                        <Text style={styles.viewMoreText}>Xem thêm</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
        <View style={{height: 80}} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default GoalScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fd',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fd',
  },
  headerGradient: {
    paddingHorizontal: 24,
    paddingTop: 65,
    paddingBottom: 35,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    shadowColor: '#2575fc',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 6,
    fontWeight: '500',
  },
  goalsListContainer: {
    marginTop: 25,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingVertical: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
  },
  addButton: {
    backgroundColor: '#6a11cb',
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6a11cb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  goalsList: {
    paddingBottom: 12,
  },
  goalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginRight: 18,
    width: width - 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(240,240,240,0.8)',
  },
  selectedGoalCard: {
    borderWidth: 2.5,
    borderColor: '#6a11cb',
    shadowColor: '#6a11cb',
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  goalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    color: '#2c3e50',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  goalProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    flex: 1,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#6a11cb',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 15,
    fontWeight: '700',
    width: 60,
    color: '#6a11cb',
  },
  goalDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 5,
  },
  goalDetailItem: {
    alignItems: 'center',
  },
  goalDetailLabel: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 5,
    fontWeight: '500',
  },
  goalDetailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2c3e50',
  },
  loader: {
    marginTop: 30,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    marginTop: 10,
  },
  emptyStateText: {
    fontSize: 17,
    color: '#95a5a6',
    marginTop: 15,
    marginBottom: 25,
    fontWeight: '500',
  },
  emptyStateButton: {
    backgroundColor: '#6a11cb',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    shadowColor: '#6a11cb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  formContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(240,240,240,0.6)',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 15,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    color: '#7f8c8d',
    marginBottom: 10,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#fcfcfc',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  primaryButton: {
    backgroundColor: '#6a11cb',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 15,
    shadowColor: '#6a11cb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
    letterSpacing: 0.5,
  },
  detailsContainer: {
    marginHorizontal: 20,
    marginTop: 25,
    marginBottom: 30,
  },
  goalDetailCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(240,240,240,0.6)',
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 25,
    color: '#2c3e50',
    letterSpacing: 0.3,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 25,
  },
  chartCenter: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartPercentage: {
    fontSize: 30,
    fontWeight: '800',
    color: '#6a11cb',
  },
  chartLabel: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 25,
    backgroundColor: '#f8f9fd',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  detailItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 5,
  },
  detailLabel: {
    fontSize: 13,
    color: '#7f8c8d',
    marginLeft: 12,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 12,
    color: '#2c3e50',
  },
  updateSection: {
    marginTop: 15,
    marginBottom: 25,
    backgroundColor: '#f1f6ff',
    borderRadius: 15,
    padding: 18,
  },
  updateTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
    color: '#2c3e50',
  },
  updateInputContainer: {
    flexDirection: 'row',
  },
  updateInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginRight: 12,
    backgroundColor: '#fff',
  },
  updateButton: {
    backgroundColor: '#6a11cb',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6a11cb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  updateButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  transactionsSection: {
    marginTop: 10,
  },
  transactionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
    color: '#2c3e50',
  },
  transactionsList: {
    backgroundColor: '#f8f9fd',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  transactionIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
  },
  transactionDate: {
    fontSize: 13,
    color: '#7f8c8d',
    marginTop: 3,
  },
  viewMoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 5,
  },
  viewMoreText: {
    color: '#6a11cb',
    fontWeight: '700',
    fontSize: 15,
  },
});