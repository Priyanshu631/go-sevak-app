import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Alert,
  ImageBackground,
  StatusBar,
} from 'react-native';
import { Card } from '../components/Card';
import { Heading } from '../components/Typography';
import { supabase } from '../lib/supabase';
import { theme } from '../theme/theme';
import { PrimaryButton } from '../components/Button';

const backgroundImg = require("../assets/bg.png");

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
          <Heading style={styles.header}>Welcome Back</Heading>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#7a5c48b7"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#7a5c48b7"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
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
  },
  header: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'serif',
    color: theme.colors.text,
  },
  input: {
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: 'serif',
    marginBottom: 15,
    color: theme.colors.text,
    backgroundColor: 'transparent',
  },
  buttonContainer: {
    marginTop: 10,
    width: '100%', // ensures buttons take full card width
  },
});
