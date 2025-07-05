import { db } from "@/Firebase";
import { useLanguage } from "@/hooks/useLanguage";
import { User } from "@/types/user";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image
} from "react-native";
import showAlert from "../CustomAlert/ShowAlert";

interface GroupAScreenProps {
  userChildren: User[];
  currentUser: User;
}

interface GDPPurchase {
  id: string;
  userId: string;
  animationFile: string;
  gdpPurchased: number;
  timestamp: any;
}

export default function GroupAScreen({
  currentUser,
}: GroupAScreenProps) {
  const [groupAChildren, setGroupAChildren] = useState<User[]>([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [userGdpPurchases, setUserGdpPurchases] = useState<{
    [key: string]: GDPPurchase | null;
  }>({});

  const { t } = useLanguage();

  useEffect(() => {
    if (!currentUser) return;

    const usersRef = collection(db, "users");
    const q = query(
      usersRef,
      where("parentId", "==", currentUser.uid),
      where("group", "==", "A"),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const children: User[] = [];
      querySnapshot.forEach((doc) => {
        children.push({ uid: doc.id, ...doc.data() } as User);
      });
      setGroupAChildren(children);
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (groupAChildren.length === 0) return;

    const fetchGdpPurchases = async () => {
      const purchases: { [key: string]: GDPPurchase | null } = {};

      for (const child of groupAChildren) {
        const gdpPurchaseRef = collection(db, "gdpPurchases");
        const q = query(
          gdpPurchaseRef,
          where("userId", "==", child.uid),
          orderBy("timestamp", "desc"),
          limit(1)
        );

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          purchases[child.uid] = {
            id: querySnapshot.docs[0].id,
            ...querySnapshot.docs[0].data(),
          } as GDPPurchase;
        } else {
          purchases[child.uid] = null;
        }
      }

      setUserGdpPurchases(purchases);
    };

    fetchGdpPurchases();
  }, [groupAChildren]);

  const navigateToSignup = () => {
    if (currentUser?.referralCode) {
      setIsAddingUser(true);
      router.push({
        pathname: "/(auth)/register",
        params: {
          referralCode: currentUser.referralCode,
          group: "A",
          isAddingUser: "true",
        },
      });
    } else {
      console.error("Current user or referral code is undefined");
      showAlert(
        t.error,
        t.tryAgain
      );
    }
  };

  const formatTimestamp = (timestamp: any) => {
    if (timestamp && timestamp.toDate) {
      return timestamp.toDate().toLocaleString();
    }
    return "Not available";
  };

  // const renderGDPAnimation = (user: User) => {
  //   const gdpPurchase = userGdpPurchases[user.uid];
  //   if (!gdpPurchase?.animationFile) return null;

  //   return (
  //     <View style={styles.gdpPreview}>
  //       <LottieView
  //         source={
  //           gdpPurchase.animationFile === "star-1.json"
  //             ? require("@/assets/animations/star-1.json") :
  //             gdpPurchase.animationFile === "2-star.json"
  //               ? require("@/assets/animations/2-star.json")
  //               : gdpPurchase.animationFile === "3-star.json"
  //                 ? require("@/assets/animations/3-star.json")
  //                 : gdpPurchase.animationFile === "4-star.json"
  //                   ? require("@/assets/animations/4-star.json")
  //                   : gdpPurchase.animationFile === "5-star.json"
  //                     ? require("@/assets/animations/5-star.json")
  //                     : require("@/assets/animations/Crown.json")
  //         }
  //         autoPlay
  //         loop
  //         style={styles.lottieAnimation}
  //       />
  //     </View>
  //   );
  // };

  const renderChildItem = ({ item }: { item: User }) => (
    <View style={styles.childItem}>
      <LinearGradient
        colors={["#ffffff", "#f8f9fa"]}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardContent}>
          <View style={styles.userSection}>
            <View style={styles.userBasicInfo}>
              <View style={styles.nameAndGdp}>
                <Image
                  source={item.photoURL ? { uri: item.photoURL } : require("@/assets/images/user.png")}
                  style={styles.userImage}
                />
                <Text style={styles.username}>{item.username}</Text>
              </View>

              <Text style={styles.state}>{item.state}</Text>
              {/* {item.country && (
                <View style={styles.countryContainer}>
                  <Text style={styles.countryName}>
                    {countries[item.country]?.name || item.country}
                  </Text>
                  <CountryFlag isoCode={item.country} size={24} />
                </View>
              )} */}
            </View>
            <View style={styles.GDPAnimation}>
              <View style={styles.timestampContainer}>
                <MaterialIcons name="access-time" size={16} color="#666" />
                <Text style={styles.timestampText}>
                  {formatTimestamp(item.timestamp)}
                </Text>
              </View>
              {/* {renderGDPAnimation(item)} */}
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={groupAChildren}
        renderItem={renderChildItem}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {currentUser && (
        <TouchableOpacity style={styles.addButton} onPress={navigateToSignup}>
          <LinearGradient
            colors={["#1a237e", "#0d47a1"]}
            style={styles.gradientButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialIcons name="person-add" size={24} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>{t.back}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  childItem: {
    marginBottom: 16,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      },
      android: {
        elevation: 3,
      },
      default: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  cardGradient: {
    borderRadius: 16,
    overflow: "hidden",
  },
  cardContent: {
    padding: 16,
  },
  userSection: {
    marginBottom: 12,
  },
  userBasicInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  nameAndGdp: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  userImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
  },
  username: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a237e",
  },
  state: {
    fontSize: 10,
    fontWeight: "600",
    color: "#1a237e",
  },
  countryContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  countryName: {
    marginRight: 10,
    fontSize: 14,
    color: "#666",
  },
  timestampContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  timestampText: {
    marginLeft: 4,
    fontSize: 12,
    color: "#666",
  },
  gdpPreview: {
    width: 45,
    height: 45,
    marginLeft:30,
  },
  lottieAnimation: {
    width: '100%',
    height: '100%',
  },
  addButton: {
    position: "absolute",
    bottom: 80,
    right: 24,
    ...Platform.select({
      ios: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)',
      },
      android: {
        elevation: 5,
      },
      default: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)',
      },
    }),
  },
  gradientButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  GDPAnimation: {
    flexDirection: "row",
    gap: 60,
  },
  backButton: {
    marginTop: 20,
    backgroundColor: "#757575",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    ...Platform.select({
      ios: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)',
      },
      android: {
        elevation: 3,
      },
      default: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)',
      },
    }),
  },
  backButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
