const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.theinterwebsite.space';

export interface PostbackParameter {
  enabled: boolean;
  description: string;
  customName?: string;
  possible_values?: string;
}

export interface PostbackShare {
  id: string;
  third_party_name: string;
  third_party_contact: string;
  postback_type: string;
  parameters: Record<string, PostbackParameter>;
  notes: string;
  status: string;
  created_at_str?: string;
  last_used_str?: string;
  usage_count?: number;
}

export interface CreatePostbackShareRequest {
  third_party_name: string;
  third_party_contact: string;
  postback_type: string;
  parameters: Record<string, PostbackParameter>;
  notes: string;
  status: string;
}

export interface PostbackUrlResponse {
  postback_url: string;
  third_party_name: string;
  postback_type: string;
  enabled_parameters: string[];
}

class PostbackService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getPostbackShares(): Promise<PostbackShare[]> {
    return this.request<PostbackShare[]>('/api/postback-shares');
  }

  async createPostbackShare(data: CreatePostbackShareRequest): Promise<PostbackShare> {
    return this.request<PostbackShare>('/api/postback-shares', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePostbackShare(id: string, data: CreatePostbackShareRequest): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/postback-shares/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePostbackShare(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/postback-shares/${id}`, {
      method: 'DELETE',
    });
  }

  async generatePostbackUrl(id: string): Promise<PostbackUrlResponse> {
    return this.request<PostbackUrlResponse>(`/api/postback-shares/${id}/generate-url`, {
      method: 'POST',
    });
  }

  async testDatabaseConnection(): Promise<{ status: string; message: string; collections: string[] }> {
    return this.request<{ status: string; message: string; collections: string[] }>('/api/test-db');
  }

  async getPostbackLogs(): Promise<any[]> {
    return this.request<any[]>('/api/postback-logs');
  }

  async getInboundPostbackLogs(): Promise<any[]> {
    return this.request<any[]>('/api/inbound-postback-logs');
  }
}

export const postbackService = new PostbackService();
export default postbackService;
