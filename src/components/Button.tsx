import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { theme } from "../theme/theme";

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
};

export const PrimaryButton: React.FC<Props> = ({ title, onPress, disabled }) => {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  text: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  disabled: {
    backgroundColor: theme.colors.muted, // grey out when disabled
  },
});