import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!process.env.EXPO_PUBLIC_FIREBASE_API_KEY) {
  throw new Error("Missing Firebase API key in environment variables");
}
if (!process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN) {
  throw new Error("Missing Firebase auth domain in environment variables");
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Initialize Firebase Auth
let auth: ReturnType<typeof getAuth>;
if (Platform.OS === 'web') {
  auth = getAuth(app);
  setPersistence(auth, browserLocalPersistence)
    .catch((error: Error) => {
      console.error('Error setting auth persistence:', error);
    });
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch (error) {
    // If already initialized, get the existing instance
    auth = getAuth(app);
  }
}

const storage = getStorage(app);

export { app, auth, db, storage };
export type { Auth } from 'firebase/auth';
