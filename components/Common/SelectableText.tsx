import * as Clipboard from 'expo-clipboard';
import React, { useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  LayoutRectangle,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

const SelectableText = ({ text, style }: { text: string, style?: any }) => {
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [layout, setLayout] = useState<LayoutRectangle | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const textRef = useRef<TextInput>(null);

  const handleLayout = (event: LayoutChangeEvent) => {
    setLayout(event.nativeEvent.layout);
  };

  const handleLongPress = () => {
    setIsSelecting(true);
    if (textRef.current) {
      textRef.current.focus();
    }
  };

  const handleSelectionChange = (start: number, end: number) => {
    setSelection({ start, end });
  };

  const handleCopy = async () => {
    const selectedText = text.slice(selection.start, selection.end);
    await Clipboard.setStringAsync(selectedText);
    setIsSelecting(false);
  };

  if (Platform.OS === 'ios') {
    return (
      <TextInput
        value={text}
        multiline
        editable={false}
        style={[styles.selectableText, style]}
        contextMenuHidden={false}
        textAlignVertical="center"
      />
    );
  }

  return (
    <View>
      <TouchableWithoutFeedback onLongPress={handleLongPress}>
        <View>
          <TextInput
            ref={textRef}
            value={text}
            multiline
            onLayout={handleLayout}
            selection={isSelecting ? selection : undefined}
            onSelectionChange={(event) => {
              const { start, end } = event.nativeEvent.selection;
              handleSelectionChange(start, end);
            }}
            style={[styles.selectableText, style]}
            contextMenuHidden={false}
            onBlur={() => setIsSelecting(false)}
          />
          {isSelecting && layout && (
            <View style={[styles.selectionToolbar, { top: -layout.height - 48 }]}>
              <TouchableWithoutFeedback onPress={handleCopy}>
                <View style={styles.toolbarButton}>
                  <Text style={styles.toolbarButtonText}>Copy</Text>
                </View>
              </TouchableWithoutFeedback>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
};

const styles = StyleSheet.create({
  selectableText: {
    margin: 0,
    padding: 0,
    backgroundColor: 'transparent',
    color: '#333',
    minHeight: 20,
    ...Platform.select({
      ios: {
        height: undefined,
      },
      android: {
        textAlignVertical: 'center',
        paddingVertical: 0,
      },
    }),
  },
  selectionToolbar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 44,
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    borderRadius: 4,
  },
  toolbarButton: {
    padding: 8,
    marginHorizontal: 4,
  },
  toolbarButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default SelectableText;
