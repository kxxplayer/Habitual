# Email Link Authentication Setup Guide

This guide will help you set up email link authentication for the Habitual app.

## Firebase Console Configuration

### Step 1: Enable Email Link Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `habitual-ucw41`
3. Navigate to **Authentication** → **Sign-in method**
4. Find **Email/Password** provider and ensure it's enabled
5. In the same section, enable **Email link (passwordless sign-in)**
6. Click **Save**

### Step 2: Configure Authorized Domains

1. In the Firebase Console, go to **Authentication** → **Settings** → **Authorized domains**
2. Add the following domains:
   - `localhost` (for development)
   - `habitual-ucw41.firebaseapp.com` (your Firebase hosting domain)
   - Add your production domain when you deploy

### Step 3: Configure Firebase Hosting (Required for Email Links)

Email link authentication requires Firebase Hosting to work properly.

1. In Firebase Console, go to **Hosting**
2. If not already set up, click **Get started**
3. Your default hosting domain should be: `habitual-ucw41.firebaseapp.com`
4. This domain is automatically configured for email link authentication

## Testing the Implementation

### Web Testing (localhost:3000)

1. Start your development server: `npm run dev`
2. Navigate to: `http://localhost:3000/auth/email-link`
3. Enter an email address
4. Click "Send Sign-in Link"
5. Check your email for the sign-in link
6. Click the link to complete authentication

### Android Testing

1. Build and install the Android app: `npm run capacitor:run`
2. Use the email link flow in the mobile app
3. Email links should open the app directly via deep links

## How Email Link Authentication Works

### Flow Overview

1. **Request Link**: User enters email → Firebase sends email with authentication link
2. **Click Link**: User clicks link in email → Opens app/website
3. **Complete Sign-in**: App verifies link and signs user in automatically

### Security Features

- **Email Verification**: Automatically verifies email ownership
- **Temporary Links**: Links expire after 1 hour
- **Device Binding**: Links are tied to the requesting device for security
- **No Password**: Eliminates password-related security risks

### URL Structure

Email links use Firebase Hosting domains:
- **Production**: `https://habitual-ucw41.firebaseapp.com/__/auth/links?...`
- **Development**: `http://localhost:3000/auth/email-link-signin?...`

## Troubleshooting

### Common Issues

1. **"Unauthorized domain" error**
   - Ensure your domain is added to Firebase authorized domains
   - Check that you're using the correct Firebase project

2. **Email not received**
   - Check spam folder
   - Verify email address is correct
   - Ensure Email/Password provider is enabled in Firebase

3. **Link doesn't open app on Android**
   - Verify AndroidManifest.xml has correct intent filters
   - Check that the Firebase project ID matches in the intent filter
   - Ensure app is properly installed and associated with the domain

4. **Link expires quickly**
   - Email links expire after 1 hour for security
   - Request a new link if expired

### Development Tips

- Test with real email addresses (not temporary/disposable emails)
- Use Firebase Console → Authentication → Users to verify user creation
- Check browser developer tools for detailed error messages
- Monitor Firebase Console → Authentication → Events for sign-in attempts

## Production Deployment

### Before Going Live

1. **Update authorized domains** in Firebase Console
2. **Configure custom domain** for Firebase Hosting (optional)
3. **Test email delivery** with your production email service
4. **Update Android package name** if different from development

### Email Customization

You can customize the email template in Firebase Console:
1. Go to **Authentication** → **Templates**
2. Select **Email link sign-in**
3. Customize the email subject and body
4. Add your app branding

## Security Considerations

- Email links are single-use and expire after 1 hour
- Links are bound to the device that requested them
- Always use HTTPS in production
- Monitor authentication events in Firebase Console
- Consider rate limiting for email sending to prevent abuse

## Integration with Existing Auth

Email link authentication works alongside:
- ✅ Email/Password authentication
- ✅ Google OAuth
- ✅ Other Firebase Auth providers

Users can use any method to sign in to the same account. 