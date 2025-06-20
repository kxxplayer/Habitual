import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.grovia.habitual',
  appName: 'GroviaHabits',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos']
    },
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#ffffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#999999",
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: "launch_screen",
      useDialog: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#ffffff",
      overlay: false
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '543466575094-381gjh3im74vjc70a4oo2tqvkfcndnct.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  }
};

export default config;