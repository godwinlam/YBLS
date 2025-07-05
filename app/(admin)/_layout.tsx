import { Stack } from "expo-router";

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#000',
        },
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 20,
          color: '#fff',
        },
        headerTintColor: '#fff',
        headerTitleAlign: 'center',
        headerBackTitle: 'Back',
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Admin Dashboard',
        }}
      />
      <Stack.Screen
        name="user-management"
        options={{
          title: 'User Management',
        }}
      />
      <Stack.Screen
        name="carousel-management"
        options={{
          title: 'Carousel Management',
        }}
      />
      <Stack.Screen
        name="service-carousel-management"
        options={{
          title: 'Service Carousel Management',
        }}
      />
      <Stack.Screen
        name="productList-management"
        options={{
          title: 'Product List Management',
        }}
      />
      <Stack.Screen
        name="orders-History"
        options={{
          title: 'Orders History',
        }}
      />
      <Stack.Screen
        name="orders-invoice"
        options={{
          title: 'Orders Invoice',
        }}
      />
    </Stack>
  );
}
