import React from "react";
import { Text, StyleSheet, TextProps } from "react-native";
import { theme } from "../theme/theme";

export const Heading: React.FC<TextProps> = ({ children, style, ...rest }) => {
  return (
    <Text style={[styles.heading, style]} {...rest}>
      {children}
    </Text>
  );
};

export const BodyText: React.FC<TextProps> = ({ children, style, ...rest }) => {
  return (
    <Text style={[styles.body, style]} {...rest}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 10,
    fontFamily: "serif", // 👈 matches the elegant serif vibe of your web app
  },
  body: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: "serif",
  },
});
