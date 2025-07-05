import { auth } from "@/Firebase";
import { userService } from "@/services/userService";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import showAlert from "../CustomAlert/ShowAlert";

export default function AdminPanelScreen() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      router.replace("/login");
      return;
    }
    try {
      const userDetails = await userService.getUserById(currentUser.uid);
      if (userDetails?.role !== "admin") {
        showAlert("Access Denied", "Only administrators can access this page");
        router.back();
        return;
      }
      setIsAdmin(true);
    } catch (error) {
      console.error("Error checking admin status:", error);
      showAlert("Error", "Failed to verify admin status");
      router.back();
    }
  };

  if (!isAdmin) {
    return <ActivityIndicator />;
  }

  return (
    <ScrollView>
      <View style={styles.container}>
        <Text style={styles.title}>Admin Panel</Text>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() =>
            router.push({ pathname: "/(admin)/user-management" } as any)
          }
        >
          <Ionicons name="people" size={24} color="white" />
          <Text style={styles.buttonText}>User Management</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() =>
            router.push({ pathname: "/(admin)/carousel-management" } as any)
          }
        >
          <MaterialIcons name="collections" size={24} color="black" />
          <Text style={styles.buttonText}>Carousel Management</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() =>
            router.push({
              pathname: "/(admin)/service-carousel-management",
            } as any)
          }
        >
          <MaterialIcons
            name="production-quantity-limits"
            size={24}
            color="black"
          />
          <Text style={styles.buttonText}>Service Carousel Management</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() =>
            router.push({ pathname: "/(admin)/productList-management" } as any)
          }
        >
          <MaterialIcons
            name="production-quantity-limits"
            size={24}
            color="black"
          />
          <Text style={styles.buttonText}>Product List Management</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() =>
            router.push({ pathname: "/(admin)/orders-History" } as any)
          }
        >
          <MaterialIcons name="history" size={24} color="black" />
          <Text style={styles.buttonText}>Order History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() =>
            router.push({ pathname: "/(admin)/orders-invoice" } as any)
          }
        >
          <MaterialIcons name="receipt" size={24} color="black" />
          <Text style={styles.buttonText}>Order Invoice</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const shadowStyle = Platform.select({
  ios: {
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.15)",
  },
  android: {
    elevation: 2,
  },
  default: {
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.15)",
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  menuButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2196F3",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    gap: 10,
    ...shadowStyle,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
