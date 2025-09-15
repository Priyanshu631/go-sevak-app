import React from "react";
import { View, StyleSheet, ViewProps } from "react-native";
import { theme } from "../theme/theme";

type Props = ViewProps & {
  children: React.ReactNode;
};

export const Card: React.FC<Props> = ({ children, style, ...rest }) => {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface, // light beige from theme
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1bfa7", // subtle brown border
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginVertical: 10,
    width: "100%",
  },
});
