import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens
import SelectLocationScreen from '../screens/SelectLocationScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import ExpenseViewDetailScreen from '../screens/ExpenseDetailViewScreen';
import EditExpenseScreen from '../screens/EditExpenseScreen';
import EditProfileScreen from '../screens/EditProfileScreen';

// Types
import { ModalStackParamList } from '../../App';

const Stack = createNativeStackNavigator<ModalStackParamList>();

const ModalStackNavigator = () => {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
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
    </Stack.Navigator>
  );
};

export default ModalStackNavigator;