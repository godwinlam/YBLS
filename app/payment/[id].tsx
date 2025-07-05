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
import { cartService } from '@/services/cartService';
import { useSafeState } from '@/hooks/useSafeState';
import { MaterialIcons } from '@expo/vector-icons';
import { CustomAlert } from '@/components/CustomAlert/CustomAlert';

type PaymentMethod = 'card' | 'bank' | 'ewallet' | 'cash';

interface PaymentOption {
  id: PaymentMethod;
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  description: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: 'cash',
    title: 'Cash',
    icon: 'attach-money',
    description: 'Pay with cash',
  },
  {
    id: 'card',
    title: 'Credit/Debit Card',
    icon: 'credit-card',
    description: 'Pay securely with your card',
  },
  {
    id: 'bank',
    title: 'Bank Transfer',
    icon: 'account-balance',
    description: 'Direct bank transfer',
  },
  {
    id: 'ewallet',
    title: 'E-Wallet',
    icon: 'account-balance-wallet',
    description: 'Pay with your e-wallet',
  },
];

export default function PaymentScreen() {
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
        card: 0.8,    // 80% success rate for cards
        bank: 0.9,    // 90% success rate for bank transfers
        ewallet: 1.0, // 100% success rate for e-wallets
        cash: 1.0 // 100% success rate for cash
      };

      const isSuccessful = Math.random() < successRates[method];
      const errorMessages = {
        card: 'Card payment failed. Please try again or use a different card.',
        bank: 'Bank transfer failed. Please check your bank details.',
        ewallet: 'E-wallet payment failed. Please ensure sufficient balance.',
        cash: 'Cash payment failed. Please try again or use a different card.',
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
      // Simulate payment gateway with selected method
      await simulatePayment(selectedMethod);
      // Update order status and clear cart
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
