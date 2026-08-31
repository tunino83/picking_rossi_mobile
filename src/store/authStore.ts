import { create } from 'zustand';
import { User } from '../types';
import { apiClient } from '../lib/api';
import { APP_CONFIG } from '../config/app.config';
import { getApiBaseUrl } from '../config/app.config';

interface AuthState {
  user: User | null;
  authLoading: boolean;
  tempEmail: string | null;
  setUser: (user: User | null) => void;
  setAuthLoading: (loading: boolean) => void;
  signIn: (email: string, password: string) => Promise<void>;
  verify2FA: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
  loadUserProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  authLoading: false,
  tempEmail: null,
  
  setUser: (user) => set({ user }),
  setAuthLoading: (loading) => set({ authLoading: loading }),
  
  signIn: async (email, password) => {
    set({ authLoading: true });
    try {
      /*
      console.log('🔐 Attempting login with:', { email, password });
      console.log('🔧 Config:', { 
        useDummyServer: APP_CONFIG.USE_DUMMY_SERVER, 
        enable2FA: APP_CONFIG.ENABLE_2FA,
        apiUrl: getApiBaseUrl()
      });
      */
      
      const response = await apiClient.login(email, password);
      
      // Check if 2FA is enabled and response requires verification
      if (APP_CONFIG.ENABLE_2FA && response.requiresVerification) {
        set({ tempEmail: email });
      } else if (response.user && response.token) {
        // Direct login without 2FA (disabled or dummy server)
        //console.log('✅ Direct login successful');
        set({ user: response.user });
      } else if (response.requiresVerification) {
        // 2FA disabled but server still requires it - set temp email
        //console.log('📱 Server requires 2FA but client has it disabled');
        set({ tempEmail: email });
      }
      
    } catch (error) {
      //console.error('❌ Login error:', error);
      throw error;
    } finally {
      set({ authLoading: false });
    }
  },
  
  verify2FA: async (code) => {
    set({ authLoading: true });
    try {
      const { tempEmail } = get();
      if (!tempEmail) {
        throw new Error('No email found for verification');
      }
      
      const response = await apiClient.verify2FA(tempEmail, code);
      
      set({ 
        user: response.user, 
        tempEmail: null 
      });
      
    } catch (error) {
      throw error;
    } finally {
      set({ authLoading: false });
    }
  },
  
  signOut: async () => {
    set({ authLoading: true });
    try {
      apiClient.clearToken();
      set({ user: null, tempEmail: null });
    } finally {
      set({ authLoading: false });
    }
  },

  loadUserProfile: async () => {
    set({ authLoading: true });
    try {
      const response = await apiClient.getUserProfile();
      set({ user: response.user });
    } catch (error) {
      // If profile loading fails, user is likely not authenticated
      apiClient.clearToken();
      set({ user: null });
    } finally {
      set({ authLoading: false });
    }
  },
}));

// Load user profile on app start if token exists
const token = localStorage.getItem('authToken');
if (token) {
  useAuthStore.getState().loadUserProfile();
}