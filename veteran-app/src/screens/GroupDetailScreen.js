/**
 * Group Detail Screen
 * Shows group info, members, and activities
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const GroupDetailScreen = ({ route, navigation }) => {
  const { groupId } = route.params || {};
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [activeTab, setActiveTab] = useState('activities');

  useEffect(() => {
    loadGroupData();
  }, []);

  const loadGroupData = async () => {
    // Mock data for demo
    const mockGroup = {
      id: groupId || 'g1',
      name: 'Morning Walkers',
      description: 'Start your day with a group walk. We meet every morning at 7 AM.',
      member_count: 8,
      max_members: 12,
      total_points: 450,
      activities_completed: 12,
      activity_schedule: { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], time: '7:00 AM' },
    };

    const mockMembers = [
      { veteran_id: 'v1', role: 'admin', total_points: 320, current_streak: 12 },
      { veteran_id: 'v2', role: 'member', total_points: 180, current_streak: 5 },
      { veteran_id: 'v3', role: 'member', total_points: 95, current_streak: 3 },
      { veteran_id: 'v4', role: 'member', total_points: 210, current_streak: 8 },
    ];

    const mockActivities = [
      {
        id: 'a1',
        title: 'Morning Group Walk',
        description: 'Walk together in the park',
        scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        duration_minutes: 30,
        participants_count: 5,
        status: 'scheduled',
        points_per_participant: 20,
      },
      {
        id: 'a2',
        title: 'Weekend Nature Hike',
        description: 'Explore the trails together',
        scheduled_at: new Date(Date.now() + 604800000).toISOString(),
        duration_minutes: 120,
        participants_count: 8,
        status: 'scheduled',
        points_per_participant: 50,
      },
      {
        id: 'a3',
        title: 'Sunset Walk',
        description: 'Enjoy the sunset together',
        scheduled_at: new Date(Date.now() - 86400000).toISOString(),
        duration_minutes: 45,
        participants_count: 6,
        status: 'completed',
        points_per_participant: 25,
      },
    ];

    setGroup(mockGroup);
    setMembers(mockMembers);
    setActivities(mockActivities);
  };

  const handleJoinActivity = (activityId) => {
    Alert.alert('Join Activity', 'You have joined this activity! 🏃');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (!group) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Group Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="people" size={40} color="#8b5cf6" />
        </View>
        <Text style={styles.groupName}>{group.name}</Text>
        <Text style={styles.groupDescription}>{group.description}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{group.member_count}/{group.max_members}</Text>
            <Text style={styles.statLabel}>Members</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{group.total_points}</Text>
            <Text style={styles.statLabel}>Total Points</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{group.activities_completed}</Text>
            <Text style={styles.statLabel}>Activities</Text>
          </View>
        </View>

        {group.activity_schedule && (
          <View style={styles.scheduleContainer}>
            <Ionicons name="calendar" size={16} color="#6b7280" />
            <Text style={styles.scheduleText}>
              {group.activity_schedule.days.join(', ')} at {group.activity_schedule.time}
            </Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'activities' && styles.tabActive]}
          onPress={() => setActiveTab('activities')}
        >
          <Text style={[styles.tabText, activeTab === 'activities' && styles.tabTextActive]}>
            Activities
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'members' && styles.tabActive]}
          onPress={() => setActiveTab('members')}
        >
          <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>
            Members
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'activities' ? (
        <View style={styles.content}>
          {activities.map((activity) => (
            <View key={activity.id} style={styles.activityCard}>
              <View style={styles.activityHeader}>
                <View style={[styles.activityStatus, activity.status === 'completed' && styles.activityStatusCompleted]}>
                  <Text style={[styles.activityStatusText, activity.status === 'completed' && styles.activityStatusTextCompleted]}>
                    {activity.status}
                  </Text>
                </View>
                <Text style={styles.activityPoints}>+{activity.points_per_participant} pts</Text>
              </View>

              <Text style={styles.activityTitle}>{activity.title}</Text>
              <Text style={styles.activityDescription}>{activity.description}</Text>

              <View style={styles.activityMeta}>
                <View style={styles.activityMetaItem}>
                  <Ionicons name="time" size={14} color="#6b7280" />
                  <Text style={styles.activityMetaText}>{activity.duration_minutes} min</Text>
                </View>
                <View style={styles.activityMetaItem}>
                  <Ionicons name="people" size={14} color="#6b7280" />
                  <Text style={styles.activityMetaText}>{activity.participants_count} joined</Text>
                </View>
                <View style={styles.activityMetaItem}>
                  <Ionicons name="calendar" size={14} color="#6b7280" />
                  <Text style={styles.activityMetaText}>{formatDate(activity.scheduled_at)}</Text>
                </View>
              </View>

              {activity.status === 'scheduled' && (
                <TouchableOpacity
                  style={styles.joinActivityButton}
                  onPress={() => handleJoinActivity(activity.id)}
                >
                  <Text style={styles.joinActivityButtonText}>Join Activity</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.content}>
          {members.map((member, index) => (
            <View key={member.veteran_id} style={styles.memberCard}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberAvatarText}>V{index + 1}</Text>
              </View>
              <View style={styles.memberInfo}>
                <View style={styles.memberHeader}>
                  <Text style={styles.memberName}>Veteran {index + 1}</Text>
                  {member.role === 'admin' && (
                    <View style={styles.adminBadge}>
                      <Text style={styles.adminBadgeText}>Admin</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.memberMeta}>
                  {member.total_points} pts • {member.current_streak} day streak
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  groupName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  groupDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  scheduleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  scheduleText: {
    fontSize: 13,
    color: '#4b5563',
    marginLeft: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#8b5cf6',
  },
  tabText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#8b5cf6',
  },
  content: {
    padding: 16,
  },
  activityCard: {
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
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityStatus: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activityStatusCompleted: {
    backgroundColor: '#d1fae5',
  },
  activityStatusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#f59e0b',
    textTransform: 'capitalize',
  },
  activityStatusTextCompleted: {
    color: '#10b981',
  },
  activityPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  activityMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  activityMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  activityMetaText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  joinActivityButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  joinActivityButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4f46e5',
  },
  memberInfo: {
    flex: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  adminBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#f59e0b',
  },
  memberMeta: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
});

export default GroupDetailScreen;
