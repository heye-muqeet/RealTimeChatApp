import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import io from 'socket.io-client';

const API_URL = 'http://192.168.1.64:3000';

let socket;
try {
  socket = io(API_URL, {
    transports: ['websocket'],
    path: '/api/socketio',
    reconnection: true,
    reconnectionAttempts: 5,	
    reconnectionDelay: 1000,
    timeout: 10000,
    forceNew: true
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    Alert.alert(
      'Connection Error',
      'Failed to connect to chat server. Please check your internet connection and try again.',
      [{ text: 'OK' }]
    );
  });

  socket.on('connect', () => {
    console.log('Socket connected successfully');
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

} catch (error) {
  console.error('Socket initialization error:', error);
}

const ChatRoomScreen = () => {
  const route = useRoute();
  const { room, userId } = route.params;
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    // Check socket connection
    const checkConnection = () => {
      const isConnected = socket?.connected;
      console.log('Socket connection status:', isConnected);
      setSocketConnected(isConnected);
      
      if (!isConnected && socket) {
        console.log('Attempting to reconnect...');
        socket.connect();
      }
    };

    checkConnection();
    const connectionInterval = setInterval(checkConnection, 5000);

    // Join room
    if (socket?.connected) {
      console.log('Joining room:', room.id);
      socket.emit('join_room', room.id);
    }

    fetchMessages();
    setupSocketListeners();

    return () => {
      clearInterval(connectionInterval);
      if (socket?.connected) {
        console.log('Leaving room:', room.id);
        socket.emit('leave_room', room.id);
      }
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (socket) {
      socket.off('receive_message');
      socket.off('user_typing');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const setupSocketListeners = () => {
    if (!socket) {
      console.error('Socket not initialized');
      return;
    }

    socket.on('receive_message', (newMessage) => {
      console.log('Received message:', newMessage);
      if (newMessage.roomId === room.id) {
        setMessages(prev => [newMessage, ...prev]);
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }
    });

    socket.on('user_typing', ({ userId: typingUserId, isTyping }) => {
      console.log('User typing status:', { typingUserId, isTyping });
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (isTyping) {
          newSet.add(typingUserId);
        } else {
          newSet.delete(typingUserId);
        }
        return newSet;
      });
    });
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(
        `${API_URL}/Chat/GetMessages?roomId=${room.id}&page=${page}&limit=20`
      );
      const data = await response.json();

      if (data.success) {
        if (page === 1) {
          setMessages(data.data.messages);
        } else {
          setMessages(prev => [...prev, ...data.data.messages]);
        }
        setHasMore(data.data.pagination.currentPage < data.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      setPage(prev => prev + 1);
      fetchMessages();
    }
  };

  const sendMessage = () => {
    if (!socket?.connected) {
      Alert.alert(
        'Connection Error',
        'Not connected to chat server. Please wait while we try to reconnect.',
        [{ text: 'OK' }]
      );
      return;
    }

    const trimmedMessage = messageText.trim();
    if (trimmedMessage) {
      console.log('Sending message:', {
        roomId: room.id,
        senderId: userId,
        message: trimmedMessage
      });
      
      // Clear the input immediately for better UX
      setMessageText('');
      
      socket.emit('send_message', {
        roomId: room.id,
        senderId: userId,
        message: trimmedMessage
      }, (acknowledgement) => {
        if (acknowledgement?.error) {
          console.error('Message send error:', acknowledgement.error);
          Alert.alert('Error', 'Failed to send message. Please try again.');
          // Restore the message text if sending failed
          setMessageText(trimmedMessage);
        } else {
          console.log('Message sent successfully');
        }
      });
    }
  };

  const handleTyping = (text) => {
    setMessageText(text);

    if (socket?.connected) {
      socket.emit('typing', {
        roomId: room.id,
        userId,
        isTyping: text.length > 0
      });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', {
          roomId: room.id,
          userId,
          isTyping: false
        });
      }, 1000);
    }
  };

  const renderMessage = ({ item: message }) => {
    const isOwnMessage = message.senderId === userId;

    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        {!isOwnMessage && (
          <Image
            source={{
              uri: message.sender?.image ||
                'https://via.placeholder.com/30'
            }}
            style={styles.messageAvatar}
          />
        )}
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownBubble : styles.otherBubble
        ]}>
          {!isOwnMessage && (
            <Text style={styles.messageSender}>
              {message.sender?.name}
            </Text>
          )}
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {message.content}
          </Text>
          <Text style={styles.messageTime}>
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      </View>
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id.toString()}
        inverted
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color="#0000ff" />
          ) : null
        }
      />

      {typingUsers.size > 0 && (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>
            {Array.from(typingUsers).map(typingUserId => {
              const user = room.participants.find(p => p.id === typingUserId);
              return user?.name || 'Someone';
            }).join(', ')} is typing...
          </Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={messageText}
          onChangeText={handleTyping}
          placeholder="Type a message..."
          multiline
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !messageText.trim() && styles.sendButtonDisabled
          ]}
          onPress={sendMessage}
          disabled={!messageText.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContainer: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'flex-end',
  },
  ownMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 20,
  },
  ownBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 5,
  },
  otherBubble: {
    backgroundColor: '#E8E8E8',
    borderBottomLeftRadius: 5,
  },
  messageSender: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#000',
  },
  messageTime: {
    fontSize: 10,
    color: '#888',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  typingContainer: {
    padding: 5,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  typingText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default ChatRoomScreen; 