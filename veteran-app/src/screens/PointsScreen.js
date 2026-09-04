/**
 * Points Screen
 * Shows points balance, rewards, and leaderboard
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PointsScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [pointsData, setPointsData] = useState(null);

  useEffect(() => {
    loadPointsData();
  }, []);

  const loadPointsData = async () => {
    // Mock data for demo
    const mockData = {
      total_points: 250,
      current_streak: 5,
      longest_streak: 12,
      tasks_completed: 12,
      rewards: [
        { id: 'r1', name: 'Bronze Warrior', points_required: 100, earned: true, icon: '🎖️' },
        { id: 'r2', name: 'Silver Guardian', points_required: 250, earned: true, icon: '🛡️' },
        { id: 'r3', name: 'Gold Champion', points_required: 500, earned: false, icon: '🏆' },
        { id: 'r4', name: 'Platinum Legend', points_required: 1000, earned: false, icon: '👑' },
      ],
      recent_activity: [
        { points: 15, reason: 'Completed: Morning Walk', timestamp: new Date().toISOString() },
        { points: 10, reason: 'Completed: Breathing Exercise', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { points: 20, reason: 'Group Activity Bonus', timestamp: new Date(Date.now() - 86400000).toISOString() },
        { points: 25, reason: 'Created Group', timestamp: new Date(Date.now() - 172800000).toISOString() },
      ],
      leaderboard: [
        { rank: 1, name: 'Veteran Alpha', points: 520 },
        { rank: 2, name: 'You', points: 250, isCurrentUser: true },
        { rank: 3, name: 'Veteran Bravo', points: 180 },
        { rank: 4, name: 'Veteran Charlie', points: 150 },
        { rank: 5, name: 'Veteran Delta', points: 120 },
      ],
    };
    setPointsData(mockData);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPointsData();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return `${Math.floor(diff / 86400000)} days ago`;
  };

  if (!pointsData) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Points Header */}
      <View style={styles.header}>
        <View style={styles.pointsCircle}>
          <Text style={styles.pointsValue}>{pointsData.total_points}</Text>
          <Text style={styles.pointsLabel}>Total Points</Text>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="flame" size={24} color="#ef4444" />
            <Text style={styles.statValue}>{pointsData.current_streak}</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="trophy" size={24} color="#f59e0b" />
            <Text style={styles.statValue}>{pointsData.longest_streak}</Text>
            <Text style={styles.statLabel}>Best Streak</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="checkbox" size={24} color="#10b981" />
            <Text style={styles.statValue}>{pointsData.tasks_completed}</Text>
            <Text style={styles.statLabel}>Tasks Done</Text>
          </View>
        </View>
      </View>

      {/* Rewards Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rewards & Badges</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {pointsData.rewards.map((reward) => (
            <View
              key={reward.id}
              style={[styles.rewardCard, reward.earned && styles.rewardCardEarned]}
            >
              <Text style={styles.rewardIcon}>{reward.icon}</Text>
              <Text style={[styles.rewardName, reward.earned && styles.rewardNameEarned]}>
                {reward.name}
              </Text>
              <Text style={styles.rewardPoints}>{reward.points_required} pts</Text>
              {reward.earned ? (
                <View style={styles.earnedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                  <Text style={styles.earnedText}>Earned</Text>
                </View>
              ) : (
                <View style={styles.lockedBadge}>
                  <Ionicons name="lock-closed" size={16} color="#9ca3af" />
                  <Text style={styles.lockedText}>Locked</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Leaderboard */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Leaderboard</Text>
        <View style={styles.leaderboardContainer}>
          {pointsData.leaderboard.map((entry) => (
            <View
              key={entry.rank}
              style={[styles.leaderboardItem, entry.isCurrentUser && styles.leaderboardItemCurrentUser]}
            >
              <View style={[styles.rankBadge, entry.rank <= 3 && styles.rankBadgeTop]}>
                <Text style={[styles.rankText, entry.rank <= 3 && styles.rankTextTop]}>
                  #{entry.rank}
                </Text>
              </View>
              <View style={styles.leaderboardInfo}>
                <Text style={[styles.leaderboardName, entry.isCurrentUser && styles.leaderboardNameCurrentUser]}>
                  {entry.name}
                </Text>
                <Text style={styles.leaderboardPoints}>{entry.points} pts</Text>
              </View>
              {entry.isCurrentUser && (
                <Ionicons name="person" size={20} color="#2563eb" />
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Recent Activity */}
      <View style={[styles.section, styles.sectionLast]}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {pointsData.recent_activity.map((activity, index) => (
          <View key={index} style={styles.activityItem}>
            <View style={[styles.activityIcon, activity.points > 0 && styles.activityIconPositive]}>
              <Ionicons
                name={activity.points > 0 ? "add" : "remove"}
                size={16}
                color={activity.points > 0 ? "#10b981" : "#ef4444"}
              />
            </View>
            <View style={styles.activityInfo}>
              <Text style={styles.activityReason}>{activity.reason}</Text>
              <Text style={styles.activityTime}>{formatDate(activity.timestamp)}</Text>
            </View>
            <Text style={[styles.activityPoints, activity.points > 0 && styles.activityPointsPositive]}>
              +{activity.points}
            </Text>
          </View>
        ))}
      </View>
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
    backgroundColor: '#1e3a5f',
    padding: 20,
    paddingTop: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  pointsCircle: {
    alignItems: 'center',
    marginBottom: 20,
  },
  pointsValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  pointsLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionLast: {
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  rewardCard: {
    width: 140,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  rewardCardEarned: {
    borderWidth: 2,
    borderColor: '#10b981',
  },
  rewardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  rewardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  rewardNameEarned: {
    color: '#1f2937',
  },
  rewardPoints: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 8,
  },
  earnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  earnedText: {
    fontSize: 12,
    color: '#10b981',
    marginLeft: 4,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockedText: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 4,
  },
  leaderboardContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  leaderboardItemCurrentUser: {
    backgroundColor: '#eff6ff',
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankBadgeTop: {
    backgroundColor: '#fef3c7',
  },
  rankText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  rankTextTop: {
    color: '#f59e0b',
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  leaderboardNameCurrentUser: {
    fontWeight: 'bold',
    color: '#2563eb',
  },
  leaderboardPoints: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityIconPositive: {
    backgroundColor: '#d1fae5',
  },
  activityInfo: {
    flex: 1,
  },
  activityReason: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  activityTime: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  activityPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  activityPointsPositive: {
    color: '#10b981',
  },
});

export default PointsScreen;
