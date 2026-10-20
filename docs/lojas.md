# Publicar o Trato nas lojas (passo a passo do Weverton)

O código já está pronto: app Android com Capacitor, compras com RevenueCat, webhook, plano grátis e a tela "Plano da família". Este roteiro é o que só você pode fazer, porque depende das suas contas e dos seus documentos. Siga na ordem.

## O que já está no código

- **App nativo:** fica em `android/` (Capacitor 8.5.2). A tela é a mesma do site (`web/dist`).
  - No nativo, o app chama a API pela `VITE_API_URL` e guarda a sessão como token no aparelho.
  - A versão web (PWA) continua funcionando com cookie.
- **Assinatura:**
  - Plugin `@revenuecat/purchases-capacitor` 13.7.0. O `appUserID` é o id da família.
  - A tela "Plano da família" fica na área do responsável, atrás do PIN. Ela mostra os pacotes do *offering* atual, "Assinar", "Restaurar compras" e o status do plano.
  - A criança nunca vê preço nem botão de compra.
- **Servidor:**
  - Tabela `assinaturas`.
  - Rota `POST /api/revenuecat/webhook`, protegida pelo header `Authorization`. Ela confirma cada evento em `GET /subscribers/{id}`.
  - Rota `POST /api/adulto/assinatura/sincronizar`, chamada depois de comprar ou restaurar.
  - Plano grátis: 1 criança e 3 missões ativas por criança. Para mudar, edite `PLANO_GRATIS` em `src/server/assinatura.ts`.
- **Na web:** aparece "Assine pelo app na Google Play". Não há pagamento por fora.
- **Regras para apps de crianças:** sem anúncios e sem analytics de terceiros.
  - Política de privacidade: `/privacidade.html`. Termos: `/termos.html`. **São rascunhos: preencha os campos entre colchetes.**
  - A exclusão de conta fica no app: Área do responsável → Conta.

## Produtos e preços

Um plano só para a família, com até 6 crianças. São dois produtos de assinatura, os dois com **7 dias grátis**:

| Produto | ID (sugestão) | Preço | Como aparece no app |
|---|---|---|---|
| Mensal | `trato_mensal` | R$ 7,99 por mês | "R$ 7,99/mês" |
| Anual | `trato_anual` | R$ 59,88 por ano | "R$ 4,99/mês", "R$ 59,88 cobrados por ano" e o selo "economize 37%" |

O app mostra o preço que vem da loja (`priceString` do RevenueCat). O "por mês" do anual e o "economize" são calculados a partir dos preços reais. Se você mudar o preço na loja, o app acompanha sozinho.

Conta do "economize": 12 × R$ 7,99 = R$ 95,88 por ano; 1 − 59,88 ÷ 95,88 ≈ 37%.

## 1. Google Play Console (taxa única de US$ 25)

1. Crie a conta de desenvolvedor em <https://play.google.com/console>. Pode ser pessoal ou de empresa; para empresa precisa do D-U-N-S.
2. **Criar app:**
   - nome **Trato** (ou o definitivo), idioma pt-BR, **App**, **Pago ou gratuito: Gratuito**. O app é grátis para baixar e a assinatura é dentro dele.
3. **Confirme o appId antes de subir o primeiro AAB.** O código usa `br.com.coutodev.trato` (em `capacitor.config.ts` e `android/app/build.gradle`) e, depois de publicado, ele não muda mais.
4. **Conteúdo do app**, no painel:
   - **Público-alvo:** inclua faixas abaixo de 13 anos. O app entra na **Política para Famílias** (Families Policy).
   - **Segurança dos dados:**
     - Coletados: nome e e-mail do responsável, nome da criança e fotos opcionais.
     - Não compartilhados para publicidade.
     - Criptografados em trânsito.
     - Exclusão disponível.
   - **Política de privacidade:** `https://SEU-DOMINIO/privacidade.html` (o servidor já serve esse arquivo).
   - **Anúncios:** não.
   - **Classificação de conteúdo:** responda ao questionário.
5. **Assinaturas** (Monetizar → Produtos → Assinaturas). Crie as duas:
   - `trato_mensal`:
     - Plano base com renovação automática **mensal**, R$ 7,99.
     - Oferta para novos assinantes com **teste grátis de 7 dias**.
   - `trato_anual`:
     - Plano base com renovação automática **anual**, R$ 59,88.
     - A mesma oferta de 7 dias grátis.
6. **Testadores de licença** (Configuração → Teste de licença): coloque o seu e-mail e o de quem for testar. Eles compram de verdade na tela, mas não são cobrados, e a assinatura renova em minutos.

## 2. RevenueCat (grátis até uma faixa de receita)

1. Crie a conta em <https://app.revenuecat.com> e um **Project** "Trato".
2. **Ligue a Google Play:**
   - Adicione um app **Play Store** com o package `br.com.coutodev.trato`.
   - Siga o guia do próprio RevenueCat para criar a **service account** no Google Cloud, dar acesso a ela no Play Console (Usuários e permissões) e enviar o JSON.
   - Ative as **Real-time developer notifications**: o RevenueCat mostra o tópico Pub/Sub para colar no Play Console.
3. **Products:** importe `trato_mensal` e `trato_anual`.
4. **Entitlement:** crie um com identificador **`familia`** e anexe os dois produtos.
5. **Offering:**
   - Crie a `default` (marque como *current*).
   - Adicione os pacotes **Monthly** → `trato_mensal` e **Annual** → `trato_anual`. O app reconhece o tipo do pacote para montar a tela.
6. **Chaves:**
   - **Public SDK key** da Google Play (começa com `goog_`): vai em `.env.android` como `VITE_REVENUECAT_ANDROID_KEY`. Ela pode ficar no app.
   - **Secret API key (v1):** vai no `.env` do **servidor** como `REVENUECAT_API_KEY`. Nunca no app nem no git.
7. **Webhook** (Integrations → Webhooks):
   - URL `https://SEU-DOMINIO/api/revenuecat/webhook`.
   - No campo **Authorization header**, invente um valor longo e coloque o mesmo no `.env` do servidor como `REVENUECAT_WEBHOOK_SECRET`.
   - Use "Send test event" para conferir: o servidor responde 200 com `ignorado: TEST`.

## 3. Servidor (Easypanel ou onde a API rodar)

No `.env` do servidor:

```
REVENUECAT_API_KEY=sk_...
REVENUECAT_WEBHOOK_SECRET=o-valor-que-voce-inventou
REVENUECAT_ENTITLEMENT=familia
CORS_ORIGINS=https://localhost,capacitor://localhost
TZ=America/Sao_Paulo
```

A API precisa estar em **HTTPS** com domínio próprio, que é a `VITE_API_URL` do app.

## 4. Gerar o AAB assinado

Pré-requisitos no PC:
- **JDK 21.** Hoje o PC tem JDK 11 e 20, e o Java embutido do Android Studio (`jbr`) está incompleto. Reinstale o Android Studio ou instale o Temurin 21.
- **Android SDK.** Já está instalado.

1. Copie `.env.android.example` para `.env.android` e preencha `VITE_API_URL` e `VITE_REVENUECAT_ANDROID_KEY`.
2. Rode `npm run android:sync`, que faz o build da tela com essas variáveis e o `cap sync android`.
3. Crie a chave de upload **uma vez só** e guarde fora do git, com backup. Sem ela não dá para atualizar o app:
   ```
   keytool -genkeypair -v -keystore C:\chaves\trato-upload.jks -alias trato -keyalg RSA -keysize 2048 -validity 10000
   ```
4. `npm run android:abrir` → Android Studio → **Build → Generate Signed App Bundle** → escolha o `.jks` → *release*. O arquivo sai em `android/app/release/app-release.aab`.
5. No Play Console, **Teste interno** → crie uma versão → envie o AAB. Ative a **assinatura de apps pelo Google Play**: o Google guarda a chave final e você só usa a de upload.
6. Instale pelo link do teste interno num celular com a conta de testador e faça uma compra de teste.

A cada versão nova, aumente `versionCode` e `versionName` em `android/app/build.gradle`.

## 5. Antes de publicar

- [ ] appId confirmado
- [ ] Política de privacidade e termos revisados e preenchidos (nome, CNPJ ou CPF, e-mail de suporte, data)
- [ ] Ícone, capturas de tela (pelo menos 2) e descrição na ficha da loja
- [ ] Compra, cancelamento e restauração testados com testador de licença
- [ ] Webhook recebendo eventos (o plano aparece como "Teste grátis" logo depois de assinar)

## Próximo passo: iPhone

- **Apple Developer Program:** US$ 99 por ano. Para empresa precisa do D-U-N-S.
- **No código:** `npm i -E @capacitor/ios@8.5.2`, depois `npx cap add ios`. O build é feito num **Mac** com Xcode.
- **App Store Connect:**
  - crie o app;
  - crie um grupo de assinaturas com `trato_mensal` e `trato_anual`, com os mesmos preços e a oferta introdutória de 7 dias grátis;
  - preencha a seção "Privacidade do app" e marque a categoria **Crianças**, que tem regras próprias.
- **RevenueCat:**
  - adicione o app **App Store**;
  - envie a *In-App Purchase Key*;
  - anexe os produtos ao mesmo entitlement `familia`;
  - coloque a public key `appl_...` em `VITE_REVENUECAT_IOS_KEY`.
- **Login com a Apple:** a Apple exige quando o app oferece login social. O Trato usa e-mail e senha, então não é obrigatório.
