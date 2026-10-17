---
scope_type: ad-hoc
related_phases: [4]
status: decided
date: 2026-09-26
scope_description: "Lacunas de contrato achadas ao montar o plano do slice de frontend da Fase 04: como o frontend descobre o canal do usuário logado, como a edição de vídeo carrega seus campos e como o token é renovado em Server Components."
---

# Technical Decisions — Fase 04 (Frontend): Lacunas de Contrato FE↔BE

_Subprojects in scope:_

- `nestjs-project/` — TD-01 e TD-02 são `Cross-layer` e implicam mudanças de contrato no backend (endpoint de canal do usuário e detalhe do vídeo).
- `next-frontend/` — TD-01/TD-02 consomem o contrato; TD-03 é decisão exclusivamente de frontend (renovação de sessão em RSC).

> Âncoras (já decididas — NÃO reabrir): BFF estrito e sessão `iron-session` (`phase-02-auth-frontend/TD-01..TD-07`); guarda de rotas e leitura por RSC (`phase-04-videos-channel-frontend/TD-01`, `TD-02`); contrato de negócio do backend (`phase-04-videos-channel/TD-01..TD-05`).
>
> Achados que originam este documento (fatos do código): o JWT carrega só `sub` e `email` (`auth.types.ts`); o login BFF grava `userId` e `channelSlug` vazios na sessão; `GET /videos/:id` devolve apenas `id, title, status, durationSeconds, width, height, createdAt`; `lib/auth/refresh.ts` regrava a sessão com `cookies().set`, o que o Next não permite durante a renderização de um Server Component.

---

## TD-01: Como o frontend obtém o canal do usuário logado (`channelId` e `nickname`)

**Scope:** Cross-layer

**Capability:** Transversal — covers: Painel de gerenciamento de vídeos do canal (thumbnail, título, visualizações, likes, comentários, tempo de publicação e status), Edição das informações do canal: nickname, nome e descrição

**Context:** `GET /channels/:id/manage/videos` e `PATCH /channels/:id` exigem o `id` do canal; `GET /channels/:nickname` exige o nickname. Nenhum endpoint nem a sessão atual entregam esses valores ao frontend, e o menu de conta (D16) precisa do nickname sem chamada ao servidor. Afeta backend (contrato) e frontend (sessão).

**Options:**

### Option A: Novo `GET /channels/me` + gravar `channelId`/`channelSlug` na sessão no login
- Endpoint autenticado devolve `id, name, nickname, description, updatedAt`. O login BFF chama o endpoint com o token recém-emitido e grava os valores na cookie de sessão; a tela de edição do canal também carrega os dados por ele. Após trocar o nickname, o BFF regrava `channelSlug`.
- **Pros:** um endpoint reutilizado pelo login e pela edição de canal; não altera o formato dos tokens; dado sempre vem do banco.
- **Cons:** uma chamada extra no login; a sessão guarda um valor que pode ficar defasado (mitigado pela regravação no PATCH); exige rota declarada antes de `:nickname`.

### Option B: Colocar `channelId` e `nickname` como claims do JWT
- `generateAccessToken` inclui os claims; o BFF os lê decodificando o token.
- **Pros:** nenhum endpoint novo nem chamada extra.
- **Cons:** o nickname muda (`phase-04-videos-channel/TD-05`) e o token só se atualiza no refresh, então o valor fica defasado até 15 min ou mais; muda o contrato de tokens da Fase 02 e seus testes; exige o BFF decodificar JWT (hoje só o trata como opaco).

### Option C: Resposta do `POST /auth/login` passa a incluir o canal
- O corpo do login devolve `{ access_token, refresh_token, channel: { id, nickname } }`; o BFF grava na sessão.
- **Pros:** sem chamada extra; sem endpoint novo.
- **Cons:** altera o contrato do login (também usado por confirmação de e-mail/refresh) e mistura autenticação com dados de canal; a edição de canal ainda precisaria de um endpoint para carregar nome/descrição.

**Recommendation:** Option A — o endpoint também é necessário para pré-preencher a edição do canal, então é a única opção que resolve os dois usos sem alterar tokens (B) nem o contrato de login (C); o custo é uma chamada no login.

**Decision:** A (`GET /channels/me` + gravar `channelId`/`channelSlug` na sessão no login e após trocar o nickname)

---

## TD-02: Como a edição de vídeo carrega os campos editáveis

**Scope:** Cross-layer

**Capability:** Edição das informações do vídeo: título, descrição, categoria e thumbnail customizada; Edição de vídeos a partir do painel; Visibilidade do vídeo: público (aparece para todos) ou unlisted (somente via link); Fluxo de rascunho → publicação

**Context:** O formulário de edição precisa de `description`, `categoryId`, `visibility`, `publishedAt`, `thumbnailKey` e `updatedAt`, além de `status` para habilitar Publicar. `GET /videos/:id` não os devolve e a listagem do painel também não traz `description`/`categoryId`.

**Options:**

### Option A: Enriquecer `GET /videos/:id` com os campos (aditivo)
- Acrescenta os campos à resposta existente, mantendo os atuais e a regra de visibilidade.
- **Pros:** sem endpoint novo; uma fonte de detalhe do vídeo, reaproveitável pela página de visualização (Fase 05).
- **Cons:** endpoint público passa a expor `description`/`categoryId`/`visibility` a não donos (aceitável: são metadados de vídeo já visível), e `publishedAt`/`thumbnailKey` são campos de gestão.

### Option B: Novo endpoint de detalhe só do dono (ex.: `GET /videos/:id/manage`)
- Resposta completa para edição, protegida por posse.
- **Pros:** separa dados de gestão dos públicos; contrato claro por papel.
- **Cons:** dois endpoints de detalhe para manter e documentar; a Fase 05 provavelmente precisa dos mesmos campos públicos e acabaria enriquecendo o GET público de qualquer forma.

### Option C: Montar o detalhe a partir da listagem do painel
- A tela de edição lê o item da listagem paginada.
- **Pros:** nenhuma mudança de backend.
- **Cons:** a listagem não tem `description` nem `categoryId`, então não resolve; acrescentá-los à listagem incha cada item e exige achar o vídeo na página certa.

**Recommendation:** Option A — o mínimo de superfície nova; os campos adicionados são metadados que a Fase 05 também vai precisar, e a regra de visibilidade existente continua valendo.

**Decision:** A (enriquecer `GET /videos/:id` de forma aditiva com `description`, `categoryId`, `visibility`, `publishedAt`, `thumbnailKey` e `updatedAt`)

---

## TD-03: Renovação de token em Server Components

**Scope:** Frontend

**Capability:** Transversal — covers: Painel de gerenciamento de vídeos do canal (thumbnail, título, visualizações, likes, comentários, tempo de publicação e status), Edição de vídeos a partir do painel, Edição das informações do canal: nickname, nome e descrição, Página pública do canal com informações e listagem de vídeos

**Context:** `phase-04-videos-channel-frontend/TD-02` manda os RSC chamarem o upstream no servidor "com o helper de refresh". O helper atual regrava a sessão via `cookies().set`, que o Next não permite durante a renderização de RSC (só em Route Handlers, Server Actions e `proxy.ts`). Confirmado na documentação do Next.js 16.2.2 (Context7, `/vercel/next.js` → `docs/01-app/03-api-reference/04-functions/cookies.mdx`): `cookies()` só lê cookies de entrada em Server Components; ler/gravar cookies de saída é exclusivo de Server Functions e Route Handlers. Sem decisão, um access token expirado quebra a renderização das telas de estúdio.

**Options:**

### Option A: RSC trata 401 redirecionando para um Route Handler que renova e volta
- No RSC, `401` → `redirect('/api/auth/refresh?next=…')` (com `next` validado como same-origin); o handler renova, regrava o cookie e redireciona de volta; falha no refresh → login.
- **Pros:** reaproveita o refresh single-flight existente; cookie gravado onde é permitido; sem custo em requisições sem expiração.
- **Cons:** um redirect extra quando o token expira; nova rota BFF a testar.

### Option B: `proxy.ts` renova proativamente
- O proxy lê o cookie, detecta expiração do access token e renova antes da renderização.
- **Pros:** RSC sempre recebe token válido; sem redirect extra.
- **Cons:** o proxy passa a decodificar JWT e chamar a rede em toda navegação da área; single-flight entre proxy e handlers precisa de coordenação; TD-01 quis o proxy apenas otimista.

### Option C: Tratar 401 em RSC como sessão expirada (novo login)
- Sem renovação em RSC; `401` → `/login?next=`.
- **Pros:** mais simples.
- **Cons:** UX ruim — o usuário é deslogado sempre que o access token expira, embora o refresh token ainda seja válido.

**Recommendation:** Option A — mantém o proxy otimista (TD-01), aproveita o helper de refresh já decidido na Fase 02 e limita o custo ao caso raro de token expirado.

**Decision:** A (RSC trata `401` redirecionando para um Route Handler que renova o token via refresh single-flight e volta ao destino, com `next` validado como same-origin)
**Renders in:** frontend-runtime

---

## Decisions Summary

| ID | Scope | Decision | Recommendation | Choice |
|----|-------|----------|----------------|--------|
| TD-01 | Cross-layer | Canal do usuário logado no frontend | Option A (`GET /channels/me` + sessão) | A |
| TD-02 | Cross-layer | Carga dos campos da edição de vídeo | Option A (enriquecer `GET /videos/:id`) | A |
| TD-03 | Frontend | Renovação de token em RSC | Option A (redirect via Route Handler) | A |
