import React, { ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import { theme } from "../theme/theme";

type Props = { children: ReactNode };

export default function ScreenWrapper({ children }: Props) {
  return <View style={styles.container}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
});
