# Ficha do Trato na Google Play

Aqui está o que vai no formulário do Play Console, campo por campo. Os itens entre colchetes (como **[E-MAIL DE SUPORTE]**) só você pode preencher; a lista completa está no fim.

> Os textos legais e as respostas abaixo são uma boa base, mas, por ser um app usado por crianças, **vale um advogado revisar** a Política de Privacidade, os Termos e as declarações da Segurança dos dados antes de publicar.

## Detalhes do app

| Campo | Valor |
|---|---|
| Nome do app (até 30) | **Trato: rotina das crianças** (26 caracteres) |
| Descrição curta (até 80) | **Missões, moedinhas e um pet que cresce: a rotina das crianças vira diversão.** (77 caracteres) |
| Categoria | **Criação de filhos** (Parenting). Alternativa: Educação |
| Tags sugeridas | rotina infantil, tarefas para crianças, criação de filhos, autonomia |
| E-mail de contato | **[E-MAIL DE SUPORTE]** |
| Site | **https://[DOMÍNIO]** |
| Política de privacidade | **https://[DOMÍNIO]/privacidade** |
| Exclusão de conta (link pedido pela Play) | **https://[DOMÍNIO]/excluir-conta** |

### Descrição completa (até 4000 caracteres)

```
Já pediu dez vezes para escovar os dentes hoje? No Trato, a rotina das crianças vira missão, e elas querem cumprir.

Você cria as missões do dia (arrumar a cama, preparar a mochila, ler um pouquinho) e a criança vê tudo num painel colorido, feito para ela. Cada missão concluída vale pontos e moedinhas, e faz crescer um pet que é só dela.

COMO FUNCIONA
1. O responsável cria as missões, os horários e as recompensas da família.
2. A criança cumpre as missões, ganha moedinhas e cuida do pet.
3. A família comemora junto e troca as moedinhas por prêmios combinados em casa, como um passeio ou um sorvete no fim de semana.

UM PET PARA CHAMAR DE SEU
• 5 espécies para escolher, cada uma com um jeitinho.
• O pet cresce em 5 níveis conforme a criança cumpre a rotina e, no fim, vai para a coleção.
• Ele reage ao toque, come, toma banho e fica animado quando a criança está em dia.

MISSÕES DO SEU JEITO
• Sugestões prontas para começar em um minuto, ou missões personalizadas.
• Dias da semana, uma vez por mês e horário.
• Três formas de concluir: direto, com a sua aprovação ou com uma foto da tarefa feita.

PARA QUEM CUIDA
• Área do responsável protegida por PIN.
• Aprovações de fotos e de pedidos de recompensa num lugar só.
• Dias seguidos, pontos e conquistas para acompanhar o progresso.
• Um celular para todos ou cada um com o seu: conecte o celular da criança com um código, sem dar a sua senha.

FEITO PARA FAMÍLIAS
• Sem anúncios.
• A criança usa o app sem e-mail nem senha e nunca vê preços nem botões de compra.
• As fotos são opcionais e só o responsável vê.
• Sem rastreadores e sem venda de dados.

PLANO FAMÍLIA
Comece grátis com uma criança e missões ilimitadas. No Plano Família, até 6 crianças. Assinatura mensal ou anual pela Google Play, com 7 dias grátis para novos assinantes; cancele quando quiser em Pagamentos e assinaturas da Play Store.

O Trato apoia a rotina da família e não substitui o acompanhamento dos responsáveis.

Dúvidas: [E-MAIL DE SUPORTE]
```

(Cerca de 1.900 caracteres; troque `[E-MAIL DE SUPORTE]` antes de colar.)

## Recursos gráficos

| Recurso | Exigência da Play | Arquivo |
|---|---|---|
| Ícone | 512×512 PNG, sem cantos transparentes (a Play arredonda sozinha) | `docs/loja/icone-512.png` ✅ |
| Imagem de destaque | 1024×500 PNG ou JPG | `docs/loja/destaque-1024x500.png` ✅ |
| Capturas de telefone | de 2 a 8 imagens, proporção 9:16, de 320 a 3840 px | `docs/loja/captura-1-inicio.png` até `captura-6-nova-missao.png` (1080×1920) ✅ |
| Capturas de tablet | opcionais | não feitas |
| Vídeo do YouTube | opcional | não feito |

As capturas saíram do app rodando no navegador em tamanho de celular, com dados de teste. Na `captura-5`, o e-mail que aparece é o da conta de teste (`teste@trato.test`): vale refazer com um e-mail de exemplo ou com o seu. A imagem de destaque e a de compartilhamento (`web/public/og.jpg`) saem de `npx tsx scripts/arte.tsx`.

## Conteúdo do app

### Público-alvo e conteúdo

- **Faixas etárias:**
  - marque as faixas das crianças que usam o app (por exemplo, **5 e menos**, **6 a 8**, **9 a 12**);
  - marque também **18+**, pelos responsáveis.
- Como inclui crianças, o app entra no **Programa Famílias** e precisa seguir a **Política para Famílias** (abaixo).
- **"O app pode atrair crianças sem querer?"** Não se aplica: ele é feito para famílias, usado por crianças com a supervisão dos responsáveis.

### Segurança dos dados (Data safety)

Respostas sugeridas, de acordo com o que o app faz hoje:

**Visão geral**
- O app coleta ou compartilha dados? **Sim, coleta.**
- Os dados são criptografados em trânsito? **Sim** (HTTPS).
- Os usuários podem pedir a exclusão? **Sim**: no app (Conta → Excluir conta e dados) e em `https://[DOMÍNIO]/excluir-conta`.
- Compartilhamento com terceiros: **Não.** Hospedagem, Google Play e RevenueCat são prestadores de serviço e, pelas regras da Play, não contam como compartilhamento.

**Tipos de dados coletados**

| Categoria → tipo | Coletado | Obrigatório? | Finalidade |
|---|---|---|---|
| Informações pessoais → Nome | Sim (nome do responsável e apelido da criança) | Obrigatório | Funcionalidade do app; Gerenciamento da conta |
| Informações pessoais → Endereço de e-mail | Sim (do responsável) | Obrigatório | Gerenciamento da conta; Funcionalidade do app |
| Fotos e vídeos → Fotos | Sim (fotos de comprovação) | **Opcional** | Funcionalidade do app |
| Atividade no app → Outro conteúdo gerado pelo usuário | Sim (missões, recompensas, histórico) | Obrigatório | Funcionalidade do app |
| Informações financeiras → Histórico de compras | Sim (só o estado da assinatura, pela RevenueCat) | Obrigatório para quem assina | Funcionalidade do app |

**Não coletados:** localização, contatos, mensagens, áudio, arquivos, agenda, informações de saúde, identificadores de publicidade, diagnóstico e desempenho (não há analytics nem relatório de falhas de terceiros).

> **Confira o SDK da RevenueCat:** ela publica um guia de como declarar o SDK dela na Segurança dos dados. Antes de enviar, compare com a versão 13.7.0 e acrescente o que o guia disser, por exemplo um "ID do usuário do app" para fins de compra.

### Classificação de conteúdo (questionário IARC)

- Categoria do app: **Todos os outros tipos de app** (não é jogo, nem rede social).
- **Respostas:**
  - Violência, sexo, linguagem imprópria, drogas, álcool, tabaco: **Não**.
  - Jogos de azar ou simulação de apostas: **Não**. As moedinhas são pontos virtuais, sem valor em dinheiro e sem sorteio.
  - Os usuários interagem ou trocam conteúdo com outros usuários? **Não.** As fotos ficam só dentro da família, e não há chat nem perfil público.
  - Compartilha a localização do usuário? **Não**.
  - Compras digitais: **Sim** (assinatura).
- **Classificação esperada:** **Livre (L)** no Brasil e **Everyone** (ESRB) / **PEGI 3**.

### Anúncios

**O app não tem anúncios.**

### Política para Famílias (declarações)

- [x] Sem anúncios. Sem SDKs de anúncios.
- [x] Sem analytics nem rastreio de terceiros.
- [x] Sem identificadores de publicidade (AD_ID). Confira no `AndroidManifest.xml` final que nenhum plugin acrescentou `com.google.android.gms.permission.AD_ID`. Se algum acrescentar, remova com `tools:node="remove"`.
- [x] Sem localização, câmera em segundo plano ou contatos. A câmera só abre quando a criança escolhe tirar a foto da missão.
- [x] Compras dentro do app só atrás do PIN do responsável. A criança não vê preço nem botão de compra.
- [x] Conteúdo adequado para crianças: sem links para fora do app na área da criança.
- [x] Política de privacidade com a seção sobre dados de crianças (LGPD, art. 14).
- [x] Consentimento do responsável no cadastro, com data e versão guardadas.
- [ ] **Você**: confirmar que a RevenueCat e os plugins do Capacitor seguem a Política para Famílias. A Play mantém uma lista de SDKs autocertificados para anúncios, mas a RevenueCat não é de anúncios: só vale conferir a declaração dela.

### Outras declarações do Play Console

- **Acesso ao app:** "Todo ou parte do app é restrito". Informe uma conta de teste para a revisão da Google (crie uma só para isso, com o PIN escrito na instrução).
- **App de notícias:** não. **Rastreamento de contatos ou saúde:** não. **App governamental:** não.
- **Serviço financeiro:** não.
- **Permissões sensíveis:** nenhuma. A câmera é usada pelo seletor de arquivos do sistema.

## Para preencher (só você pode dar)

Estão nas páginas `web/public/privacidade.html`, `termos.html`, `cancelamento.html`, `excluir-conta.html` e nesta ficha, sempre em destaque amarelo:

- **[RAZÃO SOCIAL OU NOME DO RESPONSÁVEL LEGAL]**
- **[CNPJ OU CPF]**
- **[ENDEREÇO]** (exigido pela LGPD para o controlador)
- **[E-MAIL DE SUPORTE]**
- **[NOME DO ENCARREGADO]** e **[E-MAIL DO ENCARREGADO]** (o DPO; pode ser você mesmo)
- **[CIDADE/UF DO FORO]**
- **[DOMÍNIO]**
- **[NOME DO PROVEDOR DE HOSPEDAGEM]** (por exemplo, onde o Easypanel roda)
- **[DATA DE VIGÊNCIA]**

Se mudar algo importante nos termos, troque também `VERSAO_TERMOS` em `src/shared/legal.ts`: a conta guarda a versão aceita.
