import React from 'react';
import { View, Text, Button } from 'react-native';

const ProfileScreen = () => {
  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: 'white' }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Tên người dùng</Text>
      <Text>Email@example.com</Text>
      <Button title="Chỉnh sửa thông tin" onPress={() => {}} />
      <Button title="Đăng xuất" onPress={() => {}} color="red" />
    </View>
  );
};

export default ProfileScreen;
