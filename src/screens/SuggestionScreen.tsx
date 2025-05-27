import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Image,
  Keyboard,
} from 'react-native';
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { askGemini } from '../types/gemini';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const db = getFirestore();
type RootStackParamList = {
  SuggestionScreen: undefined;
  ExpenseDetailScreen: undefined;
  // add other screens here if needed
};

const SuggestionScreen = () => {
  const [question, setQuestion] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [questionFocus, setQuestionFocus] = useState(false);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const loadingRotation = useRef(new Animated.Value(0)).current;
  const suggestionAnim = useRef(new Animated.Value(0)).current;
  const animation = useRef(null);

  // Example suggestions
  const exampleQuestions = [
    "Tôi chi tiêu nhiều nhất cho danh mục nào?",
    "Có khoản chi phí bất thường nào không?",
    "Phân tích chi tiêu hàng tháng của tôi",
    "Làm sao để tiết kiệm hơn?"
  ];

  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    fetchExpenses();
    
    // Animation when screen mounts
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
  }, []);

  // Animation for loading state
  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.timing(loadingRotation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
      
      if (animation.current) {
        animation.current.play();
      }
    } else {
      loadingRotation.setValue(0);
      
      if (animation.current) {
        animation.current.reset();
      }
    }
  }, [loading]);

  // Animation for suggestion appearance
  useEffect(() => {
    if (suggestion) {
      Animated.timing(suggestionAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      suggestionAnim.setValue(0);
    }
  }, [suggestion]);

  const fetchExpenses = async () => {
    try {
      setDataLoading(true);
      const expensesQuery = query(
        collection(db, 'expenses'),
        orderBy('date', 'desc'),
        limit(20)
      );
      const querySnapshot = await getDocs(expensesQuery);
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setExpenses(data);
      
      // Animate card appearance
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('Error fetching expenses:', error);
      Alert.alert(
        'Lỗi dữ liệu',
        'Không thể tải dữ liệu chi tiêu. Vui lòng thử lại sau.',
        [{ text: 'Đã hiểu', style: 'default' }]
      );
    } finally {
      setDataLoading(false);
    }
  };

  const handleAskAI = async () => {
    Keyboard.dismiss();
    
    if (!question.trim()) {
      // Haptic feedback for error
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      Alert.alert(
        'Thiếu câu hỏi',
        'Vui lòng nhập câu hỏi trước khi tiếp tục',
        [{ text: 'Đã hiểu', style: 'default' }]
      );
      return;
    }

    if (expenses.length === 0) {
      setSuggestion('Chưa có dữ liệu chi tiêu để phân tích. Hãy thêm giao dịch trước khi sử dụng tính năng này.');
      return;
    }

    try {
      // Haptic feedback for button press
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      setLoading(true);
      setSuggestion('');

      const formattedExpenses = expenses
        .map((expense, i) => {
          let dateStr = 'Không rõ';
          try {
            if (expense.date instanceof Timestamp) {
              dateStr = expense.date.toDate().toLocaleDateString('vi-VN');
            } else if (expense.date?.seconds) {
              dateStr = new Date(expense.date.seconds * 1000).toLocaleDateString('vi-VN');
            } else if (expense.date) {
              dateStr = String(expense.date);
            }
          } catch (e) {}

          return `${i + 1}. Ngày: ${dateStr} | Danh mục: ${expense.category || 'Không phân loại'} | Số tiền: ${expense.amount?.toLocaleString('vi-VN') || '0'} VND | Lý do: ${expense.reason || 'Không rõ lý do'}`;
        })
        .join('\n');

      const response = await askGemini(question, formattedExpenses);
      
      // Success haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      setSuggestion(response);
    } catch (error) {
      console.error('Error asking AI:', error);
      
      // Error haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      setSuggestion(`Đã xảy ra lỗi: ${error.message || 'Không thể kết nối với AI'}`);
    } finally {
      setLoading(false);
    }
  };

  const selectExampleQuestion = (q) => {
    setQuestion(q);
    // Light haptic for selection
    Haptics.selectionAsync();
  };

  const spin = loadingRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.rootContainer}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      
      <Image 
        source={{ uri: 'https://i.imgur.com/JXQoOHl.png' }} 
        style={styles.backgroundImage}
        blurRadius={15}
      />
      
      <ScrollView 
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View 
          style={[
            styles.header, 
            { 
              opacity: fadeAnim, 
              transform: [{ translateY: translateY }]
            }
          ]}
        >
          <TouchableOpacity 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.goBack();
            }} 
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={28} color="#333" />
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <MaterialCommunityIcons name="brain" size={24} color="#4CAF50" />
            <Text style={styles.title}>Cố vấn Tài chính AI</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.helpButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert(
                "Hướng dẫn",
                "Đặt câu hỏi về chi tiêu của bạn và AI sẽ phân tích dữ liệu để đưa ra gợi ý. Bạn có thể hỏi về xu hướng chi tiêu, lĩnh vực chi nhiều nhất, hoặc cách để tiết kiệm hơn.",
                [{ text: "Đã hiểu", style: "default" }]
              );
            }}
          >
            <Ionicons name="help-circle-outline" size={24} color="#555" />
          </TouchableOpacity>
        </Animated.View>

        {dataLoading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingAnimation}>
              <ActivityIndicator size="large" color="#4CAF50" />
            </View>
            <Text style={styles.loadingText}>Đang tải dữ liệu chi tiêu...</Text>
          </View>
        ) : expenses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={80} color="#AAA" style={styles.emptyIcon} />
            <Text style={styles.noData}>Chưa có dữ liệu chi tiêu</Text>
            <Text style={styles.noDataSub}>Hãy thêm giao dịch trước khi sử dụng tính năng này</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigation.navigate('ExpenseDetailScreen');
              }}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Thêm chi tiêu mới</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Animated.View 
              style={[
                styles.card,
                { 
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }]
                }
              ]}
            >
              <View style={styles.cardHeader}>
                <Ionicons name="analytics-outline" size={22} color="#4CAF50" />
                <Text style={styles.subTitle}>
                  Phân tích dựa trên {expenses.length} giao dịch gần đây
                </Text>
              </View>
              
              <View style={styles.inputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    questionFocus && styles.inputFocused
                  ]}
                  placeholder="Hỏi AI về chi tiêu của bạn..."
                  placeholderTextColor="#AAA"
                  value={question}
                  onChangeText={setQuestion}
                  multiline
                  numberOfLines={3}
                  onFocus={() => setQuestionFocus(true)}
                  onBlur={() => setQuestionFocus(false)}
                />
                {!questionFocus && !question && (
                  <Ionicons 
                    name="search" 
                    size={20} 
                    color="#AAA" 
                    style={styles.searchIcon}
                  />
                )}
              </View>
              
              <Text style={styles.exampleHeader}>Gợi ý câu hỏi:</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.examplesContainer}
              >
                {exampleQuestions.map((q, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.exampleChip}
                    onPress={() => selectExampleQuestion(q)}
                  >
                    <Text style={styles.exampleText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <TouchableOpacity
                style={[
                  styles.button,
                  loading && styles.buttonLoading
                ]}
                onPress={handleAskAI}
                disabled={loading}
                activeOpacity={0.7}
              >
                {loading ? (
                  <View style={styles.buttonAnimation}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                ) : (
                  <>
                    <Ionicons name="flash-outline" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Phân tích ngay</Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            {loading && (
              <BlurView intensity={30} tint="light" style={styles.loadingOverlay}>
                <View style={styles.loadingBox}>
                  <View style={styles.thinkingAnimation}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Ionicons name="bulb-outline" size={40} color="#4CAF50" style={{marginTop: 10}} />
                  </View>
                  <Text style={styles.loadingTitle}>AI đang phân tích</Text>
                  <Text style={styles.loadingDescription}>
                    Đang xử lý {expenses.length} giao dịch của bạn...
                  </Text>
                </View>
              </BlurView>
            )}

            {suggestion ? (
              <Animated.View 
                style={[
                  styles.resultBox,
                  {
                    opacity: suggestionAnim,
                    transform: [
                      { translateY: suggestionAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0]
                      })}
                    ]
                  }
                ]}
              >
                <View style={styles.resultHeader}>
                  <MaterialCommunityIcons name="lightbulb-on-outline" size={24} color="#4CAF50" />
                  <Text style={styles.resultTitle}>Phân tích từ AI</Text>
                </View>
                
                <View style={styles.resultContent}>
                  <Text style={styles.resultText}>{suggestion}</Text>
                </View>
                
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      // Implement clipboard copy
                      Alert.alert("Thành công", "Đã sao chép kết quả vào bộ nhớ tạm");
                    }}
                  >
                    <Ionicons name="copy-outline" size={16} color="#555" />
                    <Text style={styles.actionButtonText}>Sao chép</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      // Implement sharing
                      Alert.alert("Chia sẻ", "Tính năng chia sẻ đang được phát triển");
                    }}
                  >
                    <Ionicons name="share-outline" size={16} color="#555" />
                    <Text style={styles.actionButtonText}>Chia sẻ</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: '#e8f5e9' }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setQuestion('');
                      setSuggestion('');
                    }}
                  >
                    <Ionicons name="refresh-outline" size={16} color="#4CAF50" />
                    <Text style={[styles.actionButtonText, { color: '#4CAF50' }]}>Hỏi lại</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ) : null}
          </>
        )}
        
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backgroundImage: {
    position: 'absolute', 
    width: '100%', 
    height: '100%', 
    opacity: 0.5
  },
  container: {
    padding: 20,
    paddingTop: StatusBar.currentHeight + 10,
    minHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    paddingVertical: 5,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  helpButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    marginBottom: 25,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 15,
  },
  subTitle: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    paddingTop: 16,
    backgroundColor: '#f9f9f9',
    minHeight: 100,
    maxHeight: 150,
    textAlignVertical: 'top',
    fontSize: 15,
    color: '#333',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 5,
    elevation: 1,
  },
  inputFocused: {
    borderColor: '#4CAF50',
    backgroundColor: '#fff',
    shadowOpacity: 0.1,
    elevation: 2,
  },
  searchIcon: {
    position: 'absolute',
    top: 18,
    left: 16,
  },
  exampleHeader: {
    fontSize: 13,
    color: '#777',
    marginBottom: 8,
    marginLeft: 2,
  },
  examplesContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  exampleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0f9ff',
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e1f5fe',
  },
  exampleText: {
    fontSize: 13,
    color: '#0277bd',
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#4CAF50',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 3,
  },
  buttonLoading: {
    backgroundColor: '#78c37a',
  },
  buttonAnimation: {
    width: 24,
    height: 24,
    marginRight: 6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
  },
  loadingAnimation: {
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyIcon: {
    marginBottom: 15,
  },
  noData: {
    textAlign: 'center',
    color: '#555',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 10,
  },
  noDataSub: {
    textAlign: 'center',
    color: '#888',
    fontSize: 14,
    marginTop: 5,
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: StatusBar.currentHeight + 70,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingBox: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 20,
    alignItems: 'center',
    width: width * 0.85,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 15,
    elevation: 10,
  },
  thinkingAnimation: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 10,
  },
  loadingDescription: {
    fontSize: 14,
    color: '#777',
    marginTop: 5,
    textAlign: 'center',
  },
  resultBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 0,
    marginTop: 10,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 10,
    elevation: 3,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 15,
    paddingHorizontal: 20,
    backgroundColor: '#f5f5f5',
  },
  resultTitle: {
    fontWeight: '600',
    fontSize: 16,
    color: '#333',
  },
  resultContent: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  resultText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 10,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#555',
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 50,
  },
});

export default SuggestionScreen;