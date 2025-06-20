# Google Authentication Setup Guide

This guide covers setting up Google authentication for both web and Android platforms in your Habitual app.

## 🌐 Web Implementation (Completed)

Your web-based Google authentication is already implemented and ready to use!

### Features Implemented:
- ✅ **Smart Authentication**: Automatically detects web vs Capacitor environment
- ✅ **Popup & Redirect Support**: Uses popup for web, redirect for mobile
- ✅ **Error Handling**: Comprehensive error messages for all scenarios
- ✅ **Account Linking**: Support for linking Google accounts to existing users
- ✅ **Automatic Fallback**: Falls back to redirect if popup is blocked

### Files Created/Updated:
- `src/lib/google-auth.ts` - Main Google authentication service
- `src/app/auth/login/page.tsx` - Updated login page
- `src/app/auth/register/page.tsx` - Updated create account page

## 📱 Android Implementation

### Prerequisites
1. **Firebase Console Setup** (Required)
2. **Google Cloud Console Setup** (Required)
3. **Android Studio** (For native implementation)

## 🔧 Firebase Console Configuration

### Step 1: Enable Google Sign-In
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Authentication → Sign-in method**
4. Enable **Google** provider
5. Click **Save**

### Step 2: Configure OAuth Client
1. In the Google provider settings, note your **Web client ID**
2. This will be used for Android configuration

## 🌍 Google Cloud Console Configuration

### Step 1: Create Android OAuth Client
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Navigate to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth 2.0 Client IDs**
5. Select **Android** as application type
6. Enter your package name: `com.grovia.habitual`
7. Add your SHA-1 certificate fingerprint

### Step 2: Get SHA-1 Fingerprint
Run this command in your project root:

```bash
# For debug keystore (development)
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# For release keystore (production)
keytool -list -v -keystore path/to/your/release.keystore -alias your_alias_name
```

Copy the SHA-1 fingerprint and add it to your OAuth client.

## 📋 Android Dependencies (Already Added)

The following dependencies have been added to `android/app/build.gradle`:

```gradle
implementation 'com.google.firebase:firebase-auth'

// Google Sign-In dependencies
implementation 'androidx.credentials:credentials:1.3.0'
implementation 'androidx.credentials:credentials-play-services-auth:1.3.0'
implementation 'com.google.android.libraries.identity.googleid:googleid:1.1.1'
```

## 🧪 Testing Your Implementation

### Web Testing
1. **Start Development Server**: `npm run dev`
2. **Navigate to**: `http://localhost:3000/auth/login`
3. **Click**: "Continue with Google" button
4. **Expected Behavior**:
   - Popup opens with Google sign-in
   - After successful sign-in, redirects to home page
   - User profile information is stored in Firebase

### Android Testing
1. **Build Android App**: `npm run build && npx cap sync android`
2. **Open in Android Studio**: `npx cap open android`
3. **Run on Device/Emulator**
4. **Expected Behavior**:
   - Tapping "Continue with Google" opens native Google sign-in
   - After successful sign-in, returns to app and redirects to home

## 🔍 Troubleshooting

### Common Web Issues

**1. Popup Blocked**
- **Error**: `auth/popup-blocked`
- **Solution**: App automatically falls back to redirect method

**2. Unauthorized Domain**
- **Error**: `auth/unauthorized-domain`
- **Solution**: Add your domain to Firebase Console authorized domains

**3. Invalid Client Configuration**
- **Error**: `auth/invalid-oauth-client`
- **Solution**: Check Firebase Console Google provider configuration

### Common Android Issues

**1. Google Play Services Not Available**
- **Solution**: Ensure Google Play Services is installed on device
- **Alternative**: Use Firebase Auth UI fallback

**2. SHA-1 Mismatch**
- **Error**: Sign-in fails silently
- **Solution**: Verify SHA-1 fingerprint in Google Cloud Console

**3. Package Name Mismatch**
- **Error**: `DEVELOPER_ERROR`
- **Solution**: Ensure package name matches in all configurations

## 🚀 Production Deployment

### Web Deployment
1. **Add Production Domain**: Add your production domain to Firebase authorized domains
2. **Environment Variables**: Ensure all Firebase config variables are set
3. **HTTPS Required**: Google sign-in requires HTTPS in production

### Android Deployment
1. **Release Keystore**: Generate and configure release keystore
2. **Production SHA-1**: Add production SHA-1 fingerprint to Google Cloud Console
3. **Play Store**: Upload to Google Play Store for distribution

## 🔐 Security Best Practices

### Web Security
- ✅ **Domain Validation**: Only authorized domains can use Google sign-in
- ✅ **Token Validation**: Firebase automatically validates Google ID tokens
- ✅ **HTTPS Enforcement**: Secure connection required for production

### Android Security
- ✅ **Package Name Verification**: Google validates your app's package name
- ✅ **Certificate Fingerprint**: SHA-1 fingerprint prevents impersonation
- ✅ **Play Integrity**: Google Play services provides additional security

## 📚 Additional Resources

### Documentation
- [Firebase Auth Web Guide](https://firebase.google.com/docs/auth/web/google-signin)
- [Firebase Auth Android Guide](https://firebase.google.com/docs/auth/android/google-signin)
- [Google Sign-In Android Guide](https://developers.google.com/identity/sign-in/android)

### Support
- [Firebase Support](https://firebase.google.com/support)
- [Google Identity Support](https://developers.google.com/identity/support)

## ✅ Implementation Status

### Completed ✅
- [x] Web Google authentication service
- [x] Login page integration
- [x] Create account page integration
- [x] Error handling and user feedback
- [x] Android dependencies configuration
- [x] Comprehensive documentation

### Next Steps 📋
1. **Test on Android device** with your Firebase project
2. **Configure production OAuth clients** for your domains
3. **Add release keystore SHA-1** for production Android builds
4. **Test end-to-end authentication flow**

Your Google authentication is now ready for both web and Android platforms! 🎉 