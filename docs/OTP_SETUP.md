# OTP Authentication Setup Guide

This guide covers setting up Firebase phone number OTP authentication for the Habitual app, including both web and Android platforms.

## Overview

The OTP authentication system uses Firebase's phone number authentication with SMS verification codes. This provides a secure, passwordless login option using phone numbers.

### Key Features

- ✅ **Phone Number Authentication**: Secure SMS-based verification
- ✅ **International Support**: Works with phone numbers from 15+ countries
- ✅ **reCAPTCHA Protection**: Anti-spam and abuse protection
- ✅ **Resend Functionality**: Users can request new codes with cooldown
- ✅ **Real-time Validation**: Phone number format validation
- ✅ **Mobile Optimized**: Responsive design for all screen sizes

## Firebase Console Configuration

### 1. Enable Phone Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `habitual-ucw41`
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Phone** and toggle **Enable**
5. Click **Save**

### 2. Configure Authorized Domains

Add these domains to allow OTP authentication:

**Production:**
- `habitual-ucw41.firebaseapp.com`

**Development:**
- `localhost` (should already be there)

### 3. SMS Configuration

Firebase automatically handles SMS delivery, but you can monitor usage:

1. Go to **Authentication** → **Usage**
2. Monitor SMS quota and costs
3. Set up billing alerts if needed

### 4. reCAPTCHA Configuration

reCAPTCHA is automatically configured for web applications. For production:

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Add your domain to the reCAPTCHA site configuration
3. Ensure the reCAPTCHA keys match your Firebase project

## Application Routes

The OTP authentication system uses this route:

### Web Routes

- `/auth/otp-login` - Phone number input and OTP verification

### URL Flow

1. **Phone Input** → User enters phone number with country code
2. **reCAPTCHA** → User completes security verification
3. **OTP Sent** → Firebase sends SMS with 6-digit code
4. **OTP Verification** → User enters code to complete sign-in

## Implementation Details

### Phone Number Format

The system supports international phone numbers:

```javascript
// Supported formats
+1 555-123-4567  // US/Canada
+44 20 7946 0958 // UK
+91 98765 43210  // India
+86 138 0013 8000 // China
```

### Country Code Support

Currently supports 15 major countries:
- 🇺🇸 United States/Canada (+1)
- 🇬🇧 United Kingdom (+44)
- 🇮🇳 India (+91)
- 🇨🇳 China (+86)
- 🇯🇵 Japan (+81)
- 🇩🇪 Germany (+49)
- 🇫🇷 France (+33)
- 🇮🇹 Italy (+39)
- 🇪🇸 Spain (+34)
- 🇷🇺 Russia (+7)
- 🇧🇷 Brazil (+55)
- 🇲🇽 Mexico (+52)
- 🇦🇺 Australia (+61)
- 🇰🇷 South Korea (+82)
- 🇸🇬 Singapore (+65)

### Security Features

**reCAPTCHA Protection:**
- Prevents automated abuse
- Required before sending OTP
- Automatically rendered and validated

**Rate Limiting:**
- 60-second cooldown between resend requests
- Firebase enforces SMS quota limits
- User-friendly error messages

**Code Expiration:**
- OTP codes expire after 5 minutes
- Users can request new codes
- Invalid codes are rejected with clear messages

## Testing

### Web Testing

1. **Navigate to OTP login:**
   ```bash
   http://localhost:3000/auth/otp-login
   ```

2. **Test phone number input:**
   - Select country code
   - Enter valid phone number
   - Complete reCAPTCHA

3. **Test OTP verification:**
   - Check SMS on test phone
   - Enter 6-digit code
   - Verify successful login

### Test Phone Numbers

For development, Firebase provides test phone numbers:

```javascript
// Add these in Firebase Console → Authentication → Settings → Phone numbers for testing
+1 555-123-4567 → Code: 123456
+44 7700 900123 → Code: 654321
```

### Android Testing

1. **Build and install the Android app**
2. **Test OTP flow on device**
3. **Verify SMS reception**
4. **Test auto-redirect after verification**

## Error Handling

### Common Error Codes

| Error Code | User Message | Cause |
|------------|--------------|--------|
| `auth/invalid-phone-number` | Invalid phone number format | Malformed number |
| `auth/quota-exceeded` | SMS quota exceeded | Too many SMS sent |
| `auth/too-many-requests` | Too many requests | Rate limited |
| `auth/invalid-verification-code` | Invalid verification code | Wrong OTP entered |
| `auth/code-expired` | Verification code expired | OTP older than 5 minutes |
| `auth/captcha-check-failed` | reCAPTCHA verification failed | reCAPTCHA not completed |

### Error Recovery

- **Invalid Phone**: Real-time validation prevents submission
- **reCAPTCHA Failed**: User can retry reCAPTCHA
- **Invalid OTP**: Clear error message with retry option
- **Expired Code**: Resend functionality with cooldown
- **Network Error**: Retry mechanism with user feedback

## Security Considerations

### SMS Security

- **Secure Delivery**: Firebase uses reliable SMS providers
- **Code Uniqueness**: Each OTP is unique and single-use
- **Time-based Expiration**: Codes expire after 5 minutes
- **Rate Limiting**: Prevents SMS flooding

### Privacy Protection

- **Phone Number Storage**: Stored securely in Firebase Auth
- **No SMS Content Logging**: OTP codes are not logged
- **GDPR Compliance**: Users can delete their phone numbers
- **Carrier Privacy**: SMS rates apply from user's carrier

### Best Practices

- **Use HTTPS**: All communications over secure connections
- **Validate Input**: Client and server-side validation
- **Monitor Usage**: Track SMS costs and quota usage
- **Test Regularly**: Verify functionality across carriers

## Integration with Other Auth Methods

### Compatibility

OTP authentication works alongside:
- ✅ **Email/Password Authentication**
- ✅ **Google OAuth**
- ✅ **Email Link Authentication**
- ✅ **Password Reset**

### Account Linking

Users can link phone numbers to existing accounts:
- Sign in with email/password first
- Add phone number in profile settings
- Verify phone number with OTP
- Use phone for future logins

### User Experience

- **Unified Login Page**: All auth options in one place
- **Consistent Design**: Matching UI across all auth flows
- **Smart Routing**: Automatic redirect after successful verification
- **Fallback Options**: Multiple ways to access account

## Deployment Checklist

### Before Production

- [ ] Test OTP on staging environment
- [ ] Verify SMS delivery across carriers
- [ ] Check Firebase SMS quota limits
- [ ] Test reCAPTCHA on production domain
- [ ] Validate phone number formats
- [ ] Test international phone numbers

### Production Deployment

- [ ] Update Firebase authorized domains
- [ ] Configure reCAPTCHA for production
- [ ] Set up SMS quota alerts
- [ ] Monitor error rates and delivery
- [ ] Test end-to-end flow in production

## Cost Considerations

### Firebase SMS Pricing

- **Free Tier**: Limited SMS per month
- **Paid Plans**: Per-SMS pricing varies by region
- **Cost Monitoring**: Set up billing alerts
- **Usage Optimization**: Implement proper rate limiting

### Optimization Tips

- **Test Numbers**: Use Firebase test numbers for development
- **Rate Limiting**: Implement client-side cooldowns
- **Error Handling**: Reduce failed attempts with validation
- **User Education**: Clear instructions reduce support costs

## Troubleshooting

### Common Issues

**1. reCAPTCHA Not Loading**
- Check network connectivity
- Verify domain is authorized
- Clear browser cache and cookies

**2. SMS Not Received**
- Check phone number format
- Verify carrier compatibility
- Check spam/blocked messages

**3. OTP Verification Fails**
- Ensure code is entered correctly
- Check for code expiration
- Verify network connectivity

**4. Country Code Issues**
- Validate phone number format
- Check supported country list
- Ensure proper international formatting

### Debug Commands

```bash
# Test phone number validation
console.log(validatePhoneNumber('+1 555-123-4567'));

# Check reCAPTCHA status
console.log(window.recaptchaVerifier);

# Monitor Firebase Auth state
firebase.auth().onAuthStateChanged((user) => {
  console.log('Auth state:', user);
});
```

## Support

For additional help:
- Check Firebase Console for SMS delivery logs
- Review browser developer console for client errors
- Monitor Firebase Auth usage and quotas
- Test with Firebase Auth Emulator for development

### Useful Links

- [Firebase Phone Auth Documentation](https://firebase.google.com/docs/auth/web/phone-auth)
- [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Pricing](https://firebase.google.com/pricing)

---

**Last Updated**: December 2024  
**Firebase Version**: 11.9.1  
**Compatibility**: Web, Android  
**SMS Provider**: Firebase (Twilio backend) 