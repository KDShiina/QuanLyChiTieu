import React from 'react';
import { View, TouchableOpacity, GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Theme
import { COLORS, SHADOWS } from '../constants/theme';

interface CustomAddButtonProps {
  onPress?: (event: GestureResponderEvent) => void;
}

const CustomAddButton = ({ onPress }: CustomAddButtonProps) => {
  return (
    <View
      style={{
        top: -20,
        justifyContent: 'center',
        alignItems: 'center',
        width: 70,
        height: 70,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={{
          backgroundColor: COLORS.primary,
          width: 60,
          height: 60,
          borderRadius: 30,
          justifyContent: 'center',
          alignItems: 'center',
          ...SHADOWS.large,
        }}
      >
        <Ionicons
          name="add"
          size={34}
          color="white"
          style={{
            width: '100%',
            height: '100%',
            textAlign: 'center',
            textAlignVertical: 'center',
          }}
        />
      </TouchableOpacity>
    </View>
  );
};

export default CustomAddButton;