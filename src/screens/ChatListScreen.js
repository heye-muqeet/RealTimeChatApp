import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import io from 'socket.io-client';

const API_URL = 'http://192.168.1.64:3000'; // Replace with your actual backend URL
const socket = io(API_URL, {
  transports: ['websocket'],
  path: '/api/socketio'
});

const ChatListScreen = () => {
  const navigation = useNavigation();
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const userId = '1'; // Replace with actual user ID from your auth system

  useEffect(() => {
    fetchChatRooms();
    setupSocketListeners();

    return () => {
      socket.off('new_chat_room');
      socket.off('receive_message');
    };
  }, []);

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
          // Move the updated room to the top
          const [updatedRoom] = updatedRooms.splice(roomIndex, 1);
          updatedRooms.unshift(updatedRoom);
        }
        return updatedRooms;
      });
    });
  };

  const fetchChatRooms = async () => {
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
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchChatRooms();
  };

  const navigateToChatRoom = (room) => {
    navigation.navigate('ChatRoom', { room, userId });
  };

  const renderChatRoom = ({ item: room }) => {
    const lastMessage = room.messages[0]?.content || 'No messages yet';
    const otherParticipants = room.participants.filter(p => p.id !== userId);
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
        <ActivityIndicator size="large" color="#0000ff" />
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