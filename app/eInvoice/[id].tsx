import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/Firebase';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import { Picker } from '@react-native-picker/picker';
import { auth } from '@/Firebase';          // already in project
import { userService } from '@/services/userService';


// Simple representation of each order item
interface OrderItem {
  name: string;
  quantity: number;
  price?: number;
  originalPrice?: number;
  currency?: string;
}


interface OrderHistoryDoc {
  userId: string;
  username?: string;
  items: OrderItem[];
  status: string;
  createdAt: Timestamp | { seconds: number; nanoseconds: number };
  total: number;
  method?: string;
  receiptNumber?: string;
}

export default function EInvoiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderHistoryDoc | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string>('cash');
  const [saving, setSaving] = useState(false);
  const [shared, setShared] = useState(false);

  // inject print CSS for web to hide elements with class .no-print
  useEffect(() => {
    if (Platform.OS === 'web') {
      const styleTag = document.createElement('style');
      styleTag.id = 'print-hide-style';
      styleTag.innerHTML = '@media print { .no-print, #share-btn { display: none !important; visibility: hidden !important; } }';
      document.head.appendChild(styleTag);
      return () => {
        const el = document.getElementById('print-hide-style');
        el?.parentNode?.removeChild(el);
      };
    }
  }, []);

 

  useEffect(() => {
    const checkAdmin = async () => {
      const currentUid = auth.currentUser?.uid;
      if (!currentUid) return;
      try {
        const me = await userService.getUserById(currentUid);
        setIsAdmin(me?.role === 'admin');
      } catch { }
    };
    checkAdmin();
  }, []);

  // handler
  const updateMethod = async (value: string) => {
    setSelectedMethod(value);
    setSaving(true);
    await updateDoc(doc(db, 'orders-history', id as string), { method: value });
    setSaving(false);
  };

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const docRef = doc(db, 'orders-history', id as string);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          setError('Invoice not found');
        } else {
          const data = snap.data() as OrderHistoryDoc;
          setOrder(data);
          setSelectedMethod(data.method ?? 'cash');
          // fetch user phone number
          try {
            const userSnap = await getDoc(doc(db, 'users', data.userId));
            if (userSnap.exists()) {
              const userData = userSnap.data() as any;
              setPhone(userData.phoneNumber ?? null);
            }
          } catch { }
        }
      } catch (e) {
        console.error(e);
        setError('Failed to load invoice');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.center}>
        <Text>{error ?? 'Invoice not available'}</Text>
      </View>
    );
  }

  const date = order.createdAt instanceof Timestamp
    ? order.createdAt.toDate()
    : new Timestamp(order.createdAt.seconds, order.createdAt.nanoseconds).toDate();

  const ybcItems = order.items.filter(it => (it as any).currency === 'YBC');
  const rmItems = order.items.filter(it => (it as any).currency === 'RM');

  const methodLabelMap: Record<string, string> = {
    cash: 'Cash',
    ewallet: 'E-Wallet',
    card: 'Credit Card',
    bank: 'Bank Transfer',
    FOC: 'FOC',
  };
  const methodLabel = order.method ? (methodLabelMap[order.method] ?? order.method) : '-';

  const handleShare = async () => {
    // hide button immediately so it isn't captured in fallback screenshots
    if (!shared) setShared(true);

    if (!order) return;
    
    // Simple HTML for the invoice
    // wait for two animation frames so UI updates before snapshot
    // wait 300ms to ensure layout finished
    await new Promise(res=>setTimeout(res,300));

    const html = `<!DOCTYPE html><html><head><meta charset='utf-8'><style>
      body{font-family: Arial; padding:16px;}
      h1{text-align:center;}
      table{width:100%; border-collapse:collapse; margin-top:16px;}
      th,td{border:1px solid #ccc; padding:8px; font-size:12px;}
      th{text-align:left; background:#f2f2f2;}
    </style></head><body>
      <h2>YOUNG BEAUTY LOVERS SERVICE</h2>
      <p style='font-size:10px;'>(201803414820(002918980-X))</p>
      <p style='font-size:10px;'>NO. 37, JALAN MEDAN MIDAH, TAMAN MIDAH, 56100, KUALA LUMPUR.</p>
      <p style='font-size:10px;'>HP: 011 2088 1183</p>
      <h1>Receipt</h1>
      <p><strong>Receipt #</strong> ${order.receiptNumber}</p>
      <p><strong>Date:</strong> ${date.toLocaleString()}</p>
      <p><strong>Customer:</strong> ${order.username ?? order.userId}</p>
      <p><strong>Phone:</strong> ${phone ?? '-'}</p>
      <p><strong>Status:</strong> ${order.status}</p>
      <p><strong>Payment Method:</strong> ${methodLabel}</p>
      <table><thead><tr><th>Item</th><th>Qty</th><th>Price (RM)</th></tr></thead><tbody>
        ${order.items.map(it=>`<tr><td>${it.name}</td><td>${it.quantity}</td><td>${it.currency==='RM'?(it.originalPrice??it.price):(it.price??it.originalPrice)}</td></tr>`).join('')}
      </tbody></table>
      <h3 style='text-align:right;'>Grand Total: RM ${order.total.toFixed(2)}</h3>
    </body></html>`;
    try { 
      // const { uri } = await Print.printToFileAsync({ html });
      const { uri } = await Print.printToFileAsync({
        html,          // make sure this is not undefined / empty
        base64: false, // (optional) smaller result, but shows intent
      });
      await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (e) {
      setShared(false);
      console.warn('Share failed', e);
    }
  };

  const renderItems = (items: OrderItem[], currency: 'YBC' | 'RM') => (
    <View style={{ marginTop: 12 }}>
      {items.map((it, idx) => (
        <View style={styles.itemRow} key={`${currency}-${idx}`}>
          <Text style={styles.itemName}>{it.name}</Text>
          <Text style={styles.itemQty}>x   {it.quantity}</Text>
          <Text style={styles.itemPrice}>
            RM {currency === 'RM' ? (it.originalPrice ?? it.price ?? 0) : (it.price ?? it.originalPrice ?? 0)}
          </Text>
        </View>
      ))}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
        
      <Text style={styles.title}>YOUNG BEAUTY LOVERS SERVICE</Text>
      <Text style={styles.companyId}>(201803414820(002918980-X))</Text>
      <Text style={styles.address}>NO. 37, JALAN MEDAN MIDAH, TAMAN MIDAH, 56100, KUALA LUMPUR.</Text>
      <Text style={styles.phone}>HP: 011 2088 1183</Text>
      <Text style={styles.title}>Receipt</Text>
      <Text style={styles.subtitle}>{order.receiptNumber}</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Date:</Text>
        <Text style={styles.value}>{date.toLocaleString()}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Customer:</Text>
        <Text style={styles.value}>{order.username ?? order.userId}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>HP:</Text>
        <Text style={styles.value}>{phone ?? '-'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Status:</Text>
        <Text style={styles.value}>{order.status}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.paymentMethod}>Payment&nbsp;Method:</Text>

        {isAdmin ? (
          <Picker
            style={{ flex: 1, width: 20, height: 20, fontSize: 14, marginLeft: 5, color: '#000' }}
            selectedValue={selectedMethod}
            onValueChange={updateMethod}
            mode="dropdown"
          >
            <Picker.Item label="Cash" value="cash" />
            <Picker.Item label="E-Wallet" value="ewallet" />
            <Picker.Item label="Credit Card" value="card" />
            <Picker.Item label="Bank Transfer" value="bank" />
            <Picker.Item label="FOC" value="FOC" />
          </Picker>
        ) : (
          <Text style={styles.paymentMethodValue}>{methodLabel}</Text>
        )}
      </View>

      {/* {order.method && (
        <View style={styles.section}>
          <Text style={styles.label}>Payment Method:</Text>
          <Text style={styles.value}>{order.method}</Text>
        </View>
      )} */}

      {/* Items */}
      {ybcItems.length > 0 && (
        <>
          <Text style={styles.currencyHeader}>Items on Member Price</Text>
          {renderItems(ybcItems, 'YBC')}
        </>
      )}
      {rmItems.length > 0 && (
        <>
          <Text style={styles.currencyHeader}>Items on Non-Member Price</Text>
          {renderItems(rmItems, 'RM')}
        </>
      )}

      <View style={[styles.section, { marginTop: 16, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 }]}>
        <Text style={styles.label}>Grand Total:</Text>
        <Text style={styles.total}>RM {order.total.toFixed(2)} </Text>
      </View>

      {!shared && (
        <TouchableOpacity id="share-btn" style={styles.shareButton} onPress={handleShare} disabled={saving || loading} className="no-print">
        <Text style={styles.shareButtonText}>Share PDF</Text>
      </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  section: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontWeight: 'bold',
    width: 130,
  },
  value: {
    flex: 1,
  },
  currencyHeader: {
    marginTop: 12,
    fontWeight: 'bold',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  itemName: { flex: 1 },
  itemQty: { width: 40, textAlign: 'right' },
  itemPrice: { width: 80, textAlign: 'right' },
  total: { fontWeight: 'bold' },
  shareButton: {
    backgroundColor: '#1976D2',
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 20,
    alignItems: 'center',
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    color: '#1976D2',
    fontSize: 16,
  },
  shareButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  address: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 5,
  },
  companyId: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 5,
  },
  phone: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 5,
  },
  paymentMethod: {
    fontWeight: 'bold',
  },
  paymentMethodValue: {
    flex: 1,
    marginLeft: 15,
  },
});
