import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import io from 'socket.io-client';

const API_URL = 'http://192.168.1.64:3000';
const socket = io(API_URL, {
  transports: ['websocket'],
  path: '/api/socketio'
});

const ChatListScreen = () => {
  const navigation = useNavigation();
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    checkCurrentUser();
    setupSocketListeners();

    return () => {
      socket.off('new_chat_room');
      socket.off('receive_message');
    };
  }, []);

  const checkCurrentUser = async () => {
    try {
      const userId = await AsyncStorage.getItem('currentUserId');
      const userName = await AsyncStorage.getItem('currentUserName');
      const userImage = await AsyncStorage.getItem('currentUserImage');

      if (!userId) {
        navigation.replace('UserSelection');
        return;
      }

      setCurrentUser({
        id: userId,
        name: userName,
        image: userImage
      });

      // Set up header buttons
      navigation.setOptions({
        headerLeft: () => (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleUserSwitch}
          >
            <Image
              source={{ uri: userImage || 'https://via.placeholder.com/30' }}
              style={styles.headerAvatar}
            />
            <Text style={styles.headerUserName}>{userName}</Text>
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('CreateChatRoom')}
          >
            <Ionicons name="create-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        )
      });

      fetchChatRooms(userId);
    } catch (error) {
      console.error('Error checking current user:', error);
      navigation.replace('UserSelection');
    }
  };

  const handleUserSwitch = () => {
    Alert.alert(
      'Switch User',
      'Do you want to switch to a different user?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Switch',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('currentUserId');
              await AsyncStorage.removeItem('currentUserName');
              await AsyncStorage.removeItem('currentUserImage');
              navigation.replace('UserSelection');
            } catch (error) {
              console.error('Error switching user:', error);
              Alert.alert('Error', 'Failed to switch user. Please try again.');
            }
          }
        }
      ]
    );
  };

  const setupSocketListeners = () => {
    socket.on('new_chat_room', (newRoom) => {
      setChatRooms(prev => [newRoom, ...prev]);
    });

    socket.on('receive_message', (message) => {
      setChatRooms(prev => {
        const updatedRooms = [...prev];
        const roomIndex = updatedRooms.findIndex(room => room.id === message.roomId);
        if (roomIndex !== -1) {
          updatedRooms[roomIndex].messages = [message];
          const [updatedRoom] = updatedRooms.splice(roomIndex, 1);
          updatedRooms.unshift(updatedRoom);
        }
        return updatedRooms;
      });
    });
  };

  const fetchChatRooms = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/Chat/GetRooms`, {
        headers: {
          'user-id': userId
        }
      });
      const data = await response.json();
      if (data.success) {
        setChatRooms(data.data);
      }
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
      Alert.alert('Error', 'Failed to fetch chat rooms. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (currentUser) {
      fetchChatRooms(currentUser.id);
    }
  };

  const navigateToChatRoom = (room) => {
    navigation.navigate('ChatRoom', { room, userId: currentUser.id });
  };

  const renderChatRoom = ({ item: room }) => {
    const lastMessage = room.messages[0]?.content || 'No messages yet';
    const otherParticipants = room.participants.filter(p => p.id !== currentUser?.id);
    const roomName = room.name || otherParticipants.map(p => p.name).join(', ');

    return (
      <TouchableOpacity
        style={styles.roomItem}
        onPress={() => navigateToChatRoom(room)}
      >
        <Image
          source={{
            uri: otherParticipants[0]?.image ||
              'https://via.placeholder.com/50'
          }}
          style={styles.avatar}
        />
        <View style={styles.roomInfo}>
          <Text style={styles.roomName}>{roomName}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {lastMessage}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={chatRooms}
        renderItem={renderChatRoom}
        keyExtractor={item => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No chat rooms yet</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
    padding: 5,
  },
  headerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  headerUserName: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  roomItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

export default ChatListScreen; 