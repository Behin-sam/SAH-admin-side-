/**
 * Friends Screen
 * Connect with fellow veterans, view comrades roster, and launch direct messages.
 * VALOR Design System
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../App';
import { theme } from '../constants/theme';
import { friendsAPI } from '../services/api';

const FriendsScreen = ({ navigation }) => {
  const { user, updatePoints } = useAuth();
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'discover'
  const [friends, setFriends] = useState([]);
  const [discoverList, setDiscoverList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addingId, setAddingId] = useState(null);

  const vetId = user?.id || '550e8400-e29b-41d4-a716-446655440001';

  const loadData = useCallback(async () => {
    try {
      if (activeTab === 'friends') {
        const res = await friendsAPI.getFriends(vetId);
        setFriends(res?.friends || []);
      } else {
        const res = await friendsAPI.discoverVeterans(vetId, searchQuery);
        setDiscoverList(res?.veterans || []);
      }
    } catch (err) {
      console.warn('Friends load fallback:', err.message);
      if (activeTab === 'friends' && friends.length === 0) {
        setFriends([
          {
            id: '550e8400-e29b-41d4-a716-446655440002',
            rank: 'Maj. Kabir Singh',
            service_branch: 'Indian Air Force',
            total_points: 420,
            current_streak: 12,
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440003',
            rank: 'Sub. Arjun Das',
            service_branch: 'Indian Navy (MARCOS)',
            total_points: 180,
            current_streak: 3,
          },
        ]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [vetId, activeTab, searchQuery]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAddFriend = async (veteran) => {
    setAddingId(veteran.id);
    try {
      const res = await friendsAPI.addFriend(vetId, veteran.id);
      const points = res?.points_earned || 0;
      if (points > 0 && updatePoints) {
        await updatePoints(points);
      }
      const msg = points > 0
        ? `Added ${veteran.rank} as comrade! +${points} Valor Points awarded. 🤝`
        : `Added ${veteran.rank} as comrade!`;
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Comrade Connected', msg);
      }
      loadData();
    } catch (err) {
      console.warn('Add friend error:', err.message);
      if (Platform.OS === 'web') {
        window.alert('Comrade already added or connected!');
      } else {
        Alert.alert('Notice', 'Comrade already connected.');
      }
    } finally {
      setAddingId(null);
    }
  };

  const filteredFriends = friends.filter((f) => {
    const q = searchQuery.toLowerCase();
    return (
      (f.rank && f.rank.toLowerCase().includes(q)) ||
      (f.service_branch && f.service_branch.toLowerCase().includes(q))
    );
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerOverline}>VALOR PEER SUPPORT NETWORK</Text>
          <Text style={styles.headerTitle}>Comrades & Allies</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={theme.colors.espresso[400]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by rank or service branch..."
          placeholderTextColor={theme.colors.espresso[400]}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={theme.colors.espresso[400]} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
            My Comrades ({friends.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'discover' && styles.tabActive]}
          onPress={() => setActiveTab('discover')}
        >
          <Text style={[styles.tabText, activeTab === 'discover' && styles.tabTextActive]}>
            Discover Comrades
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.rust[500]]} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.rust[500]} />
            <Text style={styles.loadingText}>Syncing comrades network...</Text>
          </View>
        ) : activeTab === 'friends' ? (
          filteredFriends.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={theme.colors.cream[400]} />
              <Text style={styles.emptyTitle}>No comrades found</Text>
              <Text style={styles.emptySubtitle}>Explore the Discover tab to connect with other veterans.</Text>
              <TouchableOpacity style={styles.discoverBtn} onPress={() => setActiveTab('discover')}>
                <Text style={styles.discoverBtnText}>Discover Comrades</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredFriends.map((friend) => (
              <View key={friend.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.avatarCircle}>
                    <Ionicons name="shield" size={20} color="#fff" />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{friend.rank || 'Comrade'}</Text>
                    <Text style={styles.cardSubtitle}>{friend.service_branch || 'Indian Armed Forces'}</Text>
                    <View style={styles.statsRow}>
                      <Text style={styles.statItem}>🏆 {friend.total_points || 0} XP</Text>
                      <Text style={styles.statItem}>🔥 {friend.current_streak || 0}d streak</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    style={styles.messageBtn}
                    onPress={() => navigation.navigate('DM', { friendId: friend.id, friendName: friend.rank })}
                  >
                    <Ionicons name="chatbubble-ellipses" size={14} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.messageBtnText}>Direct Message</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
        ) : discoverList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color={theme.colors.cream[400]} />
            <Text style={styles.emptyTitle}>No other veterans found</Text>
          </View>
        ) : (
          discoverList.map((veteran) => {
            const isAlreadyFriend = friends.some((f) => f.id === veteran.id);
            const isAdding = addingId === veteran.id;
            return (
              <View key={veteran.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.avatarCircle, { backgroundColor: theme.colors.espresso[700] }]}>
                    <Ionicons name="person" size={20} color="#fff" />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{veteran.rank || 'Soldier'}</Text>
                    <Text style={styles.cardSubtitle}>{veteran.service_branch || 'Indian Armed Forces'}</Text>
                    <View style={styles.statsRow}>
                      <Text style={styles.statItem}>🏆 {veteran.total_points || 0} XP</Text>
                      <Text style={styles.statItem}>🔥 {veteran.current_streak || 0}d streak</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  {isAlreadyFriend ? (
                    <TouchableOpacity
                      style={[styles.messageBtn, { backgroundColor: theme.colors.cream[300] }]}
                      onPress={() => navigation.navigate('DM', { friendId: veteran.id, friendName: veteran.rank })}
                    >
                      <Ionicons name="chatbubble" size={14} color={theme.colors.espresso[800]} style={{ marginRight: 6 }} />
                      <Text style={[styles.messageBtnText, { color: theme.colors.espresso[800] }]}>Message Comrade</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.messageBtn, { backgroundColor: theme.colors.rust[600] }]}
                      onPress={() => handleAddFriend(veteran)}
                      disabled={isAdding}
                    >
                      {isAdding ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="person-add" size={14} color="#fff" style={{ marginRight: 6 }} />
                          <Text style={styles.messageBtnText}>Add Friend (+5 XP)</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.cream[100],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: theme.colors.cream[100],
  },
  headerOverline: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.rust[600],
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.colors.espresso[900],
  },
  refreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.espresso[800],
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 10,
    paddingHorizontal: 14,
    height: 42,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: theme.colors.espresso[900],
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: theme.colors.cream[200],
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabActive: {
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.espresso[400],
  },
  tabTextActive: {
    color: theme.colors.rust[600],
    fontWeight: '800',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  loadingContainer: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.espresso[400],
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.espresso[800],
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.espresso[400],
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 240,
  },
  discoverBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: theme.colors.rust[600],
  },
  discoverBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.cream[300],
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.rust[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.espresso[900],
  },
  cardSubtitle: {
    fontSize: 12,
    color: theme.colors.espresso[500],
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 12,
  },
  statItem: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.espresso[600],
  },
  cardFooter: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cream[200],
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.rust[500],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  messageBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
});

export default FriendsScreen;
