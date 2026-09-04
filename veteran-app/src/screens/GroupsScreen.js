/**
 * Groups Screen
 * Browse, join, create, and manage veteran squads with persistent storage and backend sync.
 * VALOR Design System
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
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../App';
import { theme } from '../constants/theme';
import { groupAPI } from '../services/api';
import { storage } from '../services/storage';

const GroupsScreen = ({ navigation }) => {
  const { user, updatePoints } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeTab, setActiveTab] = useState('discover');
  const [groups, setGroups] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [actionGroupId, setActionGroupId] = useState(null);

  // Create Squad Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSquadName, setNewSquadName] = useState('');
  const [newSquadDesc, setNewSquadDesc] = useState('');
  const [newSquadCategory, setNewSquadCategory] = useState('Physical');
  const [creatingSquad, setCreatingSquad] = useState(false);

  const storageKey = user?.id ? `@sah_my_groups_${user.id}` : '@sah_my_groups_guest';

  useEffect(() => {
    loadCachedGroups();
    loadGroups();
  }, [user]);

  const loadCachedGroups = async () => {
    try {
      const cached = await storage.get(storageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMyGroups(parsed);
        }
      }
    } catch (e) {}
  };

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
        } else if (allRes?.groups) {
          liveGroups = allRes.groups;
        }

        if (Array.isArray(myRes) && myRes.length > 0) {
          liveMyGroups = myRes;
        } else if (myRes?.groups) {
          liveMyGroups = myRes.groups;
        }
      } catch (err) {
        console.warn('Live groups fetch fallback:', err.message);
      }

      if (liveGroups.length > 0) {
        setGroups(liveGroups);
      }

      if (liveMyGroups.length > 0) {
        setMyGroups(liveMyGroups);
        await storage.set(storageKey, JSON.stringify(liveMyGroups));
      }
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
    const doJoin = async () => {
      setActionGroupId(group.id);

      // Optimistic state & local storage update
      const updatedMy = [...myGroups.filter((g) => g.id !== group.id), { ...group, role: 'member' }];
      setMyGroups(updatedMy);
      await storage.set(storageKey, JSON.stringify(updatedMy));

      setGroups((prev) =>
        prev.map((g) =>
          g.id === group.id ? { ...g, member_count: (g.member_count || 0) + 1 } : g
        )
      );

      try {
        if (user?.id) {
          await groupAPI.joinGroup(group.id, user.id);
        }
        if (updatePoints) {
          await updatePoints(15);
        }
      } catch (err) {
        console.warn('Join group api fallback:', err);
      }

      const joinMsg = `You are now a member of ${group.name}.\n\n+15 Valor Points awarded! 🎉`;
      if (Platform.OS === 'web') {
        window.alert(`Squad Joined! 🤝\n\n${joinMsg}`);
      } else {
        Alert.alert('Squad Joined! 🤝', joinMsg);
      }
      setActionGroupId(null);
    };

    if (Platform.OS === 'web') {
      await doJoin();
    } else {
      Alert.alert(
        'Join Squad',
        `Join ${group.name}? You will gain access to group challenges and earn +15 Valor Points.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Join Squad', onPress: doJoin },
        ]
      );
    }
  };

  const handleLeaveGroup = async (group) => {
    const doLeave = async () => {
      setActionGroupId(group.id);

      // Optimistic removal & storage update
      const updatedMy = myGroups.filter((g) => g.id !== group.id);
      setMyGroups(updatedMy);
      await storage.set(storageKey, JSON.stringify(updatedMy));

      setGroups((prev) =>
        prev.map((g) =>
          g.id === group.id ? { ...g, member_count: Math.max(0, (g.member_count || 1) - 1) } : g
        )
      );

      try {
        if (user?.id) {
          await groupAPI.leaveGroup(group.id, user.id);
        }
      } catch (err) {
        console.warn('Leave group api fallback:', err);
      }

      if (Platform.OS === 'web') {
        window.alert(`You left ${group.name}.`);
      } else {
        Alert.alert('Squad Left', `You left ${group.name}.`);
      }
      setActionGroupId(null);
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm) {
        if (window.confirm(`Are you sure you want to leave ${group.name}?`)) {
          await doLeave();
        }
      } else {
        await doLeave();
      }
    } else {
      Alert.alert(
        'Leave Squad',
        `Are you sure you want to leave ${group.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Leave Squad', style: 'destructive', onPress: doLeave },
        ]
      );
    }
  };

  const handleCreateSquad = async () => {
    if (!newSquadName.trim()) {
      const msg = 'Please provide a squad name.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Missing Name', msg);
      return;
    }

    setCreatingSquad(true);
    try {
      const payload = {
        name: newSquadName.trim(),
        description: newSquadDesc.trim() || 'Veteran support and wellness recovery squad.',
        category: newSquadCategory,
        max_members: 50,
        is_public: true,
        created_by: user?.id || '550e8400-e29b-41d4-a716-446655440001',
      };

      const res = await groupAPI.createGroup(payload);
      const newGroupObj = {
        id: res?.id || `squad-${Date.now()}`,
        name: newSquadName.trim(),
        description: newSquadDesc.trim() || 'Veteran support and wellness recovery squad.',
        category: newSquadCategory,
        member_count: 1,
        max_members: 50,
        total_points: 0,
        activities_completed: 0,
        role: 'admin',
      };

      setGroups((prev) => [newGroupObj, ...prev]);
      const updatedMy = [newGroupObj, ...myGroups];
      setMyGroups(updatedMy);
      await storage.set(storageKey, JSON.stringify(updatedMy));

      if (updatePoints) {
        await updatePoints(25);
      }

      setShowCreateModal(false);
      setNewSquadName('');
      setNewSquadDesc('');

      const msg = `Squad '${newGroupObj.name}' has been created! You earned +25 Valor Points as squad founder.`;
      if (Platform.OS === 'web') window.alert(`Squad Commissioned! 🎖️\n\n${msg}`);
      else Alert.alert('Squad Commissioned! 🎖️', msg);
    } catch (err) {
      console.warn('Create squad error:', err);
    } finally {
      setCreatingSquad(false);
    }
  };

  const categories = ['All', 'Physical', 'Mental', 'Social'];

  const filteredGroups = groups.filter((group) => {
    const matchesSearch =
      group.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat =
      selectedCategory === 'All' ||
      (group.category && group.category.toLowerCase() === selectedCategory.toLowerCase());
    return matchesSearch && matchesCat;
  });

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerOverline}>VALOR PEER RECOVERY NETWORK</Text>
          <Text style={styles.headerTitle}>Veteran Squads</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.createHeaderBtn}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.createHeaderBtnText}>New Squad</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
            <Ionicons name="refresh" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={theme.colors.espresso[400]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search squads, challenges & groups..."
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

      {/* Category Pills */}
      <View style={styles.categoryRow}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.catPill, selectedCategory === cat && styles.catPillActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.catPillText, selectedCategory === cat && styles.catPillTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'discover' && styles.tabActive]}
          onPress={() => setActiveTab('discover')}
        >
          <Text style={[styles.tabText, activeTab === 'discover' && styles.tabTextActive]}>
            Discover Squads ({filteredGroups.length})
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

      {/* Main Squad List */}
      <ScrollView
        style={styles.groupsList}
        contentContainerStyle={styles.groupsListContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.rust[500]]} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.rust[500]} />
            <Text style={styles.loadingText}>Syncing comrades & squads...</Text>
          </View>
        ) : activeTab === 'discover' ? (
          filteredGroups.map((group) => {
            const isJoined = Boolean(myGroups.find((g) => g.id === group.id));
            const isBusy = actionGroupId === group.id;

            return (
              <View key={group.id} style={styles.groupCard}>
                {/* Tappable Card Body: Open Squad Hub */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('GroupDetail', { groupId: group.id, group })}
                >
                  <View style={styles.groupHeader}>
                    <View style={styles.groupIcon}>
                      <Ionicons name="shield-checkmark" size={22} color={theme.colors.rust[500]} />
                    </View>
                    <View style={styles.groupInfo}>
                      <View style={styles.titleRow}>
                        <Text style={styles.groupName}>{group.name}</Text>
                        <Ionicons name="chevron-forward" size={16} color={theme.colors.espresso[400]} />
                      </View>
                      <Text style={styles.groupMembers}>
                        {group.member_count}/{group.max_members || 100} members • {group.category || 'Peer Support'}
                      </Text>
                    </View>
                    <View style={styles.groupPoints}>
                      <Ionicons name="trophy" size={12} color="#D97706" />
                      <Text style={styles.groupPointsText}>{group.total_points || 450} pts</Text>
                    </View>
                  </View>

                  <Text style={styles.groupDescription}>{group.description}</Text>

                  <View style={styles.badgesRow}>
                    <View style={styles.hubBadge}>
                      <Ionicons name="chatbubbles-outline" size={12} color={theme.colors.rust[600]} />
                      <Text style={styles.hubBadgeText}>Squad Cheer Board</Text>
                    </View>
                    <View style={styles.hubBadge}>
                      <Ionicons name="calendar-outline" size={12} color={theme.colors.espresso[600]} />
                      <Text style={styles.hubBadgeText}>Active Challenges</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Card Actions Footer */}
                <View style={styles.groupFooter}>
                  <TouchableOpacity
                    style={styles.openHubBtn}
                    onPress={() => navigation.navigate('GroupDetail', { groupId: group.id, group })}
                  >
                    <Ionicons name="people" size={14} color={theme.colors.espresso[700]} />
                    <Text style={styles.openHubBtnText}>Squad Hub</Text>
                  </TouchableOpacity>

                  {isJoined ? (
                    <TouchableOpacity
                      style={styles.joinedButton}
                      onPress={() => handleLeaveGroup(group)}
                      disabled={isBusy}
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
                        <>
                          <Ionicons name="person-add" size={13} color="#fff" style={{ marginRight: 4 }} />
                          <Text style={styles.joinButtonText}>Join Squad</Text>
                        </>
                      )}
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
              activeOpacity={0.8}
              style={styles.myGroupCard}
              onPress={() => navigation.navigate('GroupDetail', { groupId: group.id, group })}
            >
              <View style={styles.myGroupIcon}>
                <Ionicons name="shield" size={24} color={theme.colors.rust[500]} />
              </View>
              <View style={styles.myGroupInfo}>
                <View style={styles.titleRow}>
                  <Text style={styles.myGroupName}>{group.name}</Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.espresso[400]} />
                </View>
                <Text style={styles.myGroupMeta}>
                  {group.member_count} members • {group.total_points || 450} squad points
                </Text>
                <Text style={styles.tapToOpen}>Tap to view challenges & cheer board →</Text>
              </View>
              <TouchableOpacity
                style={styles.leaveMiniBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  handleLeaveGroup(group);
                }}
              >
                <Text style={styles.leaveMiniBtnText}>Leave</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}

        {activeTab === 'discover' && filteredGroups.length === 0 && !loading && (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={50} color={theme.colors.espresso[400]} />
            <Text style={styles.emptyTitle}>No Squads Found</Text>
            <Text style={styles.emptyText}>Try searching for another topic or create your own squad</Text>
            <TouchableOpacity
              style={styles.discoverButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={styles.discoverButtonText}>+ Create Squad</Text>
            </TouchableOpacity>
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

      {/* Modal: Create New Squad */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalOverline}>COMMISSION SQUAD</Text>
                <Text style={styles.modalTitle}>Create Veteran Squad</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.espresso[600]} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Found a squad with fellow service members. Earn +25 Valor Points as founder.
            </Text>

            {/* Squad Name */}
            <Text style={styles.inputLabel}>Squad Name *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., Para SF Morning Walkers"
              placeholderTextColor={theme.colors.espresso[400]}
              value={newSquadName}
              onChangeText={setNewSquadName}
            />

            {/* Category Selector */}
            <Text style={styles.inputLabel}>Focus Category</Text>
            <View style={styles.modalCategoryRow}>
              {['Physical', 'Mental', 'Social'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.modalCatBtn,
                    newSquadCategory === cat && styles.modalCatBtnActive,
                  ]}
                  onPress={() => setNewSquadCategory(cat)}
                >
                  <Text
                    style={[
                      styles.modalCatBtnText,
                      newSquadCategory === cat && styles.modalCatBtnTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Squad Description */}
            <Text style={styles.inputLabel}>Squad Mission / Description</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="What is the mission of this squad? (e.g. Daily morning walks and trauma recovery support)"
              placeholderTextColor={theme.colors.espresso[400]}
              multiline
              numberOfLines={3}
              value={newSquadDesc}
              onChangeText={setNewSquadDesc}
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.createSubmitBtn, creatingSquad && { opacity: 0.6 }]}
              onPress={handleCreateSquad}
              disabled={creatingSquad}
            >
              {creatingSquad ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.createSubmitBtnText}>Commission Squad (+25 XP)</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cream[400],
  },
  headerOverline: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.rust[600],
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.espresso[900],
    fontFamily: theme.fonts.heading,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  createHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.rust[500],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  createHeaderBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  refreshBtn: {
    backgroundColor: theme.colors.espresso[900],
    padding: 8,
    borderRadius: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.espresso[900],
    fontWeight: '500',
  },
  categoryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
  },
  catPillActive: {
    backgroundColor: theme.colors.espresso[900],
    borderColor: theme.colors.espresso[900],
  },
  catPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.espresso[600],
  },
  catPillTextActive: {
    color: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: theme.colors.espresso[900],
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.espresso[500],
  },
  tabTextActive: {
    color: '#fff',
  },
  groupsList: {
    flex: 1,
  },
  groupsListContent: {
    padding: 16,
    gap: 12,
  },
  groupCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: theme.colors.cream[300],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupName: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.espresso[900],
  },
  groupMembers: {
    fontSize: 11,
    color: theme.colors.espresso[400],
    fontWeight: '600',
    marginTop: 2,
  },
  groupPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  groupPointsText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  groupDescription: {
    fontSize: 12,
    color: theme.colors.espresso[600],
    lineHeight: 18,
    marginBottom: 10,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  hubBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.cream[200],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  hubBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.espresso[700],
  },
  groupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cream[300],
  },
  openHubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: theme.colors.cream[200],
  },
  openHubBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.espresso[800],
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.rust[500],
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  joinedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cream[300],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinedButtonText: {
    color: theme.colors.espresso[700],
    fontSize: 12,
    fontWeight: '700',
  },
  myGroupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  myGroupIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.cream[300],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  myGroupInfo: {
    flex: 1,
  },
  myGroupName: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.espresso[900],
  },
  myGroupMeta: {
    fontSize: 11,
    color: theme.colors.espresso[500],
    marginTop: 2,
  },
  tapToOpen: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.rust[600],
    marginTop: 4,
  },
  leaveMiniBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    marginLeft: 8,
  },
  leaveMiniBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.espresso[900],
    marginTop: 12,
  },
  emptyText: {
    fontSize: 12,
    color: theme.colors.espresso[400],
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  discoverButton: {
    backgroundColor: theme.colors.rust[500],
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  discoverButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalOverline: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.rust[600],
    letterSpacing: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.espresso[900],
  },
  modalSubtitle: {
    fontSize: 12,
    color: theme.colors.espresso[500],
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.espresso[700],
    marginBottom: 4,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: theme.colors.cream[200],
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: theme.colors.espresso[900],
  },
  modalTextArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  modalCategoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  modalCatBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: theme.colors.cream[200],
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    alignItems: 'center',
  },
  modalCatBtnActive: {
    backgroundColor: theme.colors.espresso[900],
    borderColor: theme.colors.espresso[900],
  },
  modalCatBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.espresso[600],
  },
  modalCatBtnTextActive: {
    color: '#fff',
  },
  createSubmitBtn: {
    backgroundColor: theme.colors.rust[500],
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  createSubmitBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
});

export default GroupsScreen;
