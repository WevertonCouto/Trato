/**
 * Web (PWA) ou app nativo (Capacitor).
 * Na web a sessão é um cookie httpOnly do próprio site. No app nativo a tela roda em https://localhost e
 * chama a API pública (VITE_API_URL): a sessão vira um token guardado no aparelho e mandado no Authorization.
 */
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

export const nativo = Capacitor.isNativePlatform();
export const plataforma = Capacitor.getPlatform(); // 'web' | 'android' | 'ios'
export const API_BASE = nativo ? (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '') : '';

const CHAVE = 'trato.sessao';
let token: string | null = null;
let carregado: Promise<void> | null = null;

/** Lê o token guardado (uma vez, antes da primeira chamada à API). */
export function carregarSessao() {
  if (!nativo) return Promise.resolve();
  carregado ??= Preferences.get({ key: CHAVE }).then((r) => { token = r.value; });
  return carregado;
}

export async function cabecalhosSessao(): Promise<Record<string, string>> {
  if (!nativo) return {};
  await carregarSessao();
  return token ? { authorization: `Bearer ${token}`, 'x-trato-nativo': '1' } : { 'x-trato-nativo': '1' };
}

/** O servidor manda o token novo no header X-Trato-Sessao quando a sessão muda ("" = saiu). */
export async function guardarSessao(r: Response) {
  if (!nativo) return;
  const novo = r.headers.get('x-trato-sessao');
  if (novo === null) return;
  token = novo || null;
  if (token) await Preferences.set({ key: CHAVE, value: token });
  else await Preferences.remove({ key: CHAVE });
}

/** Link para a loja (na web, onde não há compra dentro do app). */
export const LINK_LOJA = import.meta.env.VITE_LINK_LOJA || 'https://play.google.com/store/apps/details?id=com.coutodev.trato';
