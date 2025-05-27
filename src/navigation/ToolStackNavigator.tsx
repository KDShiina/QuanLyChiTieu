import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useRoute } from '@react-navigation/native';

// Screens
import GoalScreen from '../screens/GoalScreen';
import SuggestionScreen from '../screens/SuggestionScreen';
import RecurringScreen from '../screens/RecurringScreen';
import WalletScreen from '../screens/WalletScreen';

const Stack = createNativeStackNavigator();

const ToolStackNavigator = () => {
  const route = useRoute();
  const initialRouteName = route.name; // Lấy tên route hiện tại

  return (
    <Stack.Navigator 
      initialRouteName={initialRouteName}
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="GoalScreen" component={GoalScreen} />
      <Stack.Screen name="SuggestionScreen" component={SuggestionScreen} />
      <Stack.Screen name="RecurringScreen" component={RecurringScreen} />
      <Stack.Screen name="WalletScreen" component={WalletScreen} />
    </Stack.Navigator>
  );
};

export default ToolStackNavigator;