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
    // Dynamic API URL based on environment
    const hostname = window.location.hostname;
    const isLocal = hostname.includes('localhost') || hostname === '127.0.0.1';
    this.baseUrl = isLocal ? 'http://localhost:5000' : 'https://api.pepperwahl.com';
    
    // Debug logging
    console.log('🔧 AuthService initialized');
    console.log('   Hostname:', hostname);
    console.log('   Is Local:', isLocal);
    console.log('   API Base URL:', this.baseUrl);
    
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
   * Send confirmation email
   */
  /**
 * Send confirmation email
 */
private async sendConfirmationEmail(email: string, name: string): Promise<void> {
  try {
    console.log('📧 Sending confirmation email to:', email);
    // Make sure this URL is correct
    const response = await fetch(`${this.baseUrl}/api/auth/send-confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email: email,  // Only email and name
        name: name     // NO PASSWORD!
      }),
    });
    
    console.log('📧 Confirmation email response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Confirmation email sent successfully:', data);
    } else {
      const error = await response.text();
      console.log('⚠️ Failed to send confirmation email:', error);
    }
  } catch (error) {
    // Don't block registration if email fails
    console.warn('⚠️ Email notification failed (non-blocking):', error);
  }
}

  /**
   * Login user
   */
  async login(credentials: LoginRequest): Promise<{ user: User; token: string }> {
    const url = `${this.baseUrl}/api/auth/login`;
    console.log('🔐 Attempting login to:', url);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });

      console.log('📥 Login response status:', response.status);
      console.log('📥 Login response content-type:', response.headers.get('content-type'));

      if (!response.ok) {
        // Check if we got HTML instead of JSON (endpoint not found)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          console.error('❌ Got HTML response instead of JSON - endpoint not found');
          throw new Error('Login service is temporarily unavailable. Please try again later.');
        }
        
        try {
          const error = await response.json();
          throw new Error(error.error || 'Login failed');
        } catch (e) {
          if (e instanceof Error) {
            throw e;
          }
          throw new Error(`Login failed with status ${response.status}`);
        }
      }

      const data = await response.json();
      console.log('✅ Login successful');
      
      // Store token
      if (data.token) {
        this.setToken(data.token);
      }
      
      return { user: data.user, token: data.token || 'mock-token' };
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  }

  /**
   * Register new user
   */
  async register(userData: RegisterRequest): Promise<{ user: User | null; token: string | null }> {
    const url = `${this.baseUrl}/api/auth/register`;
    console.log('📝 Attempting registration to:', url);
    console.log('📝 Registration data:', { email: userData.email, name: userData.name });
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(userData),
      });

      console.log('📥 Register response status:', response.status);
      console.log('📥 Register response content-type:', response.headers.get('content-type'));

      if (!response.ok) {
        // Check if we got HTML instead of JSON (endpoint not found)
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
          console.error('❌ Got HTML response instead of JSON - endpoint not found');
          console.error('   This means the backend endpoint /api/auth/register does not exist');
          console.error('   Backend URL:', this.baseUrl);
          throw new Error('Registration service is temporarily unavailable. Please try again later.');
        }
        
        try {
          const error = await response.json();
          console.error('❌ Registration error:', error);
          
          // Handle specific error cases
          if (error.error === 'User with this email already exists') {
            throw new Error('An account with this email already exists. Please login instead.');
          }
          
          throw new Error(error.error || 'Registration failed');
        } catch (e) {
          // If error is already an Error object, throw it
          if (e instanceof Error) {
            throw e;
          }
          console.error('❌ Could not parse error response');
          throw new Error(`Registration failed with status ${response.status}`);
        }
      }

      const data = await response.json();
      console.log('✅ Registration successful');
      
      // Send confirmation email (non-blocking)
      await this.sendConfirmationEmail(userData.email, userData.name);
      
      console.log('📩 Registration successful. Please check your email to confirm your account.');
      
      // Store user data and token if provided
      if (data.token) {
        this.setToken(data.token);
      }
      
      // Return user data (but note: user may not be active until email confirmed)
      return { user: data.user, token: data.token || null };
    } catch (error) {
      console.error('❌ Registration failed:', error);
      throw error;
    }
  }

  /**
   * Resend confirmation email
   */
  async resendConfirmationEmail(email: string): Promise<void> {
    try {
      console.log('📧 Resending confirmation email to:', email);
      const response = await fetch(`${this.baseUrl}/api/auth/resend-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to resend confirmation email');
      }
      
      console.log('✅ Confirmation email resent successfully');
    } catch (error) {
      console.error('❌ Failed to resend confirmation email:', error);
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