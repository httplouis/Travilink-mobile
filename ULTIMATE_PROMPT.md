# 🚀 TraviLink Mobile - Ultimate Development Prompt

## 📋 PROJECT OVERVIEW

**TraviLink Mobile** is a React Native (Expo) mobile application that provides the requester (faculty/staff) view for the TraviLink Smart Campus Transport System. The app allows users to view, track, and manage transportation requests, view schedules, and receive real-time notifications.

**Repository Location**: `C:\Users\CATHY\Documents\Travilink-mobile`
**Web Repository Reference**: `C:\Users\CATHY\Documents\Travilink(repo)\TraviLink`

---

## 🎯 CURRENT PROJECT STATUS

### ✅ COMPLETED FEATURES

#### 1. **Authentication System** ✅
- **Microsoft OAuth Integration**: Full Azure AD OAuth flow with deep linking
  - Supports student emails (`@student.mseuf.edu.ph`) and faculty emails (`@mseuf.edu.ph`)
  - Deep link callback handler: `app/auth/callback.tsx`
  - Web and iOS/Android support with platform-specific handling
- **Email/Password Login**: Traditional login as fallback
- **AuthContext**: Complete session management with timeout protection (15s timeout)
- **Secure Storage**: Uses `expo-secure-store` on native, `localStorage` on web
- **Auto-redirect**: Based on authentication state

**Key Files**:
- `app/(auth)/sign-in.tsx` - Sign-in screen with Microsoft OAuth
- `app/auth/callback.tsx` - OAuth callback handler
- `contexts/AuthContext.tsx` - Authentication context with timeout protection
- `lib/supabase/client.ts` - Supabase client with custom storage adapter

**Important Notes**:
- Redirect URL for iOS/Android: `travilink://auth/callback`
- Redirect URL for web: `${window.location.origin}/auth/callback`
- Must add `travilink://auth/callback` to Supabase allowed redirect URLs
- Web flow uses `access_token` in hash fragment, native uses `code` parameter

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

## ⏳ PENDING FEATURES

### 1. **Request Submission Wizard** ⏳
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
- Form validation (all required fields)
- Draft saving functionality
- Signature capture using `expo-signature-pad` or similar
- File uploads using `expo-document-picker`
- Budget calculation
- Department matching logic
- Vehicle/driver validation

**Web Reference**:
- `src/components/user/request/RequestWizard.client.tsx` - Main wizard component
- `src/app/api/requests/submit/route.ts` - Submission API endpoint
- `src/lib/user/request/validation.ts` - Validation logic
- `src/lib/workflow/engine.ts` - Workflow engine for approvals

### 2. **Draft Management** ⏳
- Save drafts locally or to Supabase
- Edit saved drafts
- Resume from draft
- Draft list view

### 3. **PDF Download** ⏳
- Download request as PDF
- Integration with web API or client-side generation
- Share functionality

### 4. **Vehicle Viewing** ⏳
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
- `expo-secure-store` ~13.0.0 - Secure storage
- `expo-web-browser` ^15.0.9 - OAuth browser handling
- `expo-linking` ~6.3.0 - Deep linking
- `expo-auth-session` ^7.0.8 - OAuth session management
- `react-native-calendars` ^1.1301.0 - Calendar component
- `react-native-reanimated` ~3.10.0 - Animations
- `react-native-gesture-handler` ~2.16.0 - Gesture handling
- `date-fns` ^4.1.0 - Date formatting

### Development Tools
- Expo CLI with `--go` flag to bypass login prompts
- Scripts configured in `package.json`:
  - `npm start` - Start dev server with Expo Go
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
│   └── callback.tsx              # OAuth callback handler
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
└── AuthContext.tsx                # Authentication context

lib/
├── supabase/
│   └── client.ts                 # Supabase client with secure storage
├── types.ts                      # TypeScript type definitions
└── utils.ts                      # Utility functions
```

---

## 🔐 AUTHENTICATION FLOW

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

3. **Callback Handling**
   - **Web**: `app/auth/callback.tsx` extracts `access_token` from hash fragment
   - **Native**: `app/auth/callback.tsx` extracts `code` from URL params
   - Exchanges code/token for Supabase session
   - Calls `refreshProfile()` to fetch user data
   - Redirects to `/(tabs)/dashboard`

4. **Session Management**
   - `AuthContext` manages session state
   - 15-second timeout for initialization
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

### Critical: Analyze Web Repository Thoroughly

**Web Repository Location**: `C:\Users\CATHY\Documents\Travilink(repo)\TraviLink`

**You MUST deeply analyze these areas:**

#### 1. **Authentication System** 🔍
- **File**: `src/app/login/page.tsx` and `src/app/login/LoginView.tsx`
- **API**: `src/app/api/auth/callback/route.ts`
- **Key Changes**:
  - Microsoft OAuth is now PRIMARY login method
  - Supports student emails: `a22-34939@student.mseuf.edu.ph`
  - Auto-creates/updates user in `users` table
  - Fetches Microsoft Graph profile (name, department, position)
  - Role-based redirects after login

**Analyze**:
- How Microsoft Graph API is called
- How user profile is created/updated
- Department matching logic
- Role assignment logic
- Error handling

#### 2. **Request Submission** 🔍
- **File**: `src/components/user/request/RequestWizard.client.tsx`
- **API**: `src/app/api/requests/submit/route.ts`
- **Validation**: `src/lib/user/request/validation.ts`
- **Workflow**: `src/lib/workflow/engine.ts`
- **Routing**: `src/lib/user/request/routing.ts`
- **Types**: `src/lib/user/request/types.ts`

**Analyze**:
- Complete form structure and validation rules
- Multi-step wizard flow
- Draft saving mechanism
- Budget calculation logic
- Department matching strategies
- Vehicle/driver validation
- Signature requirements
- File upload handling
- Participant invitation (for seminars)
- Request number generation
- Workflow routing logic

#### 3. **Dashboard** 🔍
- **File**: `src/components/user/dashboard/DashboardView.tsx`
- **Container**: `src/components/user/dashboard/Dashboard.container.tsx`
- **API**: 
  - `src/app/api/vehicles/route.ts` - Vehicle listing
  - `src/app/api/trips/my-trips/route.ts` - User trips
  - Dashboard KPIs calculation

**Analyze**:
- KPI calculation methods
- Vehicle availability logic
- Trip/booking data structure
- Availability heatmap algorithm
- Quick actions implementation

#### 4. **Database Schema** 🔍
- Analyze all Supabase tables:
  - `users` - User profiles with roles
  - `requests` - Transportation requests
  - `request_history` - Approval timeline
  - `departments` - Department information
  - `vehicles` - Vehicle information
  - `notifications` - User notifications
  - `bookings` or `trips` - Scheduled trips
  - Any other related tables

**Analyze**:
- Table relationships (foreign keys)
- Row Level Security (RLS) policies
- Indexes and constraints
- Data types and validation

#### 5. **API Endpoints** 🔍
- All `/api` routes in `src/app/api/`
- Request submission flow
- File upload handling
- PDF generation
- Email sending (if any)

**Analyze**:
- Request/response formats
- Error handling
- Authentication requirements
- Rate limiting
- Validation logic

#### 6. **Workflow Engine** 🔍
- **File**: `src/lib/workflow/engine.ts`
- Approval routing logic
- Status transitions
- Role-based workflows

**Analyze**:
- How approvals are routed
- Status transition rules
- Budget-based routing
- Role-based routing
- Rejection handling
- Cancellation logic

#### 7. **UI Components** 🔍
- Dashboard components
- Request form components
- Status trackers
- Calendar components
- Notification components

**Analyze**:
- Component structure
- Props and state management
- Styling patterns
- Animation usage
- Responsive design

#### 8. **Real-time Features** 🔍
- Supabase Realtime subscriptions
- Live updates implementation
- Notification triggers

**Analyze**:
- What tables have Realtime enabled
- Subscription patterns
- Update triggers
- Notification creation logic

---

## 🎯 NEXT IMPLEMENTATION PRIORITIES

### Priority 1: Request Submission Wizard ⚠️ HIGH
**Why**: Core functionality missing, users need to create requests

**Tasks**:
1. Create multi-step form wizard (`app/request/new.tsx`)
2. Implement form validation (match web version exactly)
3. Add signature capture (`expo-signature-pad`)
4. Add file uploads (`expo-document-picker`)
5. Implement draft saving
6. Connect to submission API
7. Handle all request types (Travel Order, Seminar)
8. Implement budget calculation
9. Add department/vehicle/driver selection
10. Add participant management (for seminars)

**Reference Web Files**:
- `src/components/user/request/RequestWizard.client.tsx`
- `src/app/api/requests/submit/route.ts`
- `src/lib/user/request/validation.ts`

### Priority 2: Draft Management ⚠️ MEDIUM
**Why**: Users need to save and resume requests

**Tasks**:
1. Create draft storage (Supabase or local)
2. Draft list screen
3. Edit draft functionality
4. Resume from draft

### Priority 3: PDF Download ⚠️ MEDIUM
**Why**: Users need to download request documents

**Tasks**:
1. Integrate with web PDF API or implement client-side
2. Add download button in request details
3. Share functionality

### Priority 4: Vehicle Viewing ⚠️ LOW
**Why**: Dashboard shows vehicles, but dedicated view may be useful

**Tasks**:
1. Complete `app/vehicles/index.tsx` if not done
2. Add filtering
3. Add vehicle details

---

## 🐛 KNOWN ISSUES & FIXES

### 1. **iOS OAuth Timeout** ✅ FIXED
**Issue**: OAuth callback timing out on iOS
**Fix**: 
- Added proper deep link handling
- Used `WebBrowser.openAuthSessionAsync()`
- Created `app/auth/callback.tsx` handler
- Added timeout protection in AuthContext

### 2. **Web Infinite Loading** ✅ FIXED
**Issue**: Web callback causing infinite loop
**Fix**:
- Added `isProcessing` flag
- Clear hash fragment after processing
- Proper session handling for web vs native

### 3. **App Hanging on Startup** ✅ FIXED
**Issue**: App stuck loading indefinitely
**Fix**:
- Added 15-second timeout for auth initialization
- Added 8-second timeout for profile fetch
- Added fetch timeout (10s) in Supabase client
- Ensured loading always completes

### 4. **Expo Login Prompt** ✅ FIXED
**Issue**: Stuck on Expo login prompt
**Fix**:
- Added `--go` flag to all npm scripts
- Bypasses login prompt automatically

### 5. **Network Timeout Issues** ✅ PARTIALLY FIXED
**Issue**: Request timeouts on slow networks
**Fix**:
- Added timeouts to all async operations
- Added tunnel mode option (`npm run start:tunnel`)
- Improved error handling

**Remaining**: May need to adjust timeout values based on network conditions

---

## 📝 DEVELOPMENT GUIDELINES

### Code Style
- Use TypeScript for all files
- Follow Expo Router file-based routing
- Use functional components with hooks
- Use TanStack Query for data fetching
- Use Supabase Realtime for live updates
- Follow existing component patterns

### Error Handling
- Always handle loading states
- Show user-friendly error messages
- Implement retry mechanisms
- Log errors to console for debugging
- Use try-catch for async operations

### Performance
- Use React Query caching (30s stale time)
- Implement pull-to-refresh
- Use FlatList for long lists
- Optimize images
- Minimize re-renders

### Security
- Never commit `.env` file
- Use SecureStore for sensitive data
- Validate all user inputs
- Use RLS policies in Supabase
- Sanitize file uploads

### Testing
- Test on iOS and Android
- Test on web (for development)
- Test OAuth flow on all platforms
- Test offline scenarios
- Test with slow networks

---

## 🔄 SYNC WITH WEB VERSION

### Critical: Stay in Sync
- **Always** analyze web version before implementing features
- **Match** validation logic exactly
- **Match** workflow logic exactly
- **Match** data structures exactly
- **Match** API endpoints exactly (if using them)

### When Web Updates
1. Pull latest web repository changes
2. Analyze all changed files
3. Update mobile implementation to match
4. Test thoroughly
5. Update this prompt if needed

---

## 🚨 CRITICAL REMINDERS

1. **Always analyze web version first** - Don't implement features without checking web implementation
2. **Deep dive required** - Read every file, understand every function, trace every flow
3. **Match exactly** - Validation, workflows, data structures must match web
4. **Test OAuth** - Microsoft login must work on iOS, Android, and web
5. **Test timeouts** - App should never hang indefinitely
6. **Check Supabase** - Ensure redirect URLs are configured
7. **Environment variables** - Always check `.env` file exists and is correct
8. **Network issues** - Use tunnel mode if LAN doesn't work
9. **Expo Go** - Use `--go` flag to bypass login prompts

---

## 📚 REFERENCE DOCUMENTATION

### Project Documentation
- `README.md` - Project overview and setup
- `TRAVILINK_WEB_ANALYSIS.md` - Web version analysis
- `IMPLEMENTATION_SUMMARY.md` - Implementation details
- `PROJECT_STATUS.md` - Current project status

### External Documentation
- [Expo Router Docs](https://docs.expo.dev/router/introduction/)
- [Supabase Docs](https://supabase.com/docs)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [React Native Docs](https://reactnative.dev/docs/getting-started)

---

## 🎯 QUICK START FOR NEW CHAT

1. **Read this entire prompt** - Understand the full context
2. **Check current state** - Review what's implemented vs pending
3. **Analyze web version** - Deep dive into web repository for any feature you're implementing
4. **Follow patterns** - Use existing code as reference
5. **Test thoroughly** - Test on iOS, Android, and web
6. **Update documentation** - Keep this prompt updated as you progress

---

## 📞 SUPPORT INFORMATION

**Project**: TraviLink Mobile
**Repository**: `C:\Users\CATHY\Documents\Travilink-mobile`
**Web Reference**: `C:\Users\CATHY\Documents\Travilink(repo)\TraviLink`
**Framework**: Expo ~54.0.23
**Language**: TypeScript
**Backend**: Supabase

---

**Last Updated**: Current session
**Status**: Core features implemented, Request Submission Wizard pending
**Next Priority**: Implement Request Submission Wizard matching web version exactly

