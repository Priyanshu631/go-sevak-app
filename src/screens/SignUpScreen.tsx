import React, { useState } from 'react';
import {
  View,
  TextInput,
  Alert,
  StyleSheet,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Image,
} from 'react-native';
import { Card } from '../components/Card';
import { Heading } from '../components/Typography';
import { supabase } from '../lib/supabase';
import { theme } from '../theme/theme';
import { PrimaryButton } from '../components/Button';

const backgroundImg = require("../assets/bg.png");
const logoImg = require("../assets/CowIcon.png");

export default function SignUpScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (password !== repeatPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) Alert.alert('Error', error.message);
    else Alert.alert('Success', 'Account created successfully! Please check your email for a confirmation link.');
    setLoading(false);
  };

  return (
    <ImageBackground
      source={backgroundImg}
      style={styles.background}
      resizeMode="repeat"
    >
      <StatusBar barStyle="dark-content" translucent={true} backgroundColor="transparent" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Card style={styles.card}>
            
            <View style={styles.logoContainer}>
              <Image source={logoImg} style={styles.logo} />
              <Heading style={styles.appName}>GoSevak</Heading>
            </View>

            <View style={styles.divider} />

            <Heading style={styles.header}>Create Account</Heading>

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#7a5c48b7"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              selectionColor={theme.colors.text} // Set cursor color
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#7a5c48b7"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              selectionColor={theme.colors.text} // Set cursor color
            />

            <TextInput
              style={styles.input}
              placeholder="Repeat Password"
              placeholderTextColor="#7a5c48b7"
              value={repeatPassword}
              onChangeText={setRepeatPassword}
              secureTextEntry
              selectionColor={theme.colors.text} // Set cursor color
            />

            <View style={styles.buttonContainer}>
              <PrimaryButton
                title={loading ? 'Creating Account...' : 'Sign Up'}
                onPress={handleSignUp}
                disabled={loading}
              />

              <PrimaryButton
                title="Already Have An Account? Login!"
                onPress={() => navigation.navigate('Login')}
              />
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  card: {
    width: '100%',
    padding: 20,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 15,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 8,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'serif',
    color: theme.colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    width: '80%',
    marginBottom: 15,
  },
  header: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'serif',
    color: theme.colors.text,
  },
  // --- REVERTED AND ENHANCED INPUT STYLE ---
  input: {
    height: 50, // Explicit height
    width: '100%', // Ensure it takes full width of the card
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 15, // Increased padding
    fontSize: 16,
    fontFamily: 'serif',
    marginBottom: 15,
    color: theme.colors.text,
    backgroundColor: 'transparent', // Ensure no default background is applied
  },
  // --- END OF STYLE CHANGE ---
  buttonContainer: {
    marginTop: 10,
    width: '100%',
    gap: 12,
  },
});