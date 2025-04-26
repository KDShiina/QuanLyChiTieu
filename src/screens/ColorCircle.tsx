import React from 'react';
import { View, TouchableOpacity, StyleSheet, FlatList } from 'react-native';

const DEFAULT_COLORS = [
  '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', 
  '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
  '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800',
  '#ff5722', '#795548', '#607d8b'
];

export const ColorCircle = ({ selectedColor, onColorChange, colors = DEFAULT_COLORS }) => {
  return (
    <FlatList
      data={colors}
      horizontal={false}
      numColumns={6}
      keyExtractor={(item) => item}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => onColorChange(item)}
          style={[
            styles.colorCircle,
            { backgroundColor: item },
            selectedColor === item && styles.selected,
          ]}
        />
      )}
      contentContainerStyle={styles.container}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 5,
  },
  selected: {
    borderWidth: 2,
    borderColor: '#000',
  },
});