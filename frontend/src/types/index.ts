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
  owner_reviewed: boolean;
  caregiver_reviewed: boolean;
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
}
