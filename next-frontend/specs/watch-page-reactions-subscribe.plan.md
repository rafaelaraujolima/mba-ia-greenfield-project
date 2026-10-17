---
subproject: frontend
runner: playwright
scope: phase-06-social-interactions
si: SI-06.18b
target_file: tests/watch-page-reactions-subscribe.e2e-spec.ts
---

# Página de visualização do vídeo — reações e inscrição — Test Plan

## Application Overview

A rota `/watch/[id]` continua pública: o Server Component lê `GET /videos/{id}` com autenticação opcional e mostra `likeCount`, `channelSubscriberCount` e, com sessão, o `viewerState` (social-interactions/TD-06). `VideoReactionButtons` e `SubscribeButton` são ilhas Client Component com `useOptimistic` e `router.refresh()` (social-interactions/TD-08) que chamam `PUT`/`DELETE /api/videos/{id}/reaction` e `PUT`/`DELETE /api/channels/{nickname}/subscription`. O dono do canal não vê o Subscribe; visitante anônimo que tenta reagir ou se inscrever é levado a `/login?next=<caminho>`.

## Test Scenarios

### 1. Leitura pública das contagens

**Setup:** `next-frontend/tests/fixtures.ts` (MSW network fixture auto-applied; server-side upstream faked via `instrumentation.ts`; sem sessão)

#### 1.1. watch-contagens-sem-sessao

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Visitante anônimo navega para `/watch/{id}`
    - expect: a contagem de likes do vídeo (notação compacta) e a de inscritos do canal são exibidas
    - expect: nenhum redirect para `/login` ocorre

### 2. Reagir ao vídeo e inscrever-se

**Setup:** `next-frontend/tests/fixtures.ts`; usuário autenticado por login com credenciais de fixture (cookie `iron-session` real)

#### 2.1. watch-like-otimista

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Usuário logado navega para `/watch/{id}` e clica no botão de like
    - expect: o ícone passa a preenchido (`aria-pressed="true"`) e a contagem sobe imediatamente
    - expect: o navegador chama `PUT /api/videos/{id}/reaction` com `{ "type": "like" }`
  2. Usuário clica de novo no botão de like
    - expect: o ícone volta a vazado e a contagem desce
    - expect: o navegador chama `DELETE /api/videos/{id}/reaction`

#### 2.2. watch-subscribe-otimista

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Usuário logado que não segue o canal clica em "Inscrever-se"
    - expect: o botão vira "Inscrito" e a contagem de inscritos sobe imediatamente
    - expect: o navegador chama `PUT /api/channels/{nickname}/subscription`

#### 2.3. watch-dono-nao-ve-subscribe

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Dono do canal do vídeo (fixture reservado em que `viewerState.isChannelOwner` é `true`) navega para `/watch/{id}`
    - expect: o botão Subscribe não é renderizado

### 3. Visitante anônimo e falhas

**Setup:** `next-frontend/tests/fixtures.ts`

#### 3.1. watch-anonimo-redireciona-para-login

**Covers AC:** #5
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Visitante anônimo navega para `/watch/{id}` e clica em like, depois em dislike, depois em Subscribe
    - expect: cada clique leva a `/login?next=/watch/{id}`
    - expect: nenhuma chamada a `/api/videos/{id}/reaction` nem a `/api/channels/{nickname}/subscription` é feita

#### 3.2. watch-falha-reverte-estado-otimista

**Covers AC:** #6
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Usuário logado clica em Subscribe quando o upstream responde erro (fixture reservado)
    - expect: o botão volta para "Inscrever-se" e a contagem de inscritos volta ao valor anterior
    - expect: a página é reconciliada por `router.refresh()` sem recarregar a navegação
