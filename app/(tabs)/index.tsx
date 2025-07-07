import { auth, db } from "@/Firebase";
import HomeCarousel from "@/components/Carousel/HomeCarousel";
import { languages, useLanguage } from "@/hooks/useLanguage";
import { User } from "@/types/user";
import { AntDesign } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import LottieView from "lottie-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  SectionList,
} from "react-native";
import CountryFlag from "react-native-country-flag";
import { Product } from "@/components/Products/ProductList";
import ServiceCarousel from "@/components/Carousel/ServiceCarousel";

interface TabOneScreenProps {}

const getAnimationSource = (animationFile: string) => {
  switch (animationFile) {
    // case "star-1.json":
    //   return require("@/assets/animations/star-1.json");
    // case "2-star.json":
    //   return require("@/assets/animations/2-star.json");
    // case "3-star.json":
    //   return require("@/assets/animations/3-star.json");
    // case "4-star.json":
    //   return require("@/assets/animations/4-star.json");
    // case "5-star.json":
    //   return require("@/assets/animations/5-star.json");
    // case "Crown.json":
    //   return require("@/assets/animations/Crown.json");
    default:
      return require("@/assets/animations/Referral.json");
  }
};

const TabOneScreen = () => {
  const [children, setChildren] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [animationSource, setAnimationSource] = useState(
    require("@/assets/animations/Referral.json")
  );
  const [userBalance, setUserBalance] = useState(0);
  const [hotTreatment, setHotTreatment] = useState<Product[]>([]);
  const [promotion, setPromotion] = useState<Product[]>([]);

  useEffect(() => {
    loadHotTreatment();
    loadPromotion();
    refreshUserData();
  }, []);

  const loadHotTreatment = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      const productsData = querySnapshot.docs
        .map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as Product)
        )
        .filter((product: Product) => product.category === "Hot Treatment");
      setHotTreatment(productsData);
    } catch (error) {
      console.error("Error loading Hot Treatment:", error);
    }
  };

  const loadPromotion = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      const productsData = querySnapshot.docs
        .map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as Product)
        )
        .filter((product: Product) => product.category === "Promotions");
      setPromotion(productsData);
    } catch (error) {
      console.error("Error loading promotions:", error);
    }
  };

  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => router.push({ pathname: `/products/${item.id}` as any })}
    >
      <Image source={{ uri: item.image }} style={styles.productImage} />

      <Text style={styles.productName} numberOfLines={1}>
        {item.name}
      </Text>

      <View style={{ flexDirection: "row" }}>
        <Text style={styles.bigPrice}>
          RM {item.bigOriginalPrice.toFixed(0)}
        </Text>
        <Text style={styles.originalPrice}>Original Price</Text>
      </View>

      <View style={{ flexDirection: "row" }}>
        <Text style={styles.productPrice}>
          RM {item.originalPrice.toFixed(0)}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={styles.YBCPrice}>{item.price.toFixed(0)}</Text>
          <Text style={styles.ybcText}>YBC</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderPromotionItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.promotionCard}
      onPress={() => router.push({ pathname: `/products/${item.id}` as any })}
    >
      <Image source={{ uri: item.image }} style={styles.promotionImage} />
    </TouchableOpacity>
  );

  const {
    t,
    handleLanguageChange,
    showLanguageModal,
    setShowLanguageModal,
    selectedLanguage,
  } = useLanguage();

  const renderLanguageOption = (lang: (typeof languages)[0]) => (
    <TouchableOpacity
      key={lang.code}
      style={[
        styles.languageOption,
        selectedLanguage === lang.code && styles.selectedLanguage,
      ]}
      onPress={() => handleLanguageChange(lang.code)}
    >
      <CountryFlag
        isoCode={lang.isoCode}
        size={24}
        style={{ marginRight: 8 }}
      />
      <Text
        style={[
          styles.languageOptionText,
          selectedLanguage === lang.code && styles.selectedLanguageText,
        ]}
      >
        {lang.name}
      </Text>
      {selectedLanguage === lang.code && (
        <AntDesign name="check" size={20} color="#007AFF" />
      )}
    </TouchableOpacity>
  );

  const refreshUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = { uid: userDoc.id, ...userDoc.data() } as User;
          setCurrentUser(userData);
          setUserBalance(userData.balance || 0);
          if (userData.gdpAnimation) {
            setAnimationSource(getAnimationSource(userData.gdpAnimation));
          }
        }
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
    }
  };
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true);
        const user = auth.currentUser;
        if (!user) {
          setCurrentUser(null);
          setIsLoading(false);
          // router.replace({ pathname: '/home' as any });
          return;
        }

        // Set up real-time listener for user document
        const unsubscribe = onSnapshot(
          doc(db, "users", user.uid),
          (userDoc) => {
            if (userDoc.exists()) {
              const userData = { uid: userDoc.id, ...userDoc.data() } as User;
              setCurrentUser(userData);
              setUserBalance(userData.balance || 0);
              if (userData.gdpAnimation) {
                setAnimationSource(getAnimationSource(userData.gdpAnimation));
              }
            }
            setIsLoading(false);
          },
          (error) => {
            console.error("Error in user snapshot:", error);
            setIsLoading(false);
          }
        );

        return unsubscribe;
      } catch (error) {
        console.error("Error loading user data:", error);
        setIsLoading(false);
      }
    };

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        // router.replace({ pathname: '/home' as any });
        setCurrentUser(null);
      }
    });

    const unsubscribePromise = loadUserData();
    let unsubscribe: (() => void) | undefined;

    // Handle the async unsubscribe
    if (unsubscribePromise) {
      unsubscribePromise.then((unsub) => {
        if (unsub) {
          unsubscribe = unsub;
        }
      });
    }

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      unsubscribeAuth();
    };
  }, []);

  // Load GDP animation when a logged-in user's uid changes
  useEffect(() => {
    if (!currentUser?.uid) return; // skip for guests

    let alive = true;
    (async () => {
      const animation = await getGDPAnimation(currentUser.uid);
      if (alive) {
        setAnimationSource(getAnimationSource(animation || "Referral.json"));
      }
    })();

    return () => {
      alive = false; // prevent state update if unmounted
    };
  }, [currentUser?.uid]);

  const getGDPAnimation = async (userId: string): Promise<string | null> => {
    try {
      const gdpPurchasesRef = collection(db, "gdpPurchases");
      const q = query(gdpPurchasesRef, where("userId", "==", userId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const gdpPurchase = querySnapshot.docs[0].data();
        return gdpPurchase.animationFile || "Referral.json";
      }
      return null;
    } catch (error) {
      console.error("Error getting GDP animation:", error);
      return null;
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  const handleGroupAPress = () => {
    router.push({
      pathname: "/group-a",
      params: {
        children: JSON.stringify(
          children.filter((child) => child.group === "A")
        ),
        currentUser: JSON.stringify(currentUser),
      },
    });
  };

  const navigateToYBC = () => router.push("/YBC" as any);

  const sections = [
    { type: "HOME_CAROUSEL", data: [{ key: "home-carousel" }] },
    { type: "USER_INFO", data: [{ key: "user-info" }] },
    { type: "HOT_TREATMENT", title: t.hot_Treatment, data: [hotTreatment] },
    { type: "PROMOTIONS", title: t.promotions, data: [promotion] },
    { type: "SERVICES", title: t.our_services, data: [{ key: "services" }] },
  ];

  const renderSectionContent = ({
    item,
    section,
  }: {
    item: any;
    section: any;
  }) => {
    switch (section.type) {
      case "HOME_CAROUSEL":
        return <HomeCarousel />;
      case "USER_INFO":
        return (
          <>
            <View style={styles.header}>
              <Text style={styles.welcomeText}>{t.welcomeBack}</Text>
              {currentUser ? (
                <Text style={styles.userNameText}>{currentUser.username}</Text>
              ) : (
                <Text style={styles.userNameText}>{t.guest} </Text>
              )}
              <TouchableOpacity
                style={styles.languageButton}
                onPress={() => setShowLanguageModal(true)}
              >
                {(() => {
                  const selectedLang =
                    languages.find((lang) => lang.code === selectedLanguage) ||
                    languages[0];
                  return (
                    <>
                      {/* <CountryFlag isoCode={selectedLang.isoCode} size={24} style={{ marginRight: 8 }} /> */}
                      <Text style={styles.languageButtonText}>
                        {selectedLang.name}
                      </Text>
                      <AntDesign name="down" size={16} color="#666" />
                    </>
                  );
                })()}
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: "row" }}>
              <TouchableOpacity onPress={navigateToYBC}>
                <View style={styles.balanceContainer}>
                  <View style={{ width: 120 }}>
                    <Text style={styles.balanceLabel}>{t.balance}</Text>
                    <View style={{ flexDirection: "row" }}>
                      <Text style={styles.balanceAmount}>
                        {userBalance.toLocaleString()}
                        <Text style={styles.currencySymbol}>YBC</Text>
                      </Text>
                    </View>
                  </View>

                  <View style={styles.imageContainer}>
                    {/* <LottieView source={animationSource} style={styles.gdpAnimation} autoPlay loop /> */}
                    <Image
                      source={require("@/assets/images/Logo-YBL.png")}
                      style={styles.image}
                    />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleGroupAPress()}>
                <View style={styles.referralContainer}>
                  <View style={styles.referralTextContainer}>
                    <Text style={styles.referralText}>{t.Friends}</Text>
                  </View>

                  <View style={styles.gdpAnimationContainer}>
                    <LottieView
                      source={animationSource}
                      style={styles.gdpAnimation}
                      autoPlay
                      loop
                    />
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </>
        );
      case "HOT_TREATMENT":
        return (
          <FlatList
            data={item}
            renderItem={renderProductItem}
            keyExtractor={(p: Product) => p.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productListContainer}
          />
        );
      case "PROMOTIONS":
        return (
          <FlatList
            data={item}
            style={styles.promotionListContainer}
            renderItem={renderPromotionItem}
            keyExtractor={(p: Product) => p.id}
            // contentContainerStyle={styles.promotionListContainer}
          />
        );
      case "SERVICES":
        return <ServiceCarousel />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <SectionList
          sections={sections}
          keyExtractor={(item, index) =>
            item.key || (item.id ? item.id + index : index.toString())
          }
          renderItem={renderSectionContent}
          renderSectionHeader={({ section: { title, type } }) => {
            if (
              type === "HOT_TREATMENT" ||
              type === "PROMOTIONS" ||
              type === "SERVICES"
            ) {
              return <Text style={styles.hotserviceText}>{title}</Text>;
            }
            return null;
          }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />

        <Modal
          visible={showLanguageModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowLanguageModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowLanguageModal(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t.selectLanguage}</Text>
              <ScrollView>{languages.map(renderLanguageOption)}</ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </SafeAreaView>
  );
};
export default TabOneScreen as React.FC<TabOneScreenProps>;

const { width, height } = Dimensions.get("window");

const shadowStyle = Platform.select({
  ios: {
    boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
  },
  android: {
    elevation: 3,
  },
  default: {
    boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  container: {
    flex: 1,
    backgroundColor: "lightblue",
  },
  header: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "android" ? 40 : 0,
    paddingBottom: 10,
    paddingHorizontal: 16,
    marginBottom: 10,
    marginTop: 5,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },
  actionSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  actionWrapper: {
    width: "30%",
    alignItems: "center",
    marginBottom: 20,
  },
  actionSquare: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    ...Platform.select({
      ios: {
        boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
      },
      android: {
        elevation: 2,
      },
      default: {
        boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
      },
    }),
  },
  actionLabel: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },
  gdpSection: {
    padding: 20,
  },
  gdpCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    ...shadowStyle,
  },
  gdpCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gdpCardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2D3436",
  },
  gdpCardSubtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  balanceSection: {
    paddingLeft: 5,
    paddingRight: 5,
    paddingBottom: 1,
    paddingTop: 5,
  },
  balanceCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 5,
    ...shadowStyle,
  },
  balanceContainer: {
    flexDirection: "row",
    width: 150,
    borderRadius: 15,
    marginLeft: 10,
    ...shadowStyle,
    backgroundColor: "#fff",
  },

  balanceLabel: {
    fontSize: 10,
    color: "green",
    marginBottom: 3,
    marginTop: 8,
    marginLeft: 10,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  currencySymbol: {
    fontSize: 12,
    color: "#1E293B",
    fontWeight: "bold",
    marginLeft: 5,
    marginTop: 8,
    marginRight: 5,
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1E293B",
    marginLeft: 10,
  },
  gdpAnimationContainer: {
    width: 50,
    height: 50,
    alignItems: "center",
    marginLeft: 10,
  },
  gdpAnimation: {
    width: "100%",
    height: "100%",
  },
  imageContainer: {
    width: 60,
    height: 50,
    alignItems: "center",
    backgroundColor: "#2c0440",
    borderRadius: 10,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  userNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 20,
  },
  userNameText: {
    fontSize: 16,
    color: "blue",
    fontWeight: "600",
    marginRight: 20,
    marginLeft: 20,
  },
  scrollView: {
    flex: 1,
  },
  bitcoinSection: {
    padding: 10,
    backgroundColor: "red",
  },
  bitcoinCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffff",
    borderRadius: 12,
    padding: 5,
    ...Platform.select({
      ios: {
        boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
      },
      android: {
        elevation: 3,
      },
      default: {
        boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
      },
    }),
  },
  bitcoinImageContainer: {
    width: 30,
    height: 35,
    marginRight: 20,
    marginLeft: 30,
    backgroundColor: "blue",
    borderRadius: 12,
  },
  bitcoinImage: {
    width: "100%",
    height: "100%",
  },
  bitcoinInfo: {
    flex: 1,
  },
  bitcoinTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 1,
    marginTop: 10,
  },
  bitcoinPrice: {
    fontSize: 13,
    color: "#2196F3",
    fontWeight: "600",
    marginBottom: 12,
  },
  buyButton: {
    backgroundColor: "transparent",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginRight: 50,
  },
  viewButtonText: {
    color: "green",
    fontWeight: "bold",
    fontSize: 14,
  },
  languageButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    backgroundColor: "lightgray",
    alignSelf: "flex-end",
    marginRight: 10,
  },
  languageButtonText: {
    fontSize: 16,
    color: "black",
    marginRight: 5,
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 8,
  },
  languageOptionText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  selectedLanguage: {
    backgroundColor: "#f0f0f0",
  },
  selectedLanguageText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    width: "100%",
    maxWidth: 400,
    maxHeight: height * 0.7,
    borderRadius: 15,
    padding: 20,
    ...Platform.select({
      ios: {
        boxShadow: "0px 3px 6px rgba(0, 0, 0, 0.2)",
      },
      android: {
        elevation: 5,
      },
      default: {
        boxShadow: "0px 3px 6px rgba(0, 0, 0, 0.2)",
      },
    }),
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
    textAlign: "center",
  },
  referralContainer: {
    flexDirection: "row",
    width: 130,
    borderRadius: 15,
    marginLeft: 75,
    ...shadowStyle,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  referralTextContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  referralText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "blue",
    marginLeft: 10,
    textAlign: "center",
  },
  hotserviceText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "blue",
    marginLeft: 15,
    marginTop: 25,
    marginBottom: 10,
  },
  productListContainer: {
    paddingLeft: 15,
    paddingBottom: 15,
  },
  productCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    width: 150,
    marginRight: 10,
    ...shadowStyle,
  },
  productImage: {
    width: "100%",
    height: 120,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 5,
    marginLeft: 5,
    height: 15, // To ensure consistent height
  },
  bigPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "lightgrey",
    marginTop: 20,
    marginLeft: 10,
    marginBottom: 5,
    textDecorationLine: "line-through",
    textDecorationColor: "grey",
    textDecorationStyle: "dashed",
  },
  originalPrice: {
    fontSize: 12,
    fontWeight: "bold",
    color: "blue",
    marginTop: 20,
    marginLeft: 10,
    textDecorationLine: "line-through",
    textDecorationColor: "grey",
    textDecorationStyle: "dashed",
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "grey",
    marginBottom: 5,
    marginLeft: 10,
  },
  YBCPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "green",
    marginBottom: 5,
    marginLeft: 20,
  },
  ybcText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "green",
    marginLeft: 2,
    marginBottom: 5,
  },
  promotionCard: {
    backgroundColor: "grey",
    borderRadius: 15,
    width: "100%",
    ...shadowStyle,
  },
  promotionImage: {
    width: "100%",
    height: 150,
    borderRadius: 15,
    // borderTopLeftRadius: 15,
    // borderTopRightRadius: 15,
  },
  promotionListContainer: {
    padding: 10,
    gap: 15,
    backgroundColor: "lightgrey",
    borderRadius: 15,
  },
});
