/**
 * Points Screen
 * Shows points balance, rewards, and leaderboard with VALOR design system
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../App';
import { theme } from '../constants/theme';
import { veteranAPI } from '../services/api';

const PointsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pointsData, setPointsData] = useState(null);

  useEffect(() => {
    loadPointsData();
  }, [user]);

  const loadPointsData = async () => {
    try {
      let stats = null;
      if (user?.id) {
        try {
          const res = await veteranAPI.getStats(user.id);
          if (res) stats = res;
        } catch (e) {
          console.warn('Could not fetch live stats, using fallback:', e.message);
        }
      }

      const totalPoints = stats?.total_points ?? user?.total_points ?? 250;
      const streak = stats?.current_streak ?? user?.current_streak ?? 5;
      const tasksCompleted = stats?.tasks_completed ?? user?.tasks_completed ?? 12;

      const data = {
        total_points: totalPoints,
        current_streak: streak,
        longest_streak: Math.max(streak, 12),
        tasks_completed: tasksCompleted,
        rewards: [
          { id: 'r1', name: 'Bronze Warrior', points_required: 100, earned: totalPoints >= 100, icon: '🎖️' },
          { id: 'r2', name: 'Silver Guardian', points_required: 250, earned: totalPoints >= 250, icon: '🛡️' },
          { id: 'r3', name: 'Gold Champion', points_required: 500, earned: totalPoints >= 500, icon: '🏆' },
          { id: 'r4', name: 'Platinum Legend', points_required: 1000, earned: totalPoints >= 1000, icon: '👑' },
        ],
        recent_activity: [
          { points: 15, reason: 'Completed: Morning Walk', timestamp: new Date().toISOString() },
          { points: 10, reason: 'Completed: Breathing Exercise', timestamp: new Date(Date.now() - 3600000).toISOString() },
          { points: 20, reason: 'Group Activity Bonus', timestamp: new Date(Date.now() - 86400000).toISOString() },
          { points: 25, reason: 'Wellness Check-In', timestamp: new Date(Date.now() - 172800000).toISOString() },
        ],
        leaderboard: [
          { rank: 1, name: 'Capt. Vikram Rathore', points: Math.max(520, totalPoints + 50) },
          { rank: 2, name: user?.name ? `${user.name} (You)` : 'You', points: totalPoints, isCurrentUser: true },
          { rank: 3, name: 'Maj. Kabir Singh', points: Math.max(180, totalPoints - 40) },
          { rank: 4, name: 'Sub. Arjun Das', points: 150 },
          { rank: 5, name: 'Hav. Rajesh Kumar', points: 120 },
        ],
      };

      setPointsData(data);
    } catch (err) {
      console.error('Error loading points data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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

  if (loading && !pointsData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.rust[500]} />
        <Text style={styles.loadingText}>Loading Valor Points...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.rust[500]]} />}
    >
      {/* Points Header with Warm Espresso & Rust styling */}
      <View style={styles.header}>
        <View style={styles.pointsCircle}>
          <View style={styles.badgePill}>
            <Text style={styles.badgePillText}>HONOR & MILESTONES</Text>
          </View>
          <Text style={styles.pointsValue}>{pointsData.total_points}</Text>
          <Text style={styles.pointsLabel}>Total Valor Points</Text>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={styles.statIconCircle}>
              <Ionicons name="flame" size={20} color={theme.colors.rust[500]} />
            </View>
            <Text style={styles.statValue}>{pointsData.current_streak} days</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>
          <View style={styles.statItem}>
            <View style={styles.statIconCircle}>
              <Ionicons name="trophy" size={20} color="#D97706" />
            </View>
            <Text style={styles.statValue}>{pointsData.longest_streak} days</Text>
            <Text style={styles.statLabel}>Best Streak</Text>
          </View>
          <View style={styles.statItem}>
            <View style={styles.statIconCircle}>
              <Ionicons name="shield-checkmark" size={20} color={theme.colors.status.stable} />
            </View>
            <Text style={styles.statValue}>{pointsData.tasks_completed}</Text>
            <Text style={styles.statLabel}>Tasks Done</Text>
          </View>
        </View>
      </View>

      {/* Rewards Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rewards & Badges</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rewardsScroll}>
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
                  <Ionicons name="checkmark-circle" size={14} color={theme.colors.status.stable} />
                  <Text style={styles.earnedText}>Earned</Text>
                </View>
              ) : (
                <View style={styles.lockedBadge}>
                  <Ionicons name="lock-closed" size={14} color={theme.colors.espresso[400]} />
                  <Text style={styles.lockedText}>Locked</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Leaderboard */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cohort Standings</Text>
        <View style={styles.leaderboardContainer}>
          {pointsData.leaderboard.map((entry) => (
            <View
              key={entry.rank}
              style={[styles.leaderboardItem, entry.isCurrentUser && styles.leaderboardItemCurrentUser]}
            >
              <View style={[styles.rankBadge, entry.rank <= 3 && styles.rankBadgeTop, entry.isCurrentUser && styles.rankBadgeCurrentUser]}>
                <Text style={[styles.rankText, entry.rank <= 3 && styles.rankTextTop, entry.isCurrentUser && styles.rankTextCurrentUser]}>
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
                <View style={styles.currentUserIndicator}>
                  <Ionicons name="person" size={16} color={theme.colors.rust[500]} />
                  <Text style={styles.currentUserBadgeText}>You</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Recent Activity */}
      <View style={[styles.section, styles.sectionLast]}>
        <Text style={styles.sectionTitle}>Points Activity</Text>
        {pointsData.recent_activity.map((activity, index) => (
          <View key={index} style={styles.activityItem}>
            <View style={[styles.activityIcon, activity.points > 0 && styles.activityIconPositive]}>
              <Ionicons
                name={activity.points > 0 ? "add" : "remove"}
                size={16}
                color={activity.points > 0 ? theme.colors.status.stable : theme.colors.status.urgent}
              />
            </View>
            <View style={styles.activityInfo}>
              <Text style={styles.activityReason}>{activity.reason}</Text>
              <Text style={styles.activityTime}>{formatDate(activity.timestamp)}</Text>
            </View>
            <Text style={[styles.activityPoints, activity.points > 0 && styles.activityPointsPositive]}>
              +{activity.points} pts
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
    backgroundColor: theme.colors.cream[200],
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.cream[200],
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.espresso[400],
    fontWeight: '600',
  },
  header: {
    backgroundColor: theme.colors.espresso[900],
    padding: 24,
    paddingTop: 30,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    ...theme.shadows.warmMd,
  },
  badgePill: {
    backgroundColor: 'rgba(217, 107, 39, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(217, 107, 39, 0.4)',
  },
  badgePillText: {
    color: theme.colors.rust[300],
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  pointsCircle: {
    alignItems: 'center',
    marginBottom: 24,
  },
  pointsValue: {
    fontSize: 52,
    fontWeight: '900',
    color: theme.colors.rust[400],
    letterSpacing: -1,
  },
  pointsLabel: {
    fontSize: 14,
    color: theme.colors.cream[300],
    marginTop: 4,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statItem: {
    alignItems: 'center',
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.cream[50],
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.cream[400],
    marginTop: 2,
    fontWeight: '600',
  },
  section: {
    padding: 16,
  },
  sectionLast: {
    paddingBottom: 110,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.espresso[900],
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  rewardsScroll: {
    paddingRight: 8,
  },
  rewardCard: {
    width: 145,
    backgroundColor: theme.colors.cream[50],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    ...theme.shadows.warm,
  },
  rewardCardEarned: {
    borderColor: theme.colors.rust[500],
    backgroundColor: theme.colors.cream[100],
  },
  rewardIcon: {
    fontSize: 34,
    marginBottom: 8,
  },
  rewardName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.espresso[400],
    marginBottom: 4,
    textAlign: 'center',
  },
  rewardNameEarned: {
    color: theme.colors.espresso[900],
  },
  rewardPoints: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.rust[500],
    marginBottom: 10,
  },
  earnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  earnedText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.status.stable,
    marginLeft: 4,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cream[300],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  lockedText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.espresso[400],
    marginLeft: 4,
  },
  leaderboardContainer: {
    backgroundColor: theme.colors.cream[50],
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    overflow: 'hidden',
    ...theme.shadows.warm,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cream[300],
  },
  leaderboardItemCurrentUser: {
    backgroundColor: theme.colors.peach[100],
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.rust[500],
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.cream[300],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankBadgeTop: {
    backgroundColor: theme.colors.peach[200],
  },
  rankBadgeCurrentUser: {
    backgroundColor: theme.colors.rust[500],
  },
  rankText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.espresso[700],
  },
  rankTextTop: {
    color: theme.colors.rust[700],
  },
  rankTextCurrentUser: {
    color: '#fff',
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.espresso[900],
  },
  leaderboardNameCurrentUser: {
    fontWeight: '800',
    color: theme.colors.rust[700],
  },
  leaderboardPoints: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.espresso[400],
    marginTop: 2,
  },
  currentUserIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.peach[200],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  currentUserBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.rust[700],
    marginLeft: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cream[50],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.cream[400],
    padding: 14,
    marginBottom: 8,
    ...theme.shadows.warm,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.cream[300],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityIconPositive: {
    backgroundColor: '#ECFDF5',
  },
  activityInfo: {
    flex: 1,
  },
  activityReason: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.espresso[900],
  },
  activityTime: {
    fontSize: 12,
    color: theme.colors.espresso[400],
    marginTop: 2,
  },
  activityPoints: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.espresso[700],
  },
  activityPointsPositive: {
    color: theme.colors.status.stable,
  },
});

export default PointsScreen;
