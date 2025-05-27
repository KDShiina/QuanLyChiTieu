import Expense from "./inter";

export type RootStackParamList = {
    ExpenseDetail: {
      type: string;
      category: string;
      selectedAddress?: string;
      selectedLocation?: string;
    };
    SelectLocation: {
      categoryType: string;
      category: string;
      onLocationSelected?: (address: string, location: string) => void;
    };
    ExpenseDetailView: {
        expense: Expense;
      };
      
    EditProfile: undefined;
    GoalScreen: undefined;
    SuggestionScreen: undefined;
    RecurringScreen: undefined;
    WalletScreen: undefined;
  };
  