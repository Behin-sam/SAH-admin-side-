/**
 * Admin Dashboard Screen
 * Shows analytics, veteran data, and export options
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const AdminScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    // Mock data for demo
    const mockData = {
      overview: {
        total_veterans: 45,
        active_veterans: 32,
        engagement_rate: 71.1,
      },
      tasks: {
        assigned_today: 135,
        completed_today: 89,
        completion_rate_today: 65.9,
      },
      points: {
        awarded_this_week: 4250,
        average_per_veteran: 132.8,
      },
      social: {
        total_groups: 8,
        activities_this_week: 12,
        interactions_this_week: 78,
      },
      gps: {
        distance_this_week_km: 245.6,
      },
      veterans: [
        { id: 'v1', branch: 'Army', rank: 'E-6', points: 520, streak: 12, tasks: 45 },
        { id: 'v2', branch: 'Navy', rank: 'E-5', points: 380, streak: 8, tasks: 32 },
        { id: 'v3', branch: 'Marines', rank: 'E-4', points: 290, streak: 5, tasks: 28 },
        { id: 'v4', branch: 'Air Force', rank: 'E-5', points: 250, streak: 7, tasks: 22 },
        { id: 'v5', branch: 'Army', rank: 'E-7', points: 210, streak: 3, tasks: 18 },
      ],
    };
    setDashboardData(mockData);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleExport = (format) => {
    Alert.alert(
      'Export Data',
      `Exporting data in ${format.toUpperCase()} format...`,
      [{ text: 'OK' }]
    );
  };

  if (!dashboardData) {
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <Text style={styles.headerSubtitle}>Veteran Wellness Analytics</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {['overview', 'veterans', 'analytics', 'export'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === 'overview' && (
        <View style={styles.content}>
          {/* Overview Stats */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, styles.statCardPrimary]}>
              <Ionicons name="people" size={24} color="#fff" />
              <Text style={styles.statCardValue}>{dashboardData.overview.total_veterans}</Text>
              <Text style={styles.statCardLabel}>Total Veterans</Text>
            </View>
            <View style={[styles.statCard, styles.statCardSuccess]}>
              <Ionicons name="person" size={24} color="#fff" />
              <Text style={styles.statCardValue}>{dashboardData.overview.active_veterans}</Text>
              <Text style={styles.statCardLabel}>Active Veterans</Text>
            </View>
            <View style={[styles.statCard, styles.statCardWarning]}>
              <Ionicons name="trending-up" size={24} color="#fff" />
              <Text style={styles.statCardValue}>{dashboardData.overview.engagement_rate}%</Text>
              <Text style={styles.statCardLabel}>Engagement Rate</Text>
            </View>
          </View>

          {/* Task Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Task Completion</Text>
            <View style={styles.taskStatsContainer}>
              <View style={styles.taskStatItem}>
                <Text style={styles.taskStatValue}>{dashboardData.tasks.assigned_today}</Text>
                <Text style={styles.taskStatLabel}>Assigned Today</Text>
              </View>
              <View style={styles.taskStatItem}>
                <Text style={[styles.taskStatValue, styles.taskStatValueSuccess]}>
                  {dashboardData.tasks.completed_today}
                </Text>
                <Text style={styles.taskStatLabel}>Completed Today</Text>
              </View>
              <View style={styles.taskStatItem}>
                <Text style={[styles.taskStatValue, styles.taskStatValueWarning]}>
                  {dashboardData.tasks.completion_rate_today}%
                </Text>
                <Text style={styles.taskStatLabel}>Completion Rate</Text>
              </View>
            </View>
          </View>

          {/* Social Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Social Activity</Text>
            <View style={styles.socialStatsContainer}>
              <View style={styles.socialStatItem}>
                <Ionicons name="people" size={20} color="#8b5cf6" />
                <Text style={styles.socialStatValue}>{dashboardData.social.total_groups}</Text>
                <Text style={styles.socialStatLabel}>Groups</Text>
              </View>
              <View style={styles.socialStatItem}>
                <Ionicons name="calendar" size={20} color="#3b82f6" />
                <Text style={styles.socialStatValue}>{dashboardData.social.activities_this_week}</Text>
                <Text style={styles.socialStatLabel}>Activities</Text>
              </View>
              <View style={styles.socialStatItem}>
                <Ionicons name="chatbubbles" size={20} color="#10b981" />
                <Text style={styles.socialStatValue}>{dashboardData.social.interactions_this_week}</Text>
                <Text style={styles.socialStatLabel}>Interactions</Text>
              </View>
            </View>
          </View>

          {/* GPS Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>GPS Activity</Text>
            <View style={styles.gpsStatsContainer}>
              <Ionicons name="navigate" size={32} color="#2563eb" />
              <View style={styles.gpsStatsInfo}>
                <Text style={styles.gpsStatsValue}>{dashboardData.gps.distance_this_week_km} km</Text>
                <Text style={styles.gpsStatsLabel}>Total Distance This Week</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {activeTab === 'veterans' && (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Veteran Leaderboard</Text>
          {dashboardData.veterans.map((veteran, index) => (
            <View key={veteran.id} style={styles.veteranCard}>
              <View style={styles.veteranRank}>
                <Text style={styles.veteranRankText}>#{index + 1}</Text>
              </View>
              <View style={styles.veteranInfo}>
                <Text style={styles.veteranName}>Veteran {index + 1}</Text>
                <Text style={styles.veteranService}>
                  {veteran.branch} • {veteran.rank}
                </Text>
              </View>
              <View style={styles.veteranStats}>
                <Text style={styles.veteranPoints}>{veteran.points} pts</Text>
                <Text style={styles.veteranMeta}>
                  {veteran.streak} streak • {veteran.tasks} tasks
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {activeTab === 'analytics' && (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Analytics Overview</Text>
          
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsCardTitle}>Task Completion Trend</Text>
            <View style={styles.chartPlaceholder}>
              <Ionicons name="bar-chart" size={48} color="#d1d5db" />
              <Text style={styles.chartPlaceholderText}>Chart visualization</Text>
            </View>
          </View>

          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsCardTitle}>Wellness Scores</Text>
            <View style={styles.chartPlaceholder}>
              <Ionicons name="pulse" size={48} color="#d1d5db" />
              <Text style={styles.chartPlaceholderText}>Chart visualization</Text>
            </View>
          </View>

          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsCardTitle}>Group Activity</Text>
            <View style={styles.chartPlaceholder}>
              <Ionicons name="pie-chart" size={48} color="#d1d5db" />
              <Text style={styles.chartPlaceholderText}>Chart visualization</Text>
            </View>
          </View>
        </View>
      )}

      {activeTab === 'export' && (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Data Export</Text>
          
          <TouchableOpacity
            style={styles.exportButton}
            onPress={() => handleExport('json')}
          >
            <Ionicons name="document-text" size={24} color="#2563eb" />
            <View style={styles.exportInfo}>
              <Text style={styles.exportTitle}>Export as JSON</Text>
              <Text style={styles.exportSubtitle}>Full data export for analysis</Text>
            </View>
            <Ionicons name="download" size={20} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exportButton}
            onPress={() => handleExport('csv')}
          >
            <Ionicons name="grid" size={24} color="#10b981" />
            <View style={styles.exportInfo}>
              <Text style={styles.exportTitle}>Export as CSV</Text>
              <Text style={styles.exportSubtitle}>Spreadsheet-compatible format</Text>
            </View>
            <Ionicons name="download" size={20} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exportButton}
            onPress={() => handleExport('report')}
          >
            <Ionicons name="document" size={24} color="#8b5cf6" />
            <View style={styles.exportInfo}>
              <Text style={styles.exportTitle}>Generate Report</Text>
              <Text style={styles.exportSubtitle}>PDF summary report</Text>
            </View>
            <Ionicons name="download" size={20} color="#6b7280" />
          </TouchableOpacity>
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
    backgroundColor: '#7c3aed',
    padding: 20,
    paddingTop: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#c4b5fd',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#7c3aed',
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#7c3aed',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
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
  statCardPrimary: {
    backgroundColor: '#2563eb',
  },
  statCardSuccess: {
    backgroundColor: '#10b981',
  },
  statCardWarning: {
    backgroundColor: '#f59e0b',
  },
  statCardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statCardLabel: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  taskStatsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  taskStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  taskStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  taskStatValueSuccess: {
    color: '#10b981',
  },
  taskStatValueWarning: {
    color: '#f59e0b',
  },
  taskStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  socialStatsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'space-around',
  },
  socialStatItem: {
    alignItems: 'center',
  },
  socialStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  socialStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  gpsStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  gpsStatsInfo: {
    marginLeft: 16,
  },
  gpsStatsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  gpsStatsLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  veteranCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  veteranRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  veteranRankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7c3aed',
  },
  veteranInfo: {
    flex: 1,
  },
  veteranName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  veteranService: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  veteranStats: {
    alignItems: 'flex-end',
  },
  veteranPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  veteranMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  analyticsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  analyticsCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  chartPlaceholder: {
    height: 120,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartPlaceholderText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  exportInfo: {
    flex: 1,
    marginLeft: 12,
  },
  exportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  exportSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
});

export default AdminScreen;
