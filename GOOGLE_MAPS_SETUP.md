# Map Setup Guide

## ✅ FREE Option: OpenStreetMap (No API Key Required!)

**The app is already configured to use OpenStreetMap tiles, which are completely FREE and require NO API key or billing setup!**

The app uses:
- **Nominatim (OpenStreetMap)** for location search - FREE, no API key needed
- **OpenStreetMap tiles** for map display - FREE, no API key needed

**You don't need to do anything!** The map should work out of the box.

---

## Optional: Google Maps API (Better Quality, But Requires Setup)

If you want better map quality and more features, you can optionally use Google Maps API:

### Google Maps Free Tier
- **$200/month in FREE credits** (automatically applied)
- You only pay if you exceed $200/month in usage
- For a mobile app, this is usually enough to stay within the free tier

### Setup Steps (Optional)

#### 1. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Choose **"Pay as you go"** pricing (this includes the $200/month free credits)
4. Enable the following APIs:
   - **Maps SDK for Android** (for Android)
   - **Maps SDK for iOS** (for iOS)
   - **Places API** (optional, for better search)
   - **Geocoding API** (optional, for address conversion)

5. Go to **Credentials** → **Create Credentials** → **API Key**
6. Copy your API key

#### 2. Configure in app.json

Open `app.json` and replace `YOUR_GOOGLE_MAPS_API_KEY_HERE` with your actual API key:

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

#### 3. For Android (Additional Setup)

If you're building for Android, you also need to add the API key to `android/app/src/main/AndroidManifest.xml`:

```xml
<application>
  <meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="YOUR_ACTUAL_API_KEY_HERE"/>
</application>
```

#### 4. Restart Development Server

After adding the API key:
```bash
npm start -- --clear
```

## Testing

1. Open the location picker in the app
2. You should see a map (not just search)
3. You can tap on the map to select locations
4. You can drag the marker for precise positioning

## Troubleshooting

**Map not showing?**
- Check if `react-native-maps` is installed: `npm list react-native-maps`
- Restart the development server: `npm start -- --clear`
- The app uses OpenStreetMap by default (no API key needed)
- If using Google Maps: Verify API key is correct in `app.json`
- If using Google Maps on Android: Check `AndroidManifest.xml` has the API key

**Getting API key errors?**
- **You don't need Google Maps API!** The app works with OpenStreetMap (free, no API key)
- If you want to use Google Maps: Make sure you enabled the correct APIs in Google Cloud Console
- If you want to use Google Maps: Check API key restrictions (if any)
- If you want to use Google Maps: Verify billing is enabled (but you get $200/month free credits)

