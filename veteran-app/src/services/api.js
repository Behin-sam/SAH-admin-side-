/**
 * API Service
 * Handles all communication with the SAH backend
 */

import axios from 'axios';

const API_BASE_URL = 'http://10.0.2.2:8000/api'; // Android emulator
// For iOS simulator use: http://localhost:8000/api
// For physical device use: http://<YOUR_IP>:8000/api

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
  submitAssessment: (id, answers) => api.post(`/veterans/${id}/assessment`, null, {
    params: { answers: JSON.stringify(answers) }
  }),

  // Get dashboard
  getDashboard: (id) => api.get(`/veterans/${id}/dashboard`),
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
  listGroups: (search, limit = 20) => api.get('/groups', { params: { search, limit } }),

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
  getVeteranGroups: (veteranId) => api.get(`/veterans/${veteranId}/groups`),
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
  // List counselors
  listCounselors: () => api.get('/veterans/' + 'demo-veteran-001' + '/chat/counselors'),

  // List conversations
  listConversations: (veteranId) => api.get(`/veterans/${veteranId}/chat/conversations`),

  // Start conversation
  startConversation: (veteranId, counselorId, subject, message) =>
    api.post(`/veterans/${veteranId}/chat/conversations`, null, {
      params: { counselor_id: counselorId, subject, initial_message: message }
    }),

  // Get conversation with messages
  getConversation: (veteranId, conversationId) =>
    api.get(`/veterans/${veteranId}/chat/conversations/${conversationId}`),

  // Send message
  sendMessage: (veteranId, conversationId, content) =>
    api.post(`/veterans/${veteranId}/chat/conversations/${conversationId}/messages`, null, {
      params: { content }
    }),

  // Send emergency message
  sendEmergency: (veteranId, content) =>
    api.post(`/veterans/${veteranId}/chat/emergency`, null, {
      params: { content }
    }),
};

export default api;
