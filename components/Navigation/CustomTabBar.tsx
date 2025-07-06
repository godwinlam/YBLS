import { useUser } from "@/context/UserContext";
import { isValidLanguage, useLanguage } from "@/hooks/useLanguage";
import translations from "@/translations";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePathname, useRouter } from "expo-router";
import React, { useCallback, useEffect } from "react";
import {
  DeviceEventEmitter,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Event name constant to ensure consistency
const LANGUAGE_CHANGE_EVENT = "LANGUAGE_CHANGE";

// Valid tab routes for type safety
const TAB_ROUTES = {
  index: "/(tabs)",
  products: '/(tabs)/products',
  cart: '/(tabs)/cart',
  cartRM: '/(tabs)/cartRM',
  profile: "/(tabs)/profile",
  orderHistory: "/(tabs)/orderHistory",
  admin: "/(tabs)/admin",
  location: "/(tabs)/location",
} as const;

type TabRoutePath = (typeof TAB_ROUTES)[keyof typeof TAB_ROUTES];
type TabRouteName = keyof typeof TAB_ROUTES;

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

export default function CustomTabBar({
  state,
  descriptors,
  navigation,
}: TabBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { userRole } = useUser();
  const isAdmin = userRole === "admin";

  const { t, selectedLanguage, setSelectedLanguage } = useLanguage();

  // Memoized navigation handler
  const handleNavigation = useCallback(
    async (routeName: TabRouteName) => {
      try {
        const path = TAB_ROUTES[routeName];
        await router.replace(path as TabRoutePath);
      } catch (error) {
        console.error("Navigation error:", error);
      }
    },
    [router]
  );

  // Listen for language changes
  useEffect(() => {
    const checkLanguage = async () => {
      try {
        const storedLanguage = await AsyncStorage.getItem("selectedLanguage");
        if (
          storedLanguage &&
          storedLanguage !== selectedLanguage &&
          translations[storedLanguage] &&
          isValidLanguage(storedLanguage)
        ) {
          // Update language state
          setSelectedLanguage(storedLanguage);

          // Emit a language change event that other components can listen to
          DeviceEventEmitter.emit(LANGUAGE_CHANGE_EVENT, {
            language: storedLanguage,
          });

          // Force a re-render of the tab bar with updated translations
          if (pathname.startsWith("/(tabs)")) {
            const currentRoute = state.routes[state.index];
            if (currentRoute?.name) {
              await handleNavigation(currentRoute.name as TabRouteName);
            }
          }
        }
      } catch (error) {
        console.error("Error checking language:", error);
      }
    };

    // Initial language check
    checkLanguage();

    // Set up an interval to check periodically
    const intervalId = setInterval(checkLanguage, 2000);

    // Cleanup interval on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [pathname, handleNavigation, selectedLanguage, state.index, state.routes]);

  // Load initial language
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const storedLanguage = await AsyncStorage.getItem("selectedLanguage");
        if (storedLanguage && translations[storedLanguage] && isValidLanguage(storedLanguage)) {
          setSelectedLanguage(storedLanguage);
        }
      } catch (error) {
        console.error("Error loading language:", error);
      }
    };

    loadLanguage();
  }, []);

  const getTabIcon = (routeName: TabRouteName): keyof typeof Ionicons.glyphMap => {
  switch (routeName) {
    case "index":
      return "home";
    case "products":
      return "bag";
    case "cart":
      return "cart";
    case "cartRM":
      return "card";
    case "orderHistory":
      return "list";
    case "location":
      return "location";
    case "profile":
      return "person";
    case "admin":
      return "settings";
    default:
      return "home";
  }
};

  const getTabLabel = (routeName: TabRouteName) => {
    switch (routeName) {
      case "index":
        return t.home;
      case 'products':
        return t.services;
      case 'cart':
        return 'YBC';
      case 'cartRM':
        return 'RM';
      case "profile":
        return t.profile;
      case "orderHistory":
        return t.history;
      case "admin":
        return t.admin;
      case "location":
        return t.location;
      default:
        return t.home;
    }
  };

  const shouldShowTab = (routeName: TabRouteName) => {
    if (routeName === "admin") {
      return isAdmin;
    }
    return true;
  };

  return (
    <View style={styles.container}>
      {state.routes.map((route: any, index: number) => {
         const routeNameGeneric = route.name as string;
         // Skip any routes we haven't explicitly mapped; prevents duplicate unknown Home tabs
         if (!(routeNameGeneric in TAB_ROUTES)) {
           return null;
         }
         const routeName = routeNameGeneric as TabRouteName;
         if (!shouldShowTab(routeName)) {
           return null;
         }

        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            handleNavigation(routeName);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            style={styles.tab}
          >
            <View style={[styles.tabContent, isFocused && styles.activeTab]}>
              <Ionicons
                name={getTabIcon(routeName)}
                size={24}
                color={isFocused ? "#2196F3" : "#666"}
              />
              <Text style={[styles.label, isFocused && styles.activeLabel]}>
                {getTabLabel(routeName)}
              </Text>
              {isFocused && <View style={styles.activeDot} />}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingBottom: Platform.OS === "ios" ? 24 : 8,
    paddingTop: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: "0 -4px 12px rgba(0,0,0,0.1)",
      } as any,
    }),
  },
  tab: {
    flex: 1,
    alignItems: "center",
  },
  tabContent: {
    alignItems: "center",
    padding: 4,
    borderRadius: 16,
    position: "relative",
  },
  activeTab: {
    backgroundColor: "lightgreen",
  },
  label: {
    fontSize: 10,
    marginTop: 4,
    color: "#666",
    fontWeight: "500",
  },
  activeLabel: {
    color: "blue",
    fontWeight: "600",
  },
  activeDot: {
    position: "absolute",
    bottom: -8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "red",
  },
});
