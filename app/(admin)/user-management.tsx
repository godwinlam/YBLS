import UserManagementScreen from "@/components/Admin/UserManagement";
import { Stack } from "expo-router";

export default function UserManagement() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <UserManagementScreen />
    </>
  );
}
