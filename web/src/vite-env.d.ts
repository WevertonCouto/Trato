/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL pública da API, usada só no app nativo (ex.: https://trato.coutodev.com.br). */
  readonly VITE_API_URL?: string;
  /** Chaves públicas do SDK do RevenueCat (não são segredo; a secreta fica só no servidor). */
  readonly VITE_REVENUECAT_ANDROID_KEY?: string;
  readonly VITE_REVENUECAT_IOS_KEY?: string;
  /** Link da página do app na loja (mostrado na web, onde não há compra). */
  readonly VITE_LINK_LOJA?: string;
}
