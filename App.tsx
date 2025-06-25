import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import UserSelectionScreen from './src/screens/UserSelectionScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import ChatRoomScreen from './src/screens/ChatRoomScreen';
import CreateChatRoomScreen from './src/screens/CreateChatRoomScreen';

// Enable screens
enableScreens();

type RootStackParamList = {
  UserSelection: undefined;
  ChatList: undefined;
  ChatRoom: {
    room: {
      id: string;
      name?: string;
    };
    userId: string;
  };
  CreateChatRoom: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="UserSelection"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#fff',
            },
            headerTitleStyle: {
              fontSize: 18,
              fontWeight: '600',
            },
            contentStyle: {
              backgroundColor: '#fff',
            },
            headerTitleAlign: 'center',
          }}
        >
          <Stack.Screen
            name="UserSelection"
            component={UserSelectionScreen}
            options={{
              headerShown: false
            }}
          />
          <Stack.Screen
            name="ChatList"
            component={ChatListScreen}
            options={{
              title: 'Chats',
              headerBackVisible: false,
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="ChatRoom"
            component={ChatRoomScreen}
            options={({ route }) => ({
              title: route.params.room.name || 'Chat',
              headerBackTitle: 'Back',
              headerShadowVisible: false,
            })}
          />
          <Stack.Screen
            name="CreateChatRoom"
            component={CreateChatRoomScreen}
            options={{
              title: 'New Chat',
              headerBackTitle: 'Back',
              headerShadowVisible: false,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}