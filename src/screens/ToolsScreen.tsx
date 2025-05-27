import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ImageBackground,
  Dimensions,
  ColorValue
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../types/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialIcons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type ToolsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'GoalScreen'>;

const SCREEN_WIDTH = Dimensions.get('window').width;

const ToolsScreen = () => {
  const navigation = useNavigation<ToolsScreenNavigationProp>();

  const renderFeatureCard = (
    icon: React.ReactNode,
    title: string,
    description: string,
    gradientColors: [ColorValue, ColorValue],
    onPress: () => void
  ) => {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={onPress}
      >
        <LinearGradient
          colors={gradientColors}
          style={styles.gradientCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.cardContent}>
            <View style={styles.iconContainer}>
              {icon}
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.cardDescription}>{description}</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <ImageBackground
        source={{ uri: 'https://img.freepik.com/free-vector/blue-copy-space-digital-background_23-2148821698.jpg' }}
        style={styles.headerBackground}
        imageStyle={styles.headerBackgroundImage}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Tiện Ích</Text>
          <Text style={styles.subtitle}>Trải nghiệm những công cụ tài chính hữu ích</Text>
        </View>
      </ImageBackground>
      
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {renderFeatureCard(
          <FontAwesome5 name="bullseye" size={28} color="#ffffff" />,
          "Mục tiêu tài chính",
          "Lập và theo dõi các mục tiêu tiết kiệm của bạn",
          ['#1e40af', '#2563eb'] as [ColorValue, ColorValue],
          () => navigation.navigate('GoalScreen')
        )}

        {renderFeatureCard(
          <Ionicons name="bulb-outline" size={30} color="#ffffff" />,
          "Gợi ý chi tiêu",
          "Nhận các gợi ý thông minh để tối ưu hóa chi tiêu",
          ['#ca8a04', '#eab308'] as [ColorValue, ColorValue],
          () => navigation.navigate('SuggestionScreen')
        )}

        {renderFeatureCard(
          <FontAwesome5 name="redo-alt" size={28} color="#ffffff" />,
          "Giao dịch định kỳ",
          "Quản lý các khoản chi tiêu và thu nhập định kỳ",
          ['#16a34a', '#22c55e'] as [ColorValue, ColorValue],
          () => navigation.navigate('RecurringScreen')
        )}

        {renderFeatureCard(
          <MaterialIcons name="account-balance-wallet" size={30} color="#ffffff" />,
          "Ví điện tử",
          "Kết nối và quản lý các ví điện tử của bạn",
          ['#9333ea', '#a855f7'] as [ColorValue, ColorValue],
          () => navigation.navigate('WalletScreen')
        )}

        {/* {renderFeatureCard(
          <MaterialCommunityIcons name="chart-timeline-variant" size={30} color="#ffffff" />,
          "Phân tích xu hướng",
          "Xem các báo cáo và phân tích chi tiết về chi tiêu",
          ['#be123c', '#e11d48'] as [ColorValue, ColorValue],
          () => navigation.navigate('AnalyticsScreen')
        )}

        {renderFeatureCard(
          <MaterialCommunityIcons name="bell-ring-outline" size={30} color="#ffffff" />,
          "Thông báo thông minh",
          "Nhận cảnh báo và nhắc nhở cho các khoản thanh toán",
          ['#0f766e', '#14b8a6'] as [ColorValue, ColorValue],
          () => navigation.navigate('NotificationsScreen')
        )} */}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerBackground: {
    paddingTop: 40,
    paddingBottom: 20,
  },
  headerBackgroundImage: {
    opacity: 0.05,
  },
  header: {
    paddingHorizontal: 20,
  },
  title: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: '#0f172a',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 10,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    marginTop: -20,
  },
  card: {
    marginBottom: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  gradientCard: {
    borderRadius: 16,
    padding: 20,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 55,
    height: 55,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
});

export default ToolsScreen;