import axios, { AxiosResponse } from 'axios';
import { LoginRequest, RegisterRequest, ApiResponse, User } from '../../../shared/types';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  setToken: (token: string | null) => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  },

  login: async (credentials: LoginRequest): Promise<AxiosResponse<ApiResponse<{ user: User; token: string }>>> => {
    const response = await api.post('/auth/login', credentials);
    return response;
  },

  register: async (userData: RegisterRequest): Promise<AxiosResponse<ApiResponse<{ user: User; token: string }>>> => {
    const response = await api.post('/auth/register', userData);
    return response;
  },

  getProfile: async (): Promise<AxiosResponse<ApiResponse<{ user: User }>>> => {
    const response = await api.get('/auth/profile');
    return response;
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    authService.setToken(null);
  }
};

export default api;
