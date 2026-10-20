/**
 * Compras pelo RevenueCat (só no app nativo; na web não existe compra dentro do app).
 * O appUserID é o id da família: o webhook do servidor usa o mesmo id para liberar o plano.
 * Preços sempre vêm da loja (priceString / price); "por mês" e "economize" são calculados a partir deles.
 */
import { Purchases, LOG_LEVEL, type PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { nativo, plataforma } from './plataforma.ts';

const CHAVE_SDK = plataforma === 'ios' ? import.meta.env.VITE_REVENUECAT_IOS_KEY : import.meta.env.VITE_REVENUECAT_ANDROID_KEY;
export const comprasDisponiveis = nativo && !!CHAVE_SDK;

let configurado = '';
async function configurar(familia: string) {
  if (!comprasDisponiveis) throw new Error('Compras só pelo app da loja.');
  if (configurado === familia) return;
  if (!configurado) {
    if (import.meta.env.DEV) await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    await Purchases.configure({ apiKey: CHAVE_SDK!, appUserID: familia });
  } else await Purchases.logIn({ appUserID: familia });
  configurado = familia;
}

export type Pacote = {
  id: string;
  tipo: 'mensal' | 'anual' | 'outro';
  preco: string; // priceString da loja, ex.: "R$ 59,88"
  porMes: string | null; // só no anual: preço dividido por 12, na moeda da loja
  economia: number | null; // % em relação a 12 mensalidades
  gratis: boolean; // tem período grátis configurado na loja
  original: PurchasesPackage;
};

const formatar = (valor: number, moeda: string) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: moeda }).format(valor);

export async function pacotes(familia: string): Promise<Pacote[]> {
  await configurar(familia);
  const { current } = await Purchases.getOfferings();
  const lista = current?.availablePackages ?? [];
  const mensal = lista.find((p) => p.packageType === 'MONTHLY');
  return lista.map((p) => {
    const prod = p.product;
    const tipo = p.packageType === 'MONTHLY' ? 'mensal' : p.packageType === 'ANNUAL' ? 'anual' : 'outro';
    const anual = tipo === 'anual';
    const gratis = !!(prod.introPrice && prod.introPrice.price === 0) || !!(prod as any).defaultOption?.freePhase;
    return {
      id: p.identifier,
      tipo,
      preco: prod.priceString,
      porMes: anual ? formatar(prod.price / 12, prod.currencyCode) : null,
      economia: anual && mensal ? Math.round((1 - prod.price / (mensal.product.price * 12)) * 100) : null,
      gratis,
      original: p,
    };
  });
}

/** Compra; devolve false se a pessoa desistiu na tela da loja. */
export async function comprar(familia: string, p: Pacote) {
  await configurar(familia);
  try {
    await Purchases.purchasePackage({ aPackage: p.original });
    return true;
  } catch (e: any) {
    if (e?.userCancelled || e?.code === '1' || /cancel/i.test(e?.message ?? '')) return false;
    throw e;
  }
}

export async function restaurar(familia: string) {
  await configurar(familia);
  await Purchases.restorePurchases();
}
