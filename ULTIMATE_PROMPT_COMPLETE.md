# 🚀 TraviLink Mobile - Ultimate Complete Development Prompt

## 📋 PROJECT OVERVIEW

**TraviLink Mobile** is a React Native (Expo) mobile application that provides the requester (faculty/staff) view for the TraviLink Smart Campus Transport System. The app allows users to view, track, and manage transportation requests, view schedules, and receive real-time notifications.

**Repository Location**: `C:\Users\CATHY\Documents\Travilink-mobile`
**Web Repository Reference**: `C:\Users\CATHY\Documents\Travilink(repo)\TraviLink`

**CRITICAL NOTE**: The web repository (`C:\Users\CATHY\Documents\Travilink(repo)\TraviLink`) is frequently updated. **ALWAYS** check for web repo updates before implementing any feature. Pull latest changes and analyze all relevant files before starting work.

---

## 🎯 CURRENT PROJECT STATUS

### ✅ COMPLETED FEATURES

#### 1. **Authentication System** ✅ (BUT WITH ONGOING ISSUES)
- **Microsoft OAuth Integration**: Full Azure AD OAuth flow with deep linking
  - Supports student emails (`@student.mseuf.edu.ph`) and faculty emails (`@mseuf.edu.ph`)
  - Deep link callback handler: `app/auth/callback.tsx`
  - Web and iOS/Android support with platform-specific handling
- **Email/Password Login**: Traditional login as fallback
- **AuthContext**: Complete session management with timeout protection
  - 10-second timeout for initialization
  - 8-second timeout for `getSession()`
  - 2-second timeout for `fetchProfileByUserId()`
  - Uses `Promise.race()` to prevent hanging
- **Secure Storage**: 
  - Uses `expo-secure-store` for values <2048 bytes on native
  - Uses `@react-native-async-storage/async-storage` for large values (>2048 bytes) on native
  - Uses `localStorage` on web
  - Dual storage check on native (checks both SecureStore and AsyncStorage)
- **Auto-redirect**: Based on authentication state

**Key Files**:
- `app/(auth)/sign-in.tsx` - Sign-in screen with Microsoft OAuth
- `app/auth/callback.tsx` - OAuth callback handler (SIMPLIFIED - redirects immediately)
- `contexts/AuthContext.tsx` - Authentication context with timeout protection
- `lib/supabase/client.ts` - Supabase client with custom storage adapter

**Important Notes**:
- Redirect URL for iOS/Android: `travilink://auth/callback`
- Redirect URL for web: `${window.location.origin}/auth/callback`
- Must add `travilink://auth/callback` to Supabase allowed redirect URLs
- Web flow uses `access_token` in hash fragment, native uses `code` parameter

**Current Authentication Flow (SIMPLIFIED)**:
1. User clicks "Sign in with Microsoft" → Opens browser/OAuth flow
2. Microsoft authenticates → Redirects to callback URL
3. Callback extracts `access_token` (web) or `code` (native)
4. Sets session via `supabase.auth.setSession()` or `exchangeCodeForSession()`
5. **IMMEDIATELY redirects** to dashboard - NO waiting for profile
6. Profile loads in background via `onAuthStateChange` listener in AuthContext

**CRITICAL**: The callback (`app/auth/callback.tsx`) is simplified to:
- Set session
- Redirect immediately
- NO waiting for profile (profile loads in background)

#### 2. **Dashboard** ✅
- **Location**: `app/(tabs)/dashboard/index.tsx`
- **Features**:
  - Hero section with welcome message, date, and time
  - KPI cards (Active Requests, Vehicles Online, Pending Approvals)
  - Quick Actions (New request, Schedule, My requests, Help)
  - Available Vehicles showcase (horizontal scroll)
  - Upcoming Trips list
  - Availability Heatmap (30-day capacity view)
  - Sidebar menu integration (hamburger menu)
  - Animations (fade-in, slide-up, scale)
  - Pull-to-refresh

**Data Hooks**:
- `hooks/useDashboard.ts` - Fetches KPIs, vehicles, and trips

#### 3. **Navigation Structure** ✅
- **Bottom Tabs** (3 tabs):
  1. **Home/Dashboard** - Main dashboard screen
  2. **Request** (Plus icon) - Floating action button for creating requests
  3. **Profile** - User profile and settings
- **Sidebar Menu** (`components/SidebarMenu.tsx`):
  - My Requests
  - Schedule
  - Notifications
  - Vehicles
  - Settings
  - Help & Support

**Key Files**:
- `app/(tabs)/_layout.tsx` - Tab navigator with sidebar integration
- `components/SidebarMenu.tsx` - Slide-in sidebar menu

#### 4. **My Requests (Submissions)** ✅
- **Location**: `app/(tabs)/submissions/index.tsx`
- **Features**:
  - List of all user's requests
  - Real-time updates via Supabase Realtime
  - Status badges (Pending, Approved, Rejected, etc.)
  - Request cards with key information
  - Pull-to-refresh
  - Navigation to request details

**Data Hooks**:
- `hooks/useRequests.ts` - Fetches requests with real-time subscriptions

#### 5. **Request Details** ✅
- **Location**: `app/request/[id].tsx`
- **Features**:
  - Full request information
  - Approval timeline/tracking
  - Comments section
  - Transportation details
  - Budget breakdown
  - Real-time status updates

**Data Hooks**:
- `hooks/useRequestTracking.ts` - Comprehensive request tracking data

#### 6. **Calendar/Schedule** ✅
- **Location**: `app/(tabs)/calendar/index.tsx`
- **Features**:
  - Month view calendar with color-coded dates
  - View selector (Week, Month, 2-Month, Year) - UI ready
  - Date selection with bookings modal
  - Legend for status colors (Available/Partial/Full)
  - Booking cards with full details
  - Real-time updates
  - Dynamic date range calculation based on view

**Data Hooks**:
- `hooks/useCalendar.ts` - Calendar bookings with view-based date ranges

#### 7. **Notifications** ✅
- **Location**: `app/(tabs)/notifications/index.tsx`
- **Features**:
  - Tabs (Unread / All)
  - Mark as read functionality
  - Mark all as read
  - Real-time new notifications
  - Pull-to-refresh
  - Navigation to related requests
  - Notification icons based on type

**Data Hooks**:
- `hooks/useNotifications.ts` - Notifications with mark-as-read functionality

#### 8. **Profile & Settings** ✅
- **Location**: `app/(tabs)/profile/index.tsx` and `app/(tabs)/profile/settings.tsx`
- **Features**:
  - User profile information
  - Settings screen
  - Sign-out functionality

#### 9. **Request Creation Screen** ✅
- **Location**: `app/(tabs)/request/index.tsx`
- **Features**:
  - Entry point for creating new requests
  - Options: Travel Order or Seminar Application
  - Navigation to request wizard

---

## 🐛 CRITICAL AUTHENTICATION ISSUES & ATTEMPTED FIXES

### Problem History (Detailed Timeline)

#### Issue 1: Expo Dev Server Timeout ✅ FIXED
- **Problem**: Expo dev server timing out, couldn't connect to `exp://192.168.68.140:8081`
- **Solution**: 
  - Added `--offline` flag to all npm scripts
  - Added `--go` flag to bypass Expo login prompts
  - Updated README with troubleshooting steps
  - Suggested tunnel mode (`npm run start:tunnel`) for network issues

#### Issue 2: App Hanging on Startup ✅ FIXED
- **Problem**: App stuck in loading state indefinitely
- **Root Cause**: `supabase.auth.getSession()` hanging without timeout
- **Solution**:
  - Added 10-second timeout for auth initialization
  - Wrapped `supabase.auth.getSession()` in `Promise.race()` with 8-second timeout
  - Added 10-second timeout to Supabase client fetch requests
  - Ensured `loading` state always completes

#### Issue 3: SecureStore Size Limit ❌ FIXED BUT CAME BACK
- **Problem**: "Value being stored in SecureStore is larger than 2048 bytes" on iOS
- **Solution**:
  - Installed `@react-native-async-storage/async-storage`
  - Modified `lib/supabase/client.ts` to:
    - Use AsyncStorage for values >2048 bytes
    - Try SecureStore first for smaller values
    - Fallback to AsyncStorage if SecureStore fails
    - Check both stores on `getItem()` and `removeItem()`

#### Issue 4: Web Infinite Loading / Redirect Loops ✅ FIXED (SIMPLIFIED)
- **Problem**: Web callback causing infinite "Completing sign in..." loop
- **Root Cause**: Complex redirect logic with multiple useEffect hooks and state checks
- **Attempted Fixes** (multiple iterations):
  1. Added `hasProcessedRef` to prevent re-processing
  2. Added `isProcessingRef` to prevent race conditions
  3. Added `shouldRedirect` state with `<Redirect />` component
  4. Added profile waiting logic (WAITING FOR PROFILE TO LOAD)
  5. Added `fetchProfileByUserId` to directly fetch profile in callback
  6. Added multiple useEffect hooks to watch session/profile changes
  7. Added 5-second fallback timeout
- **Final Solution**: **SIMPLIFIED COMPLETELY**
  - Removed ALL profile waiting logic
  - Removed ALL redirect state management
  - Removed ALL useEffect watching for profile
  - Callback now: Set session → Redirect immediately → Done
  - Profile loads in background via `onAuthStateChange`

#### Issue 5: iOS First Login Not Working / Second Login Works ⚠️ ONGOING
- **Problem**: First login does nothing, second login works, requires app restart
- **Attempted Fixes**:
  1. Added direct profile fetching in callback
  2. Added profile waiting logic (made it worse - 5+ minute delays)
  3. Removed profile waiting (back to first login not working)
  4. Added timeouts to profile fetch (2 seconds)
  5. Simplified callback to redirect immediately
- **Current Status**: Callback redirects immediately, but first login may still not complete properly
- **Root Cause Unknown**: Could be:
  - Session not properly set on first attempt
  - AuthContext not updating fast enough
  - React state update timing
  - Supabase session state synchronization

#### Issue 6: Profile Fetch Taking 5+ Minutes ⚠️ PARTIALLY ADDRESSED
- **Problem**: Profile fetch hanging/taking extremely long (5+ minutes)
- **Root Cause**: Database query hanging or network issues
- **Solution**:
  - Added 2-second timeout to `fetchProfileByUserId()` using `Promise.race()`
  - Made profile loading non-blocking (loads in background)
  - Callback no longer waits for profile
- **Remaining Issue**: Profile may not load at all if timeout triggers
- **Current Behavior**: App redirects immediately, profile loads when ready (or not at all if it fails)

#### Issue 7: Web Mobile Version Stuck in "Completing Sign In" ⚠️ ADDRESSED
- **Problem**: Web mobile version stuck in infinite "Completing sign in..." screen
- **Solution**: Simplified callback to redirect immediately without waiting

### Current Authentication Code State

**`app/auth/callback.tsx`** (SIMPLIFIED VERSION):
```typescript
// Key points:
1. Single useEffect that processes callback once
2. Extracts access_token (web) or code (native)
3. Sets session via setSession() or exchangeCodeForSession()
4. IMMEDIATELY redirects - NO waiting for profile
5. Profile loads in background via onAuthStateChange
```

**`contexts/AuthContext.tsx`** (KEY FEATURES):
```typescript
// Key points:
1. 10-second timeout for initialization
2. 8-second timeout for getSession()
3. 2-second timeout for fetchProfileByUserId()
4. onAuthStateChange listener fetches profile automatically
5. Profile loading is non-blocking
```

**`lib/supabase/client.ts`** (STORAGE ADAPTER):
```typescript
// Key points:
1. Dual storage on native (SecureStore + AsyncStorage)
2. Uses AsyncStorage for large values (>2048 bytes)
3. Checks both stores on getItem()
4. 10-second timeout on all fetch requests
```

---

## ⏳ PENDING FEATURES

### 1. **Request Submission Wizard** ⏳ HIGH PRIORITY
**Status**: UI exists, needs full implementation
**Location**: Should be at `app/request/new.tsx` or similar

**Required Features** (based on web version):
- Multi-step form wizard:
  1. **Request Type Selection**: Travel Order or Seminar Application
  2. **Basic Information**: Date, requesting person, department, destination
  3. **Travel Details**: Departure/return dates, purpose, reason type
  4. **Vehicle Selection**: Mode (institutional/owned/rent), preferred vehicle/driver
  5. **Participants**: For seminar requests
  6. **Expenses**: Budget breakdown
  7. **Attachments**: File uploads
  8. **Signature**: E-signature pad
  9. **Review & Submit**: Final review before submission

**Request Types**:
- **Travel Order**: Standard travel requests
- **Seminar Application**: Training/seminar participation

**Reason Types**:
- `official` - Official business
- `ces` - CES
- `seminar` - Seminar / Training / Meeting
- `educational` - Educational Trip
- `competition` - Competition
- `visit` - Visit / Coordination

**Vehicle Modes**:
- `institutional` - University vehicle (requires School Service section)
- `owned` - Personal vehicle
- `rent` - Rental vehicle (requires justification)

**Key Requirements**:
- Form validation (all required fields) - **MATCH WEB EXACTLY**
- Draft saving functionality
- Signature capture using `expo-signature-pad` or similar
- File uploads using `expo-document-picker`
- Budget calculation - **MATCH WEB LOGIC EXACTLY**
- Department matching logic - **MATCH WEB EXACTLY**
- Vehicle/driver validation - **MATCH WEB EXACTLY**

**Web Reference**:
- `src/components/user/request/RequestWizard.client.tsx` - Main wizard component
- `src/app/api/requests/submit/route.ts` - Submission API endpoint
- `src/lib/user/request/validation.ts` - Validation logic - **ANALYZE THOROUGHLY**
- `src/lib/workflow/engine.ts` - Workflow engine for approvals - **ANALYZE THOROUGHLY**
- `src/lib/user/request/routing.ts` - Routing logic
- `src/lib/user/request/types.ts` - Type definitions

**CRITICAL**: Before implementing, you MUST:
1. Pull latest web repo changes
2. Read and understand ALL validation logic
3. Read and understand workflow engine
4. Read and understand routing logic
5. Match EVERYTHING exactly

### 2. **Draft Management** ⏳ MEDIUM PRIORITY
- Save drafts locally or to Supabase
- Edit saved drafts
- Resume from draft
- Draft list view

### 3. **PDF Download** ⏳ MEDIUM PRIORITY
- Download request as PDF
- Integration with web API or client-side generation
- Share functionality

### 4. **Vehicle Viewing** ⏳ LOW PRIORITY
- **Location**: `app/vehicles/index.tsx` (exists but may need implementation)
- View available vehicles
- Filter by capacity, type, etc.
- Vehicle details

---

## 🔧 TECHNICAL STACK

### Core Technologies
- **Framework**: Expo ~54.0.23
- **Router**: Expo Router ^3.0.0 (file-based routing)
- **Language**: TypeScript ~5.9.2
- **React**: 19.1.0 (with overrides)
- **React Native**: 0.81.5

### Key Dependencies
- `@supabase/supabase-js` ^2.55.0 - Backend/database
- `@tanstack/react-query` ^5.0.0 - Data fetching & caching
- `expo-secure-store` ~13.0.0 - Secure storage (values <2048 bytes)
- `@react-native-async-storage/async-storage` ^2.2.0 - Async storage (large values)
- `expo-web-browser` ^15.0.9 - OAuth browser handling
- `expo-linking` ~6.3.0 - Deep linking
- `expo-auth-session` ^7.0.8 - OAuth session management
- `react-native-calendars` ^1.1301.0 - Calendar component
- `react-native-reanimated` ~3.10.0 - Animations
- `react-native-gesture-handler` ~2.16.0 - Gesture handling
- `date-fns` ^4.1.0 - Date formatting

### Development Tools
- Expo CLI with `--go` and `--offline` flags
- Scripts configured in `package.json`:
  - `npm start` - Start dev server with Expo Go (offline mode)
  - `npm run start:tunnel` - Start with tunnel mode (for network issues)
  - `npm run web` - Run on web
  - `npm run ios` - Run on iOS
  - `npm run android` - Run on Android

---

## 📁 PROJECT STRUCTURE

```
app/
├── _layout.tsx                    # Root layout with providers
├── index.tsx                      # Root redirect based on auth
├── (auth)/
│   ├── _layout.tsx               # Auth layout
│   └── sign-in.tsx               # Sign-in with Microsoft OAuth
├── auth/
│   └── callback.tsx              # OAuth callback handler (SIMPLIFIED)
├── (tabs)/
│   ├── _layout.tsx               # Tab navigator (Home, Request, Profile)
│   ├── dashboard/
│   │   └── index.tsx             # Main dashboard
│   ├── request/
│   │   └── index.tsx             # Request creation entry
│   ├── profile/
│   │   ├── index.tsx             # Profile screen
│   │   └── settings.tsx          # Settings screen
│   ├── submissions/
│   │   └── index.tsx             # My Requests list
│   ├── calendar/
│   │   └── index.tsx             # Calendar/Schedule
│   └── notifications/
│       └── index.tsx             # Notifications
├── request/
│   └── [id].tsx                  # Request details screen
└── vehicles/
    └── index.tsx                 # Vehicles list (may need implementation)

components/
├── SidebarMenu.tsx               # Sidebar navigation menu
├── RequestCard.tsx               # Request list item
├── RequestStatusTracker.tsx      # Approval progress tracker
└── StatusBadge.tsx               # Status indicator badge

hooks/
├── useRequests.ts                # Requests data + real-time
├── useCalendar.ts                # Calendar bookings
├── useNotifications.ts           # Notifications + mark as read
├── useRequestTracking.ts         # Request tracking data
├── useDashboard.ts               # Dashboard data (KPIs, vehicles, trips)
└── useVehicles.ts                # Vehicle data

contexts/
└── AuthContext.tsx                # Authentication context (with timeouts)

lib/
├── supabase/
│   └── client.ts                 # Supabase client with secure storage
├── types.ts                      # TypeScript type definitions
└── utils.ts                      # Utility functions
```

---

## 🔐 AUTHENTICATION FLOW (CURRENT STATE)

### Microsoft OAuth Flow

1. **User clicks "Sign in with Microsoft"**
   - `app/(auth)/sign-in.tsx` → `handleMicrosoftLogin()`
   - Calls `supabase.auth.signInWithOAuth({ provider: 'azure' })`
   - Redirect URL:
     - **Web**: `${window.location.origin}/auth/callback`
     - **Native**: `travilink://auth/callback`

2. **Browser Opens** (native only)
   - Uses `WebBrowser.openAuthSessionAsync()` on iOS/Android
   - User authenticates with Microsoft
   - Microsoft redirects to Supabase callback

3. **Callback Handling** (SIMPLIFIED)
   - **Web**: `app/auth/callback.tsx` extracts `access_token` from hash fragment (`params['#']`)
   - **Native**: `app/auth/callback.tsx` extracts `code` from URL params
   - Sets session:
     - **Web**: `supabase.auth.setSession({ access_token, refresh_token })`
     - **Native**: `supabase.auth.exchangeCodeForSession(code)`
   - **IMMEDIATELY redirects** to `/(tabs)/dashboard` - **NO waiting for profile**

4. **Profile Loading** (Background)
   - `AuthContext` has `onAuthStateChange` listener
   - When session changes, automatically fetches profile
   - Profile loads in background (non-blocking)
   - If profile fetch fails or times out (2 seconds), app continues without profile

5. **Session Management**
   - `AuthContext` manages session state
   - 10-second timeout for initialization
   - 8-second timeout for `getSession()`
   - Auto-refresh token enabled
   - Session persisted in SecureStore (native) or localStorage (web)

### Important Configuration

**Supabase Dashboard**:
- Must add `travilink://auth/callback` to allowed redirect URLs
- Must add web callback URL to allowed redirect URLs

**app.json**:
- `scheme: "travilink"` - Deep link scheme

**Environment Variables** (`.env`):
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## 🌐 WEB VERSION DEEP DIVE REQUIREMENTS

### ⚠️ CRITICAL: You MUST Deep Dive Into Web Repository

**Web Repository Location**: `C:\Users\CATHY\Documents\Travilink(repo)\TraviLink`

**IMPORTANT**: The web repository is frequently updated. **ALWAYS** pull latest changes before implementing features. Check git status, pull changes, and analyze all relevant files.

### Areas Requiring Deep Analysis

#### 1. **Authentication System** 🔍 CRITICAL
**Location**: `src/app/login/` and `src/app/api/auth/`

**Files to Analyze**:
- `src/app/login/page.tsx` - Login page component
- `src/app/login/LoginView.tsx` - Login view component
- `src/app/api/auth/callback/route.ts` - OAuth callback API
- `src/lib/auth/` - Authentication utilities

**Key Questions to Answer**:
- How does Microsoft OAuth work on web?
- How is user profile created/updated from Microsoft Graph?
- What data is fetched from Microsoft Graph API?
- How is department matched/assigned?
- How are roles assigned?
- What happens if user doesn't exist in database?
- What error handling is in place?
- How is session managed?
- Are there any special redirects based on role?

**Why This Matters**:
- Mobile app should match web authentication behavior exactly
- User experience should be consistent
- Profile creation/update logic should match

#### 2. **Request Submission** 🔍 CRITICAL (HIGHEST PRIORITY)
**Location**: `src/components/user/request/` and `src/app/api/requests/`

**Files to Analyze** (IN ORDER OF IMPORTANCE):
1. `src/components/user/request/RequestWizard.client.tsx` - **MAIN WIZARD** (Read entire file)
2. `src/app/api/requests/submit/route.ts` - **SUBMISSION API** (Read entire file)
3. `src/lib/user/request/validation.ts` - **VALIDATION LOGIC** (Read entire file)
4. `src/lib/workflow/engine.ts` - **WORKFLOW ENGINE** (Read entire file)
5. `src/lib/user/request/routing.ts` - **ROUTING LOGIC** (Read entire file)
6. `src/lib/user/request/types.ts` - **TYPE DEFINITIONS** (Read entire file)
7. `src/lib/user/request/utils.ts` - **UTILITY FUNCTIONS** (if exists)

**For Each Step of Wizard, Analyze**:
- What fields are required?
- What validation rules apply?
- What data transformations happen?
- What dependencies exist (e.g., vehicle selection depends on date)?
- What errors can occur?
- How are errors displayed?

**Key Questions to Answer**:
- What is the exact form structure?
- What are ALL validation rules?
- How is draft saving implemented?
- How is signature captured?
- How are files uploaded?
- How is budget calculated? (exact formula)
- How is department matched? (exact algorithm)
- How are vehicles/drivers validated? (exact logic)
- How does workflow engine route requests?
- What are ALL status transitions?
- How are participants handled for seminars?
- How is request number generated?
- What happens on submit? (exact API call)

**Why This Matters**:
- **MUST MATCH WEB EXACTLY** - Any differences will cause data inconsistencies
- Validation must be identical - users expect same behavior
- Workflow must match - approvals won't work if different

#### 3. **Dashboard** 🔍 MEDIUM
**Location**: `src/components/user/dashboard/`

**Files to Analyze**:
- `src/components/user/dashboard/DashboardView.tsx` - Dashboard component
- `src/components/user/dashboard/Dashboard.container.tsx` - Container component
- `src/app/api/vehicles/route.ts` - Vehicle listing API
- `src/app/api/trips/my-trips/route.ts` - User trips API

**Key Questions to Answer**:
- How are KPIs calculated? (exact formulas)
- How is vehicle availability determined?
- How is availability heatmap calculated?
- What data is shown in upcoming trips?
- How is data refreshed?
- Are there any filters or sorting?

**Why This Matters**:
- Mobile dashboard should show same data
- KPIs should match exactly
- Availability calculations should match

#### 4. **Database Schema** 🔍 CRITICAL
**Location**: Supabase Dashboard or `supabase/migrations/` (if exists)

**Tables to Analyze**:
- `users` - User profiles with roles, departments, etc.
- `requests` - Transportation requests (ALL columns)
- `request_history` - Approval timeline
- `departments` - Department information
- `vehicles` - Vehicle information (ALL columns)
- `drivers` - Driver information
- `notifications` - User notifications
- `bookings` or `trips` - Scheduled trips
- Any other related tables

**For Each Table, Document**:
- All columns and types
- Relationships (foreign keys)
- Constraints
- Indexes
- Default values
- Nullable fields

**Row Level Security (RLS) Policies**:
- Document ALL RLS policies
- Understand who can read/write what
- Mobile app must respect same policies

**Why This Matters**:
- Mobile app must use same data structure
- Queries must match database schema
- RLS policies must be understood

#### 5. **API Endpoints** 🔍 CRITICAL
**Location**: `src/app/api/`

**Endpoints to Analyze**:
- `/api/requests/submit` - Request submission
- `/api/requests/[id]` - Request details/updates
- `/api/vehicles` - Vehicle listing
- `/api/trips/my-trips` - User trips
- `/api/notifications` - Notifications
- `/api/auth/callback` - OAuth callback
- Any other API endpoints

**For Each Endpoint, Document**:
- Request method (GET, POST, PUT, DELETE)
- Request body structure
- Query parameters
- Response structure
- Error responses
- Authentication requirements
- Validation logic

**Why This Matters**:
- Mobile app may need to call these APIs
- If using Supabase directly, must match API behavior
- Error handling must match

#### 6. **Workflow Engine** 🔍 CRITICAL
**Location**: `src/lib/workflow/`

**Files to Analyze**:
- `src/lib/workflow/engine.ts` - Main workflow engine
- Any workflow configuration files

**Key Questions to Answer**:
- How are approval routes determined?
- What are ALL status transitions?
- How does budget affect routing?
- How do roles affect routing?
- What happens on approval/rejection?
- How are notifications created?
- What triggers status changes?
- Are there any special rules or exceptions?

**Why This Matters**:
- **MUST MATCH EXACTLY** - Workflow determines who approves requests
- Any differences will break approval process
- Status transitions must match exactly

#### 7. **UI Components** 🔍 LOW (Reference Only)
**Location**: `src/components/`

**Components to Review** (as reference):
- Dashboard components
- Request form components
- Status trackers
- Calendar components
- Notification components

**Why This Matters**:
- Understand UI/UX patterns
- Match visual design where possible
- Understand component structure

#### 8. **Real-time Features** 🔍 MEDIUM
**Location**: Supabase Realtime configuration

**Questions to Answer**:
- What tables have Realtime enabled?
- What events trigger updates? (INSERT, UPDATE, DELETE)
- How are subscriptions structured?
- What data is pushed to clients?
- How are notifications created?
- Are there any webhooks?

**Why This Matters**:
- Mobile app already uses Realtime for requests
- Must ensure all real-time features match
- Notification triggers must match

---

## 🎯 NEXT IMPLEMENTATION PRIORITIES

### Priority 1: Fix Authentication Issues ⚠️ CRITICAL

**Current Problems**:
1. First login doesn't work immediately on iOS
2. Profile may not load if fetch times out
3. Inconsistent behavior between first and second login

**Tasks**:
1. Investigate why first login doesn't work
   - Add more detailed logging
   - Check session state after callback
   - Check AuthContext state updates
   - Check React rendering cycles
2. Improve profile loading reliability
   - Maybe increase timeout (but not too much)
   - Add retry logic
   - Show profile loading state on dashboard
3. Ensure consistent behavior
   - Test extensively on iOS, Android, and web
   - Ensure first login always works
   - Ensure profile always loads eventually

**Estimated Time**: 2-4 hours

### Priority 2: Request Submission Wizard ⚠️ HIGH

**Prerequisites**:
1. **MUST** pull latest web repo changes
2. **MUST** deep dive into web implementation (see Web Version Deep Dive section)
3. **MUST** understand validation logic completely
4. **MUST** understand workflow engine completely

**Tasks**:
1. Create multi-step form wizard (`app/request/new.tsx`)
2. Implement Step 1: Request Type Selection
3. Implement Step 2: Basic Information
4. Implement Step 3: Travel Details
5. Implement Step 4: Vehicle Selection
6. Implement Step 5: Participants (for seminars)
7. Implement Step 6: Expenses
8. Implement Step 7: Attachments
9. Implement Step 8: Signature
10. Implement Step 9: Review & Submit
11. Implement form validation (MATCH WEB EXACTLY)
12. Implement draft saving
13. Connect to submission API
14. Handle all request types
15. Test thoroughly

**Key Requirements**:
- **MATCH WEB VALIDATION EXACTLY** - No exceptions
- **MATCH WEB WORKFLOW EXACTLY** - Approval routing must match
- **MATCH WEB DATA STRUCTURE EXACTLY** - API/submission must match

**Estimated Time**: 8-16 hours (depending on complexity)

### Priority 3: Draft Management ⚠️ MEDIUM

**Tasks**:
1. Design draft storage (Supabase table or local)
2. Create draft list screen
3. Implement save draft functionality
4. Implement edit draft functionality
5. Implement resume from draft
6. Add draft indicator to request list

**Estimated Time**: 4-6 hours

### Priority 4: PDF Download ⚠️ MEDIUM

**Tasks**:
1. Check if web has PDF API endpoint
2. Implement PDF download (API or client-side)
3. Add download button in request details
4. Implement share functionality

**Estimated Time**: 2-4 hours

### Priority 5: Vehicle Viewing ⚠️ LOW

**Tasks**:
1. Complete `app/vehicles/index.tsx` if not done
2. Add filtering
3. Add vehicle details screen
4. Add search functionality

**Estimated Time**: 2-4 hours

---

## 📝 DEVELOPMENT GUIDELINES

### Code Style
- Use TypeScript for all files
- Follow Expo Router file-based routing
- Use functional components with hooks
- Use TanStack Query for data fetching
- Use Supabase Realtime for live updates
- Follow existing component patterns
- Add detailed console logs for debugging

### Error Handling
- Always handle loading states
- Show user-friendly error messages
- Implement retry mechanisms where appropriate
- Log errors to console with context
- Use try-catch for async operations
- Never let app hang indefinitely (always have timeouts)

### Performance
- Use React Query caching (30s stale time)
- Implement pull-to-refresh
- Use FlatList for long lists
- Optimize images
- Minimize re-renders
- Use useMemo/useCallback where appropriate

### Security
- Never commit `.env` file
- Use SecureStore for sensitive data (when possible)
- Use AsyncStorage for large values (>2048 bytes)
- Validate all user inputs
- Use RLS policies in Supabase
- Sanitize file uploads
- Never expose API keys

### Testing
- Test on iOS and Android
- Test on web (for development)
- Test OAuth flow on all platforms
- Test offline scenarios
- Test with slow networks
- Test with timeout scenarios
- Test first login vs second login
- Test profile loading

---

## 🔄 SYNC WITH WEB VERSION

### ⚠️ CRITICAL: Stay in Sync

**The web repository is frequently updated. You MUST:**

1. **Before starting any feature**:
   - Pull latest web repository changes
   - Check git status to see what changed
   - Read all changed files
   - Understand all changes
   - Update mobile implementation if needed

2. **When implementing features**:
   - **ALWAYS** analyze web version first
   - **MATCH** validation logic exactly
   - **MATCH** workflow logic exactly
   - **MATCH** data structures exactly
   - **MATCH** API endpoints exactly (if using them)
   - **MATCH** UI/UX patterns where possible

3. **After web updates**:
   - Pull latest changes
   - Identify what changed
   - Determine if mobile needs updates
   - Update mobile if needed
   - Test thoroughly
   - Update this prompt if needed

### How to Check for Web Updates

```bash
cd "C:\Users\CATHY\Documents\Travilink(repo)\TraviLink"
git status
git pull
git log --oneline -10  # See recent commits
```

### Files to Watch for Changes

- Authentication files (`src/app/login/`, `src/app/api/auth/`)
- Request submission files (`src/components/user/request/`, `src/app/api/requests/`)
- Validation files (`src/lib/user/request/validation.ts`)
- Workflow files (`src/lib/workflow/`)
- API routes (`src/app/api/`)
- Database migrations (if in repo)

---

## 🚨 CRITICAL REMINDERS

1. **Always pull web repo before starting** - Check for updates first
2. **Always analyze web version first** - Don't implement without checking web
3. **Deep dive required** - Read every file, understand every function, trace every flow
4. **Match exactly** - Validation, workflows, data structures must match web
5. **Test OAuth thoroughly** - Microsoft login must work on iOS, Android, and web
6. **Test timeouts** - App should never hang indefinitely
7. **Check Supabase** - Ensure redirect URLs are configured
8. **Environment variables** - Always check `.env` file exists and is correct
9. **Network issues** - Use tunnel mode if LAN doesn't work
10. **Expo Go** - Use `--go` and `--offline` flags in npm scripts
11. **First login issues** - Still need to fix iOS first login problem
12. **Profile loading** - May not load if fetch times out (2 seconds)
13. **Storage limits** - SecureStore has 2048 byte limit, use AsyncStorage for large values

---

## 📚 REFERENCE DOCUMENTATION

### Project Documentation
- `README.md` - Project overview and setup
- `ULTIMATE_PROMPT.md` - Original prompt (may be outdated)
- `ULTIMATE_PROMPT_COMPLETE.md` - This document (most up-to-date)

### External Documentation
- [Expo Router Docs](https://docs.expo.dev/router/introduction/)
- [Supabase Docs](https://supabase.com/docs)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [React Native Docs](https://reactnative.dev/docs/getting-started)

---

## 🎯 QUICK START FOR NEW CHAT

### Step 1: Understand Context
1. **Read this entire prompt** - Don't skip sections
2. **Understand current state** - What's done, what's pending, what's broken
3. **Understand problems** - All authentication issues and fixes
4. **Understand priorities** - What needs to be done next

### Step 2: Check Web Repository
1. **Pull latest changes** from web repo
2. **Check what changed** since last update
3. **Read relevant files** if implementing features

### Step 3: Start Working
1. **If fixing auth**: Focus on first login issue, profile loading
2. **If implementing features**: Deep dive into web version first
3. **Always test**: On iOS, Android, and web
4. **Always log**: Add detailed console logs
5. **Always handle errors**: Never let app hang

### Step 4: Update Documentation
1. **Update this prompt** as you make changes
2. **Document new issues** you encounter
3. **Document fixes** you implement
4. **Document new features** you add

---

## 📞 SUPPORT INFORMATION

**Project**: TraviLink Mobile
**Repository**: `C:\Users\CATHY\Documents\Travilink-mobile`
**Web Reference**: `C:\Users\CATHY\Documents\Travilink(repo)\TraviLink`
**Framework**: Expo ~54.0.23
**Language**: TypeScript
**Backend**: Supabase

---

## 📅 LAST UPDATED

**Date**: Current session
**Status**: 
- Core features implemented ✅
- Authentication working but with issues ⚠️
- Request Submission Wizard pending ⏳
- First login on iOS not working reliably ⚠️
- Profile loading may timeout ⚠️

**Next Priority**: 
1. Fix authentication issues (first login, profile loading)
2. Implement Request Submission Wizard (after fixing auth and deep diving web version)

---

## 🔍 DEBUGGING CHECKLIST

When encountering issues, check:

- [ ] Web repo is up to date (pull latest changes)
- [ ] `.env` file exists and has correct values
- [ ] Supabase redirect URLs are configured
- [ ] Network connection is working
- [ ] Expo dev server is running
- [ ] Console logs show what's happening
- [ ] Timeouts are set for all async operations
- [ ] Storage is working (SecureStore/AsyncStorage/localStorage)
- [ ] Session is being set correctly
- [ ] Profile is loading (check console logs)
- [ ] AuthContext is updating correctly
- [ ] React state is updating correctly

---

**END OF PROMPT**

Use this document as your complete reference. When starting a new chat, provide this entire document to the AI assistant for full context.

