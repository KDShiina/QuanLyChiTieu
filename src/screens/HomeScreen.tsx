import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Button,
  Alert,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { db } from './firebaseConfig';
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  getDocs,
} from 'firebase/firestore';
import RNPickerSelect from 'react-native-picker-select';

interface Expense {
  id: string;
  reason: string;
  amount: number;
  date: any;
  category?: string;
  categoryColor?: string;
}

interface Category {
  label: string;
  value: string;
  color: string;
}

// Danh mục mặc định
const fixedCategories: Category[] = [
  { label: 'Mua sắm', value: 'Mua sắm', color: '#86efac' },
  { label: 'Ăn uống', value: 'Ăn uống', color: '#fca5a5' },
];

const HomeScreen: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    // Load chi tiêu
    const unsubscribe = onSnapshot(collection(db, 'expenses'), (snapshot) => {
      const expensesList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Expense[];
      setExpenses(expensesList);
      setLoading(false);
    });

    // Load danh mục
    const fetchCategories = async () => {
      const snapshot = await getDocs(collection(db, 'categories'));
      const userCategories: Category[] = snapshot.docs.map((doc) => doc.data()) as Category[];
      const all = [...fixedCategories, ...userCategories];
      // Loại bỏ trùng danh mục (dựa trên value)
      const uniqueCategories = Array.from(new Map(all.map(item => [item.value, item])).values());
      setCategories(uniqueCategories);
    };

    fetchCategories();

    return () => unsubscribe();
  }, []);

  const handleUpdate = async () => {
    if (selectedExpense) {
      const matched = categories.find(cat => cat.value === selectedExpense.category);
      if (!matched) {
        Alert.alert('Lỗi', 'Danh mục không hợp lệ');
        return;
      }

      try {
        await updateDoc(doc(db, 'expenses', selectedExpense.id), {
          reason: selectedExpense.reason,
          amount: selectedExpense.amount,
          category: matched.value,
          categoryColor: matched.color,
        });
        Alert.alert('Thành công', 'Cập nhật thành công');
        setModalVisible(false);
      } catch (e) {
        Alert.alert('Lỗi', 'Không thể cập nhật');
      }
    }
  };

  const handleDelete = async () => {
    if (selectedExpense) {
      await deleteDoc(doc(db, 'expenses', selectedExpense.id));
      setModalVisible(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#00f" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chi tiêu gần đây</Text>
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => {
              setSelectedExpense(item);
              setModalVisible(true);
            }}
            style={[
              styles.expenseItem,
              { backgroundColor: item.categoryColor || '#f3f4f6' },
            ]}
          >
            <Text style={styles.expenseReason}>{item.reason}</Text>
            <Text style={styles.expenseDate}>
              {item.date?.toDate().toLocaleDateString?.()}
            </Text>
            <Text style={styles.expenseAmount}>
              {item.amount.toLocaleString()}đ
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chi tiết chi tiêu</Text>

            <Text>Lý do:</Text>
            <TextInput
              value={selectedExpense?.reason}
              onChangeText={(text) =>
                setSelectedExpense((prev) => prev ? { ...prev, reason: text } : prev)
              }
              style={styles.input}
            />

            <Text>Số tiền:</Text>
            <TextInput
              value={selectedExpense?.amount.toString()}
              keyboardType="numeric"
              onChangeText={(text) =>
                setSelectedExpense((prev) =>
                  prev ? { ...prev, amount: parseFloat(text) || 0 } : prev
                )
              }
              style={styles.input}
            />

            <Text>Loại danh mục:</Text>
            <RNPickerSelect
              onValueChange={(value) => {
                const found = categories.find(cat => cat.value === value);
                if (found) {
                  setSelectedExpense(prev =>
                    prev ? { ...prev, category: value, categoryColor: found.color } : prev
                  );
                }
              }}
              value={selectedExpense?.category}
              items={categories.map((cat) => ({
                label: cat.label,
                value: cat.value,
              }))}
              style={{
                inputIOS: styles.input,
                inputAndroid: styles.input,
              }}
              placeholder={{ label: 'Chọn danh mục...', value: null }}
            />

            <View style={styles.buttonRow}>
              <Button title="Cập nhật" onPress={handleUpdate} />
              <Button title="Xoá" onPress={handleDelete} color="red" />
            </View>
            <Button title="Đóng" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12, color: '#333' },
  expenseItem: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  expenseReason: { fontSize: 18, fontWeight: '600', color: '#333' },
  expenseDate: { color: '#6b7280', marginVertical: 4 },
  expenseAmount: { color: '#ef4444', fontWeight: 'bold', fontSize: 16 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalContainer: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white', padding: 20,
    borderRadius: 12, width: '85%',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  input: {
    borderWidth: 1, borderColor: '#ccc',
    borderRadius: 6, padding: 8, marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
});

export default HomeScreen;
