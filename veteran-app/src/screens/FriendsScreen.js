/**
 * Friends Screen — Comrades & Peer Network
 * Full Request & Accept system (Zero points for adding friends)
 * 3 Tabs: Comrades (Accepted) | Requests (Incoming) | Discover (Send Requests)
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
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../App';
import { theme } from '../constants/theme';
import { friendsAPI } from '../services/api';

const AVATAR_COLORS = ['#8C4A1E', '#1E3A8A', '#065F46', '#92400E', '#5B21B6', '#374151'];

const FriendsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'requests' | 'discover'
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [discoverList, setDiscoverList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState(null);
  const [sentRequestIds, setSentRequestIds] = useState(new Set());

  const vetId = user?.id || '550e8400-e29b-41d4-a716-446655440001';

  const loadData = useCallback(async () => {
    try {
      if (activeTab === 'friends') {
        const res = await friendsAPI.getFriends(vetId);
        setFriends(res?.friends || []);
      } else if (activeTab === 'requests') {
        const res = await friendsAPI.getFriendRequests(vetId);
        setRequests(res?.requests || []);
      } else {
        const res = await friendsAPI.discoverVeterans(vetId, searchQuery);
        setDiscoverList(res?.veterans || []);
      }

      // Also silently load requests count for badge if on other tabs
      if (activeTab !== 'requests') {
        friendsAPI.getFriendRequests(vetId).then((r) => setRequests(r?.requests || [])).catch(() => {});
      }
    } catch (err) {
      console.warn('Friends load error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [vetId, activeTab, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSendRequest = async (veteran) => {
    setActingId(veteran.id);
    try {
      const res = await friendsAPI.sendFriendRequest(vetId, veteran.id);
      setSentRequestIds((prev) => new Set([...prev, veteran.id]));
      const msg = res?.message || 'Friend request sent!';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Request Sent', msg);
      }
      loadData();
    } catch (err) {
      const errDetail = err.response?.data?.detail || 'Could not send request';
      if (Platform.OS === 'web') {
        window.alert(errDetail);
      } else {
        Alert.alert('Notice', errDetail);
      }
    } finally {
      setActingId(null);
    }
  };

  const handleRespondRequest = async (requestId, action, senderRank) => {
    setActingId(requestId);
    try {
      const res = await friendsAPI.respondToFriendRequest(vetId, requestId, action);
      const msg = action === 'accept'
        ? `You and ${senderRank || 'Comrade'} are now allies! 🤝`
        : 'Request declined.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert(action === 'accept' ? 'Request Accepted' : 'Declined', msg);
      }
      loadData();
    } catch (err) {
      console.warn('Respond error:', err.message);
    } finally {
      setActingId(null);
    }
  };

  const handleRemoveFriend = (friend) => {
    const doRemove = async () => {
      try {
        await friendsAPI.removeFriend(vetId, friend.id);
        loadData();
      } catch (e) {
        console.warn('Remove friend error:', e);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Disconnect from ${friend.rank}?`)) {
        doRemove();
      }
    } else {
      Alert.alert(
        'Remove Comrade',
        `Are you sure you want to disconnect from ${friend.rank}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Disconnect', style: 'destructive', onPress: doRemove },
        ]
      );
    }
  };

  const filteredFriends = friends.filter((f) => {
    const q = searchQuery.toLowerCase();
    return (
      (f.name && f.name.toLowerCase().includes(q)) ||
      (f.rank && f.rank.toLowerCase().includes(q)) ||
      (f.service_branch && f.service_branch.toLowerCase().includes(q))
    );
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerOverline}>PEER SUPPORT SQUADRON</Text>
          <Text style={styles.headerTitle}>Comrades & Allies</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} activeOpacity={0.8}>
          <Ionicons name="refresh" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
          onPress={() => {
            setActiveTab('friends');
            setLoading(true);
          }}
        >
          <Ionicons
            name="people"
            size={14}
            color={activeTab === 'friends' ? theme.colors.rust[600] : theme.colors.espresso[400]}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
            Comrades ({friends.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
          onPress={() => {
            setActiveTab('requests');
            setLoading(true);
          }}
        >
          <Ionicons
            name="mail"
            size={14}
            color={activeTab === 'requests' ? theme.colors.rust[600] : theme.colors.espresso[400]}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
            Requests
          </Text>
          {requests.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{requests.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'discover' && styles.tabActive]}
          onPress={() => {
            setActiveTab('discover');
            setLoading(true);
          }}
        >
          <Ionicons
            name="compass"
            size={14}
            color={activeTab === 'discover' ? theme.colors.rust[600] : theme.colors.espresso[400]}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.tabText, activeTab === 'discover' && styles.tabTextActive]}>
            Discover
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input for Friends / Discover */}
      {activeTab !== 'requests' && (
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
      )}

      {/* Main List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.rust[500]]} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.rust[500]} />
            <Text style={styles.loadingText}>Syncing peer squadron...</Text>
          </View>
        ) : activeTab === 'friends' ? (
          filteredFriends.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="shield-half" size={52} color={theme.colors.cream[400]} />
              <Text style={styles.emptyTitle}>No comrades linked yet</Text>
              <Text style={styles.emptySubtitle}>
                Build your trusted recovery circle. Tap Discover to send friendship requests.
              </Text>
              <TouchableOpacity style={styles.discoverBtn} onPress={() => setActiveTab('discover')}>
                <Text style={styles.discoverBtnText}>Explore Veterans</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredFriends.map((friend, idx) => (
              <View key={friend.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.avatarCircle,
                      { backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length] },
                    ]}
                  >
                    <Text style={styles.avatarInitials}>
                      {(friend.name || friend.rank || 'CO').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{friend.name || friend.rank || 'Comrade'}</Text>
                    <Text style={styles.cardSubtitle}>{friend.name ? `${friend.rank} • ` : ''}{friend.service_branch || 'Indian Armed Forces'}</Text>
                    <View style={styles.statsRow}>
                      <View style={styles.statPill}>
                        <Ionicons name="trophy" size={11} color="#D97706" />
                        <Text style={styles.statItem}>{friend.total_points || 0} XP</Text>
                      </View>
                      <View style={styles.statPill}>
                        <Ionicons name="flame" size={11} color={theme.colors.rust[500]} />
                        <Text style={styles.statItem}>{friend.current_streak || 0}d streak</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    style={styles.disconnectBtn}
                    onPress={() => handleRemoveFriend(friend)}
                  >
                    <Ionicons name="person-remove-outline" size={14} color="#9CA3AF" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.messageBtn}
                    onPress={() => navigation.navigate('DM', { friendId: friend.id, friendName: friend.name || friend.rank })}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="chatbubbles" size={14} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.messageBtnText}>Direct Message</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
        ) : activeTab === 'requests' ? (
          requests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="mail-open-outline" size={52} color={theme.colors.cream[400]} />
              <Text style={styles.emptyTitle}>No pending requests</Text>
              <Text style={styles.emptySubtitle}>
                When fellow veterans invite you to connect, their requests will appear here.
              </Text>
            </View>
          ) : (
            requests.map((req, idx) => {
              const isBusy = actingId === req.request_id;
              return (
                <View key={req.request_id} style={[styles.card, styles.requestCard]}>
                  <View style={styles.cardHeader}>
                    <View
                      style={[
                        styles.avatarCircle,
                        { backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length] },
                      ]}
                    >
                      <Text style={styles.avatarInitials}>
                        {(req.name || req.rank || 'CO').slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>{req.name || req.rank || 'Comrade'}</Text>
                      <Text style={styles.cardSubtitle}>{req.name ? `${req.rank} • ` : ''}{req.service_branch || 'Armed Forces'}</Text>
                      <Text style={styles.requestedTimeText}>Wants to join your comrades squad</Text>
                    </View>
                  </View>

                  <View style={styles.requestActionRow}>
                    <TouchableOpacity
                      style={styles.declineBtn}
                      onPress={() => handleRespondRequest(req.request_id, 'reject', req.name || req.rank)}
                      disabled={isBusy}
                    >
                      <Text style={styles.declineBtnText}>Decline</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => handleRespondRequest(req.request_id, 'accept', req.name || req.rank)}
                      disabled={isBusy}
                    >
                      {isBusy ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark" size={16} color="#fff" style={{ marginRight: 4 }} />
                          <Text style={styles.acceptBtnText}>Accept Ally</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )
        ) : discoverList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={52} color={theme.colors.cream[400]} />
            <Text style={styles.emptyTitle}>No veterans found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your search criteria.</Text>
          </View>
        ) : (
          discoverList.map((veteran, idx) => {
            const isAlreadyFriend = friends.some((f) => f.id === veteran.id);
            const isSent = sentRequestIds.has(veteran.id);
            const isBusy = actingId === veteran.id;

            return (
              <View key={veteran.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.avatarCircle,
                      { backgroundColor: AVATAR_COLORS[(idx + 2) % AVATAR_COLORS.length] },
                    ]}
                  >
                    <Text style={styles.avatarInitials}>
                      {(veteran.name || veteran.rank || 'V').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{veteran.name || veteran.rank || 'Soldier'}</Text>
                    <Text style={styles.cardSubtitle}>{veteran.name ? `${veteran.rank} • ` : ''}{veteran.service_branch || 'Armed Forces'}</Text>
                    <View style={styles.statsRow}>
                      <View style={styles.statPill}>
                        <Ionicons name="trophy" size={11} color="#D97706" />
                        <Text style={styles.statItem}>{veteran.total_points || 0} XP</Text>
                      </View>
                      <View style={styles.statPill}>
                        <Ionicons name="flame" size={11} color={theme.colors.rust[500]} />
                        <Text style={styles.statItem}>{veteran.current_streak || 0}d streak</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  {isAlreadyFriend ? (
                    <TouchableOpacity
                      style={[styles.messageBtn, { backgroundColor: theme.colors.cream[400] }]}
                      onPress={() => navigation.navigate('DM', { friendId: veteran.id, friendName: veteran.name || veteran.rank })}
                    >
                      <Ionicons name="chatbubbles" size={14} color={theme.colors.espresso[800]} style={{ marginRight: 6 }} />
                      <Text style={[styles.messageBtnText, { color: theme.colors.espresso[800] }]}>Chat</Text>
                    </TouchableOpacity>
                  ) : isSent ? (
                    <View style={styles.pendingBadge}>
                      <Ionicons name="time-outline" size={14} color="#D97706" style={{ marginRight: 4 }} />
                      <Text style={styles.pendingBadgeText}>Request Sent</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.addFriendBtn}
                      onPress={() => handleSendRequest(veteran)}
                      disabled={isBusy}
                      activeOpacity={0.85}
                    >
                      {isBusy ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="person-add" size={14} color="#fff" style={{ marginRight: 6 }} />
                          <Text style={styles.addFriendBtnText}>Send Request</Text>
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
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerOverline: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.rust[600],
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    marginTop: 2,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 14,
    padding: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 11,
    position: 'relative',
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  tabTextActive: {
    color: theme.colors.rust[600],
    fontWeight: '800',
  },
  tabBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 14,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#111827',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  discoverBtn: {
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.colors.rust[600],
  },
  discoverBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  requestCard: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFDF9',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  requestedTimeText: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '600',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  statItem: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  cardFooter: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  disconnectBtn: {
    padding: 8,
    borderRadius: 8,
  },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.rust[600],
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  messageBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  addFriendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  addFriendBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  pendingBadgeText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '700',
  },
  requestActionRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  declineBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  declineBtnText: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '700',
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#059669',
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});

export default FriendsScreen;
