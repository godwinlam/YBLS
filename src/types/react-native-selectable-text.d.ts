declare module 'react-native-selectable-text' {
  import { ComponentType } from 'react';
  import { StyleProp, TextStyle } from 'react-native';

  interface SelectableTextProps {
    value: string;
    style?: StyleProp<TextStyle>;
    menuItems?: string[];
    selectable?: boolean;
    onSelection?: (selection: { content: string }) => void;
  }

  const SelectableText: ComponentType<SelectableTextProps>;
  export default SelectableText;
}
