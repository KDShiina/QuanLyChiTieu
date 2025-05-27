import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { COLORS } from '../constants/theme';

const LoadingScreen = ({ message = 'Đang tải...' }) => {
  return (
    <View 
      style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: COLORS.background 
      }}
    >
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text 
        style={{ 
          marginTop: 10, 
          color: COLORS.textSecondary,
          fontSize: 16,
        }}
      >
        {message}
      </Text>
    </View>
  );
};

export default LoadingScreen;