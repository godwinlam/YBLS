import AdminServiceCarousel from '@/components/Admin/AdminServiceCarousel';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function ServiceCarouselManagementScreen() {
  return (
    <View style={styles.container}>
      <AdminServiceCarousel />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});
