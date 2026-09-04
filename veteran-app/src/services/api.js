/**
 * API Service
 * Handles all communication with the SAH backend
 */

import axios from 'axios';
import { Platform } from 'react-native';

const API_BASE_URL = Platform.select({
  web: 'http://localhost:8000/api',
  ios: 'http://localhost:8000/api',
  android: 'http://10.0.2.2:8000/api',
  default: 'http://localhost:8000/api',
});

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ─── Veteran Endpoints ────────────────────────────────────────────────────────

export const veteranAPI = {
  // Create veteran profile
  create: (data) => api.post('/veterans/', null, { params: data }),

  // Get veteran profile
  getProfile: (id) => api.get(`/veterans/${id}`),

  // Get detailed stats
  getStats: (id) => api.get(`/veterans/${id}/stats`),

  // Submit wellness assessment
  submitAssessment: (id, answers) => api.post(`/veterans/${id}/assessment`, answers),

  // Get dashboard
  getDashboard: (id) => api.get(`/veterans/${id}/dashboard`),

  // Get rewards
  getRewards: (id) => api.get(`/veterans/${id}/rewards`),

  // Claim reward
  claimReward: (veteranId, rewardId) => api.post(`/veterans/${veteranId}/rewards/${rewardId}/claim`),

  // Get points history
  getPointsHistory: (id) => api.get(`/veterans/${id}/points/history`),
};

// ─── Task Endpoints ───────────────────────────────────────────────────────────

export const taskAPI = {
  // Get tasks
  getTasks: (veteranId, filters = {}) => api.get(`/veterans/${veteranId}/tasks`, { params: filters }),

  // Generate daily tasks
  generateTasks: (veteranId) => api.post(`/veterans/${veteranId}/tasks/generate`),

  // Get task detail
  getTask: (veteranId, taskId) => api.get(`/veterans/${veteranId}/tasks/${taskId}`),

  // Start task
  startTask: (veteranId, taskId) => api.post(`/veterans/${veteranId}/tasks/${taskId}/start`),

  // Complete task
  completeTask: (veteranId, taskId) => api.post(`/veterans/${veteranId}/tasks/${taskId}/complete`),

  // Skip task
  skipTask: (veteranId, taskId, reason) => api.post(`/veterans/${veteranId}/tasks/${taskId}/skip`, null, {
    params: { reason }
  }),
};

// ─── GPS Endpoints ────────────────────────────────────────────────────────────

export const gpsAPI = {
  // Record GPS point
  recordPoint: (veteranId, data) => api.post('/veterans/' + veteranId + '/gps/track', null, { params: data }),

  // Record batch GPS points
  recordBatch: (veteranId, points, taskId) => api.post('/veterans/' + veteranId + '/gps/track/batch', {
    points,
    task_id: taskId,
  }),

  // Get GPS track for task
  getTrack: (veteranId, taskId) => api.get(`/veterans/${veteranId}/gps/track/${taskId}`),

  // Get GPS history
  getHistory: (veteranId, days = 30) => api.get(`/veterans/${veteranId}/gps/history`, { params: { days } }),

  // Get GPS stats
  getStats: (veteranId) => api.get(`/veterans/${veteranId}/gps/stats`),
};

// ─── Group Endpoints ──────────────────────────────────────────────────────────

export const groupAPI = {
  // List groups
  listGroups: async (search, limit = 20) => {
    const res = await api.get('/groups', { params: { search, limit } });
    return res?.groups || (Array.isArray(res) ? res : []);
  },

  // Create group
  createGroup: (data) => api.post('/groups', null, { params: data }),

  // Get group details
  getGroup: (groupId) => api.get(`/groups/${groupId}`),

  // Join group
  joinGroup: (groupId, veteranId) => api.post(`/groups/${groupId}/join`, null, {
    params: { veteran_id: veteranId }
  }),

  // Leave group
  leaveGroup: (groupId, veteranId) => api.post(`/groups/${groupId}/leave`, null, {
    params: { veteran_id: veteranId }
  }),

  // Get group members
  getMembers: (groupId) => api.get(`/groups/${groupId}/members`),

  // List group activities
  getActivities: (groupId) => api.get(`/groups/${groupId}/activities`),

  // Create group activity
  createActivity: (groupId, data) => api.post(`/groups/${groupId}/activities`, null, { params: data }),

  // Join activity
  joinActivity: (groupId, activityId, veteranId) => api.post(`/groups/${groupId}/activities/${activityId}/join`, null, {
    params: { veteran_id: veteranId }
  }),

  // Complete activity
  completeActivity: (groupId, activityId, veteranId) => api.post(`/groups/${groupId}/activities/${activityId}/complete`, null, {
    params: { veteran_id: veteranId }
  }),

  // Get veteran's groups
  getVeteranGroups: async (veteranId) => {
    const res = await api.get(`/veterans/${veteranId}/groups`);
    return Array.isArray(res) ? res : (res?.groups || []);
  },
};

// ─── Social Interaction Endpoints ─────────────────────────────────────────────

export const socialAPI = {
  // Get interaction history
  getInteractions: (veteranId, days = 30) => api.get(`/veterans/${veteranId}/interactions`, { params: { days } }),

  // Log interaction
  logInteraction: (veteranId, data) => api.post(`/veterans/${veteranId}/interactions`, null, { params: data }),
};

// ─── Admin Endpoints ──────────────────────────────────────────────────────────

export const adminAPI = {
  // Get dashboard
  getDashboard: () => api.get('/admin/dashboard'),

  // List veterans
  listVeterans: (search, sortBy = 'total_points') => api.get('/admin/veterans', { params: { search, sort_by: sortBy } }),

  // Get veteran detail
  getVeteranDetail: (id) => api.get(`/admin/veterans/${id}`),

  // Get task analytics
  getTaskAnalytics: (days = 30) => api.get('/admin/analytics/tasks', { params: { days } }),

  // Get group analytics
  getGroupAnalytics: () => api.get('/admin/analytics/groups'),

  // Get wellness analytics
  getWellnessAnalytics: (days = 30) => api.get('/admin/analytics/wellness', { params: { days } }),

  // Get GPS analytics
  getGPSAnalytics: (days = 30) => api.get('/admin/analytics/gps', { params: { days } }),

  // Get interaction analytics
  getInteractionAnalytics: (days = 30) => api.get('/admin/analytics/interactions', { params: { days } }),

  // Get daily report
  getDailyReport: (date) => api.get('/admin/reports/daily', { params: { date } }),

  // Export data
  exportData: (format = 'json', days = 30) => api.get('/admin/reports/export', { params: { format, days } }),
};

// ─── Chat Endpoints ─────────────────────────────────────────────────────────

export const chatAPI = {
  // Direct messages thread with counselor
  getDirectMessages: (veteranId) => api.get('/chat/messages', { params: { veteran_id: veteranId } }),

  // Send direct message
  sendDirectMessage: (veteranId, content, senderType = 'veteran', counselorId = null) =>
    api.post('/chat/messages', {
      veteran_id: veteranId,
      content,
      sender_type: senderType,
      counselor_id: counselorId,
    }),

  // List counselors
  listCounselors: () => api.get('/chat/counselors'),

  // List conversations
  listConversations: (veteranId) => api.get('/chat/conversations', { params: { veteran_id: veteranId } }),

  // Send emergency message
  sendEmergency: (veteranId, content) =>
    api.post(`/veterans/${veteranId}/chat/emergency`, { content }),
};

export const authAPI = {
  login: (email, password, role = 'veteran') => api.post('/auth/login', { email, password, role }),
  register: (data) => api.post('/auth/register', data),
  getDemoUsers: () => api.get('/auth/demo-users'),
};

export default api;
