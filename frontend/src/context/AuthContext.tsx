import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { userApi } from '../api';
import type { User, UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  login: (username: string, password?: string, role?: string, district?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('petfoster_user');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setUser(data.user);
        setProfile(data.profile);
      } catch {}
    } else {
      login('zhang_san', '123456');
    }
  }, []);

  const login = async (username: string, password?: string, role?: string, district?: string) => {
    setIsLoading(true);
    try {
      const res = await userApi.login({ username, password, role, district });
      setUser(res.data.user);
      setProfile(res.data.profile);
      localStorage.setItem('petfoster_user', JSON.stringify({
        user: res.data.user,
        profile: res.data.profile,
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setProfile(null);
    localStorage.removeItem('petfoster_user');
  };

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
