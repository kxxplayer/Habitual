# 📱 Firebase Phone Number Authentication Setup (Android)

This guide covers how to enable and use Firebase Phone Number Authentication in your Habitual app for both native Android and React Native/Capacitor environments.

---

## 1. Android Dependencies

Ensure your `android/app/build.gradle` includes:

```gradle
implementation platform('com.google.firebase:firebase-bom:33.15.0')
implementation 'com.google.firebase:firebase-auth'
```

---

## 2. Add SHA-1 and SHA-256 to Firebase Console

1. Run this command to get your debug SHA-1 and SHA-256:
   ```sh
   keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```
2. Go to Firebase Console → Project Settings → Your Apps (Android) → Add SHA-1 and SHA-256.

---

## 3. Enable Phone Authentication in Firebase

- Go to Firebase Console → Authentication → Sign-in method → Enable **Phone**.

---

## 4. Add Test Phone Numbers

- In the same Sign-in method page, scroll to "Phone numbers for testing" and add e.g. `+91 98765-43210` with code `123456`.

---

## 5. Native Android (Kotlin) Implementation

Add this to your main Activity or ViewModel:

```kotlin
import com.google.firebase.FirebaseException
import com.google.firebase.auth.*
import java.util.concurrent.TimeUnit

// 1. Start phone number verification
val options = PhoneAuthOptions.newBuilder(FirebaseAuth.getInstance())
    .setPhoneNumber("+919876543210") // User's phone number
    .setTimeout(60L, TimeUnit.SECONDS)
    .setActivity(this) // Your activity
    .setCallbacks(object : PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
        override fun onVerificationCompleted(credential: PhoneAuthCredential) {
            // Auto-retrieval or instant verification succeeded
            signInWithPhoneAuthCredential(credential)
        }

        override fun onVerificationFailed(e: FirebaseException) {
            // Handle error (invalid number, quota exceeded, etc.)
        }

        override fun onCodeSent(verificationId: String, token: PhoneAuthProvider.ForceResendingToken) {
            // Save verificationId and token for later
            // Prompt user to enter the code
        }
    })
    .build()
PhoneAuthProvider.verifyPhoneNumber(options)

// 2. After user enters the code:
val credential = PhoneAuthProvider.getCredential(verificationId, code)
signInWithPhoneAuthCredential(credential)

// 3. Sign in with the credential
fun signInWithPhoneAuthCredential(credential: PhoneAuthCredential) {
    FirebaseAuth.getInstance().signInWithCredential(credential)
        .addOnCompleteListener(this) { task ->
            if (task.isSuccessful) {
                // User signed in!
                val user = task.result?.user
            } else {
                // Handle error
            }
        }
}
```

### Testing with Fictional Numbers
- In the Firebase Console, add test numbers (e.g., `+91 98765-43210` with code `123456`).
- For emulator/dev, you can disable app verification:
  ```kotlin
  FirebaseAuth.getInstance().firebaseAuthSettings.setAppVerificationDisabledForTesting(true)
  ```
  **Never use this in production!**

---

## 6. React Native/Capacitor Integration

### Option A: Use a Plugin (Recommended)

#### For Capacitor:
- Use [`@capacitor-firebase/auth`](https://capacitorjs.com/docs/apis/firebase-auth)
- [Official Docs: Phone Auth](https://capacitorjs.com/docs/apis/firebase-auth#sign-in-with-phone-number)

#### For React Native:
- Use [`@react-native-firebase/auth`](https://rnfirebase.io/auth/phone-auth)

**Example (React Native):**
```js
import auth from '@react-native-firebase/auth';

// Send code
await auth().signInWithPhoneNumber('+919876543210');

// Confirm code
const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
const credential = await confirmation.confirm(code); // code from SMS
```

**Example (Capacitor):**
```js
import { FirebaseAuth } from '@capacitor-firebase/auth';

// Send code
const { verificationId } = await FirebaseAuth.signInWithPhoneNumber({ phoneNumber: '+919876543210' });

// Confirm code
await FirebaseAuth.confirmVerificationCode({ verificationId, verificationCode: '123456' });
```

---

## 7. Troubleshooting
- Ensure SHA-1 and SHA-256 are set in Firebase Console.
- Enable Phone Auth in Firebase Console.
- Use test numbers for development to avoid quota issues.
- For "Missing initial state" or reCAPTCHA errors, check app links and API key restrictions.

---

## 8. Security Note
Phone number auth is less secure than other methods. Always inform users and, if possible, offer it alongside more secure sign-in options (like Google or email).

---

## 9. References
- [Firebase Phone Auth Docs (Android)](https://firebase.google.com/docs/auth/android/phone-auth)
- [Firebase Phone Auth Docs (Web)](https://firebase.google.com/docs/auth/web/phone-auth)
- [Capacitor Firebase Auth](https://capacitorjs.com/docs/apis/firebase-auth)
- [React Native Firebase Auth](https://rnfirebase.io/auth/phone-auth) 