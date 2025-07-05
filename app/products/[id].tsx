import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/Firebase';
import { Product } from '@/components/Products/ProductList';
import { cartService } from '@/services/cartService';
import { useSafeState } from '@/hooks/useSafeState';
import { useAuth } from '@/hooks/useAuth';
import { MaterialIcons } from '@expo/vector-icons';
import Checkbox from 'expo-checkbox';
import { CustomAlert } from '@/components/CustomAlert/CustomAlert';

interface QuantityButtonProps {
  icon: "add" | "remove";
  onPress: () => void;
  disabled?: boolean;
}

function QuantityButton({ icon, onPress, disabled }: QuantityButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.quantityButton, disabled && styles.disabledButton]}
      onPress={onPress}
      disabled={disabled}
    >
      <MaterialIcons name={icon} size={24} color={disabled ? "#999" : "#000"} />
    </TouchableOpacity>
  );
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [product, setProduct] = useSafeState<Product | null>(null);
  const [quantity, setQuantity] = useSafeState(1);
  const [loading, setLoading] = useSafeState(false);
  const [addingToCart, setAddingToCart] = useSafeState(false);
  const [useYBC, setUseYBC] = useState<boolean>(false);
  const [useRM, setUseRM] = useState<boolean>(false);
  const canAdd = useYBC || useRM;
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: any[];
  }>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });

  useEffect(() => {
    loadProduct();
  }, [id]);

  const showAlert = (title: string, message: string, buttons: any[]) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      buttons,
    });
  };

  const hideAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  };

  const loadProduct = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'products', id as string);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setProduct({ id: docSnap.id, ...docSnap.data() } as Product);
      } else {
        showAlert('Error', 'Product not found', [
          {
            text: 'Go Back',
            onPress: () => router.back(),
            style: 'default'
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading product:', error);
      showAlert('Error', 'Failed to load product', [
        {
          text: 'Try Again',
          onPress: loadProduct,
          style: 'default'
        },
        {
          text: 'Go Back',
          onPress: () => router.back(),
          style: 'cancel'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    if (!user) {
      showAlert(
        'Login Required',
        'Please log in to add items to your cart',
        [
          {
            text: 'Cancel',
            onPress: () => {},
            style: 'cancel',
          },
          {
            text: 'Log In',
            onPress: () => router.push('/login'),
            style: 'default'
          },
        ]
      );
      return;
    }

    try {
      setAddingToCart(true);
      const currency: 'YBC' | 'RM' = useYBC ? 'YBC' : 'RM';
    await cartService.addToCart(user.uid, product, quantity, currency);
      showAlert(
        'Success',
        'Added to cart successfully',
        [
          {
            text: 'Continue Shopping',
            onPress: () => router.back(),
            style: 'cancel',
          },
          {
            text: 'View Cart',
            onPress: () => router.push({pathname: currency === 'YBC' ? '/(tabs)/cart' : '/(tabs)/cartRM'} as any),
            style: 'default'
          },
        ]
      );
    } catch (error) {
      console.error('Error adding to cart:', error);
      showAlert('Error', 'Failed to add to cart', [
        {
          text: 'Try Again',
          onPress: handleAddToCart,
          style: 'default'
        },
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel'
        }
      ]);
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ee4d2d" />
      </View>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <ScrollView style={styles.container}>
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={hideAlert}
      />
      <View style={styles.imageContainer}>
        <Image source={{ uri: product.image }} style={styles.image} />
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Text style={styles.name}>{product.name}</Text>
        
        <Text style={styles.description}>{product.description}</Text>

        <View style={styles.priceContainer}>
          
        <Text style={styles.price}>{product.price.toFixed(2)}</Text>
        <Text style={styles.ybcText}>YBC</Text>
        <Checkbox
            value={useYBC}
            onValueChange={(v) => { setUseYBC(v); if (v) setUseRM(false); }}
            style={styles.checkbox}
            color={useYBC ? 'green' : undefined}
          />
        <Text style={styles.productPrice}>RM {product.originalPrice.toFixed(2)}</Text>
        <Checkbox
            value={useRM}
            onValueChange={(v) => { setUseRM(v); if (v) setUseYBC(false); }}
            style={styles.checkbox}
            color={useRM ? 'green' : undefined}
          />
        </View>
        
        <View style={styles.quantityContainer}>
          <Text style={styles.quantityLabel}>Quantity:</Text>
          <View style={styles.quantityControls}>
            <QuantityButton
              icon="remove"
              onPress={() => setQuantity(prev => Math.max(1, prev - 1))}
              disabled={quantity <= 1}
            />
            <Text style={styles.quantityText}>{quantity}</Text>
            <QuantityButton
              icon="add"
              onPress={() => setQuantity(prev => prev + 1)}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.addToCartButton,
            (addingToCart || !canAdd) && styles.disabledButton,
          ]}
          onPress={handleAddToCart}
          disabled={addingToCart || !canAdd}
        >
          {addingToCart ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.addToCartText}>Add to Cart</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 300,
   
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover', 
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : Platform.OS === 'ios' ? 60 : 20,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        cursor: 'pointer',
      } as any,
    }),
  },
  content: {
    padding: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  price: {
    fontSize: 20,
    color: 'blue',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 24,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 20,
  },
  quantityLabel: {
    fontSize: 16,
    marginRight: 16,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '500',
    marginHorizontal: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  addToCartButton: {
    backgroundColor: 'green',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  addToCartText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  }, 
  priceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
   ybcText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'green',
    marginLeft: 5,
    marginTop: 5,
  },
  checkbox: {
    marginLeft: 18,
    boxSizing: 'content-box',
    alignSelf: 'center',
    marginBottom: 5,
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'green',
  },
  productPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'grey',
    marginBottom: 5,
    marginLeft: 35,
  },
});
