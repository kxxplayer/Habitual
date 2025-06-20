# Android Firebase Phone Authentication Setup Guide

## Current Issue
The reCAPTCHA verifier is failing with "Firebase: Error (auth/argument-error)" when trying to use phone authentication on Android.

## Root Cause Analysis
1. **reCAPTCHA Configuration**: Android apps require different reCAPTCHA handling than web apps
2. **Domain Authorization**: Firebase Console needs proper Android app configuration
3. **Missing Permissions**: Android requires specific SMS permissions for phone authentication

## Step-by-Step Fix

### 1. Firebase Console Configuration

#### A. Enable Phone Authentication
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `habitual-ucw41`
3. Navigate to **Authentication** → **Sign-in method**
4. Enable **Phone** authentication method
5. Click **Save**

#### B. Configure Android App
1. In Firebase Console, go to **Project Settings** → **General**
2. Under **Your apps**, find your Android app
3. Verify the following details:
   - **Package name**: `com.grovia.habitual`
   - **App nickname**: Habitual
   - **Debug signing certificate SHA-1**: (Add if missing)

#### C. Add SHA-1 Fingerprint (Critical for Phone Auth)
**🔑 Your Debug SHA-1 Fingerprint**: `4B:65:99:3F:A1:6C:80:FF:5B:EF:26:06:6F:5F:23:E5:4B:E2:13:DF`

**Steps to add to Firebase Console**:
1. Go to [Firebase Console](https://console.firebase.google.com/) → Project Settings → General
2. Under **Your apps**, find your Android app (`com.grovia.habitual`)
3. Click **Add fingerprint**
4. Paste the SHA-1: `4B:65:99:3F:A1:6C:80:FF:5B:EF:26:06:6F:5F:23:E5:4B:E2:13:DF`
5. Click **Save**

**⚠️ CRITICAL**: This SHA-1 fingerprint MUST be added to Firebase Console for phone authentication to work on Android!

#### D. Authorized Domains
1. In Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Ensure these domains are added:
   - `localhost` (for development)
   - `habitual-ucw41.firebaseapp.com` (your Firebase domain)
   - Your production domain (if any)

### 2. Android App Configuration

#### A. Verify google-services.json
✅ **Already configured** - The file is present and contains the correct configuration.

#### B. Verify Build Dependencies
✅ **Already configured** - Firebase Auth and BOM are properly added to `android/app/build.gradle`.

#### C. Verify Permissions
✅ **Just added** - SMS permissions have been added to `AndroidManifest.xml`:
- `RECEIVE_SMS`
- `READ_SMS` 
- `SEND_SMS`

### 3. Code Implementation Fixes

#### A. Updated reCAPTCHA Handling
✅ **Just fixed** - Updated `src/lib/otp-auth.ts` to:
- Detect Capacitor/Android environment
- Use invisible reCAPTCHA for mobile devices
- Better error handling for Android-specific issues

#### B. Key Changes Made:
1. **Environment Detection**: Added `isCapacitorEnvironment()` function
2. **Mobile-First reCAPTCHA**: Uses invisible reCAPTCHA for Android
3. **Better Error Messages**: More specific error handling for different failure scenarios

### 4. Testing Instructions

#### A. Test Phone Numbers (For Development)
Add these test numbers in Firebase Console → **Authentication** → **Phone numbers for testing**:

| Phone Number | Verification Code |
|--------------|-------------------|
| +91 98765-43210 | 123456 |
| +1 650-555-3434 | 123456 |

#### B. Testing Steps:
1. Build and run the Android app:
   ```bash
   npm run build
   npx cap sync
   npx cap run android
   ```

2. Navigate to Phone OTP login
3. Enter a test phone number
4. The reCAPTCHA should now initialize as invisible
5. Enter the test verification code (123456)

### 5. Troubleshooting

#### Common Issues and Solutions:

**Issue**: "reCAPTCHA initialization failed"
**Solution**: 
- Ensure SHA-1 fingerprint is added to Firebase Console
- Check that phone authentication is enabled
- Verify authorized domains include your development environment

**Issue**: "Domain not authorized"
**Solution**:
- Add `localhost` to Firebase Console authorized domains
- For Android, ensure SHA-1 fingerprint is correct

**Issue**: "Invalid app credential"
**Solution**:
- Regenerate and download `google-services.json`
- Ensure package name matches exactly: `com.grovia.habitual`

**Issue**: SMS not received
**Solution**:
- Use test phone numbers during development
- Check phone number format (include country code)
- Verify SMS permissions are granted on device

### 6. Production Considerations

#### A. Release SHA-1 Fingerprint
For production builds, you'll need to add the release SHA-1:
```bash
keytool -list -v -keystore path/to/release-keystore.jks -alias your-alias
```

#### B. Play Store Requirements
- Request SMS permissions only when needed
- Provide clear explanation for SMS permissions
- Consider using Google Play Services for automatic SMS verification

### 7. Verification Checklist

- [ ] Firebase Phone Authentication enabled
- [ ] Android SHA-1 fingerprint added to Firebase Console
- [ ] Test phone numbers configured
- [ ] SMS permissions added to AndroidManifest.xml
- [ ] Updated reCAPTCHA handling for mobile
- [ ] App builds successfully
- [ ] Phone authentication works with test numbers

## Next Steps

1. **Immediate**: Test the phone authentication with the updated code
2. **Before Production**: Add release SHA-1 fingerprint
3. **Optimization**: Consider implementing automatic SMS code detection
4. **Security**: Review and minimize SMS permissions for production

## Support Resources

- [Firebase Phone Auth Documentation](https://firebase.google.com/docs/auth/android/phone-auth)
- [Capacitor Firebase Auth Plugin](https://github.com/capacitor-community/firebase-auth)
- [Android SMS Permissions Guide](https://developer.android.com/guide/topics/permissions/overview#sms) 