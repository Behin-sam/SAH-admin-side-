/**
 * API Service for VALOR Web Frontend
 * Communicates with FastAPI backend at http://localhost:8000/api
 */

const API_BASE_URL = 'http://localhost:8000/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.warn(`[Backend API] Request to ${endpoint} failed:`, error);
    throw error;
  }
}

export const apiService = {
  // Auth & Demo Users
  async getDemoUsers() {
    return request<{ veterans: any[]; counselors: any[] }>('/auth/demo-users');
  },

  async login(email: string, role: string) {
    return request<{ success: boolean; token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });
  },

  async register(userData: {
    name: string;
    email: string;
    role: string;
    rank?: string;
    unit?: string;
    service_branch?: string;
  }) {
    return request<{ success: boolean; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Veteran Endpoints
  async getVeteranDashboard(veteranId: string) {
    return request<any>(`/veterans/${veteranId}/dashboard`);
  },

  async getVeteranProfile(veteranId: string) {
    return request<any>(`/veterans/${veteranId}`);
  },

  async getTasks(veteranId: string, filters: Record<string, string> = {}) {
    const params = new URLSearchParams(filters).toString();
    const query = params ? `?${params}` : '';
    return request<any[]>(`/veterans/${veteranId}/tasks${query}`);
  },

  async completeTask(veteranId: string, taskId: string) {
    return request<any>(`/veterans/${veteranId}/tasks/${taskId}/complete`, {
      method: 'POST',
    });
  },

  async skipTask(veteranId: string, taskId: string, reason?: string) {
    const query = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    return request<any>(`/veterans/${veteranId}/tasks/${taskId}/skip${query}`, {
      method: 'POST',
    });
  },

  // Check-ins
  async submitCheckIn(data: any) {
    return request<any>('/checkins/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Counselor Endpoints
  async getCounselorCases(counselorId: string) {
    return request<any[]>(`/counselors/${counselorId}/cases`);
  },

  async getCounselorAlerts(counselorId: string) {
    return request<any[]>(`/counselors/${counselorId}/alerts`);
  },

  async acknowledgeAlert(counselorId: string, alertId: string) {
    return request<any>(`/counselors/${counselorId}/alerts/${alertId}/ack`, {
      method: 'POST',
    });
  },

  // Direct Messaging
  async getChatMessages(veteranId: string) {
    return request<{ conversation_id: string; veteran_id: string; counselor_name: string; messages: any[] }>(
      `/chat/messages?veteran_id=${veteranId}`
    );
  },

  async sendChatMessage(veteranId: string, content: string, senderType: 'veteran' | 'counselor' = 'counselor') {
    return request<any>('/chat/messages', {
      method: 'POST',
      body: JSON.stringify({
        veteran_id: veteranId,
        content,
        sender_type: senderType,
      }),
    });
  },

  // Squads & Peer Groups Endpoints
  async getGroups(search?: string) {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return request<{ groups: any[]; total: number }>(`/groups${query}`);
  },

  async getGroup(groupId: string) {
    return request<any>(`/groups/${groupId}`);
  },

  async getVeteranGroups(veteranId: string) {
    return request<{ veteran_id: string; groups: any[]; total: number }>(`/veterans/${veteranId}/groups`);
  },

  async joinGroup(groupId: string, veteranId: string) {
    return request<{ message: string; group_id: string; points_earned: number }>(
      `/groups/${groupId}/join?veteran_id=${veteranId}`,
      { method: 'POST' }
    );
  },

  async leaveGroup(groupId: string, veteranId: string) {
    return request<{ message: string; group_id: string }>(
      `/groups/${groupId}/leave?veteran_id=${veteranId}`,
      { method: 'POST' }
    );
  },

  async createGroup(data: { name: string; created_by: string; description?: string; max_members?: number; is_public?: boolean }) {
    return request<any>('/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getGroupActivities(groupId: string) {
    return request<{ group_id: string; activities: any[] }>(`/groups/${groupId}/activities`);
  },

  async joinGroupActivity(groupId: string, activityId: string, veteranId: string) {
    return request<any>(`/groups/${groupId}/activities/${activityId}/join?veteran_id=${veteranId}`, {
      method: 'POST',
    });
  },

  async completeGroupActivity(groupId: string, activityId: string, veteranId: string) {
    return request<any>(`/groups/${groupId}/activities/${activityId}/complete?veteran_id=${veteranId}`, {
      method: 'POST',
    });
  },

  async getGroupMembers(groupId: string) {
    return request<{ group_id: string; members: any[]; count: number }>(`/groups/${groupId}/members`);
  },

  async getGroupMessages(groupId: string) {
    return request<{ group_id: string; messages: any[] }>(`/groups/${groupId}/messages`);
  },

  async postGroupMessage(groupId: string, params: { sender_id: string; message: string; cheer_type?: string; sender_name?: string; sender_rank?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return request<any>(`/groups/${groupId}/messages?${query}`, { method: 'POST' });
  },

  async likeGroupMessage(groupId: string, messageId: string) {
    return request<any>(`/groups/${groupId}/messages/${messageId}/like`, { method: 'POST' });
  },

  // Health check
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch('http://localhost:8000/health');
      return res.ok;
    } catch {
      return false;
    }
  },
};
