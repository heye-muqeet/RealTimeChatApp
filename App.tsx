import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import ChatNavigator from './src/navigation/ChatNavigator';

// Enable screens
enableScreens();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <ChatNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}