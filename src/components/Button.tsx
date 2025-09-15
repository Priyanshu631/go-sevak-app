import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { theme } from "../theme/theme";

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean; // 👈 allow disabled
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
    marginHorizontal: 5,
    flex: 1,
  },
  text: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  disabled: {
    backgroundColor: "#aaa", // grey out when disabled
  },
});
