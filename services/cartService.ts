import { db } from '@/Firebase';
import { collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { Product } from '../components/Products/ProductList';

export interface CartItem extends Product {
  currency: 'YBC' | 'RM';
  quantity: number;
  addedAt: number;
}

export interface Order {
  id: string;
  items: CartItem[];
  totalAmount: number;
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: number;
  updatedAt: number;
}

class CartService {
  private cartCollection = collection(db, 'carts');
  private ordersCollection = collection(db, 'orders-history');

  async addToCart(userId: string, product: Product, quantity: number, currency: 'YBC' | 'RM' = 'YBC') {
    try {
      const cartDoc = doc(this.cartCollection, userId);
      const cartSnapshot = await getDoc(cartDoc);
      
      const cartItem: CartItem = {
        ...product,
        currency,
        quantity,
        addedAt: Date.now()
      };

      if (!cartSnapshot.exists()) {
        await setDoc(cartDoc, { items: [cartItem] });
      } else {
        const cart = cartSnapshot.data();
        const existingItemIndex = cart.items.findIndex((item: CartItem) => item.id === product.id && item.currency === currency);

        if (existingItemIndex > -1) {
          cart.items[existingItemIndex].quantity += quantity;
          await updateDoc(cartDoc, { items: cart.items });
        } else {
          await updateDoc(cartDoc, { items: [...cart.items, cartItem] });
        }
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  }

  async getCart(userId: string) {
    try {
      const cartDoc = doc(this.cartCollection, userId);
      const cartSnapshot = await getDoc(cartDoc);
      
      if (!cartSnapshot.exists()) {
        return { items: [] };
      }
      
      return cartSnapshot.data();
    } catch (error) {
      console.error('Error getting cart:', error);
      throw error;
    }
  }

  async updateCartItemQuantity(
    userId: string,
    productId: string,
    quantity: number,
    currency: 'YBC' | 'RM' = 'YBC'
  ) {
    const cartRef = doc(db, 'carts', userId);
    const cartDoc = await getDoc(cartRef);
    const cart = cartDoc.data();
    const items = cart?.items || [];

    if (quantity === 0) {
      // Remove the item completely
      const updatedItems = items.filter((item: CartItem) => !(item.id === productId && item.currency === currency));
      
      if (updatedItems.length === 0) {
        // If cart is empty, delete the entire cart document
        await deleteDoc(cartRef);
      } else {
        // Update cart with remaining items
        await updateDoc(cartRef, { items: updatedItems });
      }
    } else {
      const existingItemIndex = items.findIndex((item: CartItem) => item.id === productId && item.currency === currency);
      if (existingItemIndex !== -1) {
        items[existingItemIndex].quantity = quantity;
        await updateDoc(cartRef, { items });
      }
    }
  }

  async createOrder(userId: string): Promise<{ id: string; amount: number }> {
    try {
      const cartRef = doc(db, 'carts', userId);
      const cartDoc = await getDoc(cartRef);
      
      if (!cartDoc.exists()) {
        throw new Error('Cart not found');
      }

      const cartData = cartDoc.data();
      const items = cartData.items || [];
      
      if (items.length === 0) {
        throw new Error('Cart is empty');
      }

      // fetch username
      let username: string | undefined;
      try {
        const userSnap = await getDoc(doc(db, 'users', userId));
        if (userSnap.exists()) {
          username = (userSnap.data() as any).username;
        }
      } catch (e) {
        console.warn('Unable to fetch username', e);
      }

      const orderRef = await addDoc(collection(db, 'orders-history'), {
        userId,
        username: username ?? '',
        items,
        status: 'completed',
        createdAt: serverTimestamp(),
        total: items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0),
      });

      return {
        id: orderRef.id,
        amount: items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0),
      };
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  async clearCart(userId: string): Promise<void> {
    try {
      const cartRef = doc(db, 'carts', userId);
      await updateDoc(cartRef, {
        items: [],
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  }

  async getUserOrders(userId: string) {
    try {
      const q = query(this.ordersCollection, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting user orders:', error);
      throw error;
    }
  }

  async updateOrderStatus(orderId: string, status: Order['status']) {
    try {
      const orderDoc = doc(this.ordersCollection, orderId);
      await updateDoc(orderDoc, { 
        status,
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }
}

export const cartService = new CartService();
