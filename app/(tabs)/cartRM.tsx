import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { cartService, CartItem } from "@/services/cartService";
import { useSafeState } from "@/hooks/useSafeState";
import { useAuth } from "@/hooks/useAuth";
import { MaterialIcons } from "@expo/vector-icons";
import { CustomAlert } from "@/components/CustomAlert/CustomAlert";

export default function CartRM() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [cartItems, setCartItems] = useSafeState<CartItem[]>([]);
  const [loading, setLoading] = useSafeState(true);
  const [processing, setProcessing] = useSafeState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: any[];
  }>({
    visible: false,
    title: "",
    message: "",
    buttons: [],
  });

  // Calculate total amount using useMemo to optimize performance
  const totalAmount = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + item.originalPrice * item.quantity,
        0
      ),
    [cartItems]
  );
  const itemCount = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.quantity, 0),
    [cartItems]
  );

  useEffect(() => {
    if (user) {
      loadCart();
    }
    // else if (!authLoading) {
    //   router.push('/login');
    // }
  }, [user]);

  const showAlert = (title: string, message: string, buttons: any[]) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      buttons,
    });
  };

  const hideAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  const loadCart = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const cart = await cartService.getCart(user.uid);
      setCartItems((cart.items || []).filter((i: any) => i.currency === "RM"));
    } catch (error) {
      console.error("Error loading cart:", error);
      showAlert("Error", "Failed to load cart", [
        { text: "OK", onPress: () => {} },
      ]);
    } finally {
      setLoading(false);
    }
  };

  async function handleUpdateQuantity(productId: string, newQuantity: number) {
    if (!user) return;

    try {
      await cartService.updateCartItemQuantity(
        user.uid,
        productId,
        newQuantity,
        "RM"
      );
      await loadCart();
    } catch (error) {
      console.error("Error updating quantity:", error);
      showAlert("Error", "Failed to update quantity", [
        {
          text: "Try Again",
          onPress: () => handleUpdateQuantity(productId, newQuantity),
          style: "default",
        },
        {
          text: "Cancel",
          onPress: () => {},
          style: "cancel",
        },
      ]);
    }
  }

  const handleDeleteItem = (productId: string, productName: string) => {
    if (!user) return;
    showAlert(
      "Remove Item",
      `Are you sure you want to remove "${productName}" from your cart?`,
      [
        {
          text: "Keep Item",
          onPress: () => {},
          style: "cancel",
        },
        {
          text: "Remove",
          onPress: async () => {
            try {
              await cartService.updateCartItemQuantity(
                user!.uid,
                productId,
                0,
                "RM"
              );
              await loadCart();
            } catch (error) {
              console.error("Error removing item:", error);
              showAlert("Error", "Failed to remove item from cart", [
                {
                  text: "Try Again",
                  onPress: () => handleDeleteItem(productId, productName),
                  style: "default",
                },
                {
                  text: "Cancel",
                  onPress: () => {},
                  style: "cancel",
                },
              ]);
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  // Checkout RM items -> create order then navigate to payment
  const handleCheckout = async () => {
    if (!user) return;
    try {
      setProcessing(true);
      // For RM checkout we don't persist an order in Firestore.
      const tempId = Date.now().toString();
      router.push({
        pathname: "/RMpayment/[id]" as any,
        params: { id: tempId, amount: totalAmount.toFixed(2) },
      } as any);
    } catch (error) {
      console.error("RM Checkout error:", error);
      showAlert("Error", "Failed to create order", [
        { text: "OK", onPress: () => {} },
      ]);
    } finally {
      setProcessing(false);
    }
  };

  const renderItem = ({ item }: { item: CartItem }) => {
    const itemTotal = item.originalPrice * item.quantity;

    return (
      <View style={styles.cartItem}>
        <Image source={{ uri: item.image }} style={styles.productImage} />
        <View style={styles.itemDetails}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.productPrice}>
            RM {item.originalPrice.toFixed(2)}
          </Text>
          <View style={styles.quantityContainer}>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={[
                  styles.quantityButton,
                  item.quantity <= 1 && styles.disabledButton,
                ]}
                onPress={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                disabled={item.quantity <= 1}
              >
                <MaterialIcons name="remove" size={20} color="#000" />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{item.quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handleUpdateQuantity(item.id, item.quantity + 1)}
              >
                <MaterialIcons name="add" size={20} color="#000" />
              </TouchableOpacity>
            </View>
            <Text style={styles.itemTotal}>RM {itemTotal.toFixed(2)}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleDeleteItem(item.id, item.name)}
        >
          <MaterialIcons name="delete" size={24} color="#ee4d2d" />
        </TouchableOpacity>
      </View>
    );
  };

  // if (authLoading || loading) {
  //   return (
  //     <View style={styles.loadingContainer}>
  //       <ActivityIndicator size="large" color="#ee4d2d" />
  //     </View>
  //   );
  // }

  if (!user) {
    return (
      <View style={styles.emptyCart}>
        <MaterialIcons name="account-circle" size={64} color="#ccc" />
        <Text style={styles.emptyText}>Please log in to view your cart</Text>
        <Text style={styles.text}>New Users Will Get 100 Credits</Text>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => router.push("/login")}
        >
          <Text style={styles.continueButtonText}>Log In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={hideAlert}
      />
      <Text style={styles.title}>Shopping Cart</Text>
      {cartItems.length === 0 ? (
        <View style={styles.emptyCart}>
          <MaterialIcons name="shopping-cart" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => router.push({ pathname: "/products" } as any)}
          >
            <Text style={styles.continueButtonText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={cartItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
          />
          <View style={styles.footer}>
            <View style={styles.totalContainer}>
              <View>
                <Text style={styles.totalLabel}>
                  Total ({itemCount} items):
                </Text>
                <Text style={styles.totalSubtext}>
                  Including taxes and fees
                </Text>
              </View>
              <Text style={styles.totalAmount}>
                RM {totalAmount.toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.checkoutButton,
                processing && styles.disabledButton,
              ]}
              onPress={handleCheckout}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.checkoutButtonText}>
                  Proceed to Checkout
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    padding: 16,
    backgroundColor: "#fff",
  },
  listContainer: {
    padding: 16,
  },
  cartItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 4,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    color: "#4b18e6",
    fontWeight: "bold",
    marginBottom: 8,
  },
  quantityContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  quantityText: {
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: "500",
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4b18e6",
  },
  removeButton: {
    padding: 8,
  },
  footer: {
    backgroundColor: "#fff",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "500",
  },
  totalSubtext: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4b18e6",
  },
  checkoutButton: {
    backgroundColor: "#0c1bec",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  checkoutButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  disabledButton: {
    opacity: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyCart: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    color: "green",
    marginTop: 16,
    marginBottom: 5,
  },
  text: {
    fontSize: 18,
    color: "green",
    marginBottom: 24,
  },
  continueButton: {
    backgroundColor: "#ee4d2d",
    borderRadius: 8,
    padding: 12,
    paddingHorizontal: 24,
  },
  continueButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
});
