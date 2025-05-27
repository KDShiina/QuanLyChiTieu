import React, { useState, useEffect } from 'react';
import { Alert, BackHandler, Platform, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged } from 'firebase/auth';
import { StatusBar } from 'expo-status-bar';

// Theme và utilities
import { COLORS, SHADOWS } from './src/constants/theme';

// Firebase auth
import { auth } from './src/config/firebaseConfig';

// Import Navigators
import AuthNavigator from './src/navigation/AuthNavigator';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import ToolStackNavigator from './src/navigation/ToolStackNavigator';

// Import Individual Screens
import SelectLocationScreen from './src/screens/SelectLocationScreen';
import AddExpenseScreen from './src/screens/AddExpenseScreen';
import ExpenseViewDetailScreen from './src/screens/ExpenseDetailViewScreen';
import EditExpenseScreen from './src/screens/EditExpenseScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';

// TypeScript Types
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  History: undefined;
  Add: undefined;
  Tools: undefined;
  Profile: undefined;
};

export type ModalStackParamList = {
  SelectLocation: undefined;
  AddExpenseScreen: { categoryId: string; type: string };
  ExpenseViewDetailScreen: { id: string };
  EditExpenseScreen: { id: string };
  EditProfile: undefined;
};

export type ToolStackParamList = {
  GoalScreen: undefined;
  SuggestionScreen: undefined;
  RecurringScreen: undefined;
  WalletScreen: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
} & ModalStackParamList & ToolStackParamList;

const Stack = createNativeStackNavigator<RootStackParamList>();

const App = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Kiểm tra trạng thái đăng nhập
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Xử lý nút Back trên Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backAction = () => {
        Alert.alert(
          'Thoát ứng dụng', 
          'Bạn có chắc chắn muốn thoát?', 
          [
            { 
              text: 'Hủy', 
              onPress: () => null, 
              style: 'cancel' 
            },
            { 
              text: 'Thoát', 
              onPress: () => BackHandler.exitApp(),
              style: 'destructive'
            },
          ],
          { cancelable: true }
        );
        return true;
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => backHandler.remove();
    }
  }, []);

  // Loading Screen
  if (loading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: COLORS.background 
      }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <NavigationContainer>
        <Stack.Navigator 
          screenOptions={{ 
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          {user ? (
            <>
              {/* Main App Flow */}
              <Stack.Screen 
                name="Main" 
                component={MainTabNavigator} 
              />
              
              {/* Modal Screens - Individual Components */}
              <Stack.Group 
                screenOptions={{ 
                  presentation: 'modal',
                  animation: 'slide_from_bottom',
                }}
              >
                <Stack.Screen 
                  name="SelectLocation" 
                  component={SelectLocationScreen}
                  options={{
                    title: 'Chọn vị trí'
                  }}
                />
                <Stack.Screen 
                  name="AddExpenseScreen" 
                  component={AddExpenseScreen}
                  options={{
                    title: 'Thêm giao dịch'
                  }}
                />
                <Stack.Screen 
                  name="ExpenseViewDetailScreen" 
                  component={ExpenseViewDetailScreen}
                  options={{
                    title: 'Chi tiết giao dịch'
                  }}
                />
                <Stack.Screen 
                  name="EditExpenseScreen" 
                  component={EditExpenseScreen}
                  options={{
                    title: 'Chỉnh sửa giao dịch'
                  }}
                />
                <Stack.Screen 
                  name="EditProfile" 
                  component={EditProfileScreen}
                  options={{
                    title: 'Chỉnh sửa hồ sơ'
                  }}
                />
              </Stack.Group>

              {/* Tool Screens */}
              <Stack.Group
                screenOptions={{
                  animation: 'slide_from_right',
                }}
              >
                <Stack.Screen 
                  name="GoalScreen" 
                  component={ToolStackNavigator} 
                />
                <Stack.Screen 
                  name="SuggestionScreen" 
                  component={ToolStackNavigator} 
                />
                <Stack.Screen 
                  name="RecurringScreen" 
                  component={ToolStackNavigator} 
                />
                <Stack.Screen 
                  name="WalletScreen" 
                  component={ToolStackNavigator} 
                />
              </Stack.Group>
            </>
          ) : (
            <>
              {/* Authentication Flow */}
              <Stack.Screen 
                name="Auth" 
                component={AuthNavigator} 
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
};

export default App;