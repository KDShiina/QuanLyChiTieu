import React, { useEffect, useState } from 'react';
import { View, Text, Dimensions, ActivityIndicator } from 'react-native';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';
import { db } from './firebaseConfig'; // Đảm bảo đường dẫn đúng
import { collection, onSnapshot } from 'firebase/firestore';
import { Expense } from './types/Expense';

const screenWidth = Dimensions.get('window').width;
const chartSize = 240;

const StatisticsScreen = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Màu sắc mặc định cho các danh mục (nếu cần thiết)
  const CATEGORY_COLORS = {
    'Ăn uống': '#fca5a5',
    'Mua sắm': '#86efac',
  };

  // Lấy dữ liệu chi tiêu từ Firestore theo thời gian thực
  const fetchExpenses = () => {
    const unsubscribe = onSnapshot(collection(db, 'expenses'), (snapshot) => {
      const expensesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setExpenses(expensesList);
      setLoading(false); // Set loading to false once data is fetched
    }, (error) => {
      console.error("Error fetching expenses:", error);
      setLoading(false); // Stop loading even on error
    });

    // Cleanup function to unsubscribe from the listener
    return unsubscribe;
  };

  // Lấy dữ liệu chi tiêu khi component được mount và unsubcribe khi unmount
  useEffect(() => {
    const unsubscribe = fetchExpenses();
    
    // Cleanup when component unmounts
    return () => unsubscribe();
  }, []);

  // Nhóm chi tiêu theo danh mục và cộng dồn số tiền
  const groupByCategory = (data: Expense[]) => {
    const grouped: { [key: string]: { category: string; amount: number; categoryColor: string } } = {};

    data.forEach((item) => {
      const category = item.category; // Sử dụng category làm danh mục chi tiêu
      const color = item.categoryColor || CATEGORY_COLORS[category] || '#000000'; // Sử dụng màu từ Firestore hoặc màu mặc định

      if (!grouped[category]) {
        grouped[category] = {
          category,
          amount: 0,
          categoryColor: color,
        };
      }
      grouped[category].amount += item.amount; // Cộng dồn amount cho cùng một category
    });

    return Object.values(grouped); // Trả về danh sách các chi tiêu đã được nhóm
  };

  // Tính toán các phần của biểu đồ
  const calculatePie = (data: { category: string; amount: number; categoryColor: string }[]) => {
    const total = data.reduce((sum, item) => sum + item.amount, 0);
    let cumulativeAngle = 0;

    return data.map((item) => {
      const startAngle = cumulativeAngle;
      const angle = (item.amount / total) * 2 * Math.PI;
      const endAngle = startAngle + angle;
      cumulativeAngle = endAngle;

      const x1 = Math.cos(startAngle) * chartSize / 2 + chartSize / 2;
      const y1 = Math.sin(startAngle) * chartSize / 2 + chartSize / 2;
      const x2 = Math.cos(endAngle) * chartSize / 2 + chartSize / 2;
      const y2 = Math.sin(endAngle) * chartSize / 2 + chartSize / 2;
      const largeArc = angle > Math.PI ? 1 : 0;

      const pathData = `
        M ${chartSize / 2} ${chartSize / 2}
        L ${x1} ${y1}
        A ${chartSize / 2} ${chartSize / 2} 0 ${largeArc} 1 ${x2} ${y2}
        Z
      `;

      const midAngle = startAngle + angle / 2;
      const labelX = Math.cos(midAngle) * chartSize * 0.35 + chartSize / 2;
      const labelY = Math.sin(midAngle) * chartSize * 0.35 + chartSize / 2;

      const percentage = ((item.amount / total) * 100).toFixed(1);

      return {
        ...item,
        path: pathData,
        labelX,
        labelY,
        percentage,
      };
    });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#00f" />
      </View>
    );
  }

  // Tính toán biểu đồ với dữ liệu lấy từ Firestore
  const groupedData = groupByCategory(expenses);
  const pieData = calculatePie(groupedData);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 40, alignItems: 'center' }}>
      <Svg width={chartSize} height={chartSize}>
        <G>
          {pieData.map((slice, index) => (
            <G key={index}>
              <Path d={slice.path} fill={slice.categoryColor} stroke="#fff" strokeWidth={2} />
              <SvgText
                x={slice.labelX}
                y={slice.labelY}
                fill="#fff"
                fontSize="12"
                fontWeight="bold"
                textAnchor="middle"
                stroke="#000"
                strokeWidth={0.2}
              >
                {slice.percentage}%
              </SvgText>
            </G>
          ))}
        </G>
      </Svg>

      <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 24 }}>Biểu đồ chi tiêu</Text>

      {/* Legend */}
      <View style={{ marginTop: 20, width: screenWidth - 40 }}>
        {pieData.map((item, index) => (
          <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 6 }}>
            <View style={{
              width: 16, height: 16, backgroundColor: item.categoryColor,
              borderRadius: 4, marginRight: 10, borderWidth: 1, borderColor: '#e2e8f0'
            }} />
            <Text style={{ fontSize: 14, color: '#334155' }}>
              {item.category} - {item.amount.toLocaleString()}đ
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default StatisticsScreen;
