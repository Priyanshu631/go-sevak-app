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
} from 'react-native';
import { Card } from '../components/Card';
import { Heading } from '../components/Typography';
import { supabase } from '../lib/supabase';
import { theme } from '../theme/theme';
import { PrimaryButton } from '../components/Button';

const backgroundImg = require("../assets/bg.png");

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
    else Alert.alert('Success', 'Please check your email for a confirmation link!');
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
            <Heading style={styles.header}>Create Account</Heading>

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#7a5c48b7"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#7a5c48b7"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TextInput
              style={styles.input}
              placeholder="Repeat Password"
              placeholderTextColor="#7a5c48b7"
              value={repeatPassword}
              onChangeText={setRepeatPassword}
              secureTextEntry
            />

            <View style={styles.buttonContainer}>
              <PrimaryButton
                title={loading ? 'Signing Up...' : 'Sign Up'}
                onPress={handleSignUp}
                disabled={loading}
              />

              <PrimaryButton
                title="Already Have An Account? Login Here!"
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
    gap: 12,
  },
});
