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
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.1.64:3000';

const UserSelectionScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/Chat/GetUsers`);
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('Failed to fetch users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    try {
      const currentUserId = await AsyncStorage.getItem('currentUserId');
      if (currentUserId) {
        navigation.replace('ChatList');
      }
    } catch (error) {
      console.error('Error checking current user:', error);
    }
  };

  const selectUser = async (user) => {
    try {
      await AsyncStorage.setItem('currentUserId', user.id.toString());
      await AsyncStorage.setItem('currentUserName', user.name);
      await AsyncStorage.setItem('currentUserImage', user.image || '');
      navigation.replace('ChatList');
    } catch (error) {
      console.error('Error setting user:', error);
      alert('Failed to select user');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
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
      <Text style={styles.title}>Select Your User</Text>
      <FlatList
        data={users}
        renderItem={({ item: user }) => (
          <TouchableOpacity
            style={styles.userItem}
            onPress={() => selectUser(user)}
          >
            <Image
              source={{
                uri: user.image || 'https://via.placeholder.com/50'
              }}
              style={styles.userAvatar}
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={item => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No users available</Text>
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
    padding: 15,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  userItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '500',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
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

export default UserSelectionScreen; 