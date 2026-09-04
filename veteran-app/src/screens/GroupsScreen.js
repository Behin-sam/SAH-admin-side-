/**
 * Groups Screen
 * Browse and join veteran groups for social activities with VALOR design system
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

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      let liveGroups = null;
      try {
        const res = await groupAPI.listGroups(searchQuery);
        if (Array.isArray(res) && res.length > 0) {
          liveGroups = res;
        }
      } catch (err) {
        console.warn('Live groups fetch failed, using fallback:', err.message);
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

      const loadedList = liveGroups || defaultGroups;
      setGroups(loadedList);

      setMyGroups([
        {
          id: 'g1',
          name: 'Morning Walkers',
          member_count: 8,
          total_points: 450,
          role: 'member',
          category: 'Physical',
        },
      ]);
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

  const handleJoinGroup = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    Alert.alert(
      'Join Squad',
      `Join ${group.name} and earn squad recovery points together?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join Squad',
          onPress: async () => {
            if (user?.id) {
              try {
                await groupAPI.joinGroup(groupId, user.id);
              } catch (e) {
                console.warn('API join group:', e.message);
              }
            }
            if (!myGroups.find(g => g.id === groupId)) {
              setMyGroups([...myGroups, { ...group, role: 'member' }]);
              Alert.alert('Squad Joined', `Welcome to ${group.name}! 🎉`);
            }
          },
        },
      ]
    );
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerOverline}>VALOR COMMUNITY</Text>
          <Text style={styles.headerTitle}>Veteran Squads</Text>
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => Alert.alert('Create Squad', 'Squad creation is managed with clinical approval for safety.')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.espresso[400]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search squads & activities..."
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

      {/* Groups List */}
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
            return (
              <View key={group.id} style={styles.groupCard}>
                <View style={styles.groupHeader}>
                  <View style={styles.groupIcon}>
                    <Ionicons name="people" size={24} color={theme.colors.rust[500]} />
                  </View>
                  <View style={styles.groupInfo}>
                    <Text style={styles.groupName}>{group.name}</Text>
                    <Text style={styles.groupMembers}>
                      {group.member_count}/{group.max_members} members • {group.category || 'Peer Support'}
                    </Text>
                  </View>
                  <View style={styles.groupPoints}>
                    <Ionicons name="trophy" size={14} color="#D97706" />
                    <Text style={styles.groupPointsText}>{group.total_points} pts</Text>
                  </View>
                </View>

                <Text style={styles.groupDescription}>{group.description}</Text>

                <View style={styles.groupFooter}>
                  <View style={styles.groupStats}>
                    <Text style={styles.groupStat}>
                      🏆 {group.activities_completed || 0} group challenges done
                    </Text>
                  </View>
                  {isJoined ? (
                    <TouchableOpacity
                      style={styles.joinedButton}
                      onPress={() => Alert.alert(group.name, `Active squad with ${group.member_count} members.`)}
                    >
                      <Ionicons name="checkmark" size={14} color={theme.colors.status.stable} style={{ marginRight: 4 }} />
                      <Text style={styles.joinedButtonText}>Joined</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.joinButton}
                      onPress={() => handleJoinGroup(group.id)}
                    >
                      <Text style={styles.joinButtonText}>Join Squad</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        ) : (
          myGroups.map((group) => (
            <TouchableOpacity
              key={group.id}
              style={styles.myGroupCard}
              onPress={() => Alert.alert(group.name, `You are an active member of ${group.name}.`)}
            >
              <View style={styles.myGroupIcon}>
                <Ionicons name="shield" size={24} color={theme.colors.rust[500]} />
              </View>
              <View style={styles.myGroupInfo}>
                <Text style={styles.myGroupName}>{group.name}</Text>
                <Text style={styles.myGroupMeta}>
                  {group.member_count} members • {group.total_points} squad pts
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.espresso[400]} />
            </TouchableOpacity>
          ))
        )}

        {activeTab === 'discover' && filteredGroups.length === 0 && !loading && (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={60} color={theme.colors.espresso[400]} />
            <Text style={styles.emptyTitle}>No Squads Found</Text>
            <Text style={styles.emptyText}>Try adjusting your search terms</Text>
          </View>
        )}

        {activeTab === 'my-groups' && myGroups.length === 0 && !loading && (
          <View style={styles.emptyContainer}>
            <Ionicons name="shield-outline" size={60} color={theme.colors.espresso[400]} />
            <Text style={styles.emptyTitle}>No Squads Joined Yet</Text>
            <Text style={styles.emptyText}>Join a recovery squad to boost wellness together</Text>
            <TouchableOpacity
              style={styles.discoverButton}
              onPress={() => setActiveTab('discover')}
            >
              <Text style={styles.discoverButtonText}>Browse Squads</Text>
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
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.espresso[400],
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    backgroundColor: theme.colors.espresso[900],
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...theme.shadows.warmMd,
  },
  headerOverline: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.rust[300],
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.cream[50],
    letterSpacing: -0.5,
  },
  createButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.rust[500],
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.rustGlow,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cream[50],
    margin: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    ...theme.shadows.warm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 15,
    color: theme.colors.espresso[900],
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.rust[500],
  },
  tabText: {
    fontSize: 15,
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
    paddingBottom: 110,
  },
  groupCard: {
    backgroundColor: theme.colors.cream[50],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.warm,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.peach[200],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.espresso[900],
  },
  groupMembers: {
    fontSize: 12,
    color: theme.colors.espresso[400],
    marginTop: 2,
    fontWeight: '500',
  },
  groupPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.peach[100],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.peach[200],
  },
  groupPointsText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.rust[700],
    marginLeft: 4,
  },
  groupDescription: {
    fontSize: 14,
    color: theme.colors.espresso[700],
    lineHeight: 20,
    marginBottom: 12,
  },
  groupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.cream[300],
    paddingTop: 12,
  },
  groupStats: {
    flex: 1,
  },
  groupStat: {
    fontSize: 12,
    color: theme.colors.espresso[400],
    fontWeight: '600',
  },
  joinButton: {
    backgroundColor: theme.colors.rust[500],
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
    ...theme.shadows.warm,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  joinedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.2)',
  },
  joinedButtonText: {
    color: theme.colors.status.stable,
    fontSize: 13,
    fontWeight: '700',
  },
  myGroupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cream[50],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.warm,
  },
  myGroupIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.peach[200],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  myGroupInfo: {
    flex: 1,
  },
  myGroupName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.espresso[900],
  },
  myGroupMeta: {
    fontSize: 13,
    color: theme.colors.espresso[400],
    marginTop: 3,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.espresso[900],
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.espresso[400],
    marginTop: 4,
    textAlign: 'center',
  },
  discoverButton: {
    marginTop: 16,
    backgroundColor: theme.colors.rust[500],
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 10,
    ...theme.shadows.warm,
  },
  discoverButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default GroupsScreen;
