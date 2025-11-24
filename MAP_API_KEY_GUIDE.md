# Map API Key Guide

## ✅ Good News: You DON'T Need an API Key!

The app is now configured to use **OpenStreetMap tiles**, which are **completely FREE** and require **NO API key**!

The map should work out of the box without any setup.

---

## 🗺️ Current Setup (OpenStreetMap - FREE)

- **No API key required**
- **No billing setup needed**
- **Works immediately**
- Uses OpenStreetMap tiles (free and open source)

---

## 🔧 Optional: Google Maps API (Better Quality)

If you want better map quality and more features, you can optionally use Google Maps API:

### Google Maps Free Tier
- **$200/month in FREE credits** (automatically applied)
- You only pay if you exceed $200/month in usage
- For a mobile app, this is usually enough to stay within the free tier

### How to Get Google Maps API Key (Optional)

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create or Select Project**
   - Create a new project or select existing one
   - Project name: "TraviLink Maps" (or any name)

3. **Enable Billing** (Required, but you get $200/month free)
   - Go to **Billing** in the left menu
   - Link a billing account (credit card required, but you won't be charged unless you exceed $200/month)
   - Choose **"Pay as you go"** pricing (this includes the $200/month free credits)

4. **Enable Required APIs**
   - Go to **APIs & Services** → **Library**
   - Search and enable:
     - **Maps SDK for Android** (for Android)
     - **Maps SDK for iOS** (for iOS)
     - **Places API** (optional, for better search)
     - **Geocoding API** (optional, for address conversion)

5. **Create API Key**
   - Go to **APIs & Services** → **Credentials**
   - Click **"Create Credentials"** → **"API Key"**
   - Copy your API key

6. **Configure in Mobile App**
   - Open `app.json`
   - Find the `react-native-maps` plugin
   - Replace `YOUR_GOOGLE_MAPS_API_KEY_HERE` with your actual API key:
   
   ```json
   {
     "expo": {
       "plugins": [
         [
           "react-native-maps",
           {
             "googleMapsApiKey": "YOUR_ACTUAL_API_KEY_HERE"
           }
         ]
       ]
     }
   }
   ```

7. **For Android (Additional Setup)**
   - If building for Android, also add to `android/app/src/main/AndroidManifest.xml`:
   
   ```xml
   <application>
     <meta-data
       android:name="com.google.android.geo.API_KEY"
       android:value="YOUR_ACTUAL_API_KEY_HERE"/>
   </application>
   ```

8. **Restart Development Server**
   ```bash
   npm start -- --clear
   ```

---

## 🎯 Recommendation

**Start with OpenStreetMap (current setup)** - it's free and works immediately!

Only switch to Google Maps if:
- You need better map quality
- You need advanced features (like Places API)
- You're okay with setting up billing (even though you get $200/month free)

---

## ❓ Troubleshooting

**Map not showing?**
- Check console logs for errors
- Verify `react-native-maps` is installed: `npm list react-native-maps`
- For Android: Check if OpenStreetMap tiles are loading
- Restart development server: `npm start -- --clear`

**Getting API key errors?**
- Make sure you enabled the correct APIs in Google Cloud Console
- Check API key restrictions (if any)
- Verify billing is enabled (Google Maps requires billing, but has free tier)

