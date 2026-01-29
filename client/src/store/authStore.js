import { create } from 'zustand';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  loading: false,
  error: null,

  setAuthHeaders: (token) => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email,
        password
      });
      
      const { token, user, message } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      set({
        user,
        token,
        isAuthenticated: true,
        loading: false,
        error: null
      });
      
      get().setAuthHeaders(token);
      return { success: true, message: message || 'Login successful' };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      set({
        loading: false,
        error: errorMessage,
        isAuthenticated: false
      });
      return { success: false, message: errorMessage };
    }
  },

  register: async (username, email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, {
        username,
        email,
        password
      });
      
      const { token, user, message } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      set({
        user,
        token,
        isAuthenticated: true,
        loading: false,
        error: null
      });
      
      get().setAuthHeaders(token);
      return { success: true, message: message || 'Registration successful' };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      set({
        loading: false,
        error: errorMessage,
        isAuthenticated: false
      });
      return { success: false, message: errorMessage };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    get().setAuthHeaders(null);
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null
    });
  },

  getCurrentUser: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }

    try {
      get().setAuthHeaders(token);
      const response = await axios.get(`${API_BASE_URL}/api/auth/me`);
      const user = response.data.user;
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }
      set({
        user,
        token,
        isAuthenticated: true,
        error: null
      });
    } catch (error) {
      console.error('Get current user error:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        get().setAuthHeaders(null);
        set({ isAuthenticated: false, user: null, token: null });
      } else {
        set({ isAuthenticated: false, user: null });
      }
    }
  },

  initialize: async () => {
    set({ loading: true });
    const token = localStorage.getItem('token');
    if (token) {
      get().setAuthHeaders(token);
      set({ token });
      await get().getCurrentUser();
    } else {
      get().setAuthHeaders(null);
      set({ isAuthenticated: false, user: null, token: null });
    }
    set({ loading: false });
  }
}));

export default useAuthStore;
