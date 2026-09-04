/**
 * Groups Screen
 * Browse and join veteran groups for social activities
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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const GroupsScreen = ({ navigation }) => {
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
      // Mock data for demo
      const mockGroups = [
        {
          id: 'g1',
          name: 'Morning Walkers',
          description: 'Start your day with a group walk. We meet every morning at 7 AM.',
          member_count: 8,
          max_members: 12,
          total_points: 450,
          activities_completed: 12,
          is_public: true,
        },
        {
          id: 'g2',
          name: 'Mindfulness Warriors',
          description: 'Practice mindfulness and meditation together.',
          member_count: 6,
          max_members: 10,
          total_points: 320,
          activities_completed: 8,
          is_public: true,
        },
        {
          id: 'g3',
          name: 'Fitness Buddies',
          description: 'Weekly fitness challenges and group workouts.',
          member_count: 10,
          max_members: 10,
          total_points: 680,
          activities_completed: 15,
          is_public: true,
        },
        {
          id: 'g4',
          name: 'Journaling Circle',
          description: 'Share your thoughts and support each other through writing.',
          member_count: 5,
          max_members: 8,
          total_points: 180,
          activities_completed: 6,
          is_public: true,
        },
      ];

      const mockMyGroups = [
        {
          id: 'g1',
          name: 'Morning Walkers',
          member_count: 8,
          total_points: 450,
          role: 'member',
        },
      ];

      setGroups(mockGroups);
      setMyGroups(mockMyGroups);
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
    Alert.alert(
      'Join Group',
      'Are you sure you want to join this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join',
          onPress: () => {
            // Add to my groups
            const group = groups.find(g => g.id === groupId);
            if (group && !myGroups.find(g => g.id === groupId)) {
              setMyGroups([...myGroups, { ...group, role: 'member' }]);
              Alert.alert('Success', `You've joined ${group.name}! 🎉`);
            }
          },
        },
      ]
    );
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Veteran Groups</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => Alert.alert('Create Group', 'Coming soon!')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search groups..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'discover' && styles.tabActive]}
          onPress={() => setActiveTab('discover')}
        >
          <Text style={[styles.tabText, activeTab === 'discover' && styles.tabTextActive]}>
            Discover
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my-groups' && styles.tabActive]}
          onPress={() => setActiveTab('my-groups')}
        >
          <Text style={[styles.tabText, activeTab === 'my-groups' && styles.tabTextActive]}>
            My Groups ({myGroups.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Groups List */}
      <ScrollView
        style={styles.groupsList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'discover' ? (
          filteredGroups.map((group) => (
            <View key={group.id} style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <View style={styles.groupIcon}>
                  <Ionicons name="people" size={24} color="#8b5cf6" />
                </View>
                <View style={styles.groupInfo}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupMembers}>
                    {group.member_count}/{group.max_members} members
                  </Text>
                </View>
                <View style={styles.groupPoints}>
                  <Ionicons name="trophy" size={16} color="#f59e0b" />
                  <Text style={styles.groupPointsText}>{group.total_points}</Text>
                </View>
              </View>

              <Text style={styles.groupDescription}>{group.description}</Text>

              <View style={styles.groupFooter}>
                <View style={styles.groupStats}>
                  <Text style={styles.groupStat}>
                    {group.activities_completed} activities completed
                  </Text>
                </View>
                {myGroups.find(g => g.id === group.id) ? (
                  <TouchableOpacity
                    style={styles.joinedButton}
                    onPress={() => navigation.navigate('GroupDetail', { groupId: group.id })}
                  >
                    <Text style={styles.joinedButtonText}>View Group</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.joinButton}
                    onPress={() => handleJoinGroup(group.id)}
                  >
                    <Text style={styles.joinButtonText}>Join</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        ) : (
          myGroups.map((group) => (
            <TouchableOpacity
              key={group.id}
              style={styles.myGroupCard}
              onPress={() => navigation.navigate('GroupDetail', { groupId: group.id })}
            >
              <View style={styles.myGroupIcon}>
                <Ionicons name="people" size={24} color="#8b5cf6" />
              </View>
              <View style={styles.myGroupInfo}>
                <Text style={styles.myGroupName}>{group.name}</Text>
                <Text style={styles.myGroupMeta}>
                  {group.member_count} members • {group.total_points} pts
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          ))
        )}

        {activeTab === 'discover' && filteredGroups.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No groups found</Text>
          </View>
        )}

        {activeTab === 'my-groups' && myGroups.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>You haven't joined any groups yet</Text>
            <TouchableOpacity
              style={styles.discoverButton}
              onPress={() => setActiveTab('discover')}
            >
              <Text style={styles.discoverButtonText}>Discover Groups</Text>
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
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1e3a5f',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#2563eb',
  },
  tabText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#2563eb',
  },
  groupsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  groupCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  groupMembers: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  groupPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  groupPointsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
    marginLeft: 4,
  },
  groupDescription: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  groupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupStats: {
    flex: 1,
  },
  groupStat: {
    fontSize: 12,
    color: '#6b7280',
  },
  joinButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  joinedButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  joinedButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  myGroupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  myGroupIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  myGroupInfo: {
    flex: 1,
  },
  myGroupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  myGroupMeta: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 12,
  },
  discoverButton: {
    marginTop: 16,
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  discoverButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default GroupsScreen;
