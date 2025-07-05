import { db, storage } from "@/Firebase";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import showAlert from "../CustomAlert/ShowAlert";

interface CarouselItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  order: number;
}

export default function AdminServiceCarousel() {
  const [carouselItems, setCarouselItems] = useState<CarouselItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<CarouselItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });

  useEffect(() => {
    loadCarouselItems();
  }, []);

  const loadCarouselItems = async () => {
    try {
      const carouselRef = collection(db, "service-carousel");
      const q = query(carouselRef, orderBy("order", "asc"));
      const querySnapshot = await getDocs(q);
      const items: CarouselItem[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as CarouselItem);
      });
      setCarouselItems(items);
    } catch (error) {
      console.error("Error loading service carousel items:", error);
      showAlert("Error", "Failed to load service carousel items");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      showAlert("Error", "Failed to pick image");
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      let response, blob;

      // Handle both local and web platform cases
      if (Platform.OS === 'web') {
        // For web platform, convert base64 to blob
        const base64Response = await fetch(uri);
        blob = await base64Response.blob();
      } else {
        // For mobile platforms
        response = await fetch(uri);
        blob = await response.blob();
      }

      const timestamp = Date.now();
      // Get file extension from uri or mime type
      let extension = '';
      if (uri.includes(';base64,')) {
        // Handle base64 image
        extension = uri.split(';')[0].split('/')[1] || 'jpg' || 'png';
      } else {
        extension = uri.split('.').pop()?.toLowerCase() || 'jpg' || 'png';
      }

      const filename = `service-carousel/${timestamp}.${extension}`;
      const storageRef = ref(storage, filename);

      // Set appropriate content type
      const metadata = {
        contentType: blob.type || `image/${extension}`,
      };

      console.log('Uploading with metadata:', metadata);
      const snapshot = await uploadBytes(storageRef, blob, metadata);
      console.log('Uploaded service carousel image:', snapshot.ref.fullPath);

      return await getDownloadURL(snapshot.ref);
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleAddItem = async () => {
    try {
      if (!imageUri) {
        showAlert("Error", "Please select an image");
        return;
      }

      if (!formData.title || !formData.description) {
        showAlert("Error", "Please fill in all fields");
        return;
      }

      setLoading(true);
      const imageUrl = await uploadImage(imageUri);

      const newItem = {
        ...formData,
        imageUrl,
        order: carouselItems.length,
      };

      await addDoc(collection(db, "service-carousel"), newItem);

      setFormData({ title: "", description: "" });
      setImageUri(null);
      loadCarouselItems();
      showAlert("Success", "Service Carousel item added successfully");
    } catch (error) {
      console.error("Error adding service carousel item:", error);
      showAlert("Error", "Failed to add service carousel item");
    } finally {
      setLoading(false);
    }
  };

  const handleEditItem = async (item: CarouselItem) => {
    if (isEditing && selectedItem) {
      try {
        setLoading(true);
        let imageUrl = selectedItem.imageUrl;

        if (imageUri) {
          // Delete old image if it exists
          if (selectedItem.imageUrl) {
            const oldImageRef = ref(storage, selectedItem.imageUrl);
            await deleteObject(oldImageRef).catch(console.error);
          }
          imageUrl = await uploadImage(imageUri);
        }

        const itemRef = doc(db, "service-carousel", selectedItem.id);
        await updateDoc(itemRef, {
          title: formData.title,
          description: formData.description,
          imageUrl,
        });

        setIsEditing(false);
        setSelectedItem(null);
        setImageUri(null);
        setFormData({ title: "", description: "" });
        loadCarouselItems();
        showAlert("Success", "Service Carousel item updated successfully");
      } catch (error) {
        console.error("Error updating service carousel item:", error);
        showAlert("Error", "Failed to update service carousel item");
      } finally {
        setLoading(false);
      }
    } else {
      setIsEditing(true);
      setSelectedItem(item);
      setFormData({
        title: item.title,
        description: item.description,
      });
      setImageUri(null);
    }
  };

  const handleDeleteItem = async (item: CarouselItem) => {
    try {
      setLoading(true);

      // Delete image from storage
      if (item.imageUrl) {
        const imageRef = ref(storage, item.imageUrl);
        await deleteObject(imageRef).catch(console.error);
      }

      // Delete document from Firestore
      await deleteDoc(doc(db, "service-carousel", item.id));

      // Update order of remaining items
      const remainingItems = carouselItems.filter((i) => i.id !== item.id);
      for (let i = 0; i < remainingItems.length; i++) {
        const itemRef = doc(db, "service-carousel", remainingItems[i].id);
        await updateDoc(itemRef, { order: i });
      }

      loadCarouselItems();
      showAlert("Success", "Service Carousel item deleted successfully");
    } catch (error) {
      console.error("Error deleting service carousel item:", error);
      showAlert("Error", "Failed to delete service carousel item");
    } finally {
      setLoading(false);
    }
  };

  const moveItem = async (itemId: string, direction: "up" | "down") => {
    try {
      setLoading(true);
      const currentIndex = carouselItems.findIndex(
        (item) => item.id === itemId
      );
      const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (newIndex < 0 || newIndex >= carouselItems.length) return;

      const items = [...carouselItems];
      const item = items[currentIndex];
      const swapItem = items[newIndex];

      const itemRef = doc(db, "service-carousel", item.id);
      const swapItemRef = doc(db, "service-carousel", swapItem.id);

      await updateDoc(itemRef, { order: newIndex });
      await updateDoc(swapItemRef, { order: currentIndex });

      loadCarouselItems();
    } catch (error) {
      console.error("Error moving service carousel item:", error);
      showAlert("Error", "Failed to move service carousel item");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Service Carousel</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>
            {isEditing ? "Edit Service Carousel Item" : "Add New Service Carousel Item"}
          </Text>

          <TouchableOpacity
            style={styles.imagePickerButton}
            onPress={pickImage}
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
            ) : (
              <>
                <MaterialIcons
                  name="add-photo-alternate"
                  size={24}
                  color="#666"
                />
                <Text style={styles.imagePickerText}>Select Image</Text>
              </>
            )}
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Title"
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description"
            value={formData.description}
            onChangeText={(text) =>
              setFormData({ ...formData, description: text })
            }
            multiline
            numberOfLines={4}
          />

          <TouchableOpacity
            style={[styles.button, isEditing && styles.editButton]}
            onPress={
              isEditing ? () => handleEditItem(selectedItem!) : handleAddItem
            }
          >
            <Text style={styles.buttonText}>
              {isEditing ? "Update Item" : "Add Item"}
            </Text>
          </TouchableOpacity>

          {isEditing && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setIsEditing(false);
                setSelectedItem(null);
                setImageUri(null);
                setFormData({ title: "", description: "" });
              }}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.listContainer}>
          <Text style={styles.title}>Service Carousel Items</Text>
          {carouselItems.map((item, index) => (
            <View key={item.id} style={styles.itemContainer}>
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.itemImage}
                resizeMode="cover"
              />
              <View style={styles.itemContent}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemDescription}>{item.description}</Text>
              </View>
              <View style={styles.itemActions}>
                <TouchableOpacity
                  onPress={() => moveItem(item.id, "up")}
                  disabled={index === 0}
                  style={[
                    styles.actionButton,
                    index === 0 && styles.disabledButton,
                  ]}
                >
                  <MaterialIcons name="arrow-upward" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => moveItem(item.id, "down")}
                  disabled={index === carouselItems.length - 1}
                  style={[
                    styles.actionButton,
                    index === carouselItems.length - 1 && styles.disabledButton,
                  ]}
                >
                  <MaterialIcons name="arrow-downward" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleEditItem(item)}
                  style={styles.actionButton}
                >
                  <MaterialIcons name="edit" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteItem(item)}
                  style={[styles.actionButton, styles.deleteButton]}
                >
                  <MaterialIcons name="delete" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  backButton: {
    position: "absolute",
    left: 16,
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  formContainer: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
      },
      android: {
        elevation: 2,
      },
      default: {
        boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
      },
    }),
  },
  imagePickerButton: {
    height: 200,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#ddd",
    borderStyle: "dashed",
  },
  imagePickerText: {
    marginTop: 8,
    color: "#666",
    fontSize: 16,
  },
  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    overflow: "hidden",
    resizeMode: "cover",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#2196F3",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  editButton: {
    backgroundColor: "#4CAF50",
  },
  cancelButton: {
    backgroundColor: "#f44336",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  listContainer: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    ...Platform.select({
      ios: {
        boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
      },
      android: {
        elevation: 2,
      },
      default: {
        boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
      },
    }),
  },
  itemContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 16,
    overflow: "hidden",
  },
  itemImage: {
    width: "100%",
    height: 200,
  },
  itemContent: {
    padding: 16,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  itemDescription: {
    fontSize: 14,
    color: "#666",
  },
  itemActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 8,
    backgroundColor: "#f5f5f5",
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2196F3",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: "#f44336",
  },
  disabledButton: {
    opacity: 0.5,
  },
});
