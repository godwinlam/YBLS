import CustomTabBar from '@/components/Navigation/CustomTabBar';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#fff',
  },
});

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTitleStyle: {
          fontWeight: '600',
          color: '#1a1a1a',
        },
        headerShadowVisible: false,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 88 : 60,
          paddingHorizontal: 8,
          borderTopWidth: 0,
          backgroundColor: '#fff',
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarShowLabel: false,
      }}
      tabBar={props => (
        <SafeAreaView edges={['bottom']} style={styles.safeArea}>
          <CustomTabBar {...props} />
        </SafeAreaView>
      )}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "home",
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: "Products",
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="cartRM"
        options={{
          title: "CartRM",
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="orderHistory"
        options={{
          title: "Order",
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="location"
        options={{
          title: "Location",
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
