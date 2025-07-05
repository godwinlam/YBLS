import AdminCarousel from '@/components/Admin/AdminCarousel';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function CarouselManagementScreen() {
  return (
    <View style={styles.container}>
      <AdminCarousel />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});
