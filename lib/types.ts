// Request Status Types
export type RequestStatus =
  | 'draft'
  | 'pending_head'
  | 'pending_parent_head'
  | 'pending_admin'
  | 'pending_comptroller'
  | 'pending_hr'
  | 'pending_vp'
  | 'pending_president'
  | 'pending_exec'
  | 'pending_hr_ack'
  | 'approved'
  | 'rejected'
  | 'cancelled';

// Request Type
export type RequestType = 'travel_order' | 'seminar';

// Vehicle Type
export type VehicleType = 'van' | 'bus' | 'car' | 'motorcycle' | 'suv';

// UI Vehicle Type (capitalized)
export type UIVehicleType = 'Van' | 'Bus' | 'Car' | 'Motorcycle' | 'SUV';

// User Role
export type UserRole = 'admin' | 'faculty' | 'driver' | 'head' | 'hr' | 'exec' | 'comptroller';

// Request Interface
export interface Request {
  id: string;
  request_number: string;
  request_type: RequestType;
  title: string;
  purpose: string;
  destination: string;
  travel_start_date: string;
  travel_end_date: string;
  created_at: string;
  updated_at: string;
  
  // Requester Info
  requester_id: string;
  requester_name: string;
  requester_signature: string | null;
  requester_is_head: boolean;
  department_id: string;
  parent_department_id: string | null;
  
  // Participants
  participants: Array<{
    id: string;
    name: string;
    email?: string;
    is_head?: boolean;
  }> | null;
  head_included: boolean;
  
  // Budget
  has_budget: boolean;
  total_budget: number | null;
  expense_breakdown: Array<{
    category: string;
    amount: number;
    description?: string;
  }> | null;
  comptroller_edited_budget: number | null;
  
  // Vehicle Requirements
  needs_vehicle: boolean;
  vehicle_type: VehicleType | null;
  needs_rental: boolean;
  rental_note: string | null;
  assigned_vehicle_id: string | null;
  assigned_driver_id: string | null;
  preferred_vehicle_id: string | null;
  preferred_driver_id: string | null;
  preferred_vehicle_note: string | null;
  preferred_driver_note: string | null;
  transportation_type: 'owned' | 'institutional' | 'rent' | null;
  pickup_location: string | null;
  pickup_time: string | null;
  dropoff_location: string | null;
  dropoff_time: string | null;
  cost_justification: string | null;
  
  // Status & Workflow
  status: RequestStatus;
  current_approver_role: string | null;
  
  // Approval Chain
  head_approved_at: string | null;
  head_approved_by: string | null;
  head_signature: string | null;
  head_comments: string | null;
  
  parent_head_approved_at: string | null;
  parent_head_approved_by: string | null;
  parent_head_signature: string | null;
  parent_head_comments: string | null;
  
  admin_processed_at: string | null;
  admin_processed_by: string | null;
  admin_comments: string | null;
  
  comptroller_approved_at: string | null;
  comptroller_approved_by: string | null;
  comptroller_comments: string | null;
  
  hr_approved_at: string | null;
  hr_approved_by: string | null;
  hr_signature: string | null;
  hr_comments: string | null;
  
  vp_approved_at: string | null;
  vp_approved_by: string | null;
  vp_signature: string | null;
  vp_comments: string | null;
  
  president_approved_at: string | null;
  president_approved_by: string | null;
  president_signature: string | null;
  president_comments: string | null;
  
  exec_approved_at: string | null;
  exec_approved_by: string | null;
  exec_signature: string | null;
  exec_comments: string | null;
  
  final_approved_at: string | null;
  
  // Rejection
  rejected_at: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
  rejection_stage: string | null;
  
  // Relations
  department?: {
    id: string;
    name: string;
    code: string;
  };
  assigned_vehicle?: {
    id: string;
    vehicle_name: string;
    plate_number: string;
    type: VehicleType;
  } | null;
  assigned_driver?: {
    id: string;
    name: string;
  } | null;
  preferred_vehicle?: {
    id: string;
    vehicle_name: string;
    plate_number: string;
  } | null;
  preferred_driver?: {
    id: string;
    name: string;
  } | null;
}

// Notification Interface
export interface Notification {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  related_type: string | null;
  related_id: string | null;
  action_url: string | null;
  action_label: string | null;
  priority: 'low' | 'normal' | 'high';
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  expires_at: string | null;
}

// Booking Interface (for calendar)
export interface Booking {
  id: string;
  dateISO: string; // "YYYY-MM-DD"
  endDateISO?: string; // "YYYY-MM-DD" - for multi-day trips
  vehicle: UIVehicleType;
  vehicleName: string;
  driver: string;
  department: string;
  destination: string;
  purpose: string;
  departAt: string; // "HH:mm"
  returnAt: string; // "HH:mm"
  status: RequestStatus;
}

// User Availability Status
export type AvailabilityStatus = 'online' | 'busy' | 'off_work' | 'on_leave';

// User Profile Interface
export interface UserProfile {
  id: string;
  auth_user_id: string;
  email: string;
  name: string;
  role: UserRole;
  department_id: string | null;
  department?: {
    id: string;
    name: string;
    code: string;
  } | null;
  is_head: boolean;
  is_hr: boolean;
  is_exec: boolean;
  is_vp: boolean;
  is_president: boolean;
  profile_picture: string | null;
  phone_number: string | null;
  position_title: string | null;
  status: 'active' | 'inactive';
  availability_status?: AvailabilityStatus;
}

// Department Interface
export interface Department {
  id: string;
  name: string;
  code: string;
  parent_department_id: string | null;
}

