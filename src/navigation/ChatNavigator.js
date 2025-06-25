import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ChatListScreen from '../screens/ChatListScreen';
import ChatRoomScreen from '../screens/ChatRoomScreen';
import CreateChatRoomScreen from '../screens/CreateChatRoomScreen';

const Stack = createNativeStackNavigator();

const ChatNavigator = () => {
  return (
    <Stack.Navigator
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
      }}
    >
      <Stack.Screen
        name="ChatList"
        component={ChatListScreen}
        options={({ navigation }) => ({
          title: 'Chats',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('CreateChatRoom')}
              style={{ marginRight: 15 }}
            >
              <Ionicons name="create-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={({ route }) => ({
          title: route.params?.room?.name || 'Chat',
          headerBackTitle: 'Back',
        })}
      />
      <Stack.Screen
        name="CreateChatRoom"
        component={CreateChatRoomScreen}
        options={{
          title: 'New Chat',
          headerBackTitle: 'Back',
        }}
      />
    </Stack.Navigator>
  );
};

export default ChatNavigator; 