import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Alert,
  ImageBackground,
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

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    console.log("Login attempt error:", JSON.stringify(error, null, 2));
    console.log("Login attempt data:", JSON.stringify(data, null, 2));

    if (error) Alert.alert('Error', error.message);
    setLoading(false);
  };

  return (
    <ImageBackground
      source={backgroundImg}
      style={styles.background}
      resizeMode="repeat"
    >
      <StatusBar barStyle="dark-content" translucent={true} backgroundColor="transparent" />
      <View style={styles.container}>
        <Card style={styles.card}>
          
          <View style={styles.logoContainer}>
            <Image source={logoImg} style={styles.logo} />
            <Heading style={styles.appName}>GoSevak</Heading>
          </View>

          <View style={styles.divider} />

          <Heading style={styles.header}>Welcome Back</Heading>

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

          <View style={styles.buttonContainer}>
            <PrimaryButton
              title={loading ? 'Logging In...' : 'Login'}
              onPress={handleLogin}
              disabled={loading}
            />

            <View style={{ height: 12 }} />

            <PrimaryButton
              title="Need An Account ? Sign Up !"
              onPress={() => navigation.navigate('SignUp')}
            />
          </View>
        </Card>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
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
    width: '90%',
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
  },
});