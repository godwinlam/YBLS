import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { db } from "@/Firebase";
import {
  doc,
  runTransaction,
  collection,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { ScrollView } from "react-native-gesture-handler";
import { useAuth } from "@/context/auth";
import showAlert from "@/components/CustomAlert/ShowAlert";
import PinInput from "@/components/Transaction/PinInput";
import { useLanguage } from "@/hooks/useLanguage";

// Helper to check if user's reward is still active
const isRewardActive = (data: any): boolean => {
  if (!data?.rewardPercentage || !data?.rewardExpiresAt) return false;
  try {
    const expiresAtMillis =
      data.rewardExpiresAt instanceof Timestamp
        ? data.rewardExpiresAt.toMillis()
        : (data.rewardExpiresAt as any).toMillis?.() ?? data.rewardExpiresAt;
    return expiresAtMillis > Date.now();
  } catch {
    return false;
  }
};

export default function YBCScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const { user } = useAuth();
  const [processing, setProcessing] = React.useState(false);
  const [pinVisible, setPinVisible] = React.useState(false);
  const [pin, setPin] = React.useState("");
  const [pendingAmount, setPendingAmount] = React.useState<number | null>(null);

  const handlePurchase = async (amount: 600 | 1300 | 2800 | 5000 | 8000) => {
    if (!user) return;
    if ((user.RM ?? 0) < amount) {
      showAlert(
        "Insufficient Credit",
        `You need at least ${amount} Credit to purchase ${amount} YBC.`
      );
      return;
    }
    try {
      setProcessing(true);
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error("User not found");
        const data = userSnap.data() as any;

        // Read parent (if any) BEFORE any writes
        let parentRef: any = null;
        let parentSnap: any = null;
        let grandParentRef: any = null;
        let grandParentSnap: any = null;
        let greatGrandParentRef: any = null;
        let greatGrandParentSnap: any = null;
        if (data.parentId) {
          parentRef = doc(db, "users", data.parentId);
          parentSnap = await transaction.get(parentRef);
          if (parentSnap.exists()) {
            const parentData = parentSnap.data() as any;
            if (parentData.parentId) {
              grandParentRef = doc(db, "users", parentData.parentId);
              grandParentSnap = await transaction.get(grandParentRef);
              // fetch great-grandparent if exists
              if (grandParentSnap.exists()) {
                const gpData = grandParentSnap.data() as any;
                if (gpData.parentId) {
                  greatGrandParentRef = doc(db, "users", gpData.parentId);
                  greatGrandParentSnap = await transaction.get(
                    greatGrandParentRef
                  );
                }
              }
            }
          }
        }

        const currentRM = data.RM ?? 0;
        const currentBalance = data.balance ?? 0;
        if (currentRM < amount) throw new Error("Insufficient Credit");
        const updateData: any = {
          RM: currentRM - amount,
          balance: currentBalance + amount,
          updatedAt: Date.now(),
        };
        if (
          amount === 1300 ||
          amount === 2800 ||
          amount === 5000 ||
          amount === 8000
        ) {
          updateData.rewardPercentage = 0.05; // 5% reward on children purchases
          updateData.rewardExpiresAt = Timestamp.fromMillis(
            Date.now() + 365 * 24 * 60 * 60 * 1000
          ); // 365 days
        }

        // Now perform writes
        transaction.update(userRef, updateData);

        // Log purchase record
        const purchaseRef = doc(collection(db, "purchasedYBC"));
        transaction.set(purchaseRef, {
          id: purchaseRef.id,
          userId: user.uid,
          toUserId: user.uid,
          amount,
          currency: "YBC",
          paidCredit: amount,
          createdAt: serverTimestamp() as any,
        });

        if (parentRef && parentSnap && parentSnap.exists()) {
          const parentData = parentSnap.data() as any;
          const parentEligible = isRewardActive(parentData);
          if (parentEligible) {
            const parentBalance = parentData.balance ?? 0;
            const reward = amount * 0.05;
            transaction.update(parentRef, {
              balance: parentBalance + reward,
              updatedAt: Date.now(),
            });
            const rewardRef = doc(collection(db, "reward-history"));
            transaction.set(rewardRef, {
              id: rewardRef.id,
              type: "reward",
              userId: parentRef.id,
              userName: parentData.username,
              fromUserId: user.uid,
              toUserId: parentRef.id,
              amount: reward,
              purchaseAmount: amount,
              currency: "RM",
              createdAt: serverTimestamp() as any,
            });
          }
        } // Added closing bracket here

        // Grandparent 3% reward
        if (grandParentRef && grandParentSnap && grandParentSnap.exists()) {
          const gpData = grandParentSnap.data() as any;
          const gpEligible = isRewardActive(gpData);
          if (gpEligible) {
            const gpBalance = gpData.balance ?? 0;
            const gpReward = amount * 0.03;
            transaction.update(grandParentRef, {
              balance: gpBalance + gpReward,
              updatedAt: Date.now(),
            });
            const gpRewardRef = doc(collection(db, "reward-history"));
            transaction.set(gpRewardRef, {
              id: gpRewardRef.id,
              type: "reward",
              userId: grandParentRef.id,
              userName: gpData.username,
              fromUserId: user.uid,
              toUserId: grandParentRef.id,
              amount: gpReward,
              purchaseAmount: amount,
              currency: "RM",
              createdAt: serverTimestamp() as any,
            });
          }
        } // Added closing bracket here

        // Great-Grandparent 2% reward
        if (
          greatGrandParentRef &&
          greatGrandParentSnap &&
          greatGrandParentSnap.exists()
        ) {
          const ggpData = greatGrandParentSnap.data() as any;
          const ggpEligible = isRewardActive(ggpData);
          if (ggpEligible) {
            const ggpBalance = ggpData.balance ?? 0;
            const ggpReward = amount * 0.02;
            transaction.update(greatGrandParentRef, {
              balance: ggpBalance + ggpReward,
              updatedAt: Date.now(),
            });
            const ggpRewardRef = doc(collection(db, "reward-history"));
            transaction.set(ggpRewardRef, {
              id: ggpRewardRef.id,
              type: "reward",
              userId: greatGrandParentRef.id,
              userName: ggpData.username,
              fromUserId: user.uid,
              toUserId: greatGrandParentRef.id,
              amount: ggpReward,
              purchaseAmount: amount,
              currency: "RM",
              createdAt: serverTimestamp() as any,
            });
          }
        } // Added closing bracket here
      });
      showAlert("Success", `You have purchased ${amount} YBC.`);
      router.replace("/(tabs)");
    } catch (e: any) {
      console.error("Purchase error", e);
      showAlert("Error", e.message || "Failed to process purchase");
    } finally {
      setProcessing(false);
    }
  };

  const requestPurchase = (amount: number) => {
    setPendingAmount(amount);
    setPin("");
    setPinVisible(true);
  };

  const confirmPin = () => {
    if (pin.length < 6) {
      return;
    }
    setPinVisible(false);
    if (pendingAmount) handlePurchase(pendingAmount as any);
  };

  const handle600Purchase = () => requestPurchase(600);
  const handle1300Purchase = () => requestPurchase(1300);
  const handle2800Purchase = () => requestPurchase(2800);
  const handle5000Purchase = () => requestPurchase(5000);
  const handle8000Purchase = () => requestPurchase(8000);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {t.credits}: {user?.RM?.toLocaleString() ?? 0}
      </Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.productCard}>
          <TouchableOpacity
            onPress={handle600Purchase}
            disabled={processing}
            style={styles.productButton}
          >
            <Image
              source={require("@/assets/images/600-YBC.jpg")}
              style={styles.image}
            />
          </TouchableOpacity>
          {processing && <ActivityIndicator style={{ marginTop: 10 }} />}
        </View>

        <View style={styles.productCard}>
          <TouchableOpacity
            onPress={handle1300Purchase}
            disabled={processing}
            style={styles.productButton}
          >
            <Image
              source={require("@/assets/images/1300-YBC.jpeg")}
              style={styles.image}
            />
          </TouchableOpacity>
          {processing && <ActivityIndicator style={{ marginTop: 10 }} />}
        </View>

        <View style={styles.productCard}>
          <TouchableOpacity
            onPress={handle2800Purchase}
            disabled={processing}
            style={styles.productButton}
          >
            <Image
              source={require("@/assets/images/2800-YBC.jpeg")}
              style={styles.image}
            />
          </TouchableOpacity>
          {processing && <ActivityIndicator style={{ marginTop: 10 }} />}
        </View>

        <View style={styles.productCard}>
          <TouchableOpacity
            onPress={handle5000Purchase}
            disabled={processing}
            style={styles.productButton}
          >
            <Image
              source={require("@/assets/images/5000-YBC.jpeg")}
              style={styles.image}
            />
          </TouchableOpacity>
          {processing && <ActivityIndicator style={{ marginTop: 10 }} />}
        </View>

        <View style={styles.productCard}>
          <TouchableOpacity
            onPress={handle8000Purchase}
            disabled={processing}
            style={styles.productButton}
          >
            <Image
              source={require("@/assets/images/8000-YBC.jpeg")}
              style={styles.image}
            />
          </TouchableOpacity>
          {processing && <ActivityIndicator style={{ marginTop: 10 }} />}
        </View>

        <View style={styles.backContainer}>
          <Text onPress={() => router.back()} style={styles.back}>
            {t.back}
          </Text>
        </View>
      </ScrollView>
      <PinInput
        value={pin}
        onChange={setPin}
        visible={pinVisible}
        onClose={() => setPinVisible(false)}
        onConfirm={confirmPin}
        title="Enter Transaction PIN"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "lightyellow",
  },
  image: {
    width: 300,
    height: 100,
    margin: 10,
    borderRadius: 10,
    overflow: "hidden",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 20,
    color: "blue",
  },
  backContainer: {
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 50,
  },
  back: {
    color: "blue",
    fontSize: 16,
    fontWeight: "bold",
  },
  productCard: {
    alignItems: "center",
    marginVertical: 10,
  },
  productButton: {
    alignItems: "center",
  },
  productLabel: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "bold",
  },
  productPrice: {
    fontSize: 16,
    color: "#555",
  },
});
