---
subproject: frontend
runner: playwright
scope: phase-06-social-interactions
si: SI-06.19b
target_file: tests/channel-page-subscribe.e2e-spec.ts
---

# Página pública do canal — inscrição e contagem — Test Plan

## Application Overview

A rota `/channel/[nickname]` continua pública: o Server Component lê `GET /channels/{nickname}` com autenticação opcional e `ChannelHeader` exibe `subscriberCount` em notação compacta e, para quem tem sessão, o `SubscribeButton` (social-interactions/TD-06, social-interactions/TD-08). O botão chama `PUT`/`DELETE /api/channels/{nickname}/subscription` de forma otimista; fica oculto para o dono do canal e leva visitantes anônimos a `/login?next=<caminho>`.

## Test Scenarios

### 1. Contagem pública de inscritos

**Setup:** `next-frontend/tests/fixtures.ts` (MSW network fixture auto-applied; server-side upstream faked via `instrumentation.ts`; sem sessão)

#### 1.1. canal-contagem-sem-sessao

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Visitante anônimo navega para `/channel/{nickname}`
    - expect: a contagem de inscritos é exibida em notação compacta na linha de meta do cabeçalho
    - expect: nenhum redirect para `/login` ocorre

### 2. Inscrever-se e cancelar

**Setup:** `next-frontend/tests/fixtures.ts`; usuário autenticado por login com credenciais de fixture (cookie `iron-session` real)

#### 2.1. canal-subscribe-otimista

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Usuário logado que não segue o canal clica em "Inscrever-se"
    - expect: o botão vira "Inscrito" e a contagem de inscritos sobe imediatamente
    - expect: o navegador chama `PUT /api/channels/{nickname}/subscription`

#### 2.2. canal-unsubscribe-otimista

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Usuário logado que já segue o canal clica em "Inscrito"
    - expect: o botão volta a "Inscrever-se" e a contagem desce imediatamente
    - expect: o navegador chama `DELETE /api/channels/{nickname}/subscription`

#### 2.3. canal-dono-nao-ve-subscribe

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Dono do canal (nickname reservado `own-channel`) navega para a própria página
    - expect: o botão Subscribe não é renderizado

### 3. Visitante anônimo

**Setup:** `next-frontend/tests/fixtures.ts`

#### 3.1. canal-anonimo-redireciona-para-login

**Covers AC:** #5
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Visitante anônimo navega para `/channel/{nickname}` e clica em "Inscrever-se"
    - expect: é levado a `/login?next=/channel/{nickname}`
    - expect: nenhuma chamada a `/api/channels/{nickname}/subscription` é feita
