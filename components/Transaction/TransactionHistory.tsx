import { auth, db } from "@/Firebase";
import { useLanguage } from "@/hooks/useLanguage";
import { User } from "@/types/user";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  LayoutChangeEvent,
  LayoutRectangle,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

interface TransactionBase {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  timestamp: any;
  type:
    | "transfer"
    | "reward"
    | "share_purchase"
    | "investment_reward"
    | "bank_transfer"
    | "gdp_reward"
    | "gdp_conversion"
    | "withdrawal"
    | "top_up";
  status?: "pending" | "approved" | "rejected";
  descriptions?: string;
  blockchain?: string;
  address?: string;
  cryptocurrency?: string;
  network?: string;
}

interface TransactionWithDetails extends TransactionBase {
  otherUserName: string;
}

interface SelectableTextProps {
  text: string;
  style?: any;
}

const SelectableText: React.FC<SelectableTextProps> = ({ text, style }) => {
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [layout, setLayout] = useState<LayoutRectangle | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const textRef = useRef<TextInput>(null);

  const handleLayout = (event: LayoutChangeEvent) => {
    setLayout(event.nativeEvent.layout);
  };

  const handleLongPress = () => {
    setIsSelecting(true);
    if (textRef.current) {
      textRef.current.focus();
    }
  };

  const handleSelectionChange = (start: number, end: number) => {
    setSelection({ start, end });
  };

  const handleCopy = async () => {
    const selectedText = text.slice(selection.start, selection.end);
    await Clipboard.setStringAsync(selectedText);
    setIsSelecting(false);
  };

  if (Platform.OS === "ios") {
    return (
      <TextInput
        value={text}
        multiline
        editable={false}
        style={[styles.selectableText, style]}
        contextMenuHidden={false}
        textAlignVertical="center"
      />
    );
  }

  return (
    <View>
      <TouchableWithoutFeedback onLongPress={handleLongPress}>
        <View>
          <TextInput
            ref={textRef}
            value={text}
            multiline
            onLayout={handleLayout}
            selection={isSelecting ? selection : undefined}
            onSelectionChange={(event) => {
              const { start, end } = event.nativeEvent.selection;
              handleSelectionChange(start, end);
            }}
            style={[styles.selectableText, style]}
            contextMenuHidden={false}
            onBlur={() => setIsSelecting(false)}
          />
          {isSelecting && layout && (
            <View
              style={[styles.selectionToolbar, { top: -layout.height - 48 }]}
            >
              <TouchableWithoutFeedback onPress={handleCopy}>
                <View style={styles.toolbarButton}>
                  <Text style={styles.toolbarButtonText}>Copy</Text>
                </View>
              </TouchableWithoutFeedback>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
};

const TransactionHistory: React.FC = () => {
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const { t } = useLanguage();

  // Function to delete old transactions
  const deleteOldTransactions = async (transactionDocs: any[]) => {
    const tenMinutesAgo = new Date();
    tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 129600);
    // const tenMinutesAgoTimestamp = Timestamp.fromDate(tenMinutesAgo);

    for (const doc of transactionDocs) {
      const timestamp = doc.data().timestamp || doc.data().createdAt;
      const transactionTime =
        timestamp instanceof Timestamp
          ? timestamp
          : new Timestamp(timestamp.seconds, timestamp.nanoseconds);

      if (transactionTime.toDate() < tenMinutesAgo) {
        try {
          // Delete from the appropriate collection based on transaction type
          const collectionName = doc.ref.parent.id;
          await deleteDoc(doc.ref);
          console.log(
            `Deleted old transaction from ${collectionName}:`,
            doc.id
          );
        } catch (error) {
          console.error("Error deleting old transaction:", error);
        }
      }
    }
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.replace("/(auth)/login");
      return;
    }

    const userDoc = doc(db, "users", user.uid);
    const unsubscribeUser = onSnapshot(userDoc, (docSnapshot) => {
      if (docSnapshot.exists()) {
        setCurrentUser({ ...docSnapshot.data(), uid: docSnapshot.id } as User);
      }
    });

    return () => {
      unsubscribeUser();
    };
  }, []);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const fetchTransactionHistory = async () => {
      setLoading(true);
      setError(null);

      try {
        // Create queries for all transaction types
        const q = query(
          collection(db, "transactions"),
          where("fromUserId", "==", currentUser.uid),
          orderBy("timestamp", "desc")
        );

        const receivedQ = query(
          collection(db, "transactions"),
          where("toUserId", "==", currentUser.uid),
          orderBy("timestamp", "desc")
        );

        const withdrawalQ = query(
          collection(db, "withdrawals"),
          where("userId", "==", currentUser.uid),
          orderBy("createdAt", "desc")
        );

        const topUpQ = query(
          collection(db, "depositRequests"),
          where("userId", "==", currentUser.uid),
          // where("status", "==", "approved"),
          orderBy("createdAt", "desc")
        );

        // Get all transaction documents
        const [
          sentSnapshot,
          receivedSnapshot,
          withdrawalSnapshot,
          topUpSnapshot,
        ] = await Promise.all([
          getDocs(q),
          getDocs(receivedQ),
          getDocs(withdrawalQ),
          getDocs(topUpQ),
        ]);

        // Delete old transactions from each collection
        await Promise.all([
          deleteOldTransactions(sentSnapshot.docs),
          deleteOldTransactions(receivedSnapshot.docs),
          deleteOldTransactions(withdrawalSnapshot.docs),
          deleteOldTransactions(topUpSnapshot.docs),
        ]);

        const transactionsData: TransactionBase[] = [];
        const userIds = new Set<string>();

        // Process remaining transactions (less than 10 minutes old)
        const tenMinutesAgo = new Date();
        tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 129600);
        // const tenMinutesAgoTimestamp = Timestamp.fromDate(tenMinutesAgo);

        const processTransaction = (doc: any, type: string) => {
          const data = doc.data();
          const timestamp = data.timestamp || data.createdAt;
          const transactionTime =
            timestamp instanceof Timestamp
              ? timestamp
              : new Timestamp(timestamp.seconds, timestamp.nanoseconds);

          if (transactionTime.toDate() >= tenMinutesAgo) {
            return true;
          }
          return false;
        };

        withdrawalSnapshot.forEach((doc) => {
          if (!processTransaction(doc, "withdrawal")) return;
          const data = doc.data();
          transactionsData.push({
            id: doc.id,
            fromUserId: currentUser.uid,
            toUserId: "SYSTEM",
            amount: data.originalAmount,
            timestamp: data.createdAt,
            type: "withdrawal",
            status: data.status,
            blockchain: data.blockchain,
            address: data.address,
            descriptions: `${data.blockchain} ${t.send} ${t.to} : `,
          });
        });

        sentSnapshot.forEach((doc) => {
          if (!processTransaction(doc, "sent")) return;
          const data = doc.data() as TransactionBase;
          if (data.type === "reward") {
            return;
          }
          const status = data.status || "approved";
          transactionsData.push({
            ...data,
            id: doc.id,
            status,
          });
          userIds.add(data.toUserId);
        });

        receivedSnapshot.forEach((doc) => {
          if (!processTransaction(doc, "received")) return;
          const data = doc.data();
          const status = data.status || "approved";

          let finalType: TransactionWithDetails["type"] = "transfer";
          if (data.type === "gdp_reward" || data.fromUserId === "SYSTEM") {
            finalType = "reward";
          } else if (
            [
              "reward",
              "share_purchase",
              "investment_reward",
              "bank_transfer",
              "gdp_conversion",
              "withdrawal",
            ].includes(data.type)
          ) {
            finalType = data.type as TransactionWithDetails["type"];
          }

          const transactionData: TransactionBase = {
            id: doc.id,
            fromUserId: data.fromUserId,
            toUserId: data.toUserId,
            amount: data.amount,
            timestamp: data.timestamp,
            type: finalType,
            status,
            descriptions: data.descriptions,
            blockchain: data.blockchain,
            address: data.address,
          };

          transactionsData.push(transactionData);
          userIds.add(data.fromUserId);
        });

        topUpSnapshot.forEach((doc) => {
          if (!processTransaction(doc, "topup")) return;
          const data = doc.data();
          transactionsData.push({
            id: doc.id,
            fromUserId: data.userId,
            toUserId: data.userId,
            amount: data.amount,
            timestamp: data.createdAt,
            type: "top_up",
            status: data.status,
            cryptocurrency: data.cryptocurrency,
            network: data.network,
            address: data.walletAddress,
            descriptions: `${t.topUp} ${data.amount} ${t.via} (${data.network})`,
          });
        });

        const userRefs = Array.from(userIds).map((userId) =>
          getDoc(doc(db, "users", userId))
        );
        const userSnapshots = await Promise.all(userRefs);

        const userMap = new Map<string, string>();
        userSnapshots.forEach((snapshot) => {
          if (snapshot.exists()) {
            const userData = snapshot.data();
            userMap.set(
              snapshot.id,
              userData.displayName || userData.username || "Unknown User"
            );
          }
        });

        const transactionsWithDetails = transactionsData.map((transaction) => {
          const transactionWithDetails: TransactionWithDetails = {
            ...transaction,
            otherUserName:
              transaction.fromUserId === currentUser.uid
                ? userMap.get(transaction.toUserId) || t.admin
                : userMap.get(transaction.fromUserId) || t.admin,
            type: transaction.type as TransactionWithDetails["type"],
            status: transaction.status || "approved",
            amount: transaction.amount,
            fromUserId: transaction.fromUserId,
            toUserId: transaction.toUserId,
            timestamp: transaction.timestamp,
            id: transaction.id,
            blockchain: transaction.blockchain,
            address: transaction.address,
            cryptocurrency: transaction.cryptocurrency,
            network: transaction.network,
          };
          return transactionWithDetails;
        });

        transactionsWithDetails.sort((a, b) => {
          const timeA = a.timestamp?.toMillis?.() || a.timestamp;
          const timeB = b.timestamp?.toMillis?.() || b.timestamp;
          return timeB - timeA;
        });

        setTransactions(transactionsWithDetails);
      } catch (err: any) {
        setError(err.message || "Failed to fetch transactions");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionHistory();
  }, [currentUser?.uid]);

  const renderTransactionItem = (transaction: TransactionWithDetails) => {
    const isPositive =
      transaction.type === "reward" ||
      transaction.type === "investment_reward" ||
      transaction.type === "gdp_reward" ||
      transaction.type === "gdp_conversion" ||
      transaction.toUserId === auth.currentUser?.uid;

    const getTransactionTitle = () => {
      switch (transaction.type) {
        case "transfer":
          return isPositive ? t.received : t.transfer;
        case "reward":
          return t.reward;
        case "investment_reward":
          return `${t.Staking} ${t.reward}`;
        case "gdp_reward":
          return `${t.gdp} ${t.reward}`;
        case "gdp_conversion":
          return `${t.gdp} ${t.conversion}`;
        case "share_purchase":
          return "GDPCOIN";
        case "bank_transfer":
          return t.Withdraw;
        case "withdrawal":
          return t.Wallet;
        case "top_up":
          return t.topUp;
        default:
          return t.transactions;
      }
    };

    const getStatusColor = () => {
      switch (transaction.status) {
        case "approved":
          return "#4CAF50";
        case "rejected":
          return "#f44336";
        case "pending":
          return "#FFA500";
        default:
          return "#666";
      }
    };

    const getStatusText = () => {
      switch (transaction.status) {
        case "approved":
          return t.completed;
        case "rejected":
          return t.rejected;
        case "pending":
          return t.pending;
        default:
          return "Unknown";
      }
    };

    return (
      <View style={styles.transactionCard}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.transactionType}>{getTransactionTitle()}</Text>
            <Text style={styles.date}>
              {transaction.timestamp?.toDate().toLocaleString()}
            </Text>
          </View>
          <Text
            style={[
              styles.amount,
              isPositive ? styles.positiveAmount : styles.negativeAmount,
            ]}
          >
            {isPositive ? "+" : "-"} ${Math.abs(transaction.amount).toFixed(2)}
          </Text>
        </View>

        <View style={styles.details}>
          {transaction.descriptions && (
            <Text style={styles.description}>{transaction.descriptions}</Text>
          )}

          {transaction.address && (
            <View style={[styles.detailRow, styles.detailRow_last]}>
              <Text style={styles.label}>{t.address}:</Text>
              <View style={{ flex: 1 }}>
                <SelectableText
                  text={transaction.address}
                  style={[styles.value, styles.addressText]}
                />
              </View>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.otherParty}>
            {transaction.otherUserName
              ? `${isPositive ? t.from : t.to}: ${transaction.otherUserName}`
              : ""}
          </Text>
          {transaction.status && (
            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor() },
                ]}
              />
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t.transactions}</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#2196F3" style={styles.loader} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : transactions.length === 0 ? (
        <Text style={styles.noTransactions}>{t.noTransactions}</Text>
      ) : (
        <FlatList
          data={transactions}
          renderItem={({ item }) => renderTransactionItem(item)}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity
          style={styles.navigationButton}
          onPress={() => router.replace("/(tabs)")}
        >
          <Text style={styles.buttonText}>{t.back}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a1a",
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 35 : 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    textAlign: "center",
  },
  list: {
    padding: 16,
  },
  transactionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 5,
  },
  titleContainer: {
    flex: 1,
    marginRight: 16,
  },
  transactionType: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: "#666",
  },
  amount: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "right",
    minWidth: 100,
  },
  positiveAmount: {
    color: "#4CAF50",
  },
  negativeAmount: {
    color: "#f44336",
  },
  details: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    // marginTop: 3,
  },
  description: {
    fontSize: 15,
    color: "#1a1a1a",
    // marginBottom: 20,
    lineHeight: 20,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  detailRow_last: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  label: {
    width: 80,
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
    marginTop: 2,
  },
  value: {
    flex: 1,
    fontSize: 14,
    color: "#1a1a1a",
    paddingLeft: 8,
  },
  addressText: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
    fontSize: 13,
    letterSpacing: 0.5,
    lineHeight: 20,
    color: "#2c3e50",
    backgroundColor: "#f8f9fa",
    padding: 8,
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  footer: {
    // marginTop: 12,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  otherParty: {
    fontSize: 14,
    color: "#666",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  error: {
    color: "#f44336",
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
  },
  noTransactions: {
    color: "#666",
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
  },
  selectableText: {
    margin: 0,
    padding: 0,
    backgroundColor: "transparent",
    color: "#1a1a1a",
    minHeight: 20,
    ...Platform.select({
      ios: {
        height: undefined,
        textAlignVertical: "center",
      },
      android: {
        textAlignVertical: "center",
        paddingVertical: 0,
      },
    }),
  },
  selectionToolbar: {
    position: "absolute",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 8,
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.2)",
  },
  toolbarButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  toolbarButtonText: {
    color: "#1a1a1a",
    fontSize: 15,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  menuContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 8,
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.2)",
  },
  menuRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  menuItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: {
    fontSize: 15,
    color: "#1a1a1a",
    fontWeight: "500",
  },
  retryButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "500",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    minHeight: 200,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  bottomButtonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
    marginBottom: Platform.OS === 'android' ? 30 : 0,
  },
  navigationButton: {
    backgroundColor: "#2196F3",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default TransactionHistory;
