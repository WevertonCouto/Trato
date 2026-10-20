import type { CapacitorConfig } from '@capacitor/cli';

// appId definitivo (confirmado pelo Weverton); depois de publicado na loja não muda
const config: CapacitorConfig = {
  appId: 'com.coutodev.trato',
  appName: 'Trato',
  webDir: 'web/dist',
  android: { allowMixedContent: false },
  server: { androidScheme: 'https' },
};

export default config;
