import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { auth } from '../config/firebaseConfig';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validateEmail = () => {
    if (!email.trim()) {
      setError('Vui lòng nhập email của bạn');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Email không hợp lệ');
      return false;
    }
    
    return true;
  };

  const handleResetPassword = () => {
    setError('');
    setMessage('');
    
    if (!validateEmail()) {
      return;
    }
    
    setLoading(true);
    
    sendPasswordResetEmail(auth, email)
      .then(() => {
        setMessage('Email khôi phục mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư của bạn.');
        setEmail('');
      })
      .catch((err) => {
        let errorMessage = 'Đã xảy ra lỗi khi gửi email đặt lại mật khẩu';
        
        if (err.code === 'auth/user-not-found') {
          errorMessage = 'Không tìm thấy tài khoản với email này';
        } else if (err.code === 'auth/invalid-email') {
          errorMessage = 'Email không hợp lệ';
        } else if (err.code === 'auth/too-many-requests') {
          errorMessage = 'Quá nhiều yêu cầu. Vui lòng thử lại sau';
        }
        
        setError(errorMessage);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <LinearGradient
      colors={['#4c669f', '#3b5998', '#192f6a']}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <Animated.View 
          style={[
            styles.formContainer,
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }] 
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#3B5998" />
          </TouchableOpacity>
          
          <View style={styles.logoContainer}>
            <Image
              source={{uri: 'https://img.lovepik.com/png/20231123/logo-for-a-cute-kitty-vector-sketch-behance-hd_679973_wh1200.png'}}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.appName}>Kitty App</Text>
          </View>
          
          <Text style={styles.titleText}>Quên mật khẩu?</Text>
          <Text style={styles.subtitleText}>
            Nhập email đăng ký của bạn và chúng tôi sẽ gửi liên kết để đặt lại mật khẩu
          </Text>
          
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={22} color="#7986CB" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#9EA0A4"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          
          {error ? (
            <Animated.View 
              style={styles.errorContainer}
            >
              <Ionicons name="alert-circle-outline" size={20} color="#FF5252" />
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          ) : null}
          
          {message ? (
            <Animated.View 
              style={styles.successContainer}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
              <Text style={styles.successText}>{message}</Text>
            </Animated.View>
          ) : null}
          
          <TouchableOpacity 
            style={styles.resetButton} 
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <LinearGradient
                colors={['#FF9800', '#F57C00']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.resetButtonText}>GỬI LIÊN KẾT ĐẶT LẠI</Text>
                <Ionicons name="send-outline" size={18} color="#FFFFFF" style={styles.sendIcon} />
              </LinearGradient>
            )}
          </TouchableOpacity>
          
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <View style={styles.dividerLine} />
          </View>
          
          <View style={styles.helpContainer}>
            <TouchableOpacity 
              style={styles.helpButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Ionicons name="log-in-outline" size={20} color="#3B5998" style={styles.helpIcon} />
              <Text style={styles.helpText}>Quay lại đăng nhập</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.helpButton}
              onPress={() => navigation.navigate('Register')}
            >
              <Ionicons name="person-add-outline" size={20} color="#3B5998" style={styles.helpIcon} />
              <Text style={styles.helpText}>Tạo tài khoản mới</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.supportText}>
            Nếu bạn gặp khó khăn trong việc đặt lại mật khẩu, hãy liên hệ
            <Text style={styles.supportLink}> hỗ trợ của chúng tôi </Text>
          </Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  formContainer: {
    width: width - 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEFEF',
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 55,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#333',
    fontSize: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  errorText: {
    color: '#FF5252',
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  successText: {
    color: '#4CAF50',
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },
  resetButton: {
    borderRadius: 10,
    height: 55,
    overflow: 'hidden',
    marginBottom: 25,
  },
  buttonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sendIcon: {
    marginLeft: 8,
  },
  divider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  helpContainer: {
    marginBottom: 20,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  helpIcon: {
    marginRight: 10,
  },
  helpText: {
    color: '#3B5998',
    fontSize: 15,
    fontWeight: '500',
  },
  supportText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
  supportLink: {
    color: '#4481EB',
    fontWeight: '500',
  },
});

export default ForgotPasswordScreen;