import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from './src/screens/HomeScreen';
import AddExpenseScreen from './src/screens/AddExpenseScreen';
import StatisticsScreen from './src/screens/StatisticsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native';

// Tạo đối tượng Tab Navigator
const Tab = createBottomTabNavigator();

// Component chính
const App = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#f1f5f9',
            paddingBottom: 10,
            height: 60, // Chỉnh độ cao Tab
            borderTopWidth: 0, // Xóa đường viền trên Tab
            shadowColor: '#000', // Thêm bóng đổ
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
          },
          tabBarLabelStyle: {
            fontSize: 12, // Chỉnh font size cho Label
            fontWeight: 'bold',
          },
          tabBarIconStyle: {
            paddingBottom: 5, // Giảm khoảng cách giữa icon và label
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
            tabBarLabel: () => <Text style={{ color: '#1a202c' }}>Trang chủ</Text>,
          }}
        />
        <Tab.Screen
          name="Add"
          component={AddExpenseScreen}
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={size} color={color} />,
            tabBarLabel: () => <Text style={{ color: '#1a202c' }}>Thêm</Text>,
          }}
        />
        <Tab.Screen
          name="Stats"
          component={StatisticsScreen}
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" size={size} color={color} />,
            tabBarLabel: () => <Text style={{ color: '#1a202c' }}>Thống kê</Text>,
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
            tabBarLabel: () => <Text style={{ color: '#1a202c' }}>Hồ sơ</Text>,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default App;
