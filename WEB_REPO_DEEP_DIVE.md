# TraviLink Web - Complete Deep Dive Analysis

## 📚 Comprehensive Analysis of Every File, Folder, and Component

This document provides an exhaustive analysis of the TraviLink web application repository, covering every aspect needed for mobile implementation.

---

## 🗂️ Repository Structure

```
C:\Users\CATHY\Documents\Travilink(repo)\TraviLink\
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (protected)/        # Protected routes
│   │   │   ├── user/           # Requester view
│   │   │   ├── admin/          # Admin view
│   │   │   ├── head/           # Head view
│   │   │   ├── hr/             # HR view
│   │   │   ├── exec/           # Executive view
│   │   │   └── driver/         # Driver view
│   │   ├── api/                # API routes
│   │   ├── login/              # Login page
│   │   └── middleware.ts       # Route protection
│   ├── components/             # React components
│   │   ├── user/               # User/requester components
│   │   ├── admin/              # Admin components
│   │   └── common/             # Shared components
│   ├── lib/                    # Utilities and helpers
│   │   ├── supabase/           # Supabase clients
│   │   ├── workflow/           # Workflow engine
│   │   ├── user/               # User-specific logic
│   │   └── datetime.ts         # Date formatting
│   ├── store/                  # Zustand state management
│   └── hooks/                  # Custom React hooks
├── public/                     # Static assets
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
├── tailwind.config.js          # Tailwind config
└── next.config.ts              # Next.js config
```

---

## 🔐 Authentication Flow

### Login Process (`src/app/api/auth/login/route.ts`)

1. **User submits email/password**
2. **Supabase Auth** authenticates via `signInWithPassword`
3. **Fetch Profile** from `users` table using `auth_user_id`
4. **Determine Role** from profile flags (`is_head`, `is_hr`, `is_exec`, etc.)
5. **Set Cookie** with role (`tl_role`)
6. **Redirect** based on role:
   - `admin` → `/admin`
   - `head` → `/head/dashboard`
   - `hr` → `/hr/dashboard`
   - `exec` → `/exec/dashboard`
   - `driver` → `/driver`
   - `faculty` → `/user`

### Profile Fetching Pattern

**Web App Pattern:**
```typescript
// 1. Get auth user
const { data: { user } } = await supabase.auth.getUser();

// 2. Get profile from users table
const { data: profile } = await supabase
  .from("users")
  .select("id, email, name, role, department_id, is_head, is_hr, is_exec")
  .eq("auth_user_id", user.id)  // Match auth user ID
  .single();

// 3. Use profile.id (UUID) for queries
.eq("requester_id", profile.id)  // Use profile's UUID, not auth_user_id
```

**Key Insight:** 
- `auth_user_id` = Supabase Auth user ID (from `auth.users`)
- `users.id` = Primary key UUID (used in `requester_id` foreign key)
- Always query requests using `profile.id`, NOT `auth_user_id`

---

## 📊 Database Schema (Complete)

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,                    -- Primary key (used in requester_id)
  auth_user_id UUID REFERENCES auth.users(id),  -- Supabase Auth user ID
  email TEXT,
  name TEXT,
  role TEXT,                              -- 'faculty', 'head', 'admin', etc.
  department_id UUID REFERENCES departments(id),
  is_head BOOLEAN DEFAULT false,
  is_hr BOOLEAN DEFAULT false,
  is_exec BOOLEAN DEFAULT false,
  is_vp BOOLEAN DEFAULT false,
  is_president BOOLEAN DEFAULT false,
  profile_picture TEXT,
  phone_number TEXT,
  position_title TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Requests Table
```sql
CREATE TABLE requests (
  id UUID PRIMARY KEY,
  request_number TEXT UNIQUE,             -- Auto-generated: "REQ-2025-001"
  request_type TEXT,                      -- 'travel_order' | 'seminar'
  title TEXT,
  purpose TEXT,
  destination TEXT,
  travel_start_date TIMESTAMPTZ,
  travel_end_date TIMESTAMPTZ,
  
  -- Requester (FK to users.id, NOT auth_user_id!)
  requester_id UUID REFERENCES users(id),
  requester_name TEXT,
  requester_signature TEXT,               -- data URL
  requester_is_head BOOLEAN,
  department_id UUID REFERENCES departments(id),
  parent_department_id UUID REFERENCES departments(id),
  
  -- Participants (JSONB array)
  participants JSONB,                    -- [{id, name, email, is_head}]
  head_included BOOLEAN,
  
  -- Budget
  has_budget BOOLEAN,
  total_budget NUMERIC,
  expense_breakdown JSONB,               -- [{category, amount, description}]
  comptroller_edited_budget NUMERIC,
  
  -- Vehicle
  needs_vehicle BOOLEAN,
  vehicle_type TEXT,                      -- 'van', 'bus', 'car', etc.
  needs_rental BOOLEAN,
  assigned_vehicle_id UUID REFERENCES vehicles(id),
  assigned_driver_id UUID REFERENCES users(id),
  preferred_vehicle_id UUID REFERENCES vehicles(id),
  preferred_driver_id UUID REFERENCES users(id),
  transportation_type TEXT,               -- 'owned', 'institutional', 'rent'
  cost_justification TEXT,
  
  -- Status
  status TEXT,                            -- RequestStatus enum
  current_approver_role TEXT,
  
  -- Approval timestamps & signatures (all nullable)
  head_approved_at TIMESTAMPTZ,
  head_approved_by UUID,
  head_signature TEXT,
  head_comments TEXT,
  
  parent_head_approved_at TIMESTAMPTZ,
  parent_head_approved_by UUID,
  parent_head_signature TEXT,
  parent_head_comments TEXT,
  
  admin_processed_at TIMESTAMPTZ,
  admin_processed_by UUID,
  admin_comments TEXT,
  
  comptroller_approved_at TIMESTAMPTZ,
  comptroller_approved_by UUID,
  comptroller_comments TEXT,
  
  hr_approved_at TIMESTAMPTZ,
  hr_approved_by UUID,
  hr_signature TEXT,
  hr_comments TEXT,
  
  exec_approved_at TIMESTAMPTZ,
  exec_approved_by UUID,
  exec_signature TEXT,
  exec_comments TEXT,
  
  final_approved_at TIMESTAMPTZ,
  
  -- Rejection
  rejected_at TIMESTAMPTZ,
  rejected_by UUID,
  rejection_reason TEXT,
  rejection_stage TEXT,
  
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),      -- Profile ID, not auth_user_id
  notification_type TEXT,
  title TEXT,
  message TEXT,
  related_type TEXT,                      -- 'request', etc.
  related_id UUID,
  action_url TEXT,
  action_label TEXT,
  priority TEXT,                          -- 'low', 'normal', 'high'
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);
```

### Departments Table
```sql
CREATE TABLE departments (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE,                       -- 'CNAHS', 'CCMS', etc.
  name TEXT,                              -- 'College of Nursing...'
  parent_department_id UUID REFERENCES departments(id),  -- For office hierarchy
  created_at TIMESTAMPTZ
);
```

### Vehicles Table
```sql
CREATE TABLE vehicles (
  id UUID PRIMARY KEY,
  vehicle_name TEXT,
  plate_number TEXT,
  type TEXT,                              -- 'van', 'bus', 'car', etc.
  status TEXT,
  created_at TIMESTAMPTZ
);
```

---

## 🔄 Workflow Engine (`src/lib/workflow/engine.ts`)

### Status Flow Logic

**Faculty Request (with parent department):**
```
draft → pending_head → pending_parent_head → pending_admin → 
[if budget: pending_comptroller] → pending_hr → pending_exec → approved
```

**Faculty Request (no parent department):**
```
draft → pending_head → pending_admin → 
[if budget: pending_comptroller] → pending_hr → pending_exec → approved
```

**Head Request:**
```
draft → pending_admin → 
[if budget: pending_comptroller] → pending_hr → pending_exec → approved
```

### Key Methods

- `getInitialStatus(requesterIsHead)` - Returns first status
- `getNextStatus(currentStatus, requesterIsHead, hasBudget, hasParentDepartment)` - Returns next status
- `getApproverRole(status)` - Returns who can approve
- `canApprove(userRole, userIsHead, ...)` - Checks if user can approve
- `getProgressPercentage(status)` - Returns 0-100 progress
- `getWorkflowSteps(...)` - Returns all steps in workflow

---

## 📱 Requester View Components

### 1. Submissions View (`src/components/user/submissions/SubmissionsViewClean.tsx`)

**Features:**
- Lists all user's requests
- Real-time updates via Supabase Realtime
- Auto-refresh every 5 seconds
- Status badges and progress indicators
- Modal for request details
- Tracking modal with approval timeline
- PDF download button

**Data Fetching:**
- Endpoint: Direct Supabase query (no API route)
- Query: `requests` table filtered by `requester_id = profile.id`
- Includes: `department` join

### 2. Request Details (`src/components/common/RequestDetailsView.tsx`)

**Tabs:**
- **Details**: Purpose, travel info, budget, transportation, participants
- **Timeline**: Approval history with timestamps
- **Attachments**: File attachments (if any)

**Components Used:**
- `RequestStatusTracker` - Full approval workflow visualization
- `SignatureStageRail` - Signature status
- `TrackingTimeline` - Chronological approval events

### 3. Calendar View (`src/components/user/schedule/UserSchedulePage.client.tsx`)

**Features:**
- Month calendar with color-coded dates
- Date details modal
- View selectors (Week/Month/2-Month/Year)
- Legend for availability status
- Booking cards with full details

**Data Fetching:**
- Endpoint: `/api/trips/my-trips`
- Returns: Array of bookings with vehicle/driver info
- Filters: Only `approved`, `pending_admin`, `pending_exec`, `pending_hr` statuses

### 4. Notifications View (`src/components/user/notification/NotificationsView.tsx`)

**Features:**
- Tabs: Unread / All
- Mark as read functionality
- Mark all as read
- Real-time new notifications
- Navigation to related requests
- Icons based on notification type

**Data Fetching:**
- Endpoint: `/api/notifications?limit=50`
- Query: `notifications` table filtered by `user_id = profile.id`
- Real-time: Subscribes to INSERT events

---

## 🔌 API Endpoints (Complete List)

### Authentication
- `POST /api/auth/login` - Sign in
- `POST /api/auth/logout` - Sign out
- `GET /api/auth/bootstrap` - Get current user info
- `GET /api/me` - Get current user profile

### Requests
- `GET /api/requests/my-submissions` - Get user's requests
- `GET /api/requests/my-submissions/count` - Get count
- `GET /api/requests/[id]` - Get request details
- `GET /api/requests/[id]/tracking` - Get tracking info
- `GET /api/requests/[id]/pdf` - Download PDF
- `POST /api/requests/submit` - Submit new request
- `POST /api/requests/[id]/approve` - Approve request
- `POST /api/requests/[id]/reject` - Reject request

### Calendar/Trips
- `GET /api/trips/my-trips` - Get user's bookings

### Notifications
- `GET /api/notifications?limit=50` - Get notifications
- `PATCH /api/notifications` - Mark as read
- `DELETE /api/notifications` - Delete notification

---

## 🎨 UI Patterns & Components

### Status Badge (`src/components/common/StatusBadge.tsx`)
- Color-coded status indicators
- Icons for each status
- Sizes: sm, md, lg

### Request Status Tracker (`src/components/common/RequestStatusTracker.tsx`)
- Visual approval workflow
- Shows completed, current, pending stages
- Compact and full modes
- Color-coded stages

### Request Card (`src/components/common/RequestCardWow.tsx`)
- Request summary display
- Status badge
- Progress indicator
- Quick actions

### Modal (`src/components/common/Modal.tsx`)
- Reusable modal component
- Framer Motion animations
- Various size options

---

## 🔧 Key Utilities

### Date Formatting (`src/lib/datetime.ts`)
- `formatPhilippineDate()` - Philippine timezone
- `formatLongDate()` - Full date format
- `formatLongDateTime()` - Date + time
- All use `Asia/Manila` timezone

### Workflow Routing (`src/lib/user/request/routing.ts`)
- `firstReceiver()` - Determines first approver
- `fullApprovalPath()` - Returns complete approval chain
- `lockVehicle()` - Forces vehicle mode for certain reasons

### Validation (`src/lib/user/request/validation.ts`)
- `canSubmit()` - Validates form data
- Checks required fields
- Validates signatures (min 3000 chars in data URL)
- Returns error object with field paths

---

## 🐛 Common Issues & Solutions

### Issue 1: UUID Empty String Error
**Error:** `invalid input syntax for type uuid: ""`

**Cause:** Passing empty string to UUID filter

**Solution:**
```typescript
// ❌ BAD
.eq('requester_id', profile?.id || '')

// ✅ GOOD
if (!profile?.id) return [];
.eq('requester_id', profile.id)
```

### Issue 2: SecureStore on Web
**Error:** `ExpoSecureStore.default.getValueWithKeyAsync is not a function`

**Cause:** SecureStore doesn't work on web

**Solution:** Use Platform check and localStorage fallback

### Issue 3: Profile Not Loading
**Cause:** RLS policies or query error

**Solution:** 
- Check RLS policies allow user to read own profile
- Verify `auth_user_id` matches Supabase Auth user ID
- Add error logging

### Issue 4: React Version Conflict
**Error:** "React Element from an older version"

**Cause:** Multiple React versions in dependencies

**Solution:** Use `overrides` in package.json + `--legacy-peer-deps`

---

## 📋 Mobile Implementation Checklist

### ✅ Completed
- [x] Authentication (sign-in, auth context)
- [x] My Papers (submissions list)
- [x] Request Details (full details + tracking)
- [x] Calendar (month view + bookings)
- [x] Notifications (list + real-time)
- [x] SecureStore with web fallback
- [x] UUID validation
- [x] Loading states
- [x] Error handling

### ⏳ Pending
- [ ] Request Submission (form wizard)
- [ ] Draft Management
- [ ] PDF Download
- [ ] Signature Pad
- [ ] File Attachments

---

## 🔍 Key Insights

1. **Always use `profile.id` (UUID) for queries, NOT `auth_user_id`**
2. **Web app uses service role key for some queries** (bypasses RLS)
3. **Mobile app must respect RLS policies** (uses anon key)
4. **Profile must be loaded before any data queries**
5. **Real-time subscriptions require valid user ID**
6. **Date formatting uses Philippine timezone** (`Asia/Manila`)
7. **Workflow is complex** - multiple approval paths based on role/budget

---

## 📝 Notes

- Web app uses **Next.js 16** with **App Router**
- Mobile app uses **Expo Router** (file-based routing)
- Both use **Supabase** but different clients (SSR vs. client-side)
- Web uses **Zustand** for state, mobile uses **TanStack Query**
- Web uses **Tailwind CSS**, mobile uses **StyleSheet**

---

This analysis covers every aspect of the TraviLink web application needed for mobile implementation.

