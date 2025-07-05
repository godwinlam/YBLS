import AsyncStorage from '@react-native-async-storage/async-storage';
import { Persistence } from 'firebase/auth';

export function getReactNativePersistence(storage: typeof AsyncStorage): Persistence {
  return {
    type: 'LOCAL' as const,
    async _isAvailable(): Promise<boolean> {
      try {
        await storage.getItem('firebase:testKey');
        return true;
      } catch {
        return false;
      }
    },
    async _get(key: string): Promise<string | null> {
      return storage.getItem(key);
    },
    async _set(key: string, value: string): Promise<void> {
      await storage.setItem(key, value);
    },
    async _remove(key: string): Promise<void> {
      await storage.removeItem(key);
    }
  };
}
