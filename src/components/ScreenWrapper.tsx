import React, { ReactNode } from "react";
// We need to import these new types for the style prop
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { theme } from "../theme/theme";

// Corrected: Add an optional 'style' property to your Props type
type Props = { 
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

// Corrected: Destructure the style prop from the props
export default function ScreenWrapper({ children, style }: Props) {
  return (
    // Corrected: Apply both the default container styles and the passed style prop
    <View style={[styles.container, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Corrected: Remove the background color and padding from here
    // to allow the ImageBackground to show through.
    // The padding and alignment should be handled by the ScrollView's contentContainerStyle.
  },
});