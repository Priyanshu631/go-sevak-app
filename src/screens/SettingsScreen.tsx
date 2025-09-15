import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { clearAllPredictions } from '../services/storageService';
import { manualSync } from '../services/syncService';
import { useAuth } from '../context/AuthContext';

export default function SettingsScreen({ navigation }: any) {
  const { signOut, user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleManualSync = async () => {
    setIsSyncing(true);
    const result = await manualSync();
    Alert.alert(result.success ? "Sync Complete" : "Sync Info", result.message);
    setIsSyncing(false);
  };

  // UPDATED: This function now passes the user.id to clearAllPredictions
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
            if (user) { // Check if user exists
              try {
                // Pass the user's ID to clear only their data
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
        {
          text: "Logout",
          style: "destructive",
          onPress: () => signOut(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>App Settings</Text>
      
      {user && <Text style={styles.emailText}>Logged in as: {user.email}</Text>}

      <TouchableOpacity 
        style={[styles.button, isSyncing && styles.buttonDisabled]} 
        onPress={handleManualSync}
        disabled={isSyncing}
      >
        {isSyncing ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Force Manual Sync</Text>}
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.button, styles.destructiveButton]} onPress={handleClearHistory}>
        <Text style={styles.buttonText}>Clear Local History</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>App Version: 1.0.0</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 20,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    emailText: {
        fontSize: 14,
        color: 'gray',
        textAlign: 'center',
        marginBottom: 25,
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 20,
        minHeight: 50,
        justifyContent: 'center'
    },
    buttonDisabled: {
        backgroundColor: '#a9a9a9',
    },
    destructiveButton: {
        backgroundColor: '#FF3B30',
    },
    logoutButton: {
        backgroundColor: '#6c757d'
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        marginTop: 'auto',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: '#aaa',
    },
});