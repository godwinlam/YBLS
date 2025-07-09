import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
  Modal,
  SectionList,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Dimensions,
  SafeAreaView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "@/Firebase";
import { router } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import showAlert from "../CustomAlert/ShowAlert";

interface Product {
  id: string;
  name: string;
  bigOriginalPrice: number;
  price: number;
  originalPrice: number;
  description: string;
  category: string;
  quantity: number;
  image: string;
}

interface ProductSection {
  title: string;
  data: Product[];
}

// interface AdminProduct extends Omit<Product, 'image'> {
//   image: string;
// }

interface FormData {
  name: string;
  bigOriginalPrice: string;
  price: string;
  originalPrice: string;
  description: string;
  category: string;
  quantity: string;
}

const categories = [
  "Promotions",
  "Hot Treatment",
  "Professional Skin Treatment",
  "Facial Treatment",
  "Wellness Care",
  "Postnatal Care",
  "Bioelectrical Therapy",
];

const AdminProductManagement = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    bigOriginalPrice: "",
    price: "",
    originalPrice: "",
    description: "",
    category: categories[0],
    quantity: "1",
  });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [productSections, setProductSections] = useState<ProductSection[]>([]);

  const handleAddProduct = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      bigOriginalPrice: "",
      price: "",
      originalPrice: "",
      description: "",
      category: categories[0],
      quantity: "1",
    });
    setSelectedImage(null);
    setIsModalVisible(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      bigOriginalPrice: product.bigOriginalPrice.toString(),
      price: product.price.toString(),
      originalPrice: product.originalPrice.toString(),
      description: product.description,
      category: product.category,
      quantity: (product.quantity || 0).toString(),
    });
    setSelectedImage(product.image);
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setEditingProduct(null);
    setSelectedImage(null);
    setFormData({
      name: "",
      bigOriginalPrice: "",
      price: "",
      originalPrice: "",
      description: "",
      category: categories[0],
      quantity: "1",
    });
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (products.length > 0) {
      const grouped = products.reduce((acc, product) => {
        const { category } = product;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(product);
        return acc;
      }, {} as Record<string, Product[]>);

      const sections = Object.keys(grouped)
        .sort()
        .map((category) => ({
          title: category,
          data: grouped[category],
        }));
      setProductSections(sections);
    } else {
      setProductSections([]);
    }
  }, [products]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      const productsData: Product[] = [];
      querySnapshot.forEach((doc) => {
        productsData.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(productsData);
    } catch (error) {
      setError("Failed to load products");
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert(
        "Permission Denied",
        "Sorry, we need camera roll permissions to make this work!"
      );
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const uploadImageAsync = async (uri: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const fileRef = ref(storage, `products/${Date.now()}`);
    await uploadBytes(fileRef, blob);
    return await getDownloadURL(fileRef);
  };

  const handleSubmit = async () => {
    if (
      !formData.name ||
      !formData.price ||
      !formData.description ||
      !formData.category
    ) {
      showAlert("Error", "Please fill in all required fields");
      return;
    }

    setImageLoading(true);

    try {
      let imageUrl = editingProduct ? editingProduct.image : "";

      if (selectedImage && selectedImage !== (editingProduct?.image || "")) {
        imageUrl = await uploadImageAsync(selectedImage);
      } else if (!editingProduct && !selectedImage) {
        showAlert("Error", "Please select an image for the new product.");
        setImageLoading(false);
        return;
      }

      const productData: Omit<Product, "id"> = {
        name: formData.name,
        bigOriginalPrice: parseFloat(formData.bigOriginalPrice),
        price: parseFloat(formData.price),
        originalPrice: parseFloat(formData.originalPrice),
        description: formData.description,
        category: formData.category,
        quantity: parseInt(formData.quantity, 10) || 0,
        image: imageUrl,
      };

      if (editingProduct) {
        if (
          selectedImage &&
          selectedImage !== editingProduct.image &&
          editingProduct.image
        ) {
          const oldImageRef = ref(storage, editingProduct.image);
          try {
            await deleteObject(oldImageRef);
          } catch (e: any) {
            if (e.code !== "storage/object-not-found") {
              console.error("Error deleting old image: ", e);
            }
          }
        }
        await updateDoc(doc(db, "products", editingProduct.id), productData);
        showAlert("Success", "Product updated successfully");
      } else {
        await addDoc(collection(db, "products"), productData);
        showAlert("Success", "Product added successfully");
      }

      await loadProducts();
      handleCloseModal();
    } catch (error) {
      showAlert("Error", "Failed to save product");
      console.error("Error saving product:", error);
    } finally {
      setImageLoading(false);
    }
  };

  const handleDelete = async (product: Product) => {
    showAlert(
      "Delete Product",
      "Are you sure you want to delete this product?",
      [
        {
          text: "Cancel",
          // style: 'cancel',
        },
        {
          text: "Delete",
          // style: 'destructive',
          onPress: async () => {
            try {
              if (product.image) {
                const imageRef = ref(storage, product.image);
                await deleteObject(imageRef).catch((error) => {
                  if (error.code !== "storage/object-not-found") {
                    console.error("Error deleting image: ", error);
                  }
                });
              }
              await deleteDoc(doc(db, "products", product.id));
              await loadProducts();
              showAlert("Success", "Product deleted successfully");
            } catch (error) {
              showAlert("Error", "Failed to delete product");
              console.error("Error deleting product:", error);
            }
          },
        },
      ]
    );
  };

  const renderProductItem = ({ item }: { item: Product }) => (
    <View style={styles.productItem}>
      <Image source={{ uri: item.image }} style={styles.productImage} />
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productOriginalPrice}>
          RM {item.bigOriginalPrice.toFixed(2)}
        </Text>
        <Text style={styles.productOriginalPrice}>
          RM {item.originalPrice.toFixed(2)}
        </Text>
        <Text style={styles.productPrice}>{item.price.toFixed(2)} YBC</Text>
        <Text style={styles.productCategory}>{item.category}</Text>
        <Text style={styles.productQuantity}>Qty: {item.quantity || 0}</Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEdit(item)}
        >
          <MaterialIcons name="edit" size={20} color="#2196F3" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item)}
        >
          <MaterialIcons name="delete" size={20} color="#FF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <SectionList
        sections={productSections}
        renderItem={renderProductItem}
        keyExtractor={(item: Product, index: number) => item.id + index}
        renderSectionHeader={({ section }: { section: ProductSection }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <MaterialIcons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>Product Management</Text>
            <View style={{ width: 24 }} />
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={handleAddProduct}>
        <MaterialIcons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        onRequestClose={handleCloseModal}
        transparent
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView
              contentContainerStyle={{ flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </Text>
                <TouchableOpacity onPress={handleCloseModal}>
                  <MaterialIcons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={pickImage} style={styles.imageUpload}>
                {selectedImage ? (
                  <Image
                    source={{ uri: selectedImage }}
                    style={styles.previewImage}
                  />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <MaterialIcons name="camera-alt" size={40} color="#ccc" />
                    <Text style={styles.uploadText}>Select Image</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TextInput
                style={[
                  styles.input,
                  Platform.OS === "web" && {
                    height: 80,
                    textAlignVertical: "top",
                  },
                ]}
                placeholder="Product Name"
                multiline
                value={formData.name}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Big Original Price"
                value={formData.bigOriginalPrice}
                onChangeText={(text) =>
                  setFormData({ ...formData, bigOriginalPrice: text })
                }
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Original Price"
                value={formData.originalPrice}
                onChangeText={(text) =>
                  setFormData({ ...formData, originalPrice: text })
                }
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="YBC"
                value={formData.price}
                onChangeText={(text) =>
                  setFormData({ ...formData, price: text })
                }
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description"
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
                multiline
              />

              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.category}
                  onValueChange={(itemValue) =>
                    setFormData({ ...formData, category: itemValue })
                  }
                  style={styles.picker}
                >
                  {categories.map((cat) => (
                    <Picker.Item key={cat} label={cat} value={cat} />
                  ))}
                </Picker>
              </View>

              <View style={styles.quantityContainer}>
                <Text style={styles.label}>Quantity:</Text>
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() =>
                      setFormData((prev) => ({
                        ...prev,
                        quantity: Math.max(
                          0,
                          parseInt(prev.quantity, 10) - 1
                        ).toString(),
                      }))
                    }
                  >
                    <MaterialIcons name="remove" size={20} color="#2196F3" />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.quantityInput}
                    value={formData.quantity}
                    onChangeText={(text) =>
                      setFormData({ ...formData, quantity: text })
                    }
                    keyboardType="numeric"
                  />
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() =>
                      setFormData((prev) => ({
                        ...prev,
                        quantity: (parseInt(prev.quantity, 10) + 1).toString(),
                      }))
                    }
                  >
                    <MaterialIcons name="add" size={20} color="#2196F3" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.submitButton,
                    imageLoading && { backgroundColor: "#ccc" },
                  ]}
                  onPress={handleSubmit}
                  disabled={imageLoading}
                >
                  {imageLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>
                      {editingProduct ? "Update" : "Submit"}
                    </Text>
                  )}
                </TouchableOpacity>
                {editingProduct && (
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={handleCloseModal}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "90%",
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  formContainer: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    margin: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      },
    }),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  categoryHeaderContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },
  categoryHeaderItem: {
    backgroundColor: "#e0e0e0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryHeader: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  productItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      },
    }),
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  productPrice: {
    fontSize: 14,
    color: "#2196F3",
    marginTop: 4,
  },
  productOriginalPrice: {
    fontSize: 14,
    color: "#2196F3",
    // textDecorationLine: 'line-through',
    marginTop: 4,
  },
  productCategory: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  productQuantity: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  editButton: {
    borderColor: "#2196F3",
  },
  deleteButton: {
    borderColor: "#FF4444",
  },
  pickerContainer: {
    backgroundColor: "red",
    borderRadius: 8,
    marginBottom: 16,
    justifyContent: "center",
  },
  picker: {
    height: 60,
    fontSize: 24,
    width: "100%",
  },
  backButton: {
    zIndex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    marginHorizontal: 16,
    color: "#333",
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "bold",
    backgroundColor: "#f0f0f0",
    padding: 12,
    marginTop: 10,
    color: "#333",
  },
  imageUpload: {
    width: "100%",
    height: 200,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    marginBottom: 16,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadText: {
    marginTop: 8,
    color: "#666",
    fontSize: 16,
  },
  input: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 200,
    textAlignVertical: "top",
  },
  quantityContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: "#333",
    marginBottom: 8,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  quantityButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2196F3",
  },
  quantityInput: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    width: 80,
    textAlign: "center",
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButton: {
    backgroundColor: "#2196F3",
  },
  cancelButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#FF4444",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButtonText: {
    color: "#FF4444",
  },
  fab: {
    position: "absolute",
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    right: 20,
    bottom: 100,
    backgroundColor: "#2196F3",
    borderRadius: 28,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: "0 2px 5px rgba(0, 0, 0, 0.3)",
      },
    }),
  },
});

export default AdminProductManagement;
