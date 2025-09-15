import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { clearAllPredictions } from '../services/storageService';
import { manualSync } from '../services/syncService';
import { useAuth } from '../context/AuthContext';
import ScreenWrapper from "../components/ScreenWrapper";
import { Card } from "../components/Card";
import { Heading, BodyText } from "../components/Typography";
import { theme } from "../theme/theme";

const backgroundImg = require("../assets/bg.png"); // same as HistoryScreen

export default function SettingsScreen() {
  const { signOut, user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleManualSync = async () => {
    setIsSyncing(true);
    const result = await manualSync();
    Alert.alert(result.success ? "Sync Complete" : "Sync Info", result.message);
    setIsSyncing(false);
  };

  const handleClearHistory = () => {
    Alert.alert(
      "Clear History",
      "Are you sure you want to clear all your local prediction history? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            if (user) {
              try {
                await clearAllPredictions(user.id);
                Alert.alert("Success", "Your local history has been cleared.");
              } catch (error) {
                Alert.alert("Error", "Failed to clear local history.");
              }
            } else {
              Alert.alert("Error", "No user is logged in.");
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: () => signOut() },
      ]
    );
  };

  return (
    <ImageBackground
      source={backgroundImg}
      style={styles.background}
      resizeMode="repeat"
    >
      <SafeAreaView style={styles.safeArea}>
        <ScreenWrapper style={styles.screenWrapper}>
          <Card style={styles.mainCard}>
            <View style={styles.cardHeader}>
              <Heading>App Settings</Heading>
            </View>

            {user && (
              <BodyText style={styles.emailText}>Logged in as: {user.email}</BodyText>
            )}

            <TouchableOpacity
              style={[styles.button, isSyncing && styles.buttonDisabled]}
              onPress={handleManualSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <ActivityIndicator color={theme.colors.background} />
              ) : (
                <Text style={styles.buttonText}>Force Manual Sync</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.destructiveButton]}
              onPress={handleClearHistory}
            >
              <Text style={styles.buttonText}>Clear Local History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.logoutButton]}
              onPress={handleLogout}
            >
              <Text style={styles.buttonText}>Logout</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <BodyText style={styles.footerText}>App Version: 1.0.0</BodyText>
            </View>
          </Card>
        </ScreenWrapper>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  screenWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  mainCard: {
    padding: 20,
    width: '100%',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  emailText: {
    fontSize: 14,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 25,
  },
  button: {
    backgroundColor: theme.colors.accent,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
    minHeight: 50,
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: theme.colors.border,
  },
  destructiveButton: {
    backgroundColor: theme.colors.error || '#FF3B30',
  },
  logoutButton: {
    backgroundColor: theme.colors.secondary || '#6c757d',
  },
  buttonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.text,
  },
});
