import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Button,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { db } from './firebaseConfig';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import CategoryPicker from './CategoryPicker';

// Các mục chi tiêu cố định
const fixedCategories = [
  { label: 'Mua sắm', value: 'Mua sắm', color: '#86efac' },
  { label: 'Ăn uống', value: 'Ăn uống', color: '#fca5a5' },
];

const AddExpenseScreen = () => {
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [categoryColor, setCategoryColor] = useState('#ffffff');
  const [newCategory, setNewCategory] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [categories, setCategories] = useState(fixedCategories);

  // Load các mục chi tiêu từ Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({
        label: doc.data().label,
        value: doc.data().value,
        color: doc.data().color || '#ffffff', // Default color if undefined
      }));

      const filtered = fetched.filter(
        item => !fixedCategories.find(f => f.value === item.value)
      );

      setCategories([...fixedCategories, ...filtered]);
    });

    return () => unsubscribe();
  }, []);

  // Thêm chi tiêu mới
  const handleAddExpense = async () => {
    if (!reason || !amount || !category || category === 'add') {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      await addDoc(collection(db, 'expenses'), {
        reason,
        amount: parseFloat(amount),
        category,
        categoryColor,
        date: new Date(),
      });

      Alert.alert('Thành công', 'Chi tiêu đã được thêm');
      setReason('');
      setAmount('');
      setCategory('');
      setCategoryColor('#ffffff');
    } catch (error) {
      console.error('Lỗi khi thêm chi tiêu:', error);
      Alert.alert('Lỗi', 'Không thể lưu chi tiêu');
    }
  };

  // Thêm mục chi tiêu mới
  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên mục chi tiêu');
      return;
    }

    const existed = categories.find(item => item.value === newCategory.trim());
    if (existed) {
      Alert.alert('Lỗi', 'Mục chi tiêu này đã tồn tại');
      return;
    }

    const newCategoryItem = {
      label: newCategory,
      value: newCategory,
      color: categoryColor,
    };

    try {
      await addDoc(collection(db, 'categories'), newCategoryItem);
      setNewCategory('');
      setModalVisible(false);
    } catch (error) {
      console.error('Lỗi khi lưu mục chi tiêu:', error);
      Alert.alert('Lỗi', 'Không thể lưu mục chi tiêu');
    }
  };

  // Khi chọn mục chi tiêu
  const handleCategoryChange = (value: string) => {
    if (value === 'add') {
      setModalVisible(true);
      return;
    }

    setCategory(value);
    const selected = categories.find(item => item.value === value);
    if (selected) {
      setCategoryColor(selected.color);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={{ padding: 16, flex: 1 }}>
          <TextInput
            placeholder="Lý do"
            value={reason}
            onChangeText={setReason}
            style={{
              marginTop: 20,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: '#ccc',
              padding: 8,
              borderRadius: 4,
            }}
          />
          <TextInput
            placeholder="Số tiền"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            style={{
              marginBottom: 8,
              borderWidth: 1,
              borderColor: '#ccc',
              padding: 8,
              borderRadius: 4,
            }}
          />

          <CategoryPicker
            categories={categories}
            selectedCategory={category}
            selectedColor={categoryColor}
            onCategoryChange={handleCategoryChange}
            onColorChange={setCategoryColor}
            onAddCategory={handleAddCategory}
          />

          <Button title="Thêm chi tiêu" onPress={handleAddExpense} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AddExpenseScreen;
