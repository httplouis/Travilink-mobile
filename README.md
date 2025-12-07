# Travelink

> A comprehensive travel order and seminar application management system for Manuel S. Enverga University Foundation (MSEUF) - Mobile Application

[![Live Demo](https://img.shields.io/badge/Live%20Demo-travilink.vercel.app-blue)](https://travilink.vercel.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](https://www.typescriptlang.org/)
[![React Native](https://img.shields.io/badge/React%20Native-Expo-61DAFB)](https://expo.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E)](https://supabase.com/)

---

## Overview

Travelink Mobile is a smart mobile application designed to streamline and automate the entire travel order request process for MSEUF. The mobile app provides faculty and staff with on-the-go access to submit requests, track approval workflows, view schedules, manage vehicle/driver assignments, and provide post-trip feedback.

Built with **React Native (Expo)**, **TypeScript**, and **Supabase**, the mobile app offers full feature parity with the web version while providing an optimized mobile experience.

---

## Key Features

### 🚗 Request Management
Submit and track travel orders and seminar applications with budget tracking. Create new requests, duplicate existing ones, and manage drafts directly from your mobile device.

### ✅ Multi-Level Approval Workflow
Automated routing through Department Head → Admin → Comptroller → HR → Executive. Real-time tracking of approval status with detailed timeline and approver information.

### 🚐 Vehicle & Driver Assignment
Intelligent assignment based on availability and requirements. View assigned vehicles and drivers for approved requests.

### 📍 Real-Time Tracking
Live updates on request status and approval progress. Receive instant notifications for status changes, approvals, and rejections.

### 📅 Schedule & Calendar
View approved trips and availability in an intuitive calendar interface. Track your travel schedule and manage bookings.

### ✍️ Signature Management
Draw or upload signatures directly from your mobile device. Manage signature settings and use them for request submissions.

### 🗺️ Map Integration
Interactive location selection with search and autocomplete. Pick destinations using an integrated map picker powered by OpenStreetMap.

### 📄 PDF Download
Download request PDFs with proper formatting. Access documents on-the-go with offline viewing capabilities.

### 🔔 Notifications
Real-time notifications for request updates, approvals, and important announcements. Stay informed about your requests anytime, anywhere.

### 💬 Feedback System
Post-trip feedback collection with ratings and reviews. Evaluate completed trips and provide valuable feedback.

---

## Quick Start

### Prerequisites

- **Node.js** >= 18.x
- **npm** or **yarn**
- **Git**
- **Supabase project** (same as web app)
- **Expo CLI** (`npm install -g expo-cli`)
- **iOS Simulator** (for iOS) or **Android Emulator** (for Android)
- **Expo Go app** (for testing on physical device)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/httplouis/Travilink-mobile.git
   cd Travilink-mobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
   > **Note:** This project uses `--legacy-peer-deps` (configured in `.npmrc`) to resolve React version conflicts. This is normal and safe.

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```
   
   **How to get Supabase credentials:**
   - Go to your Supabase project dashboard
   - Navigate to **Settings** → **API**
   - Copy the **Project URL** and **anon/public key**
   - Paste them into your `.env` file
   
   > ⚠️ **Important:** The `.env` file is in `.gitignore` (never commit secrets!)

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Run on your device**
   - **iOS Simulator:** `npm run ios` or press `i`
   - **Android Emulator:** `npm run android` or press `a`
   - **Physical Device:** Install Expo Go and scan the QR code
   - **Web:** `npm run web` or press `w`

---

## Project Structure

```
Travilink-mobile/
├── app/                    # Expo Router app directory
│   ├── (auth)/            # Authentication screens
│   ├── (tabs)/            # Main app tabs
│   │   ├── submissions/   # My Papers - Request list
│   │   ├── calendar/      # Schedule view
│   │   ├── notifications/ # Notifications
│   │   └── ...
│   └── request/           # Request details screen
│
├── components/            # Reusable React components
│   ├── RequestCard.tsx
│   ├── RequestStatusTracker.tsx
│   ├── SignaturePad.tsx
│   └── ...
│
├── hooks/                 # Custom React hooks
│   ├── useRequests.ts
│   ├── useCalendar.ts
│   └── ...
│
├── contexts/              # React contexts
│   └── AuthContext.tsx
│
├── lib/                   # Utilities and configuration
│   ├── supabase/         # Supabase client
│   ├── types.ts          # TypeScript definitions
│   └── utils/            # Helper functions
│
└── docs/                  # Documentation files
    └── README.md         # Documentation index
```

---

## Technology Stack

### Core Technologies
- **React Native** - Mobile framework
- **Expo** - Development platform and tooling
- **TypeScript** - Type-safe JavaScript
- **Supabase** - Backend (Auth, Database, Realtime)
- **TanStack Query** - Data fetching and caching

### Key Libraries
- `expo-router` - File-based routing
- `react-native-calendars` - Calendar component
- `react-native-maps` - Map component
- `react-native-signature-canvas` - Signature pad
- `expo-location` - Location services
- `expo-image-picker` - Image picker
- `date-fns` - Date formatting

> See [`docs/APIS_AND_LIBRARIES.md`](docs/APIS_AND_LIBRARIES.md) for complete dependency list.

---

## API Integration

### Supabase (Primary Backend)
- Direct database connection with Row Level Security (RLS)
- Real-time subscriptions for live updates
- Tables: `requests`, `notifications`, `users`, `departments`, `vehicles`, `request_history`

### External APIs
1. **Nominatim (OpenStreetMap)** - Free location search and geocoding
   - No API key required
   - Used for map picker search/autocomplete
   - Endpoint: `https://nominatim.openstreetmap.org/`

2. **Travelink Web API** - Backend API endpoints
   - PDF Generation: `GET /api/requests/[id]/pdf`
   - Duplicate Request: `POST /api/requests/[id]/duplicate`
   - Head Endorsement Invitations: `POST /api/head-endorsements/invite`

---

## Development

### Common Commands

```bash
# Start development server
npm start

# Run on specific platform
npm run ios          # iOS Simulator
npm run android      # Android Emulator
npm run web          # Web browser

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

---

## Troubleshooting

### Common Issues

<details>
<summary><b>White Screen on Web</b></summary>

1. Check browser console for errors
2. Ensure all dependencies are installed: `npm install`
3. Clear cache: `npm start -- --clear`
4. Verify `react-native-web` is installed
</details>

<details>
<summary><b>Supabase Connection Issues</b></summary>

- Verify environment variables in `.env` file
- Check Supabase project is active
- Ensure RLS policies allow user access
- Check network connectivity
</details>

<details>
<summary><b>Expo Dev Server Timeout</b></summary>

**Solution 1: Use Tunnel Mode (Recommended)**
```bash
npm run start:tunnel
```

**Solution 2: Check Network**
- Ensure device and computer are on same Wi-Fi
- Disable VPN if active
- Check firewall settings (port 8081)

**Solution 3: Clear Cache**
```bash
npm start -- --clear
```
</details>

> For more troubleshooting tips, see [`docs/`](docs/) folder.

---

## Environment Variables

### Required
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Optional
```env
EXPO_PUBLIC_WEB_APP_URL=https://travilink.example.com
```
> Defaults to Supabase URL if not set

**Note:** Variables must start with `EXPO_PUBLIC_` to be accessible in the app.

---

## Documentation

All additional documentation is organized in the [`docs/`](docs/) folder:

- **APIs & Libraries** - Complete dependency list and API documentation
- **Project Status** - Current development status and roadmap
- **Setup Guides** - Google Maps setup, environment configuration
- **Implementation Details** - Feature implementation summaries
- **Web App Analysis** - Reference documentation for web version

> See [`docs/README.md`](docs/README.md) for documentation index.

---

## Current Status

### ✅ Completed Features

- ✅ Authentication & Authorization
- ✅ Request Submission (Travel Order & Seminar)
- ✅ Request Tracking & Status Updates
- ✅ Calendar & Schedule View
- ✅ Real-time Notifications
- ✅ PDF Download & Duplication
- ✅ Signature Management
- ✅ Map Integration
- ✅ Head Endorsement System
- ✅ Feedback Collection

### 🚧 In Progress

- Ongoing bug fixes and improvements
- Performance optimizations

---

## License

**MIT License** - Travelink Project

---

## Team

**Travelink Development Team**
- [@Gaboogsh](https://github.com/Gaboogsh)
- [@httplouis](https://github.com/httplouis)
- [@Hans-Madridano25](https://github.com/Hans-Madridano25)

---

## Support

For issues or questions:

1. Check this README
2. Review [`docs/`](docs/) folder for detailed documentation
3. Check [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) for current status
4. Review console logs for errors

---

## Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [TanStack Query Documentation](https://tanstack.com/query/latest)

---

<div align="center">

**Made with ❤️ by the Travelink Team**

</div>
