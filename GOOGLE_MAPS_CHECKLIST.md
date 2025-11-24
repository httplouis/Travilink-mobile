# Google Maps API Setup Checklist ✅

## ⚠️ IMPORTANT: Framework Selection

**You selected "Flutter" but you're using React Native!**

In the Google Cloud setup wizard:
- ✅ **Platform**: iOS and Android (CORRECT)
- ❌ **Framework**: You selected "Flutter" 
- ✅ **Should be**: **"React Native"** ← Change this!

## APIs You Need to Enable

Go to **APIs & Services** → **Library** and enable these:

### Required APIs:
1. ✅ **Maps SDK for Android** (Required for Android)
2. ✅ **Maps SDK for iOS** (Required for iOS)

### Optional but Recommended:
3. **Places API** (Better location search)
4. **Geocoding API** (Address conversion)
5. **Maps JavaScript API** (Not needed for mobile, but won't hurt)

## What to Check After Setup

### 1. ✅ API Key Created
- Go to **APIs & Services** → **Credentials**
- You should see your API key listed
- Click on it to view details

### 2. ✅ APIs Enabled
- Go to **APIs & Services** → **Enabled APIs**
- Verify you see:
  - Maps SDK for Android ✅
  - Maps SDK for iOS ✅

### 3. ✅ API Key Restrictions (Optional but Recommended)
- Click on your API key
- Under **API restrictions**, select "Restrict key"
- Choose:
  - Maps SDK for Android
  - Maps SDK for iOS
  - Places API (if enabled)
  - Geocoding API (if enabled)

### 4. ✅ Billing Enabled
- Google Maps requires billing (but has free tier)
- Go to **Billing** → Make sure billing account is linked
- Free tier: $200 credit/month (usually enough for testing)

### 5. ✅ Copy API Key
- In **Credentials** → Click on your API key
- Copy the key (starts with `AIza...`)

## Add to Your Project

1. Open `app.json`
2. Find: `"googleMapsApiKey": "YOUR_GOOGLE_MAPS_API_KEY_HERE"`
3. Replace with your actual key: `"googleMapsApiKey": "AIzaSyC...your-key-here"`

## Test It

1. Restart dev server: `npm start -- --clear`
2. Open location picker in app
3. You should see a map (not just search box)

## Quick Verification

Run this to check if key is set:
```bash
grep -i "googleMapsApiKey" app.json
```

Should show your actual key (not "YOUR_GOOGLE_MAPS_API_KEY_HERE")

