import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.1.64:3000'; // Replace with your actual backend URL

const CreateChatRoomScreen = () => {
  const navigation = useNavigation();
  const [roomName, setRoomName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    try {
      const userId = await AsyncStorage.getItem('currentUserId');
      const userName = await AsyncStorage.getItem('currentUserName');
      
      if (!userId) {
        navigation.replace('UserSelection');
        return;
      }

      setCurrentUser({
        id: userId,
        name: userName
      });

      fetchUsers(userId);
    } catch (error) {
      console.error('Error checking current user:', error);
      Alert.alert('Error', 'Failed to get current user. Please try again.');
      navigation.goBack();
    }
  };

  const fetchUsers = async (currentUserId) => {
    try {
      const response = await fetch(`${API_URL}/Chat/GetUsers`, {
        headers: {
          'user-id': currentUserId
        }
      });
      const data = await response.json();
      if (data.success) {
        // Filter out the current user from the list
        const otherUsers = data.data.filter(user => user.id !== currentUserId);
        setUsers(otherUsers);
      } else {
        Alert.alert('Error', 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to fetch users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (currentUser) {
      fetchUsers(currentUser.id);
    }
  };

  const createRoom = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'No user selected');
      return;
    }

    if (!selectedUsers.length) {
      Alert.alert('Error', 'Please select at least one user');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/Chat/CreateRoom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: roomName.trim() || undefined,
          participantIds: [...selectedUsers.map(u => u.id), currentUser.id]
        })
      });

      const data = await response.json();
      if (data.success) {
        navigation.navigate('ChatRoom', { 
          room: data.data,
          userId: currentUser.id
        });
      } else {
        Alert.alert('Error', 'Failed to create chat room');
      }
    } catch (error) {
      console.error('Error creating chat room:', error);
      Alert.alert('Error', 'Failed to create chat room');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderUser = ({ item: user }) => {
    const isSelected = selectedUsers.some(u => u.id === user.id);

    return (
      <TouchableOpacity
        style={[styles.userItem, isSelected && styles.selectedUser]}
        onPress={() => toggleUserSelection(user)}
      >
        <Image
          source={{
            uri: user.image || 'https://via.placeholder.com/40'
          }}  
          style={styles.userAvatar}
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>
        {isSelected && (
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
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
      <TextInput
        style={styles.input}
        value={roomName}
        onChangeText={setRoomName}
        placeholder="Chat room name (optional)"
      />

      <TextInput
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search users..."
      />

      <Text style={styles.sectionTitle}>Select Participants</Text>

      <FlatList
        data={filteredUsers}
        renderItem={renderUser}
        keyExtractor={item => item.id.toString()}
        style={styles.userList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No users found' : 'No users available'}
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[
          styles.createButton,
          !selectedUsers.length && styles.createButtonDisabled
        ]}
        onPress={createRoom}
        disabled={!selectedUsers.length}
      >
        <Text style={styles.createButtonText}>
          Create Chat Room ({selectedUsers.length} selected)
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  searchInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  userList: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  selectedUser: {
    backgroundColor: '#e3efff',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 16,
  },
  createButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 15,
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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

export default CreateChatRoomScreen; 