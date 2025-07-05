import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Pressable,
  GestureResponderEvent,
  Dimensions,
} from 'react-native';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  buttons: {
    text: string;
    onPress: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }[];
  onClose: () => void;
}

const { width: WINDOW_WIDTH } = Dimensions.get('window');

export function CustomAlert({
  visible,
  title,
  message,
  buttons,
  onClose,
}: CustomAlertProps) {
  const handleContentPress = (e: GestureResponderEvent | React.MouseEvent) => {
    // Prevent click from bubbling up to overlay
    if (Platform.OS === 'web') {
      e.stopPropagation();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable 
          style={[
            styles.container,
            Platform.OS === 'web' ? styles.containerWeb : styles.containerNative
          ]} 
          onPress={handleContentPress}
        >
          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
            <View style={styles.buttonContainer}>
              {buttons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    index > 0 && styles.buttonMargin,
                    button.style === 'destructive' && styles.destructiveButton,
                  ]}
                  onPress={() => {
                    button.onPress();
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      button.style === 'destructive' && styles.destructiveText,
                      button.style === 'cancel' && styles.cancelText,
                    ]}
                  >
                    {button.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  containerWeb: {
    width: Math.min(400, WINDOW_WIDTH * 0.9),
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  containerNative: {
    width: WINDOW_WIDTH * 0.8,
    elevation: 5,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  buttonMargin: {
    marginLeft: 8,
  },
  destructiveButton: {
    backgroundColor: '#fee2e2',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  destructiveText: {
    color: '#dc2626',
  },
  cancelText: {
    color: '#666',
  },
});
