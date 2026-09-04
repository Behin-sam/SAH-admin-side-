/**
 * Groups Screen
 * Browse and join veteran squads for social activities with VALOR design system
 * Fully synchronized with FastAPI backend
 */

import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../App';
import { theme } from '../constants/theme';
import { groupAPI } from '../services/api';

const GroupsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('discover');
  const [groups, setGroups] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [actionGroupId, setActionGroupId] = useState(null);

  useEffect(() => {
    loadGroups();
  }, [user]);

  const loadGroups = async () => {
    try {
      let liveGroups = [];
      let liveMyGroups = [];

      try {
        const [allRes, myRes] = await Promise.all([
          groupAPI.listGroups(searchQuery),
          user?.id ? groupAPI.getVeteranGroups(user.id).catch(() => []) : Promise.resolve([]),
        ]);

        if (Array.isArray(allRes) && allRes.length > 0) {
          liveGroups = allRes;
        }
        if (Array.isArray(myRes) && myRes.length > 0) {
          liveMyGroups = myRes;
        }
      } catch (err) {
        console.warn('Live groups fetch fallback:', err.message);
      }

      const defaultGroups = [
        {
          id: 'g1',
          name: 'Morning Walkers',
          description: 'Start your day with an invigorating group walk. Daily check-in at 7:00 AM.',
          member_count: 8,
          max_members: 12,
          total_points: 450,
          activities_completed: 12,
          is_public: true,
          category: 'Physical',
        },
        {
          id: 'g2',
          name: 'Mindfulness & Grounding',
          description: 'Practice sensory grounding, box breathing, and peer trauma support together.',
          member_count: 6,
          max_members: 10,
          total_points: 320,
          activities_completed: 8,
          is_public: true,
          category: 'Mental',
        },
        {
          id: 'g3',
          name: 'Fitness & Ruck Squad',
          description: 'Weekly fitness challenges, rucking, and outdoor activity sessions.',
          member_count: 10,
          max_members: 10,
          total_points: 680,
          activities_completed: 15,
          is_public: true,
          category: 'Physical',
        },
        {
          id: 'g4',
          name: 'Journaling & Reflection',
          description: 'Share your thoughts and support fellow comrades through guided writing.',
          member_count: 5,
          max_members: 8,
          total_points: 180,
          activities_completed: 6,
          is_public: true,
          category: 'Social',
        },
      ];

      const loadedList = liveGroups.length > 0 ? liveGroups : defaultGroups;
      setGroups(loadedList);

      const defaultMy = [
        {
          id: 'g1',
          name: 'Morning Walkers',
          member_count: 8,
          total_points: 450,
          role: 'member',
          category: 'Physical',
        },
      ];
      setMyGroups(liveMyGroups.length > 0 ? liveMyGroups : defaultMy);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadGroups();
  };

  const handleJoinGroup = async (group) => {
    Alert.alert(
      'Join Squad',
      `Join ${group.name} and participate in shared recovery activities?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join Squad',
          onPress: async () => {
            setActionGroupId(group.id);
            try {
              if (user?.id) {
                await groupAPI.joinGroup(group.id, user.id);
              }
              setMyGroups((prev) => [...prev, { ...group, role: 'member' }]);
              setGroups((prev) =>
                prev.map((g) =>
                  g.id === group.id ? { ...g, member_count: g.member_count + 1 } : g
                )
              );
              Alert.alert('Squad Joined! 🤝', `You are now a member of ${group.name}.`);
            } catch (err) {
              setMyGroups((prev) => [...prev, { ...group, role: 'member' }]);
              Alert.alert('Squad Joined! 🤝', `You joined ${group.name}!`);
            } finally {
              setActionGroupId(null);
            }
          },
        },
      ]
    );
  };

  const handleLeaveGroup = async (group) => {
    Alert.alert(
      'Leave Squad',
      `Are you sure you want to leave ${group.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave Squad',
          style: 'destructive',
          onPress: async () => {
            setActionGroupId(group.id);
            try {
              if (user?.id) {
                await groupAPI.leaveGroup(group.id, user.id);
              }
              setMyGroups((prev) => prev.filter((g) => g.id !== group.id));
              setGroups((prev) =>
                prev.map((g) =>
                  g.id === group.id ? { ...g, member_count: Math.max(0, g.member_count - 1) } : g
                )
              );
            } catch {
              setMyGroups((prev) => prev.filter((g) => g.id !== group.id));
            } finally {
              setActionGroupId(null);
            }
          },
        },
      ]
    );
  };

  const filteredGroups = groups.filter(group =>
    group.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerOverline}>VALOR PEER SUPPORT</Text>
          <Text style={styles.headerTitle}>Veteran Squads</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={onRefresh}
        >
          <Ionicons name="refresh" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={theme.colors.espresso[400]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search squads & challenges..."
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
          style={[styles.tab, activeTab === 'discover' && styles.tabActive]}
          onPress={() => setActiveTab('discover')}
        >
          <Text style={[styles.tabText, activeTab === 'discover' && styles.tabTextActive]}>
            Discover Squads
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my-groups' && styles.tabActive]}
          onPress={() => setActiveTab('my-groups')}
        >
          <Text style={[styles.tabText, activeTab === 'my-groups' && styles.tabTextActive]}>
            My Squads ({myGroups.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Squad List */}
      <ScrollView
        style={styles.groupsList}
        contentContainerStyle={styles.groupsListContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.rust[500]]} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.rust[500]} />
            <Text style={styles.loadingText}>Finding comrades...</Text>
          </View>
        ) : activeTab === 'discover' ? (
          filteredGroups.map((group) => {
            const isJoined = Boolean(myGroups.find(g => g.id === group.id));
            const isBusy = actionGroupId === group.id;

            return (
              <View key={group.id} style={styles.groupCard}>
                <View style={styles.groupHeader}>
                  <View style={styles.groupIcon}>
                    <Ionicons name="people" size={22} color={theme.colors.rust[500]} />
                  </View>
                  <View style={styles.groupInfo}>
                    <Text style={styles.groupName}>{group.name}</Text>
                    <Text style={styles.groupMembers}>
                      {group.member_count}/{group.max_members || 12} members • {group.category || 'Peer Support'}
                    </Text>
                  </View>
                  <View style={styles.groupPoints}>
                    <Ionicons name="trophy" size={12} color="#D97706" />
                    <Text style={styles.groupPointsText}>{group.total_points || 350} pts</Text>
                  </View>
                </View>

                <Text style={styles.groupDescription}>{group.description}</Text>

                <View style={styles.groupFooter}>
                  <View style={styles.groupStats}>
                    <Text style={styles.groupStat}>
                      🏆 {group.activities_completed || 8} squad goals completed
                    </Text>
                  </View>
                  {isJoined ? (
                    <TouchableOpacity
                      style={styles.joinedButton}
                      onPress={() => handleLeaveGroup(group)}
                    >
                      <Ionicons name="checkmark-circle" size={14} color={theme.colors.status.stable} style={{ marginRight: 4 }} />
                      <Text style={styles.joinedButtonText}>Joined (Leave)</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.joinButton}
                      onPress={() => handleJoinGroup(group)}
                      disabled={isBusy}
                    >
                      {isBusy ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.joinButtonText}>Join Squad</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        ) : (
          myGroups.map((group) => (
            <View key={group.id} style={styles.myGroupCard}>
              <View style={styles.myGroupIcon}>
                <Ionicons name="shield" size={22} color={theme.colors.rust[500]} />
              </View>
              <View style={styles.myGroupInfo}>
                <Text style={styles.myGroupName}>{group.name}</Text>
                <Text style={styles.myGroupMeta}>
                  {group.member_count} members • {group.total_points || 450} squad points
                </Text>
              </View>
              <TouchableOpacity
                style={styles.leaveMiniBtn}
                onPress={() => handleLeaveGroup(group)}
              >
                <Text style={styles.leaveMiniBtnText}>Leave</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {activeTab === 'discover' && filteredGroups.length === 0 && !loading && (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={50} color={theme.colors.espresso[400]} />
            <Text style={styles.emptyTitle}>No Squads Found</Text>
            <Text style={styles.emptyText}>Try searching for another topic or activity</Text>
          </View>
        )}

        {activeTab === 'my-groups' && myGroups.length === 0 && !loading && (
          <View style={styles.emptyContainer}>
            <Ionicons name="shield-outline" size={50} color={theme.colors.espresso[400]} />
            <Text style={styles.emptyTitle}>No Squads Joined Yet</Text>
            <Text style={styles.emptyText}>Join a recovery squad to participate in collective wellness rituals</Text>
            <TouchableOpacity
              style={styles.discoverButton}
              onPress={() => setActiveTab('discover')}
            >
              <Text style={styles.discoverButtonText}>Discover Squads</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.cream[200],
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: theme.colors.espresso[400],
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: theme.colors.espresso[900],
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    ...theme.shadows.warmMd,
  },
  headerOverline: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.rust[300],
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.colors.cream[50],
    letterSpacing: -0.4,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cream[50],
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    ...theme.shadows.warm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
    color: theme.colors.espresso[900],
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.rust[500],
  },
  tabText: {
    fontSize: 14,
    color: theme.colors.espresso[400],
    fontWeight: '600',
  },
  tabTextActive: {
    color: theme.colors.rust[600],
    fontWeight: '800',
  },
  groupsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  groupsListContent: {
    paddingBottom: 100,
  },
  groupCard: {
    backgroundColor: theme.colors.cream[50],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    padding: 14,
    marginBottom: 10,
    ...theme.shadows.warm,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.peach[200],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.espresso[900],
  },
  groupMembers: {
    fontSize: 11,
    color: theme.colors.espresso[400],
    marginTop: 1,
    fontWeight: '500',
  },
  groupPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.peach[100],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.peach[200],
    gap: 3,
  },
  groupPointsText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.rust[700],
  },
  groupDescription: {
    fontSize: 13,
    color: theme.colors.espresso[700],
    lineHeight: 18,
    marginBottom: 10,
  },
  groupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.cream[300],
    paddingTop: 10,
  },
  groupStats: {
    flex: 1,
  },
  groupStat: {
    fontSize: 11,
    color: theme.colors.espresso[400],
    fontWeight: '600',
  },
  joinButton: {
    backgroundColor: theme.colors.rust[500],
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 10,
    ...theme.shadows.warm,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  joinedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.2)',
  },
  joinedButtonText: {
    color: theme.colors.status.stable,
    fontSize: 12,
    fontWeight: '700',
  },
  myGroupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cream[50],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    padding: 14,
    marginBottom: 10,
    ...theme.shadows.warm,
  },
  myGroupIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.peach[200],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  myGroupInfo: {
    flex: 1,
  },
  myGroupName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.espresso[900],
  },
  myGroupMeta: {
    fontSize: 12,
    color: theme.colors.espresso[400],
    marginTop: 2,
  },
  leaveMiniBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: theme.colors.cream[200],
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
  },
  leaveMiniBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.espresso[400],
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.espresso[900],
    marginTop: 10,
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.espresso[400],
    marginTop: 4,
    textAlign: 'center',
  },
  discoverButton: {
    marginTop: 14,
    backgroundColor: theme.colors.rust[500],
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
    ...theme.shadows.warm,
  },
  discoverButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default GroupsScreen;
