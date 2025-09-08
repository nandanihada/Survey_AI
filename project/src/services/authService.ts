/**
 * JWT Authentication service for the dashboard
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'basic' | 'premium' | 'enterprise' | 'admin';
  features?: string[];
  status?: 'approved' | 'disapproved' | 'locked';
  createdAt?: string;
  simpleUserId?: number;
}

export interface AuthResponse {
  authenticated: boolean;
  user: User | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

class AuthService {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('auth_token');
  }

  /**
   * Set authentication token
   */
  setToken(token: string | null): void {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  /**
   * Get authentication headers
   */
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginRequest): Promise<{ user: User; token: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      this.setToken(data.token);
      return data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Register new user
   */
  async register(userData: RegisterRequest): Promise<{ user: User; token: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      const data = await response.json();
      this.setToken(data.token);
      return data;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  /**
   * Verify JWT token with backend
   */
  async verifyToken(): Promise<User> {
    const response = await fetch(`${this.baseUrl}/api/auth/verify-token`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Token verification failed');
    }

    const data = await response.json();
    return data.user;
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      // Clear backend session (optional with JWT)
      await fetch(`${this.baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });

      // Clear local token
      this.setToken(null);

      // Redirect to main site after logout
      window.location.href = 'https://pepperads.in';
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear token even if backend call fails
      this.setToken(null);
      throw error;
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      if (!this.token) {
        return null;
      }

      const response = await fetch(`${this.baseUrl}/api/auth/me`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        // Token might be expired, clear it
        if (response.status === 401) {
          this.setToken(null);
        }
        return null;
      }

      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Check authentication status
   */
  async checkAuth(): Promise<AuthResponse> {
    try {
      if (!this.token) {
        return { authenticated: false, user: null };
      }

      const response = await fetch(`${this.baseUrl}/api/auth/check`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        // Token might be expired, clear it
        if (response.status === 401) {
          this.setToken(null);
        }
        return { authenticated: false, user: null };
      }

      return response.json();
    } catch (error) {
      console.error('Auth check failed:', error);
      return { authenticated: false, user: null };
    }
  }

  /**
   * Check if user is admin
   */
  isAdmin(user: User | null): boolean {
    return user?.role === 'admin';
  }

  /**
   * Check if user has specific feature access
   */
  hasFeature(user: User | null, feature: string): boolean {
    if (!user) return false;
    
    // Check if features are available in user object
    if (user.features && Array.isArray(user.features)) {
      return user.features.includes(feature);
    }
    
    // Fallback: check role-based access
    const roleFeatures = {
      'basic': ['create', 'survey', 'analytics'],
      'premium': ['create', 'survey', 'analytics', 'postback', 'pass_fail'],
      'enterprise': ['create', 'survey', 'analytics', 'postback', 'pass_fail', 'test_lab'],
      'admin': ['create', 'survey', 'analytics', 'postback', 'pass_fail', 'test_lab', 'admin_panel', 'user_management']
    };
    
    const userRole = user.role || 'basic';
    const allowedFeatures = roleFeatures[userRole as keyof typeof roleFeatures] || [];
    return allowedFeatures.includes(feature);
  }

  /**
   * Check if user has premium or higher access
   */
  hasPremiumAccess(user: User | null): boolean {
    if (!user) return false;
    return ['premium', 'enterprise', 'admin'].includes(user.role);
  }

  /**
   * Check if user has enterprise or higher access
   */
  hasEnterpriseAccess(user: User | null): boolean {
    if (!user) return false;
    return ['enterprise', 'admin'].includes(user.role);
  }
}

export const authService = new AuthService();
export default authService;
