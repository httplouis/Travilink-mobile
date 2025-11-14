# TraviLink Web - Comprehensive Requester View Analysis

## 📋 Overview
This document provides a complete analysis of the TraviLink web application's requester view, focusing on all features, components, API endpoints, data structures, and business logic needed for mobile implementation.

---

## 🎯 Core Features

### 1. Request Submission (RequestWizard)
**Location**: `src/components/user/request/RequestWizard.client.tsx`

#### Request Types
- **Travel Order**: Standard travel requests
- **Seminar Application**: Training/seminar participation requests

#### Request Reasons (Reason Types)
- `official` - Official business
- `ces` - CES
- `seminar` - Seminar / Training / Meeting
- `educational` - Educational Trip
- `competition` - Competition
- `visit` - Visit / Coordination

#### Vehicle Modes
- `institutional` - University vehicle (requires School Service section)
- `owned` - Personal vehicle
- `rent` - Rental vehicle (requires justification)

#### Requester Roles
- `faculty` - Regular faculty/staff
- `head` - Department head/dean
- `org` - Organization (OSAS)

---

## 📝 Form Fields & Validation

### Travel Order Form Fields
**Location**: `src/components/user/request/ui/TravelOrderForm.ui.tsx`

#### Required Fields
1. **Date** (`travelOrder.date`) - Request date
2. **Requesting Person** (`travelOrder.requestingPerson`) - Name of person requesting
3. **Department** (`travelOrder.department`) - Department selection
4. **Destination** (`travelOrder.destination`) - Travel destination (with geolocation)
5. **Departure Date** (`travelOrder.departureDate`) - Start date
6. **Return Date** (`travelOrder.returnDate`) - End date (must be >= departure)
7. **Purpose of Travel** (`travelOrder.purposeOfTravel`) - Description
8. **Requester Signature** (`travelOrder.requesterSignature`) - E-signature (data URL, min 3000 chars)

#### Optional Fields
- **Costs Section**:
  - Food
  - Driver's Allowance
  - Rent Vehicles
  - Hired Drivers
  - Accommodation
  - Other (with label)
  - **Justification** (required if renting/hiring)

- **Endorsement Section** (for non-head requesters):
  - Endorsed By Head Name (auto-filled from department)
  - Endorsed By Head Date
  - Endorsed By Head Signature (optional on submission)

### Seminar Application Form Fields
**Location**: `src/components/user/request/ui/SeminarApplicationForm.ui.tsx`

#### Required Fields
1. **Application Date** (`seminar.applicationDate`)
2. **Title** (`seminar.title`) - Full seminar/training title
3. **Date From** (`seminar.dateFrom`) - Start date
4. **Date To** (`seminar.dateTo`) - End date
5. **Requester Signature** (`seminar.requesterSignature`) - E-signature

#### Optional Fields
- **Type of Training**: Compliance | Professional Development
- **Training Category**: Local | Regional | National | International
- **Sponsor** - Event sponsor
- **Venue** - Event location (with geolocation)
- **Modality**: Onsite | Online | Hybrid
- **Fees**:
  - Registration Fee
  - Total Amount
- **Breakdown**:
  - Registration
  - Accommodation
  - Per Diem / Meals / Driver's Allowance
  - Transport Fare / Gas / Parking / Toll
  - Other (with label)
- **Make-up Class Schedule**
- **Applicant Undertaking** (checkbox)
- **Fund Release Line** (number)

### School Service Section (Institutional Vehicles Only)
**Location**: `src/components/user/request/ui/SchoolServiceSection.ui.tsx`

#### Fields
- **Driver** - Driver selection (required)
- **Vehicle** - Vehicle selection (required)
- **Preferred Driver** (optional) - Faculty suggestion
- **Preferred Vehicle** (optional) - Faculty suggestion
- **Vehicle Dispatcher Signed** (auto-filled by admin)
- **Vehicle Dispatcher Date** (auto-filled by admin)

---

## 🔄 Workflow & Approval Process

### Workflow Engine
**Location**: `src/lib/workflow/engine.ts`

#### Status Flow

**Faculty Request (with parent department)**:
```
draft → pending_head → pending_parent_head → pending_admin → 
[if budget: pending_comptroller] → pending_hr → pending_exec → approved
```

**Faculty Request (no parent department)**:
```
draft → pending_head → pending_admin → 
[if budget: pending_comptroller] → pending_hr → pending_exec → approved
```

**Head Request**:
```
draft → pending_admin → 
[if budget: pending_comptroller] → pending_hr → pending_exec → approved
```

#### Status Types
- `draft` - Not yet submitted
- `pending_head` - Waiting for department head approval
- `pending_parent_head` - Waiting for parent department head approval
- `pending_admin` - Waiting for admin (TM) processing
- `pending_comptroller` - Waiting for comptroller (if has budget)
- `pending_hr` - Waiting for HR approval
- `pending_exec` - Waiting for executive approval
- `approved` - Fully approved
- `rejected` - Rejected at any stage
- `cancelled` - Cancelled by requester

#### Business Rules
1. **Head requests skip head approval** - Go directly to admin
2. **Parent department approval** - If department has `parent_department_id`, requires parent head approval
3. **Comptroller approval** - Only required if `has_budget = true`
4. **5 requests per day limit** - Enforced at submission
5. **Department budget check** - Can't request if department budget exhausted
6. **Date validation** - Return date must be >= departure date

---

## 🔌 API Endpoints

### Request Submission
**POST** `/api/requests/submit`

**Request Body**:
```typescript
{
  travelOrder?: {
    date: string;
    requestingPerson: string;
    department: string;
    destination: string;
    departureDate: string;
    returnDate: string;
    purposeOfTravel: string;
    costs?: {
      food?: number;
      driversAllowance?: number;
      rentVehicles?: number;
      hiredDrivers?: number;
      accommodation?: number;
      otherLabel?: string;
      otherAmount?: number;
      justification?: string;
    };
    requesterSignature: string; // data URL
    endorsedByHeadName?: string;
    endorsedByHeadDate?: string;
    endorsedByHeadSignature?: string;
  };
  reason: "official" | "ces" | "seminar" | "educational" | "competition" | "visit";
  vehicleMode: "institutional" | "owned" | "rent";
  schoolService?: {
    driver: string;
    vehicle: string;
    preferredDriver?: string; // User ID
    preferredVehicle?: string; // Vehicle ID
  };
  seminar?: {
    applicationDate: string;
    title: string;
    dateFrom: string;
    dateTo: string;
    typeOfTraining: string[];
    trainingCategory?: string;
    sponsor?: string;
    venue?: string;
    modality?: string;
    fees?: {
      registrationFee?: number;
      totalAmount?: number;
    };
    breakdown?: {
      registration?: number;
      accommodation?: number;
      perDiemMealsDriversAllowance?: number;
      transportFareGasParkingToll?: number;
      otherLabel?: string;
      otherAmount?: number;
    };
    requesterSignature: string; // data URL
    participantInvitations?: Array<{
      email: string;
      name?: string;
    }>;
  };
  status?: "draft" | "submitted"; // Optional: "draft" for saving drafts
}
```

**Response**:
```typescript
{
  ok: boolean;
  data?: {
    id: string;
    request_number: string;
    status: string;
    // ... full request object
  };
  error?: string;
}
```

### Get User Submissions
**GET** `/api/requests/my-submissions`

**Response**:
```typescript
{
  ok: boolean;
  data?: Array<Request>;
}
```

### Get Request Details
**GET** `/api/requests/[id]`

**Response**:
```typescript
{
  ok: boolean;
  data?: Request;
}
```

### Get Request Tracking
**GET** `/api/requests/[id]/tracking`

**Response**:
```typescript
{
  ok: boolean;
  data?: {
    request: Request;
    history: Array<{
      id: string;
      action: string;
      actor_name: string;
      actor_role: string;
      previous_status: string;
      new_status: string;
      comments?: string;
      created_at: string;
    }>;
    approvers: {
      head?: { name: string; approved_at: string };
      parent_head?: { name: string; approved_at: string };
      admin?: { name: string; processed_at: string };
      comptroller?: { name: string; approved_at: string };
      hr?: { name: string; approved_at: string };
      exec?: { name: string; approved_at: string };
    };
  };
}
```

### Get User Trips (Calendar)
**GET** `/api/trips/my-trips`

**Response**:
```typescript
{
  ok: boolean;
  data?: Array<{
    id: string;
    dateISO: string; // YYYY-MM-DD
    time: string; // HH:mm
    destination: string;
    purpose: string;
    department: string;
    vehicle: string; // "Van" | "Bus" | "Car"
    vehicleName: string; // "Vehicle Name (Plate)"
    driver: string;
    status: string;
  }>;
}
```

### Notifications
**GET** `/api/notifications?limit=50`

**PATCH** `/api/notifications` - Mark as read
```typescript
{
  ids: string[];
  is_read: boolean;
}
```

---

## 🗄️ Database Schema (Key Fields)

### Requests Table
```typescript
{
  id: string; // UUID
  request_number: string; // Auto-generated (e.g., "REQ-2025-001")
  request_type: "travel_order" | "seminar";
  title: string;
  purpose: string;
  destination: string;
  travel_start_date: string; // ISO timestamp
  travel_end_date: string; // ISO timestamp
  
  // Requester
  requester_id: string; // FK to users.id
  requester_name: string;
  requester_signature: string | null; // data URL
  requester_is_head: boolean;
  department_id: string; // FK to departments.id
  parent_department_id: string | null; // FK to departments.id
  
  // Participants
  participants: Array<{id, name, email, is_head}> | null;
  head_included: boolean;
  
  // Budget
  has_budget: boolean;
  total_budget: number | null;
  expense_breakdown: Array<{category, amount, description}> | null;
  comptroller_edited_budget: number | null;
  
  // Vehicle
  needs_vehicle: boolean;
  vehicle_type: "van" | "bus" | "car" | "motorcycle" | "suv" | null;
  needs_rental: boolean;
  assigned_vehicle_id: string | null; // FK to vehicles.id
  assigned_driver_id: string | null; // FK to users.id
  preferred_vehicle_id: string | null; // FK to vehicles.id
  preferred_driver_id: string | null; // FK to users.id
  transportation_type: "owned" | "institutional" | "rent" | null;
  cost_justification: string | null;
  
  // Status
  status: RequestStatus;
  current_approver_role: string | null;
  
  // Approval timestamps & signatures
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
  
  created_at: string;
  updated_at: string;
}
```

---

## 🎨 UI Components

### RequestCard
- Displays request summary
- Status badge
- Progress indicator
- Quick actions (View Details, View Tracking)

### RequestStatusTracker
- Visual approval workflow
- Shows completed, current, and pending stages
- Compact and full modes
- Color-coded stages

### StatusBadge
- Color-coded status indicators
- Icons for each status
- Sizes: sm, md, lg

### SubmissionsView
- List of user's requests
- Filters (status, date range)
- Search functionality
- Real-time updates
- Pull-to-refresh

### Calendar View
- Month calendar with color-coded dates
- Date details modal
- View selectors (Week/Month/2-Month/Year)
- Legend for availability

### NotificationsView
- Tabs (Unread / All)
- Mark as read
- Mark all as read
- Real-time new notifications
- Navigation to related requests

---

## 🔐 Authentication & Authorization

### User Roles
- `faculty` - Regular faculty/staff
- `head` - Department head/dean
- `admin` - Administrator
- `driver` - Driver
- `hr` - Human Resources
- `exec` - Executive
- `comptroller` - Comptroller

### Session Management
- Uses Supabase Auth
- Session stored in cookies (web) / SecureStore (mobile)
- Auto-refresh tokens
- Protected routes via middleware

---

## 📱 Mobile Implementation Notes

### Key Differences for Mobile
1. **Navigation**: Tab-based instead of sidebar
2. **Forms**: Multi-step wizard instead of single page
3. **Signatures**: Use `expo-signature-pad` or similar
4. **File Uploads**: Use `expo-document-picker` for attachments
5. **Real-time**: Supabase Realtime subscriptions
6. **Offline**: Consider offline queue for submissions

### Required Mobile Features
1. ✅ My Papers (Submissions List)
2. ✅ Request Details
3. ✅ Calendar/Schedule
4. ✅ Notifications
5. ⏳ Request Submission (TODO)
6. ⏳ Draft Management (TODO)
7. ⏳ PDF Download (TODO)

---

## 🐛 Known Issues & Edge Cases

1. **Department Name Matching**: Multiple strategies (exact, code extraction, ILIKE)
2. **Driver/Vehicle Validation**: Preferred driver/vehicle must exist in database
3. **Date Validation**: Return date must be >= departure date
4. **Signature Validation**: Must be valid data URL with min 3000 chars
5. **Budget Calculation**: Auto-calculated from expense breakdown
6. **Request Number Generation**: Auto-generated with retry logic for duplicates

---

## 📚 Additional Resources

- **Validation Logic**: `src/lib/user/request/validation.ts`
- **Workflow Engine**: `src/lib/workflow/engine.ts`
- **Routing Logic**: `src/lib/user/request/routing.ts`
- **Types**: `src/lib/user/request/types.ts`
- **Store**: `src/store/user/requestStore.ts` (Zustand)

---

## ✅ Implementation Checklist for Mobile

### Phase 1: Setup ✅
- [x] Expo Router
- [x] Supabase client
- [x] TanStack Query
- [x] TypeScript config

### Phase 2: Authentication ✅
- [x] Sign-in screen
- [x] Auth context
- [x] Protected routes

### Phase 3: My Papers ✅
- [x] Submissions list
- [x] RequestCard component
- [x] Real-time updates

### Phase 4: Request Details ✅
- [x] Details screen
- [x] Tracking view
- [x] Status tracker

### Phase 5: Calendar ✅
- [x] Month view
- [x] Date details
- [x] Bookings display

### Phase 6: Notifications ✅
- [x] Notifications list
- [x] Mark as read
- [x] Real-time updates

### Phase 7: Request Submission (TODO)
- [ ] Request wizard
- [ ] Form fields
- [ ] Validation
- [ ] Signature pad
- [ ] Draft saving
- [ ] Submission API

### Phase 8: Polish (TODO)
- [ ] Error handling
- [ ] Loading states
- [ ] Offline support
- [ ] Performance optimization

