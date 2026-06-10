export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface UserProfile {
  id: number;
  user: User;
  user_id: number;
  role: 'owner' | 'caregiver' | 'both';
  phone: string;
  avatar: string | null;
  district: string;
  address: string;
  latitude: number;
  longitude: number;
  bio: string;
  created_at: string;
}

export interface CaregiverProfile {
  id: number;
  user_profile: UserProfile;
  experience: 'beginner' | 'junior' | 'senior' | 'expert';
  service_types: string[];
  pet_types: string[];
  video_url: string;
  daily_capacity: number;
  price_per_day: number;
  rating: number;
  review_count: number;
  completed_orders: number;
  is_verified: boolean;
  created_at: string;
  username?: string;
  district?: string;
  avatar?: string;
  bio?: string;
  match_score?: number;
}

export interface Pet {
  id: number;
  owner: number;
  owner_name: string;
  name: string;
  pet_type: 'dog' | 'cat' | 'rabbit' | 'bird' | 'other';
  breed: string;
  age: number;
  gender: 'male' | 'female' | 'unknown';
  weight: number | null;
  personality: string;
  diet_restrictions: string;
  health_notes: string;
  avatar: string | null;
  is_vaccinated: boolean;
  is_neutered: boolean;
  created_at: string;
}

export interface FosterRequest {
  id: number;
  owner: number;
  owner_name: string;
  pet: number;
  pet_info: Pet;
  title: string;
  description: string;
  services: string[];
  start_date: string;
  end_date: string;
  district: string;
  address: string;
  latitude: number;
  longitude: number;
  budget: number;
  status: 'open' | 'matched' | 'confirmed' | 'completed' | 'cancelled';
  matched_caregiver: number | null;
  matched_caregiver_info: CaregiverProfile | null;
  created_at: string;
  updated_at: string;
}

export interface HandoverItem {
  name: string;
  quantity: string;
}

export interface HandoverDiscrepancy {
  field: string;
  description: string;
}

export interface Handover {
  id: number;
  order: number;
  order_info?: Order;
  stage: 'start' | 'end';
  stage_display?: string;
  status: 'draft' | 'pending_owner_confirm' | 'pending_caregiver_confirm' | 'confirmed' | 'disputed';
  status_display?: string;
  items: HandoverItem[];
  feeding_instructions: string;
  health_notes: string;
  location: string;
  photos: string[];
  expected_time?: string;
  actual_items: HandoverItem[];
  actual_notes: string;
  discrepancies: HandoverDiscrepancy[];
  has_discrepancies: boolean;
  related_dispute?: number;
  related_dispute_info?: Dispute;
  owner_confirmed: boolean;
  caregiver_confirmed: boolean;
  owner_confirmed_at?: string;
  caregiver_confirmed_at?: string;
  confirmed_at?: string;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  is_editable: boolean;
}

export interface Order {
  id: number;
  foster_request: number;
  foster_request_info: FosterRequest;
  owner: number;
  owner_name: string;
  caregiver: number;
  caregiver_name: string;
  total_price: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'disputed';
  start_date: string;
  end_date: string;
  transport: 'caregiver_pickup' | 'owner_deliver' | 'meetup';
  transport_display?: string;
  services: string[];
  has_open_dispute?: boolean;
  owner_reviewed: boolean;
  caregiver_reviewed: boolean;
  handovers?: Handover[];
  latest_start_handover?: Handover | null;
  can_start_service?: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderChange {
  id: number;
  order: number;
  initiator: number;
  initiator_name: string;
  change_type: 'reschedule' | 'services' | 'transport' | 'price';
  change_type_display: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  status_display: string;
  original_start_date?: string;
  original_end_date?: string;
  new_start_date?: string;
  new_end_date?: string;
  original_services?: string[];
  new_services?: string[];
  original_transport?: 'caregiver_pickup' | 'owner_deliver' | 'meetup';
  original_transport_display?: string;
  new_transport?: 'caregiver_pickup' | 'owner_deliver' | 'meetup';
  new_transport_display?: string;
  original_price?: number;
  new_price?: number;
  price_diff: number;
  reason: string;
  confirmed_at?: string;
  confirmed_by?: number;
  confirmed_by_name?: string;
  reject_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface DisputeMessage {
  id: number;
  dispute: number;
  sender?: number;
  sender_name?: string;
  sender_role: 'owner' | 'caregiver' | 'system';
  sender_role_display: string;
  content: string;
  is_system: boolean;
  created_at: string;
}

export interface Dispute {
  id: number;
  order: number;
  order_info?: Order;
  initiator: number;
  initiator_name: string;
  status: 'open' | 'resolved' | 'closed';
  status_display: string;
  trigger_type: 'abnormal_behavior' | 'feeding_missing' | 'photo_missing' | 'manual';
  trigger_type_display: string;
  title: string;
  description: string;
  opened_at: string;
  resolved_at?: string;
  resolution?: string;
  resolved_by?: number;
  resolved_by_name?: string;
  escalation_alert_sent: boolean;
  messages?: DisputeMessage[];
  created_at: string;
  updated_at: string;
}

export interface DailyRecord {
  id: number;
  order: number;
  caregiver: number;
  caregiver_name: string;
  record_date: string;
  feeding_info: string;
  pet_status: string;
  mood: string;
  abnormal_behavior: boolean;
  abnormal_description: string;
  photos: string[];
  notes: string;
  created_at: string;
}

export interface Review {
  id: number;
  order: number;
  reviewer: number;
  reviewer_name: string;
  reviewee: number;
  reviewee_name: string;
  role: 'owner' | 'caregiver';
  rating: number;
  content: string;
  tags: string[];
  created_at: string;
}

export interface Statistics {
  overview: {
    total_orders: number;
    completed_orders: number;
    completion_rate: number;
    total_pets: number;
    total_caregivers: number;
    total_users: number;
    abnormal_rate: number;
    abnormal_records: number;
    total_records: number;
    change_success_rate: number;
    total_changes: number;
    approved_changes: number;
    dispute_rate: number;
    disputed_orders: number;
    avg_negotiation_hours: number;
    escalation_resolution_rate: number;
    escalated_count: number;
    escalated_resolved: number;
    total_handovers: number;
    confirmed_handovers: number;
    disputed_handovers: number;
    handover_discrepancy_count: number;
    handover_discrepancy_rate: number;
  };
  district_activity: { district: string; count: number }[];
  district_orders: { district: string; total: number; completed: number }[];
  top_caregivers: {
    id: number;
    username: string;
    district: string;
    rating: number;
    review_count: number;
    completed_orders: number;
  }[];
  abnormal_by_type: { order_pet_type: string; count: number }[];
  order_trend: { date: string; count: number }[];
  avg_reviews: { role: string; avg_rating: number; count: number }[];
  current_district?: string;
}
