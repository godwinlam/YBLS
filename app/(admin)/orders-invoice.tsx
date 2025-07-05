import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import AdminInvoice from '@/components/Admin/AdminInvoice';


export default function OrdersInvoiceScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <AdminInvoice />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});
