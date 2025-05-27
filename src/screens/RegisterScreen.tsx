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
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const RegisterScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
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

  const validateForm = () => {
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return false;
    }
    
    if (password !== confirmPassword) {
      setError('Mật khẩu không khớp');
      return false;
    }
    
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Email không hợp lệ');
      return false;
    }
    
    return true;
  };

  const handleRegister = () => {
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError('');
    
    createUserWithEmailAndPassword(auth, email, password)
      .then(() => {
        navigation.replace('Home');
      })
      .catch((err) => {
        let errorMessage = 'Đăng ký thất bại. Vui lòng thử lại.';
        
        if (err.code === 'auth/email-already-in-use') {
          errorMessage = 'Email này đã được sử dụng';
        } else if (err.code === 'auth/invalid-email') {
          errorMessage = 'Email không hợp lệ';
        } else if (err.code === 'auth/weak-password') {
          errorMessage = 'Mật khẩu quá yếu';
        }
        
        setError(errorMessage);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };
  
  const toggleShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
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
          <View style={styles.logoContainer}>
            <Image
              source={{uri: 'https://img.lovepik.com/png/20231123/logo-for-a-cute-kitty-vector-sketch-behance-hd_679973_wh1200.png'}}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.appName}>Kitty App</Text>
          </View>
          
          <Text style={styles.welcomeText}>Tạo tài khoản mới</Text>
          <Text style={styles.subtitleText}>Đăng ký để trải nghiệm ứng dụng</Text>
          
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
          
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={22} color="#7986CB" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Mật khẩu"
              placeholderTextColor="#9EA0A4"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={toggleShowPassword} style={styles.eyeIcon}>
              <Ionicons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={22} 
                color="#7986CB" 
              />
            </TouchableOpacity>
          </View>
          
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={22} color="#7986CB" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Xác nhận mật khẩu"
              placeholderTextColor="#9EA0A4"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity onPress={toggleShowConfirmPassword} style={styles.eyeIcon}>
              <Ionicons 
                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                size={22} 
                color="#7986CB" 
              />
            </TouchableOpacity>
          </View>
          
          {error ? (
            <Animated.View 
              style={styles.errorContainer}
            >
              <Ionicons name="alert-circle-outline" size={20} color="#FF5252" />
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          ) : null}
          
          <TouchableOpacity 
            style={styles.registerButton} 
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <LinearGradient
                colors={['#43A047', '#66BB6A']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.registerButtonText}>ĐĂNG KÝ</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.arrowIcon} />
              </LinearGradient>
            )}
          </TouchableOpacity>
          
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>HOẶC</Text>
            <View style={styles.dividerLine} />
          </View>
          
          <View style={styles.socialButtonsContainer}>
            <TouchableOpacity style={[styles.socialButton, styles.googleButton]}>
              <Ionicons name="logo-google" size={20} color="#DB4437" />
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.socialButton, styles.facebookButton]}>
              <Ionicons name="logo-facebook" size={20} color="#4267B2" />
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.socialButton, styles.appleButton]}>
              <Ionicons name="logo-apple" size={20} color="#000000" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Đã có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Đăng nhập ngay</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.termsText}>
            Bằng cách đăng ký, bạn đồng ý với 
            <Text style={styles.termsLink}> Điều khoản dịch vụ </Text> 
            và
            <Text style={styles.termsLink}> Chính sách bảo mật </Text>
            của chúng tôi
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
  logoContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitleText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
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
  eyeIcon: {
    padding: 5,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 6,
    marginBottom: 15,
  },
  errorText: {
    color: '#FF5252',
    marginLeft: 5,
    fontSize: 14,
  },
  registerButton: {
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
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  arrowIcon: {
    marginLeft: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    paddingHorizontal: 10,
    color: '#9E9E9E',
    fontSize: 12,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
  },
  facebookButton: {
    backgroundColor: '#FFFFFF',
  },
  appleButton: {
    backgroundColor: '#FFFFFF',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  loginText: {
    color: '#666',
    fontSize: 14,
  },
  loginLink: {
    color: '#4481EB',
    fontWeight: 'bold',
    fontSize: 14,
  },
  termsText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#4481EB',
    fontWeight: '500',
  },
});

export default RegisterScreen;