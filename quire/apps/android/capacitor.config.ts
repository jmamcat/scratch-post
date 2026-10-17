import type { CapacitorConfig } from '@capacitor/cli';

// The app is the web client build. It keeps a full copy of the vault in the WebView's
// IndexedDB, so it works offline; the server URL is chosen in Settings (R-PLT-03).
const config: CapacitorConfig = {
  appId: 'app.quire.notes',
  appName: 'Quire',
  webDir: '../web/dist',
  server: {
    androidScheme: 'https',
    // Allows http:// servers on the LAN (a local node) during development only.
    cleartext: process.env.QUIRE_ANDROID_CLEARTEXT === '1',
  },
  android: {
    allowMixedContent: process.env.QUIRE_ANDROID_CLEARTEXT === '1',
  },
};

export default config;
