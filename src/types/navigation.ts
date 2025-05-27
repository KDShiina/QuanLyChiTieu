// Navigation Types
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
  AddExpenseScreen: { 
    categoryId: string; 
    type: string;
  };
  ExpenseViewDetailScreen: { 
    id: string;
  };
  EditExpenseScreen: { 
    id: string;
  };
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

// Navigation Props Types
import { NavigationProp, RouteProp } from '@react-navigation/native';

export type RootNavigationProp = NavigationProp<RootStackParamList>;
export type AuthNavigationProp = NavigationProp<AuthStackParamList>;
export type MainTabNavigationProp = NavigationProp<MainTabParamList>;
export type ModalStackNavigationProp = NavigationProp<ModalStackParamList>;
export type ToolStackNavigationProp = NavigationProp<ToolStackParamList>;

// Route Props Types
export type AddExpenseScreenRouteProp = RouteProp<ModalStackParamList, 'AddExpenseScreen'>;
export type ExpenseViewDetailScreenRouteProp = RouteProp<ModalStackParamList, 'ExpenseViewDetailScreen'>;
export type EditExpenseScreenRouteProp = RouteProp<ModalStackParamList, 'EditExpenseScreen'>;