---
scope_type: phase
related_phases: [4]
status: pending
date: 2026-09-23
covers_capabilities:
  - "Categorias de vídeo disponíveis na plataforma"
  - "Edição das informações do vídeo: título, descrição, categoria e thumbnail customizada"
  - "Visibilidade do vídeo: público (aparece para todos) ou unlisted (somente via link)"
  - "Fluxo de rascunho → publicação"
  - "Painel de gerenciamento de vídeos do canal (thumbnail, título, visualizações, likes, comentários, tempo de publicação e status)"
  - "Edição de vídeos a partir do painel"
  - "Edição das informações do canal: nickname, nome e descrição"
  - "Página pública do canal com informações e listagem de vídeos"
depends_on_slices: [phase-04-videos-channel]
scope_description: "Slice de frontend da Fase 04: a área autenticada de gerenciamento (painel de vídeos, edição de vídeo, edição de canal) e a página pública do canal em next-frontend/, mais o que atravessa o contrato com o backend para que isso funcione — como o navegador alcança as URLs pré-assinadas do storage e como as thumbnails chegam à UI. O backend da fase (categorias, edição, thumbnail, publicação, listagens paginadas, edição de canal) está decidido e implementado em `phase-04-videos-channel/TD-01..TD-05` e NÃO é reaberto aqui."
---

# Technical Decisions — Fase 04 (Frontend): Painel de Gerenciamento, Edição e Página Pública do Canal

_Subprojects in scope:_

- `next-frontend/` — dono das telas (painel de vídeos, edição de vídeo, edição de canal, página pública do canal), dos Route Handlers BFF de mutação, da guarda de rotas autenticadas e da estratégia de dados das listagens. As telas em si (estrutura, rotas, estados) vêm do Figma via `/screen-inventory`; esta pesquisa só decide o que o inventário não resolve.
- `nestjs-project/` — **sem decisão de domínio aberta**: o contrato de negócio está fechado em `phase-04-videos-channel/TD-01..TD-05`. Porém `TD-04` e `TD-05` abaixo são `Cross-layer` e listam **mudanças de backend necessárias** (config de storage e um endpoint de thumbnail) sem as quais a UI não consegue exibir imagens.

> Âncoras entre documentos (já decididas — NÃO reabrir):
> - **BFF estrito, `API_URL` único e server-only:** `next-frontend-config-base/TD-03`. O navegador só fala com `/api/**` do próprio Next; nenhuma URL do NestJS vai ao cliente.
> - **Cadeia OpenAPI:** `next-frontend-openapi-typing/TD-01..TD-05`. Todo formato de fio vem de `paths`; aliases em `lib/api/contracts.ts`.
> - **MSW por domínio:** `next-frontend-msw-foundation/TD-01..TD-04`. Esta fase contribui com `mocks/handlers/videos.ts` e `mocks/handlers/channels.ts` (+ linhas no barrel).
> - **Sessão e mutações:** `phase-02-auth-frontend/TD-01..TD-07` — sessão `iron-session` em cookie único, refresh transparente no BFF com single-flight, formulários com `react-hook-form` + Zod, **mutações por Route Handler POST/PATCH + `fetch` (não Server Actions)**, sessão entregue ao cliente por Provider renderizado no layout RSC (com `router.refresh()` após mutações que alteram a sessão).
> - **Backend desta fase:** `PATCH /videos/:id`, `POST /videos/:id/thumbnail` (multipart, ≤5MB, `image/*`), `POST /videos/:id/publish` (unidirecional), `GET /channels/:id/manage/videos` (dono), `GET /channels/:nickname` e `GET /channels/:nickname/videos` (públicos), `PATCH /channels/:id` (409 `NICKNAME_ALREADY_EXISTS`), `GET /categories`. Paginação por página/offset (`?page=&pageSize=`, resposta `{ items, page, pageSize, total }`). `views`/`likes`/`comments` vêm como `0` até a Fase 06.
> - **Regras do projeto que restringem a UI:** imagens raster só via `next/image` (nunca `<img>`); `env` só via `@/lib/env`; RSC por padrão, `"use client"` o mais fundo possível.

---

## TD-01: Guarda de Rotas Autenticadas (área de gerenciamento)

**Scope:** Frontend

**Capability:** Transversal — covers: Painel de gerenciamento de vídeos do canal (thumbnail, título, visualizações, likes, comentários, tempo de publicação e status), Edição de vídeos a partir do painel, Edição das informações do canal: nickname, nome e descrição

**Context:** A Fase 04 introduz a primeira área que só o dono pode ver. Hoje não existe `proxy.ts` (o antigo `middleware` do Next 16) nem guarda de rota: as telas de auth são públicas e a sessão só é lida no `RootLayout` para alimentar o Provider. A Fase 02 deixou explícito que o logout "vive no chrome autenticado (tipicamente Fase 04)". É preciso decidir **onde** a verificação de sessão acontece. O Next 16 documenta que layouts não re-renderizam a cada navegação (uma checagem só no layout pode ser pulada em navegações parciais), então a guarda precisa estar também perto do acesso a dados.

**Options:**

### Option A: Apenas `proxy.ts` (redireciona no borda da requisição)
- Um `proxy.ts` com `matcher` na área autenticada lê o cookie `streamtube_session` (via `iron-session`) e redireciona para `/login?next=…` se não houver sessão válida.
- **Pros:** um único ponto, executa antes de renderizar; UX de redirecionamento rápido.
- **Cons:** proteção "otimista" — o proxy não deve ser a única barreira (não cobre Route Handlers chamados direto nem expiração de token detectada só no upstream); qualquer bug no `matcher` deixa a rota exposta sem segunda linha de defesa.

### Option B: Apenas checagem no layout da área (`(studio)/layout.tsx`)
- O layout chama `getSession()` e `redirect()` se `!isLoggedIn`.
- **Pros:** sem arquivo novo de infraestrutura; fácil de ler.
- **Cons:** layouts não re-renderizam em navegações client-side entre páginas filhas, então a checagem pode não rodar de novo; páginas e Route Handlers de dados continuam sem verificação própria.

### Option C: `proxy.ts` otimista + `requireSession()` em todo acesso a dados do servidor (defesa em profundidade)
- `proxy.ts` faz o redirect rápido (UX). Um helper `requireSession()` (em `lib/auth/`) é chamado no início de **cada** RSC de dados da área e de **cada** Route Handler de mutação: redireciona (RSC) ou devolve 401 (Route Handler) quando a sessão é inválida. O parâmetro `next` é validado como same-origin antes do redirect pós-login (o Next documenta o risco de open redirect).
- **Pros:** duas camadas independentes; a verificação segue o dado, não o layout; reaproveita `getSession()` e o helper de refresh já existentes.
- **Cons:** disciplina — todo novo ponto de acesso a dados precisa chamar `requireSession()` (mitigável com teste que varre os handlers da área e um teste de integração por rota).

**Recommendation:** Option C — a Fase 02 já fixou que a sessão vive em cookie `iron-session` lido no servidor; falta apenas a barreira. A verificação junto ao dado é a única que sobrevive à navegação parcial do App Router, e o `proxy.ts` sozinho é explicitamente uma checagem otimista. O custo (um helper chamado em poucos pontos) é baixo para esta fase e o padrão vale para as Fases 05–07 (comentários, curtidas, inscrições).

**Decision:** C (`proxy.ts` otimista + `requireSession()` em todo acesso a dados do servidor)
**Renders in:** frontend-runtime

---

## TD-02: Estratégia de Dados e Paginação das Listagens de Vídeo

**Scope:** Frontend

**Capability:** Transversal — covers: Painel de gerenciamento de vídeos do canal (thumbnail, título, visualizações, likes, comentários, tempo de publicação e status), Página pública do canal com informações e listagem de vídeos

**Context:** O backend expõe duas listagens paginadas por página/offset (`page`, `pageSize`, total). A UI precisa decidir quem busca os dados e onde vive o estado da página atual. O stack não tem biblioteca de data-fetching no cliente (nem TanStack Query nem SWR) e `next-frontend/CLAUDE.md` recomenda RSC para carregar dados ("mantém payloads pequenos e evita waterfalls"). O RSC pode chamar o cliente `upstream` tipado diretamente no servidor (com o helper de refresh), sem passar por um Route Handler interno.

**Options:**

### Option A: RSC + `searchParams` (URL como estado), paginação por links
- A página é um RSC async: lê `searchParams.page`, chama `upstream.GET(…)` no servidor e renderiza a lista mais um componente de paginação numerada com `next/link` (`?page=N`). Mutações (publicar, alterar visibilidade) usam Route Handlers e disparam `router.refresh()` (padrão da `phase-02-auth-frontend/TD-06`).
- **Pros:** zero dependência nova; a URL é compartilhável e funciona com o botão voltar; HTML já vem renderizado (bom para a página pública/SEO); alinhado ao TD de paginação por página do backend; testável com os Route Handlers como funções + MSW.
- **Cons:** cada troca de página é uma navegação de servidor (sem cache de cliente entre páginas); interações finas (ex.: atualizar uma linha sem recarregar) dependem de `router.refresh()`.

### Option B: Cliente busca via Route Handlers GET + biblioteca de cache (TanStack Query ou SWR)
- Componentes client chamam `/api/channels/…/videos?page=N` e mantêm estado/cache no cliente.
- **Pros:** cache entre páginas, revalidação e atualização otimista prontas.
- **Cons:** nova dependência e nova camada de estado; **cria Route Handlers GET só para alimentar a UI** (o RSC já poderia buscar); pior para a página pública (conteúdo só após hidratação); duplica o que a Option A obtém de graça com a URL.

### Option C: Híbrido — RSC renderiza a primeira página; "carregar mais" no cliente
- Primeira página server-side; botão/scroll infinito busca as seguintes via Route Handler GET.
- **Pros:** boa UX para feeds longos.
- **Cons:** o backend foi decidido com paginação numerada (`TD-04` do slice de backend), que casa mal com scroll infinito (offset sujeito a duplicar/pular itens quando a lista muda); complexidade dupla (RSC + cliente) sem requisito de infinite scroll no plano.

**Recommendation:** Option A — os volumes por canal são pequenos (premissa do `TD-04` de backend), a URL como estado é o padrão idiomático do App Router e evita uma dependência e uma camada de estado que nenhuma capacidade da fase exige. Se a Fase 07 (home/busca com feed longo) pedir cache de cliente, a decisão é revisitada lá com evidência.

**Decision:** A (RSC + `searchParams` — URL como estado, paginação por links)
**Renders in:** frontend-runtime

---

## TD-03: Cache e Revalidação da Página Pública do Canal

**Scope:** Frontend

**Capability:** Transversal — covers: Página pública do canal com informações e listagem de vídeos, Edição de vídeos a partir do painel, Edição das informações do canal: nickname, nome e descrição

**Context:** A página pública é a primeira rota acessível a anônimos com conteúdo que muda por ação do dono (publicar vídeo, editar canal). Fatos do código atual: o `RootLayout` (`app/layout.tsx`) faz `await getSession()` → lê `cookies()` → **toda a árvore é renderizada dinamicamente por requisição**, herança da `phase-02-auth-frontend/TD-06`. O Next 16 oferece cache de dados via Cache Components (`cacheComponents: true` + `'use cache'` + `cacheTag`, invalidado por `revalidateTag`/`updateTag` nos Route Handlers de mutação), mas a flag é global ao projeto e faz o build acusar dados não-cacheados fora de `Suspense`, afetando as telas de auth já entregues. A decisão define se a página pública é cacheada agora e como as mutações a invalidam.

**Options:**

### Option A: Renderização dinâmica sem cache (dados frescos a cada requisição)
- A página chama `upstream` a cada visita, sem `'use cache'`. Sem tags de invalidação.
- **Pros:** zero superfície nova; sem risco de conteúdo obsoleto; não mexe em `next.config.ts` nem nas telas de auth; consistente com o layout que já é dinâmico.
- **Cons:** cada visita anônima gera chamadas ao upstream (aceitável no volume atual); sem ganho de desempenho para tráfego alto.

### Option B: Cache Components — `'use cache'` + `cacheTag('channel:{nickname}')` nas buscas, invalidação nas mutações
- Liga `cacheComponents: true`; as funções de busca da página pública são marcadas `'use cache'` com `cacheLife` e tags; os Route Handlers de publicar/editar vídeo e editar canal chamam `revalidateTag`/`updateTag` das tags afetadas.
- **Pros:** menos chamadas ao upstream; invalidação exata; caminho natural para Fases 05/07 (alto tráfego).
- **Cons:** flag global com raio de explosão sobre a Fase 02 (build passa a exigir `Suspense` em torno de acesso a `cookies()`, inclusive no `RootLayout`); acoplamento de nomes de tag entre 3+ Route Handlers (fácil dessincronizar); alta complexidade para um benefício ainda não medido; renomear nickname (`TD-05` de backend) exige invalidar a tag do nickname **antigo** e do novo.

### Option C: ISR por tempo (`export const revalidate = N`) na rota
- **Pros:** configuração de uma linha.
- **Cons:** **ineficaz enquanto o `RootLayout` ler `cookies()`** — a rota é dinâmica de qualquer forma e o `revalidate` não tem efeito; só seria viável reorganizando o layout raiz (mudança maior, fora desta fase); conteúdo pode ficar obsoleto até N segundos após a ação do dono.

**Recommendation:** Option A — não há requisito de desempenho no plano para esta fase, o layout raiz já força renderização dinâmica, e as Options B/C custam uma reorganização transversal (flag global ou layout raiz) para resolver um problema ainda não medido. Reavaliar na Fase 07 (home/busca), onde tráfego e listagens compartilhadas justificam Cache Components.

**Decision:** A (renderização dinâmica sem cache)
**Renders in:** frontend-runtime

---

## TD-04: Endpoint Público de Storage para URLs Pré-assinadas (alcançável pelo navegador)

**Scope:** Cross-layer

**Capability:** Transversal — covers: Painel de gerenciamento de vídeos do canal (thumbnail, título, visualizações, likes, comentários, tempo de publicação e status), Página pública do canal com informações e listagem de vídeos

**Context:** Achado da leitura do código: o backend assina URLs de leitura (stream, download e — nesta fase — thumbnail) usando o mesmo `S3Client` de servidor, configurado com `STORAGE_ENDPOINT=http://minio:9000` (`nestjs-project/src/config/storage.config.ts`). O host de uma URL SigV4 pré-assinada faz parte da assinatura e aqui é o nome de serviço **interno do Docker** (`minio`), que o navegador do usuário não resolve. Ou seja, `GET /videos/:id/stream` (Fase 03) e qualquer thumbnail via URL pré-assinada só funcionam de dentro da rede Docker. Nenhum capability desta fase exibe imagens sem resolver isto, e a Fase 05 (player) depende do mesmo ponto.

**Options:**

### Option A: Novo `STORAGE_PUBLIC_ENDPOINT` usado só para assinar URLs de leitura
- Nova variável (origem alcançável pelo navegador, ex.: `http://localhost:9000` em dev; domínio público em produção) lida por `storage.config.ts`, validada no Joi e documentada no `.env.example`. Um segundo cliente S3 (apenas para `getSignedUrl`) usa esse endpoint; o cliente interno continua em `minio:9000` para upload/multipart/cron.
- **Pros:** padrão S3 (assinar contra o host que o cliente usará); mudança pequena e localizada; serve thumbnail, stream e download; sem proxy de bytes.
- **Cons:** uma variável e um cliente a mais por ambiente; o MinIO precisa estar publicado ao navegador (já está na porta 9000 no Compose); em dev o valor usa `localhost` porque é **origem voltada ao navegador**, não conexão entre containers — exceção deliberada à regra de nomes de serviço do `CLAUDE.md`, que vale para chamadas container→container.

### Option B: Reverse proxy same-origin (`/storage/**` reescrito pelo Next para o MinIO)
- Assinar contra `http://<origem-do-next>/storage` e reescrever para o MinIO.
- **Pros:** o navegador só vê a origem do app (sem CORS nem porta extra).
- **Cons:** a assinatura cobre o header `Host`; a reescrita muda o host e invalida a assinatura a menos que o proxy o preserve (configuração frágil); passa a trafegar bytes de vídeo pelo Next (contraria o princípio de `phase-03-videos/TD-05` de nunca proxiar arquivos grandes).

### Option C: Backend serve os bytes (proxy no NestJS) só para thumbnails
- **Pros:** não expõe o storage ao navegador para imagens.
- **Cons:** só resolve thumbnails — stream/download (Fase 05) continuam quebrados e exigem a Option A de qualquer forma; a API passa a carregar bytes de imagem.

**Recommendation:** Option A — é a única que resolve thumbnail, stream e download com uma mudança, mantém a decisão de nunca proxiar bytes (`phase-03-videos/TD-05`) e não toca o FE. É dependência das Fases 04-FE e 05.

**Backend changes required:**

| Mudança | Onde | Detalhe |
|---|---|---|
| Nova variável `STORAGE_PUBLIC_ENDPOINT` | `storage.config.ts`, `env.validation.ts`, `.env.example`, `compose.yaml` | Origem alcançável pelo navegador; obrigatória para gerar URLs de leitura |
| Cliente de assinatura com endpoint público | `storage.module.ts` (novo provider) + `VideosService.getPlaybackUrl` | Usado apenas em `getSignedUrl` de leitura; upload/multipart/cron seguem no cliente interno |

**Decision:** A (`STORAGE_PUBLIC_ENDPOINT` usado só para assinar URLs de leitura, com cliente S3 dedicado à assinatura)

---

## TD-05: Entrega de Thumbnails à UI (contrato e `next/image`)

**Scope:** Cross-layer

**Capability:** Transversal — covers: Painel de gerenciamento de vídeos do canal (thumbnail, título, visualizações, likes, comentários, tempo de publicação e status), Edição de vídeos a partir do painel, Página pública do canal com informações e listagem de vídeos

**Context:** As listagens do backend devolvem apenas `thumbnailKey` (chave no storage), não uma URL, e a regra do projeto obriga `next/image` para imagens raster. É preciso decidir o **contrato** entre backend e UI para transformar a chave em um `src`. Fatos que pesam: (1) a thumbnail customizada **sobrescreve a mesma chave** (`videos/{id}/thumbnail.jpg`, `TD-02` do backend), então a URL estável não muda quando a imagem muda — é preciso um parâmetro de versão; (2) o painel mostra thumbnails de vídeos ainda não publicados (visíveis só ao dono); (3) assume `TD-04` acima (URLs pré-assinadas alcançáveis pelo navegador).

**Options:**

### Option A: Endpoint de redirecionamento `GET /videos/:id/thumbnail` (302 → URL pré-assinada), consumido via BFF
- Backend ganha um endpoint irmão de `/stream`, aplicando a regra de visibilidade (dono vê qualquer status; anônimo só vê vídeo publicado e público) e respondendo 302 com `Cache-Control` curto. O BFF expõe `GET /api/videos/[id]/thumbnail` que repassa o redirect. A UI usa `<Image src="/api/videos/{id}/thumbnail?v={updatedAt}" />`; as listagens passam a incluir `updatedAt` como versão.
- **Pros:** consistente com `phase-03-videos/TD-05` (leitura por URL pré-assinada, autorização decidida pela API); a URL do `src` é estável (cache do otimizador e do navegador funcionam) e o `?v=` invalida quando a thumbnail é trocada; nenhum host de storage nem assinatura viaja nos payloads.
- **Cons:** um endpoint novo no backend e um Route Handler no BFF; requer `images.localPatterns` para o `src` local com query; **a ser verificado na implementação:** como o otimizador de imagem do Next trata um `src` local que responde 302 para host remoto (o host precisaria estar em `remotePatterns`) e se encaminha o cookie de sessão — para thumbnails de vídeos ainda privados no painel a alternativa é `unoptimized` no `<Image>`.

### Option B: Backend embute `thumbnailUrl` pré-assinada em cada item das respostas
- Cada item de listagem/PATCH traz uma URL assinada pronta; a UI usa como `src` com `remotePatterns` para a origem do storage.
- **Pros:** sem endpoint extra nem Route Handler de imagem.
- **Cons:** cada resposta gera uma URL nova (assinatura diferente) — o cache do otimizador e do navegador nunca acerta; a URL expira em ~15 minutos, então painéis abertos e páginas em cache ficam com imagem quebrada; assinatura no HTML/JSON de listagem.

### Option C: Leitura pública do prefixo de thumbnails no bucket + URL estável montada no cliente
- Política de leitura anônima em `videos/*/thumbnail.jpg`; a UI monta `{STORAGE_PUBLIC_ENDPOINT}/{bucket}/videos/{id}/thumbnail.jpg?v=…` sem chamar a API.
- **Pros:** URL estável, ótima para cache/CDN, sem endpoint.
- **Cons:** qualquer pessoa com o UUID lê a thumbnail de vídeos em rascunho ou não publicados (a autorização deixa de ser da API); exige política anônima no MinIO/S3 (mudança de infra e de governança em produção); precisa de uma origem pública de storage no cliente, aproximando-se do que o BFF estrito quer evitar.

**Recommendation:** Option A — mantém a autorização na API (rascunhos continuam privados), aproveita URLs estáveis para o cache e segue o mesmo padrão de leitura já decidido para o vídeo. O custo é pequeno (um endpoint e um Route Handler) frente ao Option B (imagens quebrando por expiração) e ao Option C (vazamento de thumbnails não publicadas).

**Backend changes required:**

| Mudança | Onde | Detalhe |
|---|---|---|
| Novo `GET /videos/:id/thumbnail` (302 → URL pré-assinada, `Cache-Control` curto) | `videos.controller.ts` / `videos.service.ts` | Mesma regra de visibilidade: dono vê qualquer status; anônimo só vê vídeo `ready` + publicado + `public`. Sem `thumbnail_key` → 404 |
| `updatedAt` nos itens de `GET /channels/:id/manage/videos`, `GET /channels/:nickname/videos` e nas respostas de `PATCH /videos/:id` e `POST /videos/:id/thumbnail` | controllers de vídeos | Usado como parâmetro de versão `?v=` (a chave da thumbnail não muda ao substituí-la) |
| Documentar (OpenAPI) o novo endpoint | `videos.controller.ts` | Necessário para a cadeia `openapi.json` → `types.gen.ts` do FE |

**Decision:** A (endpoint `GET /videos/:id/thumbnail` com 302 para URL pré-assinada, consumido via BFF `GET /api/videos/[id]/thumbnail`)

---

## Decisions Summary

| ID | Scope | Decision | Recommendation | Choice |
|----|-------|----------|----------------|--------|
| TD-01 | Frontend | Guarda de rotas autenticadas | Option C (`proxy.ts` otimista + `requireSession()` no acesso a dados) | _[pending]_ |
| TD-02 | Frontend | Dados e paginação das listagens | Option A (RSC + `searchParams`) | _[pending]_ |
| TD-03 | Frontend | Cache da página pública | Option A (dinâmica, sem cache) | _[pending]_ |
| TD-04 | Cross-layer | Endpoint público de storage p/ URLs pré-assinadas | Option A (`STORAGE_PUBLIC_ENDPOINT`) | _[pending]_ |
| TD-05 | Cross-layer | Entrega de thumbnails à UI | Option A (redirect `GET /videos/:id/thumbnail` via BFF) | _[pending]_ |

---

## Notes for downstream pipeline

- **Slice e cobertura.** Este doc declara `covers_capabilities` (os 4 bullets adiados) e `depends_on_slices: [phase-04-videos-channel]`. O slice de backend **não** declara `covers_capabilities` (semântica monolítica: "cobre tudo"); por isso `plan-validate` pode emitir avisos `MC-cross-N` (advisory, não bloqueiam) para os 4 bullets do backend, e o gate de cobertura do último slice em `plan-build` deve considerar o backend como cobrindo tudo. Se o gate acusar bullets sem dono, a correção é declarar `covers_capabilities` no doc do backend (edição de frontmatter, sem TDs novos).
- **Screen inventory é pré-requisito.** Este slice tem escopo de UI real: rode `/screen-inventory` antes de `/plan-context` para que o inventário (Figma) defina telas, rotas e estados. Isso inclui a decisão de **edição de vídeo em página dedicada vs. modal/drawer**, deliberadamente não tratada aqui por depender do design.
- **Decisões herdadas que dispensam TD (resolvidas por convenção):**
  - Upload de thumbnail = Route Handler `POST /api/videos/[id]/thumbnail` recebendo `FormData` e repassando multipart ao upstream (`phase-02-auth-frontend/TD-05` + `openapi-fetch` com `bodySerializer`); validação de tipo/tamanho (≤5MB, `image/*`) espelhada no cliente e prévia via `URL.createObjectURL`.
  - Formulários de edição de vídeo e de canal = `react-hook-form` + Zod (`phase-02-auth-frontend/TD-04`); erro `409 NICKNAME_ALREADY_EXISTS` mapeado ao campo `nickname` via o helper de erro existente.
  - Ações da linha do painel (publicar, visibilidade) = Route Handlers + `router.refresh()` (`phase-02-auth-frontend/TD-05/TD-06`).
  - `views`/`likes`/`comments` chegam como `0` (esclarecimento `AMB-3` do slice de backend): exibir como valor neutro; nada de contagem real até a Fase 06.
- **Pré-requisito de contrato (não é TD, é fluxo de dev).** O `nestjs-project/openapi.json` atual não contém nenhuma rota `/videos` e o `next-frontend/lib/api/types.gen.ts` só tem `/auth/*`. Antes de qualquer SI de FE: regenerar o `openapi.json` do backend, rodar `scripts/sync-openapi.sh` e `npm run openapi:types` (ver `next-frontend-openapi-typing/TD-02/TD-03`).
- **Lacuna do backend a tratar (fora deste doc).** `GET /videos/:id`, `/stream` e `/download` só exigem `status=ready` para não-donos; **não** exigem `published_at` preenchido. Na prática um vídeo `ready` ainda em rascunho editorial fica acessível por link. O `TD-05` acima especifica a regra correta para o novo endpoint de thumbnail; alinhar os endpoints existentes é uma correção de backend a agendar (Fase 05 ou hotfix).
- **Implementação esperada se as recomendações forem aceitas:** `proxy.ts` + `lib/auth/require-session.ts` (TD-01); RSCs com `searchParams` e componente de paginação (TD-02); nenhum código de cache (TD-03); `STORAGE_PUBLIC_ENDPOINT` + cliente de assinatura no backend (TD-04); endpoint `GET /videos/:id/thumbnail`, `GET /api/videos/[id]/thumbnail`, `images.localPatterns` e `updatedAt` nas respostas (TD-05); handlers MSW `videos.ts`/`channels.ts`; aliases em `lib/api/contracts.ts`.

Fontes consultadas:

- Next.js 16 (via Context7, `/vercel/next.js`): `proxy.ts`, `next/image` (`localPatterns`/`remotePatterns`), Cache Components (`cacheComponents`, `use cache`, `cacheTag`, `revalidateTag`/`updateTag`), guias de autenticação com Cache Components.
- `next-frontend/CLAUDE.md`, `.claude/rules/next-frontend-*.md` — BFF estrito, `next/image` obrigatório, contrato OpenAPI.
- Código: `next-frontend/app/layout.tsx`, `lib/auth/session.ts`, `lib/api/upstream.ts`, `lib/api/contracts.ts`; `nestjs-project/src/config/storage.config.ts`, `src/storage/storage.module.ts`, `src/videos/videos.controller.ts`.
- `docs/decisions/technical-decisions-phase-04-videos-channel.md`, `…phase-02-auth-frontend.md`, `…next-frontend-*.md`, `…phase-03-videos.md` (TD-05, TD-06).
