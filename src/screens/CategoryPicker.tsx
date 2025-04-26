import React from 'react';
import { View, Text } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';

// Màu sắc có sẵn để chọn
const COLOR_OPTIONS = [
  '#fca5a5', '#93c5fd', '#86efac', '#fcd34d', '#f9a8d4',
  '#d8b4fe', '#a5b4fc', '#bae6fd', '#6ee7b7', '#fde68a',
];

interface CategoryPickerProps {
  categories: Array<{ label: string, value: string, color: string }>;
  selectedCategory: string;
  selectedColor: string;
  onCategoryChange: (category: string) => void;
  onColorChange: (color: string) => void;
  onAddCategory: () => void;
}

const CategoryPicker: React.FC<CategoryPickerProps> = ({
  categories,
  selectedCategory,
  selectedColor,
  onCategoryChange,
  onColorChange,
  onAddCategory,
}) => {
  return (
    <View style={{ marginBottom: 16 }}>
      <RNPickerSelect
        onValueChange={onCategoryChange}
        items={categories.map(item => ({
          label: item.label,
          value: item.value,
        }))}
        value={selectedCategory}
        style={{
          inputIOS: {
            marginBottom: 8,
            padding: 8,
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 4,
          },
          inputAndroid: {
            marginBottom: 8,
            padding: 8,
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 4,
          },
        }}
        placeholder={{ label: 'Chọn mục chi tiêu...', value: null }}
      />
      {selectedCategory === 'add' && (
        <View>
          <Text style={{ marginBottom: 6 }}>Chọn màu:</Text>
          <View style={{
            flexDirection: 'row', flexWrap: 'wrap',
          }}>
            {COLOR_OPTIONS.map((color, index) => (
              <View key={index} style={{
                width: 32,
                height: 32,
                backgroundColor: color,
                margin: 4,
                borderRadius: 16,
                borderWidth: 2,
                borderColor: selectedColor === color ? '#000' : 'transparent',
              }}>
                <View
                  style={{ flex: 1 }}
                  onTouchEnd={() => onColorChange(color)}
                />
              </View>
            ))}
          </View>
          <Text style={{ marginTop: 8, textAlign: 'center' }}>
            <Text style={{ color: '#007BFF', fontWeight: 'bold' }} onPress={onAddCategory}>
              Thêm mục chi tiêu mới
            </Text>
          </Text>
        </View>
      )}
    </View>
  );
};

export default CategoryPicker;
