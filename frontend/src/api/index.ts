import axios from 'axios';
import type {
  User, UserProfile, CaregiverProfile, Pet, FosterRequest,
  Order, DailyRecord, Review, Statistics
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export const userApi = {
  login: (data: { username: string; password?: string; role?: string; district?: string }) =>
    api.post<{ success: boolean; user: User; profile: UserProfile }>('/users/login/', data),
  list: () => api.get<User[]>('/users/'),
};

export const profileApi = {
  list: (params?: any) => api.get<UserProfile[]>('/profiles/', { params }),
  get: (id: number) => api.get<UserProfile>(`/profiles/${id}/`),
  update: (id: number, data: any) => api.put<UserProfile>(`/profiles/${id}/`, data),
};

export const caregiverApi = {
  list: (params?: any) => api.get<CaregiverProfile[]>('/caregivers/', { params }),
  get: (id: number) => api.get<CaregiverProfile>(`/caregivers/${id}/`),
  match: (params: {
    request_id?: number;
    latitude: number;
    longitude: number;
    pet_type: string;
    services: string[];
    budget: number;
  }) => api.get<CaregiverProfile[]>('/caregivers/match/', { params }),
};

export const petApi = {
  list: (params?: any) => api.get<Pet[]>('/pets/', { params }),
  get: (id: number) => api.get<Pet>(`/pets/${id}/`),
  create: (data: any) => api.post<Pet>('/pets/', data),
  update: (id: number, data: any) => api.put<Pet>(`/pets/${id}/`, data),
  delete: (id: number) => api.delete(`/pets/${id}/`),
};

export const requestApi = {
  list: (params?: any) => api.get<FosterRequest[]>('/requests/', { params }),
  get: (id: number) => api.get<FosterRequest>(`/requests/${id}/`),
  create: (data: any) => api.post<FosterRequest>('/requests/', data),
  update: (id: number, data: any) => api.put<FosterRequest>(`/requests/${id}/`, data),
  confirmMatch: (id: number, caregiverId: number) =>
    api.post(`/requests/${id}/confirm_match/`, { caregiver_id: caregiverId }),
};

export const orderApi = {
  list: (params?: any) => api.get<Order[]>('/orders/', { params }),
  get: (id: number) => api.get<Order>(`/orders/${id}/`),
  start: (id: number) => api.post<Order>(`/orders/${id}/start/`),
  complete: (id: number) => api.post<Order>(`/orders/${id}/complete/`),
};

export const dailyRecordApi = {
  list: (params?: any) => api.get<DailyRecord[]>('/daily-records/', { params }),
  create: (data: any) => api.post<DailyRecord>('/daily-records/', data),
};

export const reviewApi = {
  list: (params?: any) => api.get<Review[]>('/reviews/', { params }),
  create: (data: any) => api.post<Review>('/reviews/', data),
};

export const statsApi = {
  get: () => api.get<Statistics>('/statistics/'),
};
