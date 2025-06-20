# Password Reset Setup Guide

This guide covers setting up Firebase password reset functionality for the Habitual app, including both web and Android platforms.

## Overview

The password reset system uses Firebase's built-in password reset functionality with custom action code settings. This is **separate** from but **compatible** with the email link authentication system.

### Key Features

- ✅ **Secure Password Reset**: Uses Firebase's secure password reset tokens
- ✅ **Custom Redirect URLs**: Redirects to your app after password reset
- ✅ **Mobile Deep Links**: Works seamlessly on Android devices
- ✅ **Password Strength Validation**: Real-time password strength checking
- ✅ **User-Friendly UI**: Modern, responsive design with clear instructions
- ✅ **Error Handling**: Comprehensive error messages and recovery options

## Firebase Console Configuration

### 1. Authentication Settings

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `habitual-ucw41`
3. Navigate to **Authentication** → **Settings** → **Authorized domains**

### 2. Add Authorized Domains

Add these domains to allow password reset emails:

**Production:**
- `habitual-ucw41.firebaseapp.com`

**Development:**
- `localhost` (should already be there)

### 3. Email Templates (Optional)

You can customize the password reset email template:

1. Go to **Authentication** → **Templates**
2. Select **Password reset**
3. Customize the email subject and body
4. **Important**: Keep the `%LINK%` placeholder in the email body

## Application Routes

The password reset system uses these routes:

### Web Routes

- `/auth/forgot-password` - Request password reset
- `/auth/reset-password` - Complete password reset (with oobCode parameter)
- `/auth/login` - Login page (with "Forgot Password" link)

### URL Parameters

Password reset completion URLs include:
- `oobCode` - Firebase action code for password reset
- `mode` - Should be "resetPassword"
- `apiKey` - Firebase API key
- `continueUrl` - Optional redirect after completion

Example:
```
https://habitual-ucw41.firebaseapp.com/auth/reset-password?mode=resetPassword&oobCode=ABC123&apiKey=xyz&continueUrl=/dashboard
```

## Android Configuration

### Deep Link Setup

The Android app handles password reset links through deep links configured in `AndroidManifest.xml`:

```xml
<!-- Production password reset -->
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.BROWSABLE" />
    <category android:name="android.intent.category.DEFAULT" />
    <data
        android:scheme="https"
        android:host="habitual-ucw41.firebaseapp.com"
        android:path="/auth/reset-password" />
</intent-filter>

<!-- Development password reset -->
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.BROWSABLE" />
    <category android:name="android.intent.category.DEFAULT" />
    <data
        android:scheme="http"
        android:host="localhost"
        android:port="3000"
        android:path="/auth/reset-password" />
</intent-filter>
```

## Testing

### Web Testing

1. **Request Password Reset:**
   ```bash
   # Navigate to forgot password page
   http://localhost:3000/auth/forgot-password
   ```

2. **Enter email and submit**
3. **Check email for reset link**
4. **Click link to complete reset**

### Android Testing

1. **Build and install the Android app**
2. **Request password reset from web or app**
3. **Open email on Android device**
4. **Tap the reset link**
5. **App should open to reset-password page**

### Email Testing

Test with various email providers:
- ✅ Gmail
- ✅ Outlook/Hotmail
- ✅ Yahoo
- ✅ Custom domains

## Security Features

### Password Strength Validation

The system includes real-time password strength validation:

- **Minimum 6 characters** (Firebase requirement)
- **Strength indicators**: Very Weak → Weak → Fair → Good → Strong
- **Requirements checklist**: Length, uppercase, numbers, special characters
- **Visual feedback**: Color-coded strength bar

### Security Measures

- **Token Expiration**: Reset links expire in 1 hour
- **Single Use**: Each reset token can only be used once
- **Secure Transmission**: All communications over HTTPS
- **Input Validation**: Client and server-side validation
- **Rate Limiting**: Firebase handles rate limiting automatically

## Error Handling

### Common Error Codes

| Error Code | User Message | Cause |
|------------|--------------|--------|
| `auth/invalid-email` | Invalid email address format | Malformed email |
| `auth/user-not-found` | No account found with this email | Email not registered |
| `auth/invalid-action-code` | Reset link is invalid or expired | Bad/expired token |
| `auth/expired-action-code` | Reset link has expired | Token older than 1 hour |
| `auth/weak-password` | Password is too weak | Password < 6 characters |
| `auth/too-many-requests` | Too many requests, try again later | Rate limited |

### Error Recovery

- **Invalid Link**: Redirect to request new reset link
- **Expired Link**: Show option to request new link
- **Network Error**: Retry mechanism with user feedback
- **Weak Password**: Real-time validation prevents submission

## Integration with Other Auth Methods

### Compatibility

Password reset works alongside:
- ✅ **Email/Password Authentication**
- ✅ **Google OAuth** (for accounts created with Google)
- ✅ **Email Link Authentication** (passwordless)

### User Experience

- **Unified Login Page**: All auth options in one place
- **Consistent Design**: Matching UI across all auth flows
- **Smart Routing**: Automatic redirect after successful reset
- **Fallback Options**: Multiple ways to access account

## Deployment Checklist

### Before Production

- [ ] Test password reset on staging environment
- [ ] Verify email templates are customized
- [ ] Check authorized domains in Firebase Console
- [ ] Test Android deep links on physical device
- [ ] Verify HTTPS certificates for production domain
- [ ] Test with multiple email providers

### Production Deployment

- [ ] Update Firebase authorized domains
- [ ] Deploy web application
- [ ] Build and distribute Android app
- [ ] Monitor error logs for issues
- [ ] Test end-to-end flow in production

## Troubleshooting

### Common Issues

**1. Reset Link Not Working**
- Check Firebase authorized domains
- Verify URL parameters are correct
- Ensure app is running on correct port

**2. Email Not Received**
- Check spam/junk folder
- Verify email address is correct
- Check Firebase email quota limits

**3. Android Deep Link Not Opening**
- Verify intent filters in AndroidManifest.xml
- Check if app is set as default for links
- Test with `adb shell am start` command

**4. Password Validation Issues**
- Ensure password meets minimum requirements
- Check for special characters causing issues
- Verify validation logic matches Firebase rules

### Debug Commands

```bash
# Test Android deep link
adb shell am start \
  -W -a android.intent.action.VIEW \
  -d "https://habitual-ucw41.firebaseapp.com/auth/reset-password?oobCode=test" \
  com.grovia.habitual

# Check app logs
adb logcat | grep -i habitual
```

## Support

For additional help:
- Check Firebase Console for error logs
- Review browser developer console for client errors
- Monitor server logs for backend issues
- Test with Firebase Auth Emulator for development

---

**Last Updated**: December 2024  
**Firebase Version**: 11.9.1  
**Compatibility**: Web, Android 