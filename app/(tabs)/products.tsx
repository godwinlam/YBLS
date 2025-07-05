import React, { useState, useEffect } from "react";
import { View, StyleSheet, Platform, ActivityIndicator } from "react-native";
import ProductList, { Product } from "@/components/Products/ProductList";
import { useRouter } from "expo-router";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/Firebase";
import { useSafeState } from "@/hooks/useSafeState";

export default function ProductsScreen() {
  const router = useRouter();
  const [products, setProducts] = useSafeState<Product[]>([]);
  const [loading, setLoading] = useSafeState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const productsRef = collection(db, "products");
      const q = query(productsRef, orderBy("name"));
      const querySnapshot = await getDocs(q);

      const productsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        sold: Math.floor(Math.random() * 1000), // Simulated sold count for UI
      })) as Product[];

      setProducts(productsData);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    router.push({
      pathname: "/(tabs)/cart" as any,
      params: {
        productId: product.id,
        action: "add",
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ee4d2d" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ProductList products={products} onAddToCart={handleAddToCart} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    // paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
});
