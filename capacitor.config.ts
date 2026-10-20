import type { CapacitorConfig } from '@capacitor/cli';

// appId definitivo: confirmar com o Weverton antes de publicar (depois de publicado na loja não muda)
const config: CapacitorConfig = {
  appId: 'br.com.coutodev.trato',
  appName: 'Trato',
  webDir: 'web/dist',
  android: { allowMixedContent: false },
  server: { androidScheme: 'https' },
};

export default config;
