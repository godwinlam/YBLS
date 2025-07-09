import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
  TextInput,
} from "react-native";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/Firebase";
import { useRouter } from "expo-router";
import { useLanguage } from "@/hooks/useLanguage";

export interface Product {
  id: string;
  name: string;
  price: number;
  bigOriginalPrice: number;
  originalPrice: number;
  description: string;
  image: string;
  category: string;
  // isNew?: boolean;
  quantity?: number;
  sold?: number;
}

interface ProductListProps {
  products?: Product[];
  onAddToCart?: (product: Product) => void;
}

export default function ProductList({
  products: initialProducts,
  onAddToCart,
}: ProductListProps) {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>(initialProducts || []);
  const [selectedCategory, setSelectedCategory] = useState("Hot Treatment");
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const categories = useMemo(
    () => [
      {
        id: "Promotions",
        name: t.promotions,
        icon: require("@/assets/images/Promotions.png"),
        banner: require("@/assets/images/Promotions.png"),
      },
      {
        id: "Hot Treatment",
        name: t.hot_Treatment,
        icon: require("@/assets/images/BestSellers.png"),
        banner: require("@/assets/images/HotTreatment.png"),
      },
      {
        id: "Professional Skin Treatment",
        name: t.professional_Skin_Treatment,
        icon: require("@/assets/images/Professional Skin Treatment.jpg"),
        banner: require("@/assets/images/Professional Skin Treatment.jpg"),
      },
      {
        id: "Facial Treatment",
        name: t.facial_Treatment,
        icon: require("@/assets/images/test.png"),
        banner: require("@/assets/images/test.png"),
      },
      {
        id: "Wellness Care",
        name: t.wellness_Care,
        icon: require("@/assets/images/test.png"),
        banner: require("@/assets/images/test.png"),
      },
      {
        id: "Postnatal Care",
        name: t.postnatal_Care,
        icon: require("@/assets/images/Professional Skin Treatment.jpg"),
        banner: require("@/assets/images/voucher.png"),
      },
      {
        id: "Bioelectrical Therapy",
        name: t.bioelectrical_therapy,
        icon: require("@/assets/images/Professional Skin Treatment.jpg"),
        banner: require("@/assets/images/test01.png"),
      },
    ],
    [t]
  );

  useEffect(() => {
    if (!initialProducts) {
      loadProducts();
    }
  }, [initialProducts]);

  const loadProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      const productsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];
      setProducts(productsData);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filter by category first
    if (selectedCategory) {
      filtered = filtered.filter(
        (product) => product.category === selectedCategory
      );
    }

    // Then filter by search query
    if (searchQuery) {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [products, selectedCategory, searchQuery]);

  const renderCategoryItem = ({
    item,
  }: {
    item: { id: string; name: string; icon: string };
  }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategory === item.id && styles.selectedCategoryItem,
      ]}
      onPress={() => setSelectedCategory(item.id)}
    >
      <Image
        source={
          item.icon ||
          require("@/assets/images/Professional Skin Treatment.jpg")
        }
        style={styles.categoryIcon}
      />
      <Text
        style={[
          styles.categoryText,
          selectedCategory === item.id && styles.selectedCategoryText,
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => router.push({ pathname: `/products/${item.id}` as any })}
    >
      <Image source={{ uri: item.image }} style={styles.productImage} />
      {/* {item.isNew && (
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>NEW</Text>
        </View>
      )} */}
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <View style={styles.priceContainer}>
          {/* {item.originalPrice ? (
            <>
              <Text style={styles.price}>RM {item.price.toFixed(2)}</Text>
              <Text style={styles.originalPrice}>RM {item.originalPrice.toFixed(2)}</Text>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>
                  {Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}% OFF
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.price}>{item.price.toFixed(2)}</Text>
          )} */}
          <Text style={styles.price}>{item.price.toFixed(2)}</Text>
          <Text style={styles.ybcText}>YBC</Text>
          <Text style={styles.productPrice}>
            RM {item.originalPrice.toFixed(2)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const currentCategoryObject = categories.find(
    (cat) => cat.id === selectedCategory
  );
  const bannerImage = currentCategoryObject
    ? currentCategoryObject.banner
    : require("@/assets/images/burger.jpg"); // Fallback

  return (
    <View style={styles.container}>
      <View style={styles.sidebar}>
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
        />
      </View>
      <View style={styles.mainContent}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <Image source={bannerImage} style={styles.bannerImage} />
        <Text style={styles.categoryHeader}>
          {categories.find((c) => c.id === selectedCategory)?.name ||
            selectedCategory}
        </Text>
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    paddingVertical: 10,
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: "#354204",
    borderRadius: 8,
    paddingHorizontal: 15,
    backgroundColor: "#f5f5f5",
  },
  container: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    width: 80,
    backgroundColor: "#f5f5f5",
  },
  categoryItem: {
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 5,
    borderRadius: 10,
  },
  selectedCategoryItem: {
    backgroundColor: "lightgreen",
    borderLeftWidth: 4,
    borderLeftColor: "red",
  },
  categoryIcon: {
    width: 40,
    height: 40,
    resizeMode: "contain",
    marginBottom: 5,
  },
  categoryText: {
    fontSize: 12,
    textAlign: "center",
    color: "#666",
  },
  selectedCategoryText: {
    fontWeight: "bold",
    color: "#000",
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 10,
  },
  bannerImage: {
    width: "100%",
    height: 100,
    borderRadius: 10,
    marginBottom: 10,
    resizeMode: "cover",
  },
  categoryHeader: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  productCard: {
    flexDirection: "row",
    marginBottom: 15,
    backgroundColor: "#fff",
    borderRadius: 10,
  },
  productImage: {
    width: 130,
    height: 100,
    borderRadius: 10,
  },
  newBadge: {
    position: "absolute",
    top: -5,
    left: -5,
    backgroundColor: "#007bff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 15,
    transform: [{ rotate: "-15deg" }],
  },
  newBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  productInfo: {
    flex: 1,
    paddingLeft: 15,
    justifyContent: "center",
  },
  productName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 25,
  },
  priceContainer: {
    flexDirection: "row",
    // alignItems: 'center',
    flexWrap: "wrap",
  },
  price: {
    fontSize: 16,
    color: "green",
    fontWeight: "bold",
  },
  originalPrice: {
    fontSize: 12,
    color: "#999",
    textDecorationLine: "line-through",
    marginRight: 10,
  },
  discountBadge: {
    backgroundColor: "#fffae6",
    borderColor: "#ff6b6b",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  discountText: {
    color: "#ff6b6b",
    fontSize: 10,
    fontWeight: "bold",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
  },
  ybcText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "green",
    marginLeft: 2,
    marginTop: 8,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "grey",
    marginBottom: 5,
    marginLeft: 10,
  },
});
