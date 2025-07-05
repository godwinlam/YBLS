import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import translations from '@/translations';
import showAlert from '@/components/CustomAlert/ShowAlert';
import { DeviceEventEmitter } from 'react-native';

export type SupportedLanguage = 'en' | 'zh' | 'id' | 'hi' | 'ru' | 'ko' | 'ja' | 'vi' | 'th';

export const languages = [
  { code: "en" as SupportedLanguage, name: "English", isoCode: "US" },
  { code: "zh" as SupportedLanguage, name: "中文", isoCode: "CN" },
  { code: "id" as SupportedLanguage, name: "Indonesia", isoCode: "ID" },
  { code: "hi" as SupportedLanguage, name: "हिन्दी", isoCode: "IN" },
  { code: "ru" as SupportedLanguage, name: "Русский", isoCode: "RU" },
  { code: "ko" as SupportedLanguage, name: "한국어", isoCode: "KR" },
  { code: "ja" as SupportedLanguage, name: "日本語", isoCode: "JP" },
  { code: "vi" as SupportedLanguage, name: "Tiếng Việt", isoCode: "VN" },
  { code: "th" as SupportedLanguage, name: "ไทย", isoCode: "TH" }
];

const DEFAULT_LANGUAGE: SupportedLanguage = "en";
const LANGUAGE_STORAGE_KEY = "selectedLanguage";

// Helper function to validate language code
export const isValidLanguage = (lang: unknown): lang is SupportedLanguage => {
  return typeof lang === 'string' && languages.some(l => l.code === lang);
};

export const LANGUAGE_CHANGE_EVENT = 'LANGUAGE_CHANGE';

interface LanguageChangeEvent {
  language: string;
}

export function useLanguage() {
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // Safely get translations for the current language
  const t= translations[selectedLanguage]?.translations || translations[DEFAULT_LANGUAGE].translations;

  useEffect(() => {
    loadSavedLanguage();

    // Listen for language changes from other components
    const subscription = DeviceEventEmitter.addListener(
      LANGUAGE_CHANGE_EVENT,
      (event: LanguageChangeEvent) => {
        if (isValidLanguage(event.language)) {
          setSelectedLanguage(event.language);
        } else {
          console.warn(`Invalid language code received:`, event);
          setSelectedLanguage(DEFAULT_LANGUAGE);
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  const loadSavedLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLanguage && isValidLanguage(savedLanguage)) {
        setSelectedLanguage(savedLanguage);
      } else if (savedLanguage) {
        console.warn(`Invalid saved language found: ${savedLanguage}`);
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, DEFAULT_LANGUAGE);
        setSelectedLanguage(DEFAULT_LANGUAGE);
      }
    } catch (error) {
      console.error("Error loading saved language:", error);
      setSelectedLanguage(DEFAULT_LANGUAGE);
    }
  };

  const handleLanguageChange = async (language: SupportedLanguage) => {
    try {
      if (!isValidLanguage(language)) {
        throw new Error(`Invalid language code: ${language}`);
      }
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      setSelectedLanguage(language);
      setShowLanguageModal(false);
      // Emit language change event for other components
      DeviceEventEmitter.emit(LANGUAGE_CHANGE_EVENT, { language });
    } catch (error) {
      console.error("Error changing language:", error);
      showAlert(t.error, t.languageChangeError);
    }
  };

  return {
    selectedLanguage,
    setSelectedLanguage,
    showLanguageModal,
    setShowLanguageModal,
    t,
    handleLanguageChange
  };
}
