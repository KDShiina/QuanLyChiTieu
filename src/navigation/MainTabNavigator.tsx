import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Theme
import { COLORS, SHADOWS } from '../constants/theme';

// Screens
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ToolsScreen from '../screens/ToolsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChooseCategoryScreen from '../screens/ChooseCategoryScreen';

// Components
import CustomAddButton from '../components/CustomAddButton';

// Types
import { MainTabParamList } from '../../App';

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          paddingBottom: 5,
          height: 70,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          ...SHADOWS.medium,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: 'bold',
          marginBottom: 5,
        },
        tabBarIconStyle: {
          marginTop: 5,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.darkGray,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? "home" : "home-outline"} 
              size={size} 
              color={color} 
            />
          ),
          tabBarLabel: 'Trang chủ',
        }}
      />
      
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? "document-text" : "document-text-outline"} 
              size={size} 
              color={color} 
            />
          ),
          tabBarLabel: 'Giao dịch',
        }}
      />
      
      <Tab.Screen
        name="Add"
        component={ChooseCategoryScreen}
        options={{
          tabBarButton: (props) => <CustomAddButton onPress={props.onPress} />,
          tabBarIcon: () => null,
          tabBarLabel: () => null,
        }}
      />
      
      <Tab.Screen
        name="Tools"
        component={ToolsScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? "apps" : "apps-outline"} 
              size={size} 
              color={color} 
            />
          ),
          tabBarLabel: 'Công cụ',
        }}
      />
      
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? "person" : "person-outline"} 
              size={size} 
              color={color} 
            />
          ),
          tabBarLabel: 'Hồ sơ',
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;