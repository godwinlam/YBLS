import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import AdminProductManagement from '@/components/Admin/AdminProductManagement';


export default function ProductListManagementScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <AdminProductManagement />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});
