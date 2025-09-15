import React, { useState } from 'react';
import { View, TextInput, Button, Alert, StyleSheet, Text } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
  setLoading(true);

  // Get the full response from Supabase
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  // --- ADD THESE LOGS FOR DEBUGGING ---
  console.log("Login attempt error:", JSON.stringify(error, null, 2));
  console.log("Login attempt data:", JSON.stringify(data, null, 2));
  // --- END OF DEBUGGING LOGS ---

  if (error) {
    Alert.alert('Error', error.message);
  }

  setLoading(false);
};

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Welcome Back</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Login" onPress={handleLogin} disabled={loading} />
      <View style={{ marginVertical: 10 }} />
      <Button title="Need an account? Sign Up" onPress={() => navigation.navigate('SignUp')} />
    </View>
  );
}
// Add the same styles as your previous AuthScreen
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: 'gray', padding: 10, borderRadius: 5, marginBottom: 15 },
});