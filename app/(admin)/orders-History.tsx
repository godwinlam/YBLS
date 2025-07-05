import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import AdminOrdersHistory from '@/components/Admin/AdminOrdersHistory';


export default function OrdersHistoryScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <AdminOrdersHistory />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});
