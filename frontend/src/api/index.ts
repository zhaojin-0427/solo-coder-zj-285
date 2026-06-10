import axios from 'axios';
import type {
  User, UserProfile, CaregiverProfile, Pet, FosterRequest,
  Order, DailyRecord, Review, Statistics, OrderChange, Dispute, DisputeMessage,
  Handover, Escrow, RefundRequest
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true,
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
  payEscrow: (id: number) =>
    api.post<{ success: boolean; escrow: Escrow; order: Order }>(`/orders/${id}/pay_escrow/`),
  settle: (id: number) =>
    api.post<{ success: boolean; escrow: Escrow; order: Order; blocked_reasons?: string[] }>(`/orders/${id}/settle/`),
  escrowDetail: (id: number) => api.get<Escrow>(`/orders/${id}/escrow_detail/`),
  caregiverPendingIncome: () =>
    api.get<{ success: boolean; total_pending: number; count: number; escrows: Escrow[] }>(
      '/orders/caregiver_pending_income/'
    ),
};

export const dailyRecordApi = {
  list: (params?: any) => api.get<DailyRecord[]>('/daily-records/', { params }),
  create: (data: any) => api.post<DailyRecord>('/daily-records/', data),
};

export const reviewApi = {
  list: (params?: any) => api.get<Review[]>('/reviews/', { params }),
  create: (data: any) => api.post<Review>('/reviews/', data),
};

export const orderChangeApi = {
  list: (params?: any) => api.get<OrderChange[]>('/order-changes/', { params }),
  get: (id: number) => api.get<OrderChange>(`/order-changes/${id}/`),
  create: (data: any) => api.post<OrderChange>('/order-changes/', data),
  approve: (id: number) => api.post(`/order-changes/${id}/approve/`),
  reject: (id: number, rejectReason: string) =>
    api.post(`/order-changes/${id}/reject/`, { reject_reason: rejectReason }),
  cancel: (id: number) => api.post(`/order-changes/${id}/cancel/`),
};

export const disputeApi = {
  list: (params?: any) => api.get<Dispute[]>('/disputes/', { params }),
  get: (id: number) => api.get<Dispute>(`/disputes/${id}/`),
  create: (data: any) => api.post<Dispute>('/disputes/', data),
  addMessage: (id: number, content: string) =>
    api.post(`/disputes/${id}/add_message/`, { content }),
  resolve: (id: number, resolution: string) =>
    api.post(`/disputes/${id}/resolve/`, { resolution }),
  close: (id: number, resolution?: string) =>
    api.post(`/disputes/${id}/close/`, { resolution }),
};

export const statsApi = {
  get: (params?: any) => api.get<Statistics>('/statistics/', { params }),
};

export const handoverApi = {
  list: (params?: any) => api.get<Handover[]>('/handovers/', { params }),
  get: (id: number) => api.get<Handover>(`/handovers/${id}/`),
  create: (data: any) => api.post<Handover>('/handovers/', data),
  update: (id: number, data: any) => api.put<Handover>(`/handovers/${id}/`, data),
  submit: (id: number) => api.post<{ success: boolean; handover: Handover }>(`/handovers/${id}/submit_for_confirmation/`),
  caregiverConfirm: (id: number, data?: any) =>
    api.post<{ success: boolean; handover: Handover; dispute_created?: boolean; dispute?: Dispute }>(
      `/handovers/${id}/caregiver_confirm/`, data || {}
    ),
  ownerFinalConfirm: (id: number) =>
    api.post<{ success: boolean; handover: Handover }>(`/handovers/${id}/owner_final_confirm/`),
};

export const escrowApi = {
  list: (params?: any) => api.get<Escrow[]>('/escrows/', { params }),
  get: (id: number) => api.get<Escrow>(`/escrows/${id}/`),
};

export const refundApi = {
  list: (params?: any) => api.get<RefundRequest[]>('/refund-requests/', { params }),
  get: (id: number) => api.get<RefundRequest>(`/refund-requests/${id}/`),
  create: (data: { order: number; amount: number; reason: string }) =>
    api.post<RefundRequest>('/refund-requests/', data),
  approve: (id: number) =>
    api.post<{ success: boolean; refund: RefundRequest; escrow: Escrow }>(`/refund-requests/${id}/approve/`),
  reject: (id: number, rejectReason: string) =>
    api.post<{ success: boolean; refund: RefundRequest }>(`/refund-requests/${id}/reject/`, {
      reject_reason: rejectReason,
    }),
  cancel: (id: number) =>
    api.post<{ success: boolean; refund: RefundRequest }>(`/refund-requests/${id}/cancel/`),
};
