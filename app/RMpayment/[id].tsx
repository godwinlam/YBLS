import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CartItem, cartService } from '@/services/cartService';
import { db } from '@/Firebase';
import { userService } from '@/services/userService';
import { collection, addDoc, serverTimestamp, doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useSafeState } from '@/hooks/useSafeState';
import { MaterialIcons } from '@expo/vector-icons';
import { CustomAlert } from '@/components/CustomAlert/CustomAlert';
import { useAuth } from '@/hooks/useAuth';

type PaymentMethod = 'Card' | 'Bank Transfer' | 'E-wallet' | 'Cash';

interface PaymentOption {
  id: PaymentMethod;
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  description: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: 'Cash',
    title: 'Cash',
    icon: 'attach-money',
    description: 'Pay with cash',
  },
  {
    id: 'Card',
    title: 'Credit/Debit Card',
    icon: 'credit-card',
    description: 'Pay securely with your card',
  },
  {
    id: 'Bank Transfer',
    title: 'Bank Transfer',
    icon: 'account-balance',
    description: 'Direct bank transfer',
  },
  {
    id: 'E-wallet',
    title: 'E-Wallet',
    icon: 'account-balance-wallet',
    description: 'Pay with your e-wallet',
  },
];

export default function RMpaymentScreen() {
  const { user } = useAuth();
  const { id, amount } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useSafeState(false);
  const [selectedMethod, setSelectedMethod] = useSafeState<PaymentMethod | null>(null);
  const [alertConfig, setAlertConfig] = React.useState<{
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

  const simulatePayment = async (method: PaymentMethod) => {
    return new Promise<void>((resolve, reject) => {
      // Different success rates for different payment methods
      const successRates = {
        Card: 0.8,    // 80% success rate for cards
        'Bank Transfer': 0.9,    // 90% success rate for bank transfers
        'E-wallet': 1.0, // 100% success rate for e-wallets
        Cash: 1.0 // 100% success rate for cash
      };

      const isSuccessful = Math.random() < successRates[method];
      const errorMessages = {
        Card: 'Card payment failed. Please try again or use a different card.',
        'Bank Transfer': 'Bank transfer failed. Please check your bank details.',
        'E-wallet': 'E-wallet payment failed. Please ensure sufficient balance.',
        Cash: 'Cash payment failed. Please try again or use a different card.',
      };

      setTimeout(() => {
        if (isSuccessful) {
          resolve();
        } else {
          reject(new Error(errorMessages[method]));
        }
      }, 2000);
    });
  };

  const handlePayment = async () => {
    if (!selectedMethod) {
      showAlert('Error', 'Please select a payment method', [
        {
          text: 'OK',
          onPress: () => { },
          style: 'default'
        }
      ]);
      return;
    }

    try {
      setLoading(true);

      if (selectedMethod === selectedMethod) {
        if (!user) return;
        const userData = await userService.getUserById(user.uid);

        if (!user) throw new Error('User not found');

        // Generate unique receipt number (e.g. RCPT-YYYYMMDD-HHMMSS-XYZ)
      const generateReceiptNumber = () => {
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
        const timePart = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        const randomPart = Math.floor(100 + Math.random() * 900); // 3-digit random
        return `YBLS-${datePart}-${timePart}-${randomPart}`;
      };
      const receiptNumber = generateReceiptNumber();

        // Fetch cart items for RM currency
        const cartRef = doc(db, 'carts', user.uid);
        const cartSnap = await getDoc(cartRef);
        const allItems: CartItem[] = cartSnap.exists() ? cartSnap.data().items || [] : [];
        const rmItems = allItems.filter((it: any) => it.currency === 'RM');

        if (rmItems.length === 0) {
          showAlert('Error', 'No RM items found in cart.', [{ text: 'OK', onPress: () => { } }]);
          setLoading(false);
          return;
        }

        const totalRM = rmItems.reduce((sum, it) => sum + it.originalPrice * it.quantity, 0);

        // Save pending order in Firestore
        await addDoc(collection(db, 'orders-history'), {
          userId: user.uid,
          username: userData?.username ?? '',
          receiptNumber: receiptNumber,
          items: rmItems,
          total: totalRM,
          status: 'pending',
          method: selectedMethod,
          createdAt: serverTimestamp(),
        });

        // Remove RM items from cart, keep others
        const remaining = allItems.filter((it: any) => it.currency !== 'RM');
        if (remaining.length === 0) {
          await deleteDoc(cartRef);
        } else {
          await updateDoc(cartRef, { items: remaining, updatedAt: serverTimestamp() });
        }

        showAlert(
          'Pending',
          'Order recorded. Please pay cash at the counter.',
          [
            {
              text: 'Back',
              onPress: () => router.push('/(tabs)/orderHistory' as any),
              style: 'default',
            },
          ],
        );
        return;
      }

      // For non-cash methods: simulate payment then mark as paid
      await simulatePayment(selectedMethod);
      await cartService.updateOrderStatus(id as string, 'paid');
      await cartService.clearCart(id as string);
      showAlert(
        'Success',
        'Payment successful! Thank you for your purchase.',
        [
          {
            text: 'Back to Home',
            onPress: () => router.push('/'),
            style: 'default'
          },
          {
            text: 'Continue Shopping',
            onPress: () => router.push({ pathname: '/(tabs)/products' } as any),
            style: 'cancel'
          },
        ]
      );
    } catch (error) {
      console.error('Error processing payment:', error);
      showAlert('Payment Failed', error instanceof Error ? error.message : 'Failed to process payment', [
        {
          text: 'Try Again',
          onPress: handlePayment,
          style: 'default'
        },
        {
          text: 'Change Payment Method',
          onPress: () => setSelectedMethod(null),
          style: 'cancel'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const PaymentMethodOption = ({ option }: { option: PaymentOption }) => (
    <TouchableOpacity
      style={[
        styles.paymentOption,
        selectedMethod === option.id && styles.selectedPaymentOption,
      ]}
      onPress={() => setSelectedMethod(option.id)}
    >
      <MaterialIcons
        name={option.icon}
        size={24}
        color={selectedMethod === option.id ? '#ee4d2d' : '#666'}
        style={styles.paymentIcon}
      />
      <View style={styles.paymentOptionContent}>
        <Text style={[
          styles.paymentOptionTitle,
          selectedMethod === option.id && styles.selectedPaymentText
        ]}>
          {option.title}
        </Text>
        <Text style={styles.paymentOptionDescription}>{option.description}</Text>
      </View>
      <MaterialIcons
        name={selectedMethod === option.id ? 'radio-button-checked' : 'radio-button-unchecked'}
        size={24}
        color={selectedMethod === option.id ? '#ee4d2d' : '#666'}
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={hideAlert}
      />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push({ pathname: '/(tabs)/cart' } as any)}
        >
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Payment</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.orderId}>Order ID: {id}</Text>
        <Text style={styles.amount}>Amount: ${amount}</Text>

        <Text style={styles.sectionTitle}>Select Payment Method</Text>
        <View style={styles.paymentOptions}>
          {PAYMENT_OPTIONS.map((option) => (
            <PaymentMethodOption key={option.id} option={option} />
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.payButton,
            (!selectedMethod || loading) && styles.disabledButton
          ]}
          onPress={handlePayment}
          disabled={!selectedMethod || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons name="payment" size={24} color="#fff" style={styles.payIcon} />
              <Text style={styles.payButtonText}>Pay Now</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  orderId: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ee4d2d',
    marginBottom: 32,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  paymentOptions: {
    marginBottom: 24,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  selectedPaymentOption: {
    borderColor: '#ee4d2d',
    backgroundColor: '#fff5f3',
  },
  paymentIcon: {
    marginRight: 16,
  },
  paymentOptionContent: {
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    color: '#333',
  },
  selectedPaymentText: {
    color: '#ee4d2d',
  },
  paymentOptionDescription: {
    fontSize: 14,
    color: '#666',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ee4d2d',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  payIcon: {
    marginRight: 8,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
