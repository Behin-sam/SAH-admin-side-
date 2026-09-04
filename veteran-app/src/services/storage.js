/**
 * Local Storage Service
 * Handles persistent storage using AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  USER: 'user',
  ASSESSMENT: 'assessment',
  TASKS: 'tasks',
  GPS_TRACKS: 'gps_tracks',
  GROUPS: 'groups',
  POINTS: 'points',
  SETTINGS: 'settings',
};

export const storage = {
  // Generic get
  get: async (key) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  },

  // Generic set
  set: async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  },

  // Generic remove
  remove: async (key) => {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Storage remove error:', error);
      return false;
    }
  },

  // Clear all
  clear: async () => {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  },

  // ─── User Storage ─────────────────────────────────────────────────────────

  getUser: async () => {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    return data ? JSON.parse(data) : null;
  },

  setUser: async (user) => {
    return await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },

  // ─── Assessment Storage ───────────────────────────────────────────────────

  getAssessment: async () => {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.ASSESSMENT);
    return data ? JSON.parse(data) : null;
  },

  saveAssessment: async (answers) => {
    const assessment = {
      answers,
      timestamp: new Date().toISOString(),
    };
    return await AsyncStorage.setItem(STORAGE_KEYS.ASSESSMENT, JSON.stringify(assessment));
  },

  // ─── Tasks Storage ────────────────────────────────────────────────────────

  getTasks: async () => {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
    return data ? JSON.parse(data) : [];
  },

  saveTasks: async (tasks) => {
    return await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  },

  // ─── GPS Storage ──────────────────────────────────────────────────────────

  getGPSTracks: async () => {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.GPS_TRACKS);
    return data ? JSON.parse(data) : [];
  },

  saveGPSTrack: async (track) => {
    const tracks = await storage.getGPSTracks();
    tracks.push(track);
    return await AsyncStorage.setItem(STORAGE_KEYS.GPS_TRACKS, JSON.stringify(tracks));
  },

  // ─── Points Storage ───────────────────────────────────────────────────────

  getPoints: async () => {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.POINTS);
    return data ? JSON.parse(data) : { total: 0, history: [] };
  },

  addPoints: async (points, reason) => {
    const pointsData = await storage.getPoints();
    pointsData.total += points;
    pointsData.history.push({
      points,
      reason,
      timestamp: new Date().toISOString(),
    });
    return await AsyncStorage.setItem(STORAGE_KEYS.POINTS, JSON.stringify(pointsData));
  },
};

export default storage;
