import { db } from "@/Firebase";
import {
  collection,
  onSnapshot,
  query,
  updateDoc,
  where,
  doc,
  orderBy,
  serverTimestamp,
  getDoc,
  addDoc,
} from "firebase/firestore";
import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { router } from "expo-router";
import showAlert from "../CustomAlert/ShowAlert";

interface OrderItem {
  name: string;
  quantity: number;
  originalPrice?: number;
  price?: number;
  currency?: string;
}

interface OrderDoc {
  id: string;
  userId: string;
  username: string;
  receiptNumber: string;
  createdAt: any;
  total: number;
  status: "pending" | "completed" | "failed";
  method?: string; // e.g., 'FOC', 'Paid'
  items: OrderItem[];
}

const AdminOrdersHistory: React.FC = () => {
  const [orders, setOrders] = useState<OrderDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all pending orders in real-time
  useEffect(() => {
    const q = query(
      collection(db, "orders-history"),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: OrderDoc[] = [];
      snap.forEach((d) =>
        list.push({ id: d.id, ...(d.data() as Omit<OrderDoc, "id">) })
      );
      setOrders(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  const updateStatus = useCallback(
    async (order: OrderDoc, newStatus: "completed" | 'failed') => {
      try {
        // Update order status first
        await updateDoc(doc(db, "orders-history", order.id), {
          status: newStatus,
          updatedAt: serverTimestamp(),
        });

        // If completed and not FOC, credit 5% reward to the purchaser
        if (newStatus === "completed" && order.method !== 'FOC') {
          const rewardAmount = order.items.reduce((sum, it) => {
            const priceEach = it.originalPrice ?? it.price ?? 0;
            return sum + priceEach * it.quantity;
          }, 0) * 0.05; // 5%

          const userRef = doc(db, "users", order.userId);
          const userSnap = await getDoc(userRef);
          const currentBalance = (userSnap.data()?.balance ?? 0) as number;
          await updateDoc(userRef, {
            balance: currentBalance + rewardAmount,
            updatedAt: serverTimestamp(),
          });

          // Record reward history for purchaser
          await addDoc(collection(db, "reward-history"), {
            type: "reward-history",
            userId: order.userId,
            receiptNumber: order.receiptNumber,
            userName: order.username,
            fromUserId: order.userId,
            toUserId: order.userId,
            amount: rewardAmount,
            purchaseAmount: order.total,
            currency: "RM",
            createdAt: serverTimestamp(),
          });
        }
      } catch (err) {
        console.error("Status update error", err);
        showAlert("Error", "Unable to update order status.");
      }
    },
    []
  );

  const handleComplete = (order: OrderDoc) => {
    showAlert("Confirm", "Mark order as completed?", [
      { text: "Cancel" },
      { text: "OK", onPress: () => updateStatus(order, "completed") },
    ]);
  };

  // Complete specifically for FOC orders (no reward credit logic already handled in updateStatus)
  // const handleCompleteWithFOC = (order: OrderDoc) => {
  //   if (order.method !== 'FOC') {
  //     showAlert('Error', 'Order method is not FOC.');
  //     return;
  //   }
  //   showAlert("Confirm", "Mark FOC order as completed?", [
  //     { text: "Cancel" },
  //     {
  //       text: "OK",
  //       onPress: async () => {
  //         try {
  //           await updateDoc(doc(db, "orders-history", order.id), {
  //             status: "completed",
  //             method: "FOC",
  //             updatedAt: serverTimestamp(),
  //           });
  //         } catch (err) {
  //           console.error("FOC completion error", err);
  //           showAlert("Error", "Unable to complete FOC order.");
  //         }
  //       },
  //     },
  //   ]);
  // };

  const handleFail = (order: OrderDoc) => {
    showAlert("Confirm", "Mark order as failed?", [
      { text: "Cancel" },
      { text: "OK", onPress: () => updateStatus(order, "failed") },
    ]);
  };

  const renderItem = ({ item }: { item: OrderDoc }) => {
    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.id}>#{item.receiptNumber}</Text>
          <Text style={styles.name}>{item.username}</Text>
          <Text style={styles.date}>{
            item.createdAt?.toDate?.().toLocaleString() ?? "--"
          }</Text>
        </View>

        {/* Simple item list */}
        
          {item.items?.slice(0, 100).map((it, idx) => (
            <View style={styles.itemContainer}>
            <Text key={idx} style={styles.itemLine}>
              {it.name}  x  {it.quantity}
            </Text>
            </View>
          ))}
          {item.items?.length > 100 && <Text>…</Text>}
          

        <View style={styles.amountContainer}>
          <Text style={styles.amount}>Total: {item.total.toFixed(2)}</Text>
          <Text style={styles.name}>{item.method}</Text>
        </View>

        <View style={styles.rowBetween}>
          <TouchableOpacity
            style={[styles.btn, styles.complete]}
            onPress={() => handleComplete(item)}
          >
            <Text style={styles.btnTxt}>Completed</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.failed]}
            onPress={() => handleFail(item)}
          >
            <Text style={styles.btnTxt}>Failed</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.title}>Pending Orders</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.close}>Close</Text>
        </TouchableOpacity>
      </View>

      {orders.length === 0 ? (
        <Text style={styles.empty}>No pending orders.</Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  title: { fontSize: 20, fontWeight: "600" },
  close: { color: "#007AFF" },
  empty: { textAlign: "center", marginTop: 40, color: "#666" },
  card: {
    backgroundColor: "#fafafa",
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
      },
    }),
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    marginBottom: 6,
  },
  id: { fontWeight: "600" },
  name: { 
    fontWeight: "600", 
    color: "#007AFF", 
    fontSize: 20,
    marginLeft: 30,
    marginRight: 30,
   },
  date: { 
    color: "#666", 
    fontSize: 12, 
  },
  amount: {
    marginBottom: 6, 
    fontWeight: "500" ,
    fontSize: 20,
  },
  itemLine: { 
    marginBottom: 6,
    fontSize: 20,
  },
  btn: {
    flex: 1,
    padding: 8,
    alignItems: "center",
    borderRadius: 4,
  },
  complete: { backgroundColor: "#4CAF50", marginRight: 4 },
  failed: { backgroundColor: "#f44336", marginLeft: 4 },
  btnTxt: { color: "#fff", fontWeight: "600" },
  amountContainer: {
    flexDirection: "row",
    justifyContent: 'space-evenly',
    alignItems: "center",
    marginBottom: 6,
  },
  itemContainer: {
    marginBottom: 6,
  },
});

export default AdminOrdersHistory;
