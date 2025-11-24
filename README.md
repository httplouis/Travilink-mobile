# TraveLink Mobile

Mobile application for TraveLink - Smart Campus Transport System. This app provides the requester (faculty/staff) view for viewing and tracking transportation requests.

## 📌 About

TraveLink Mobile is a cross-platform mobile application built with React Native (Expo), TypeScript, and Supabase. It provides faculty and staff with a mobile interface to view their transportation requests, track approval status, view their schedule, and receive real-time notifications.

---

## 🚀 Features

- ✅ **Authentication** - Secure sign-in with Supabase Auth
- ✅ **My Papers (Submissions)** - View all submitted requests with real-time updates
- ✅ **Request Details** - Full request information with approval timeline
- ✅ **Schedule/Calendar** - View approved trips and availability
- ✅ **Notifications** - Real-time notifications for request updates
- ✅ **Real-time Sync** - Live updates via Supabase Realtime
- ⏳ **Request Submission** - Create new requests (coming soon)
- ⏳ **Draft Management** - Save and edit draft requests (coming soon)

---

## 📋 Requirements

- Node.js >= 18.x
- npm or yarn
- Git
- A Supabase project (same as web app)
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (for iOS) or Android Emulator (for Android)
- Expo Go app (for testing on physical device)

---

## 🔧 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/httplouis/Travilink-mobile.git
cd TraveLink-mobile
```

### 2. Install Dependencies

```bash
npm install
```

**Note:** This project uses `--legacy-peer-deps` (configured in `.npmrc`) to resolve React version conflicts between dependencies. This is normal and safe.

**Complete dependency list:**
- `expo` - Expo framework
- `expo-router` - File-based routing
- `@supabase/supabase-js` - Supabase client
- `@tanstack/react-query` - Data fetching and caching
- `expo-secure-store` - Secure storage for auth tokens
- `react-native-calendars` - Calendar component
- `date-fns` - Date formatting
- `react-native-reanimated` - Animations
- `react-native-gesture-handler` - Gesture handling
- `react-native-safe-area-context` - Safe area handling
- `@expo/vector-icons` - Icon library
- `expo-location` - Location services (for map picker and current location)
- `react-native-maps` - Map component for location selection (native only, web fallback)
- `expo-image-picker` - Image picker for signature upload
- `expo-file-system` - File system access for reading signature images and PDF downloads
- `@react-native-community/datetimepicker` - Native date/time picker
- `react-native-signature-canvas` - Signature pad component
- `react-native-webview` - WebView for signature canvas

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**How to get Supabase credentials:**
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the **Project URL** and **anon/public key**
4. Paste them into your `.env` file

**⚠️ Important:** The `.env` file is in `.gitignore` (this is correct - never commit secrets!)

### 4. Start the Development Server

```bash
npm start
```

This will:
- Start the Expo development server
- Open Expo DevTools in your browser
- Show a QR code for testing on physical devices

### 5. Run on Device/Simulator

**iOS Simulator:**
```bash
npm run ios
# or press 'i' in the Expo CLI
```

**Android Emulator:**
```bash
npm run android
# or press 'a' in the Expo CLI
```

**Physical Device:**
1. Install **Expo Go** app from App Store/Play Store
2. Scan the QR code shown in terminal/browser
3. App will load on your device

**Web (for testing):**
```bash
npm run web
# or press 'w' in the Expo CLI
```

---

## 📁 Project Structure

```
app/
├── _layout.tsx              # Root layout with providers
├── index.tsx                # Root redirect
├── (auth)/                  # Authentication screens
│   ├── _layout.tsx
│   └── sign-in.tsx
├── (tabs)/                  # Main app tabs
│   ├── _layout.tsx          # Tab navigator
│   ├── submissions/         # My Papers - Request list
│   │   └── index.tsx
│   ├── calendar/            # Schedule view
│   │   └── index.tsx
│   └── notifications/       # Notifications
│       └── index.tsx
└── request/                  # Request details screen
    └── [id].tsx

components/                  # Reusable components
├── RequestCard.tsx          # Request list item
├── RequestStatusTracker.tsx # Approval progress tracker with names/timestamps
├── StatusBadge.tsx          # Status indicator badge
├── DateInput.tsx            # Date picker with native support
├── UserSearchableSelect.tsx # User search and selection
├── DepartmentSelect.tsx     # Department selection modal
├── LocationField.tsx        # Location input with map picker
├── MapPicker.tsx            # Interactive map for location selection
├── CostsSection.tsx         # Travel costs with preset buttons
├── SignaturePad.tsx         # Signature capture (draw or upload)
├── HeadEndorsementInvitationEditor.tsx # Head endorsement UI
└── NavigationHeader.tsx      # Reusable navigation header

hooks/                       # Custom React hooks
├── useRequests.ts          # Requests data fetching + real-time
├── useCalendar.ts          # Calendar bookings fetching
└── useNotifications.ts     # Notifications + mark as read

contexts/                    # React contexts
└── AuthContext.tsx         # Authentication context

lib/                         # Utilities and configuration
├── supabase/
│   └── client.ts           # Supabase client with secure storage
├── types.ts                # TypeScript type definitions
├── utils.ts                # Helper functions (date formatting, etc.)
└── utils/
    └── pdf-helpers.ts      # PDF filename formatting and initials extraction
```

---

## 🔑 Key Features Implementation

### Real-time Updates

The app uses Supabase Realtime subscriptions to automatically update:
- Request status changes
- New notifications
- Calendar bookings

**How it works:**
- Subscriptions listen to database changes
- TanStack Query automatically refetches when changes occur
- UI updates instantly without manual refresh

### Data Fetching

Uses TanStack Query (React Query) for:
- Automatic caching (30s stale time)
- Background refetching with `refetchInterval`:
  - Requests list: 5 seconds
  - Notifications: 5 seconds
  - Calendar: 30-60 seconds
  - Dashboard: 30-60 seconds
- Optimistic updates
- Error handling and retry logic
- Loading states

### Authentication

- Supabase Auth for secure authentication
- Session stored in Expo Secure Store (encrypted)
- Automatic token refresh
- Protected routes (tabs require authentication)
- Auto-redirect based on auth state

---

## 🔌 API Integration

The app connects directly to Supabase (same database as web app):
- Uses Row Level Security (RLS) policies
- Queries same tables: `requests`, `notifications`, `users`, `departments`, `vehicles`
- Real-time subscriptions for live updates
- No separate API server needed

**External APIs:**

1. **Nominatim (OpenStreetMap)** - Free location search and geocoding (no API key required)
   - Used for map picker search/autocomplete
   - Reverse geocoding to get addresses from coordinates
   - No rate limits for reasonable usage
   - User-Agent header set to "TraviLink-Mobile/1.0" (required by Nominatim)
   - Endpoint: `https://nominatim.openstreetmap.org/`

2. **TraviLink Web API** - Backend API endpoints (requires authentication)
   - PDF Generation: `GET /api/requests/[id]/pdf`
   - Duplicate Request: `POST /api/requests/[id]/duplicate`
   - Head Endorsement Invitations: `POST /api/head-endorsements/invite`
   - Base URL: Set via `EXPO_PUBLIC_WEB_APP_URL` environment variable (defaults to Supabase URL)
   - Authentication: Uses Supabase session token in Authorization header

**Tables used:**
- `requests` - Transportation requests (with all fields matching web version)
- `notifications` - User notifications
- `users` - User profiles (with position_title, department, role, is_head)
- `departments` - Department information
- `vehicles` - Vehicle information
- `request_history` - Approval timeline
- `feedback` - Trip feedback/evaluations (optional, for completed trips)

---

## 🛠️ Development

### Common Commands

```bash
# Start development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on web
npm run web

# Clear cache and restart
npm start -- --clear
```

### Building for Production

**iOS:**
```bash
expo build:ios
# or use EAS Build
eas build --platform ios
```

**Android:**
```bash
expo build:android
# or use EAS Build
eas build --platform android
```

### Debugging

- **React Native Debugger**: Install and connect for debugging
- **Expo DevTools**: Built-in debugging tools
- **Console logs**: Check terminal for logs
- **React DevTools**: Install browser extension

---

## 🐛 Troubleshooting

### White Screen on Web

If you see a white screen when running `npm run web`:
1. Check browser console for errors
2. Ensure all dependencies are installed: `npm install`
3. Clear cache: `npm start -- --clear`
4. Check that `react-native-web` is installed (should be in package.json)

### Supabase Connection Issues

- Verify environment variables are set correctly in `.env`
- Check Supabase project is active
- Ensure RLS policies allow user access
- Check network connectivity

### Real-time Not Working

- Check Supabase Realtime is enabled in project settings
- Verify RLS policies allow SELECT operations
- Check network connectivity
- Restart the app

### Authentication Issues

- Clear Secure Store: Uninstall and reinstall app
- Check Supabase Auth settings
- Verify user exists in `users` table
- Check console for auth errors

### Expo Dev Server Timeout / Connection Issues

If you see "The request timed out" when trying to connect to the Expo dev server:

**Solution 1: Use Tunnel Mode (Recommended)**
```bash
npm run start:tunnel
```
This uses Expo's tunnel service to bypass network connectivity issues. Works even if your device and computer are on different networks.

**Solution 2: Check Network Connection**
- Ensure your device and computer are on the same Wi-Fi network
- Try disabling VPN if active
- Check firewall settings (may need to allow port 8081)

**Solution 3: Use LAN Mode with Different IP**
- Find your computer's IP address: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
- Ensure the IP matches what's shown in the error (`192.168.68.140` in your case)
- If IP changed, restart the Expo server: `npm start`

**Solution 4: Clear Cache and Restart**
```bash
npm start -- --clear
```

**Solution 5: Check Port Availability**
- Ensure port 8081 is not blocked by firewall
- Check if another process is using port 8081
- On Windows, you can check with: `netstat -ano | findstr :8081`

### Calendar Not Showing

- Check that user has approved requests
- Verify date range in `useCalendar` hook
- Check Supabase query is returning data
- Look for errors in console

---

## 📝 Environment Variables

Required environment variables (in `.env` file):

- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key

Optional environment variables:

- `EXPO_PUBLIC_WEB_APP_URL` - Base URL for TraviLink web API (for PDF download, duplicate, etc.)
  - Defaults to Supabase URL if not set
  - Example: `https://travilink.example.com` or `http://localhost:3000` (for development)

**Note:** Variables must start with `EXPO_PUBLIC_` to be accessible in the app.

---

## 📚 Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [TanStack Query Documentation](https://tanstack.com/query/latest)

---

## 🎯 Current Status

### ✅ Completed
- Phase 1: Setup (Expo Router, Supabase, TanStack Query)
- Phase 2: Authentication (Sign-in, Auth Context)
- Phase 3: My Papers (Submissions List)
- Phase 4: Request Details (Full details + Tracking)
- Phase 5: Calendar (Month view + Bookings)
- Phase 6: Notifications (List + Real-time)

### ✅ Recently Completed
- Phase 7: Request Submission (Travel Order and Seminar forms)
  - Complete form implementation matching web version exactly
  - All data fields and validation logic
  - Map picker with search/autocomplete (using Nominatim/OpenStreetMap - free, no API key needed)
  - User searchable select with full user list
  - Department selection
  - Costs section with dynamic expenses and preset buttons
  - Signature pad with drawing and image upload
  - Full database integration with Supabase

- Phase 8: Advanced Features
  - **PDF Download** - Download request PDFs with proper filename format (TO-2025-{number}-{initials}.pdf)
  - **Duplicate Request** - Duplicate existing requests to create new drafts
  - **Return to Sender** - Edit and resubmit returned requests with comments display
  - **Fixed Cost Presets** - Quick-select buttons for common expense amounts
  - **Head Self-Request Logic** - Auto-endorsement for department head requests
  - **Approval Signatures Display** - Show approver names and timestamps in tracking
  - **Auto-Refresh** - Automatic refresh for inbox and notifications (5-second intervals)
  - **Calendar Visibility** - Slot counts with pending/approved breakdown (privacy-focused)
  - **Pending Evaluations** - Notifications for completed trips needing feedback
  - **Head Endorsement Invitations** - UI for sending email invitations (ready for backend API)
  - **Budget Threshold Routing** - Display routing path based on ₱15,000 threshold
  - **Skip Admin/Comptroller** - Logic handled by backend workflow engine

### ✅ All Features Complete
- All planned features from the implementation plan have been completed
- Mobile app is fully functional and matches web version's logic and data flow
- Ready for testing and production deployment

---

## 📄 License

Private - TraviLink Project

---

## 👥 Team

TraviLink Development Team

---

## 📞 Support

For issues or questions:
1. Check this README
2. Check `PROJECT_STATUS.md` for current status
3. Check `TRAVILINK_WEB_ANALYSIS.md` for web app reference
4. Review console logs for errors

---

## 🔄 Updates

- **v1.0.0** - Initial release with core viewing features
- Request submission feature coming soon
