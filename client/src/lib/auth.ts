import { api } from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  credits: number;
  role: 'user' | 'admin';
}

interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}

export const authService = {
  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/register', { name, email, password });
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', res.token);
    }
    return res;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/login', { email, password });
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', res.token);
    }
    return res;
  },

  async me(): Promise<User> {
    const res = await api.get<{ success: boolean; user: User }>('/auth/me');
    return res.user;
  },

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  },

  isLoggedIn(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('token');
  },
};
