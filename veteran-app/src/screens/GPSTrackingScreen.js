/**
 * GPS Tracking Screen
 * Tracks location during physical activities
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

const GPSTrackingScreen = ({ route, navigation }) => {
  const { taskId, task } = route.params || {};
  const [tracking, setTracking] = useState(false);
  const [location, setLocation] = useState(null);
  const [gpsPoints, setGpsPoints] = useState([]);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const subscriptionRef = useRef(null);

  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
    };
  }, []);

  const startTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for GPS tracking');
        return;
      }

      setTracking(true);
      setStartTime(Date.now());

      // Start watching position
      subscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5, // meters
          timeInterval: 3000, // ms
        },
        (newLocation) => {
          setLocation(newLocation);
          setGpsPoints((prev) => {
            const newPoints = [...prev, {
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
              timestamp: Date.now(),
            }];
            
            // Calculate distance
            if (newPoints.length > 1) {
              const lastPoint = newPoints[newPoints.length - 2];
              const dist = calculateDistance(
                lastPoint.latitude, lastPoint.longitude,
                newLocation.coords.latitude, newLocation.coords.longitude
              );
              setDistance((prev) => prev + dist);
            }
            
            return newPoints;
          });
        }
      );
    } catch (error) {
      console.error('GPS tracking error:', error);
      Alert.alert('Error', 'Failed to start GPS tracking');
      setTracking(false);
    }
  };

  const stopTracking = () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    setTracking(false);
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hrs = Math.floor(minutes / 60);
    return `${hrs.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const formatDistance = (meters) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  const handleComplete = () => {
    const targetDistance = task?.gps_target_distance_meters || 1000;
    const targetMet = distance >= targetDistance;

    Alert.alert(
      targetMet ? '🎉 Activity Complete!' : '⚠️ Target Not Met',
      targetMet
        ? `Congratulations! You walked ${formatDistance(distance)} in ${formatDuration(duration)}`
        : `You walked ${formatDistance(distance)}, but the target was ${formatDistance(targetDistance)}`,
      [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]
    );
  };

  // Update duration while tracking
  useEffect(() => {
    let interval;
    if (tracking && startTime) {
      interval = setInterval(() => {
        setDuration(Date.now() - startTime);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [tracking, startTime]);

  const targetDistance = task?.gps_target_distance_meters || 1000;
  const progress = Math.min(distance / targetDistance, 1);

  return (
    <View style={styles.container}>
      {/* Map Area (Placeholder) */}
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map" size={64} color="#d1d5db" />
          <Text style={styles.mapText}>Map View</Text>
          {location && (
            <Text style={styles.coordinates}>
              {location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}
            </Text>
          )}
        </View>
      </View>

      {/* Stats Panel */}
      <View style={styles.statsPanel}>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {formatDistance(distance)} / {formatDistance(targetDistance)}
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Ionicons name="time" size={24} color="#2563eb" />
            <Text style={styles.statValue}>{formatDuration(duration)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="navigate" size={24} color="#10b981" />
            <Text style={styles.statValue}>{formatDistance(distance)}</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="speedometer" size={24} color="#f59e0b" />
            <Text style={styles.statValue}>
              {duration > 0 ? `${((distance / 1000) / (duration / 3600000)).toFixed(1)}` : '0.0'}
            </Text>
            <Text style={styles.statLabel}>km/h</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="radio-button-on" size={24} color="#8b5cf6" />
            <Text style={styles.statValue}>{gpsPoints.length}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
        </View>

        {/* Control Buttons */}
        <View style={styles.controlContainer}>
          {!tracking ? (
            <TouchableOpacity style={styles.startButton} onPress={startTracking}>
              <Ionicons name="play" size={32} color="#fff" />
              <Text style={styles.startButtonText}>Start Tracking</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.stopButton} onPress={stopTracking}>
                <Ionicons name="pause" size={24} color="#fff" />
                <Text style={styles.stopButtonText}>Pause</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.completeButtonText}>Complete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Tracking Status */}
        {tracking && (
          <View style={styles.trackingStatus}>
            <View style={styles.trackingDot} />
            <Text style={styles.trackingText}>Recording GPS...</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#e5e7eb',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapText: {
    fontSize: 18,
    color: '#9ca3af',
    marginTop: 12,
  },
  coordinates: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    fontFamily: 'monospace',
  },
  statsPanel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  controlContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  trackingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  trackingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    marginRight: 8,
  },
  trackingText: {
    fontSize: 14,
    color: '#6b7280',
  },
});

export default GPSTrackingScreen;
