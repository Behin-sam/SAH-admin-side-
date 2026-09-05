/**
 * Task Detail Screen
 * Shows task details, instructions, and allows starting/completing
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../../App';
import { taskAPI } from '../services/api';
import { storage } from '../services/storage';

const TaskDetailScreen = ({ route, navigation }) => {
  const { taskId, task } = route.params || {};
  const { user, updatePoints } = useAuth();
  const [loading, setLoading] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [location, setLocation] = useState(null);
  const [gpsPoints, setGpsPoints] = useState([]);
  const [status, setStatus] = useState(task?.status || 'assigned');

  // Check stored completion
  useEffect(() => {
    const checkDone = async () => {
      const doneKey = `@sah_task_done_${taskId || task?.id}`;
      const isDone = await storage.get(doneKey);
      if (isDone) setStatus('completed');
    };
    checkDone();
  }, [taskId, task]);

  // Use task from params or mock data
  const taskData = task || {
    id: taskId,
    type: 'mental',
    title: '5-Minute Breathing Exercise',
    description: 'Take 5 minutes to focus on deep, slow breathing.',
    instructions: '1. Find a quiet spot\n2. Close your eyes\n3. Breathe in for 4 counts\n4. Hold for 4 counts\n5. Exhale for 6 counts\n6. Repeat for 5 minutes',
    points: 10,
    status: 'assigned',
    difficulty: 1,
    category: 'breathing',
    gps_required: false,
  };

  const startGPSTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for GPS tracking');
        return;
      }

      setTracking(true);
      
      // Start watching position
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, // meters
          timeInterval: 5000, // ms
        },
        (newLocation) => {
          setLocation(newLocation);
          setGpsPoints((prev) => [...prev, {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
            timestamp: new Date().toISOString(),
          }]);
        }
      );

      // Store subscription for cleanup
      return () => subscription.remove();
    } catch (error) {
      console.error('GPS tracking error:', error);
      Alert.alert('Error', 'Failed to start GPS tracking');
      setTracking(false);
    }
  };

  const stopGPSTracking = () => {
    setTracking(false);
    Alert.alert(
      'GPS Tracking Stopped',
      `Recorded ${gpsPoints.length} points`,
      [{ text: 'OK' }]
    );
  };

  const handleStart = async () => {
    if (taskData.gps_required) {
      navigation.navigate('GPSTracking', { taskId: taskData.id, task: taskData });
    } else {
      setStatus('in_progress');
      if (Platform.OS === 'web') {
        window.alert('Task Started! Follow the instructions above and press "Complete Task" when finished.');
      } else {
        Alert.alert('Task Started!', 'Follow the instructions above and press "Complete Task" when finished.');
      }
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    const pts = taskData.points || 15;
    try {
      if (user?.id && taskData.id) {
        await taskAPI.completeTask(user.id, taskData.id).catch(() => {});
      }
      if (updatePoints) {
        await updatePoints(pts);
      }
      setStatus('completed');
      if (taskData.id) {
        await storage.set(`@sah_task_done_${taskData.id}`, 'true');
      }
    } catch (e) {
      console.warn('Task complete error:', e);
    } finally {
      setLoading(false);
    }

    const msg = `+${pts} Valor Points awarded! Great job staying committed.`;
    if (Platform.OS === 'web') {
      window.alert(`Task Completed! 🎉\n\n${msg}`);
      navigation.goBack();
    } else {
      Alert.alert('Task Completed! 🎉', msg, [
        { text: 'Awesome', onPress: () => navigation.goBack() },
      ]);
    }
  };

  const getDifficultyLabel = (difficulty) => {
    switch (difficulty) {
      case 1: return 'Easy';
      case 2: return 'Medium';
      case 3: return 'Hard';
      default: return 'Unknown';
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Task Header */}
      <View style={styles.header}>
        <View style={styles.typeBadge}>
          <Ionicons
            name={taskData.type === 'mental' ? 'brain' : taskData.type === 'physical' ? 'walk' : 'people'}
            size={20}
            color={taskData.type === 'mental' ? '#8b5cf6' : taskData.type === 'physical' ? '#10b981' : '#3b82f6'}
          />
          <Text style={styles.typeText}>{taskData.type}</Text>
        </View>
        <View style={styles.pointsBadge}>
          <Ionicons name="trophy" size={16} color="#f59e0b" />
          <Text style={styles.pointsText}>+{taskData.points} pts</Text>
        </View>
      </View>

      <Text style={styles.title}>{taskData.title}</Text>
      <Text style={styles.description}>{taskData.description}</Text>

      {/* Task Info */}
      <View style={styles.infoContainer}>
        <View style={styles.infoItem}>
          <Ionicons name="speedometer" size={20} color="#6b7280" />
          <Text style={styles.infoLabel}>Difficulty</Text>
          <Text style={styles.infoValue}>{getDifficultyLabel(taskData.difficulty)}</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="pricetag" size={20} color="#6b7280" />
          <Text style={styles.infoLabel}>Category</Text>
          <Text style={styles.infoValue}>{taskData.category}</Text>
        </View>
        {taskData.gps_required && (
          <View style={styles.infoItem}>
            <Ionicons name="location" size={20} color="#2563eb" />
            <Text style={styles.infoLabel}>GPS</Text>
            <Text style={[styles.infoValue, styles.infoValueGps]}>Required</Text>
          </View>
        )}
      </View>

      {/* Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instructions</Text>
        <View style={styles.instructionsContainer}>
          {taskData.instructions?.split('\n').map((instruction, index) => (
            <View key={index} style={styles.instructionItem}>
              <View style={styles.instructionNumber}>
                <Text style={styles.instructionNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.instructionText}>{instruction}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* GPS Info (if required) */}
      {taskData.gps_required && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GPS Activity</Text>
          <View style={styles.gpsInfoContainer}>
            <View style={styles.gpsInfoItem}>
              <Ionicons name="navigate" size={24} color="#2563eb" />
              <View style={styles.gpsInfoText}>
                <Text style={styles.gpsInfoLabel}>Target Distance</Text>
                <Text style={styles.gpsInfoValue}>{taskData.gps_target_distance_meters || 1000}m</Text>
              </View>
            </View>
            <View style={styles.gpsInfoItem}>
              <Ionicons name="time" size={24} color="#2563eb" />
              <View style={styles.gpsInfoText}>
                <Text style={styles.gpsInfoLabel}>Minimum Duration</Text>
                <Text style={styles.gpsInfoValue}>{taskData.gps_min_duration_seconds ? `${taskData.gps_min_duration_seconds / 60} min` : '15 min'}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        {status === 'assigned' && (
          <TouchableOpacity style={styles.startButton} onPress={handleStart}>
            <Ionicons name="play" size={24} color="#fff" />
            <Text style={styles.startButtonText}>
              {taskData.gps_required ? 'Start GPS Tracking' : 'Start Task'}
            </Text>
          </TouchableOpacity>
        )}
        
        {status === 'in_progress' && (
          <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
            <Text style={styles.completeButtonText}>Complete Task</Text>
          </TouchableOpacity>
        )}

        {status === 'completed' && (
          <View style={styles.completedContainer}>
            <Ionicons name="checkmark-circle" size={48} color="#10b981" />
            <Text style={styles.completedText}>Task Completed!</Text>
            <Text style={styles.completedPoints}>+{taskData.points} points earned</Text>
          </View>
        )}
      </View>
    </ScrollView>
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
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
    textTransform: 'capitalize',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
    marginLeft: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#4b5563',
    paddingHorizontal: 20,
    marginBottom: 20,
    lineHeight: 24,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 2,
  },
  infoValueGps: {
    color: '#2563eb',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  instructionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  instructionNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  gpsInfoContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  gpsInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  gpsInfoText: {
    marginLeft: 12,
  },
  gpsInfoLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  gpsInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  actionContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 12,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  completedContainer: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
  },
  completedText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
    marginTop: 12,
  },
  completedPoints: {
    fontSize: 16,
    color: '#f59e0b',
    marginTop: 4,
  },
});

export default TaskDetailScreen;
