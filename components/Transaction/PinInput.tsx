import { useLanguage } from '@/hooks/useLanguage';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from "@/Firebase";
import { doc, getDoc } from "firebase/firestore";
import showAlert from "@/components/CustomAlert/ShowAlert";

interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  onClose?: () => void;
  onConfirm?: () => void;
  visible: boolean;
  title?: string | React.ReactNode;
}

const { height } = Dimensions.get('window');

export default function PinInput({
  value,
  onChange,
  maxLength = 6,
  onClose,
  onConfirm,
  visible,
  title = 'PIN',
}: PinInputProps) {
  const { t } = useLanguage();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Validate PIN against user's transactionPassword in Firestore
  const handleConfirm = async () => {
    if (value.length < maxLength) return;
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        showAlert(t.error, "Not authenticated");
        return;
      }
      const userSnap = await getDoc(doc(db, "users", currentUser.uid));
      if (!userSnap.exists()) {
        showAlert(t.error, "User not found");
        return;
      }
      const pw = userSnap.data().transactionPassword ?? "";
      if (value === pw) {
        onConfirm?.();
      } else {
        showAlert(t.error, t.Incorrect_PIN ?? "Incorrect PIN");
      }
    } catch (err) {
      console.error("PIN validation error", err);
      showAlert(t.error, "Failed to validate PIN");
    }
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  const renderPinBoxes = () => {
    const boxes = [];
    for (let i = 0; i < maxLength; i++) {
      boxes.push(
        <TouchableOpacity
          key={i}
          style={[
            styles.pinBox,
            isFocused && i === value.length && styles.pinBoxFocused,
            value[i] && styles.pinBoxFilled,
          ]}
          onPress={focusInput}
          activeOpacity={0.7}
        >
          {value[i] && <View style={styles.dot} />}
        </TouchableOpacity>
      );
    }
    return boxes;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.title}>{title}</Text>
          </View>
          
          <Text style={styles.subtitle}>
        {t.Please_enter_PIN_linked_to_your_eWallet_ccount}
          </Text>

          <TouchableOpacity
            style={styles.pinContainer}
            onPress={focusInput}
            activeOpacity={1}
          >
            {renderPinBoxes()}
            <TextInput
              ref={inputRef}
              style={styles.hiddenInput}
              value={value}
              onChangeText={(text) => {
                if (text.length <= maxLength && /^\d*$/.test(text)) {
                  onChange(text);
                }
              }}
              maxLength={maxLength}
              keyboardType="numeric"
              secureTextEntry
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              autoFocus
            />
          </TouchableOpacity>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>{t.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                value.length < maxLength && styles.disabledButton,
              ]}
              onPress={handleConfirm}
              disabled={value.length < maxLength}
            >
              <Text style={styles.confirmButtonText}>{t.confirm}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingTop: 15,
    minHeight: height * 0.4,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    left: 0,
    padding: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 30,
  },
  pinBox: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBoxFocused: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  pinBoxFilled: {
    borderColor: '#007AFF',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#000',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 'auto',
    paddingTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  confirmButton: {
    backgroundColor: '#004AAD',
  },
  cancelButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
