import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator'; // Your main app (tabs)
import AuthNavigator from './src/navigation/AuthNavigator'; // Your login/signup stack

// This component listens to the AuthContext and decides which navigator to show.
const AppContent = () => {
  const { session } = useAuth();

  return (
    <NavigationContainer>
      {/* If a session and user exist, show the main app, otherwise show the login flow */}
      {session && session.user ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

// The root component wraps everything in the AuthProvider
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}