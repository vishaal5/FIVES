import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fives.game',
  appName: 'FIVES',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    // For live-reload on device/emulator, use:
    // npx cap run android -l --external
    cleartext: true
  }
};

export default config;

