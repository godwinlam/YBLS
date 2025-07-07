import { RewardProvider } from "@/context/RewardContext";
import { UserProvider } from '@/context/UserContext';
import { AuthProvider, useAuth } from "@/context/auth";
import { useColorScheme } from "@/hooks/useColorScheme";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Slot, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export {
  ErrorBoundary
} from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <RewardProvider>
          <UserProvider>
            <RootLayoutNav />
          </UserProvider>
        </RewardProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { user, loading, isPublicRoute } = useAuth();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (!loading && !isPublicRoute) {
      timeoutId = setTimeout(() => {
        // Both guests and authenticated users go to the tab navigator
        router.replace('/(tabs)' as any);
      }, 100); // Small delay to ensure layout is mounted
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [loading, user, isPublicRoute]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Slot />
    </ThemeProvider>
  );
}
