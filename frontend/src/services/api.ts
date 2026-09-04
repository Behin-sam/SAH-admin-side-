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
