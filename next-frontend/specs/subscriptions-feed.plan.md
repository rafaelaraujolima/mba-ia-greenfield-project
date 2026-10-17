---
subproject: frontend
runner: playwright
scope: phase-06-social-interactions
si: SI-06.20c
target_file: tests/subscriptions-feed.e2e-spec.ts
---

# Página de feed /subscriptions — Test Plan

## Application Overview

A rota `/subscriptions` (dentro do shell `(studio)`) lê `GET /subscriptions/videos` com `page`/`pageSize` de `searchParams` e renderiza os vídeos publicados dos canais seguidos com o `VideoCard` existente e a paginação por URL da Fase 04 (social-interactions/TD-07, revisão de 2026-10-08). Não há frame no Figma para esta página. Sem sessão, o guarda do `(studio)` redireciona para `/login`.

## Test Scenarios

### 1. Feed com dados

**Setup:** `next-frontend/tests/fixtures.ts` (MSW network fixture auto-applied; server-side upstream faked via `instrumentation.ts`); usuário autenticado por login com credenciais de fixture (cookie `iron-session` real)

#### 1.1. feed-lista-videos-dos-seguidos

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Usuário logado com inscrições navega para `/subscriptions`
    - expect: os vídeos dos canais seguidos são exibidos em cards, do mais recente ao mais antigo
    - expect: cada card mostra o nome do canal

#### 1.2. feed-paginacao-por-url

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Usuário navega para `/subscriptions?page=2`
    - expect: a segunda página de vídeos é exibida
    - expect: os links de paginação refletem a página atual

### 2. Estado vazio e sessão

**Setup:** `next-frontend/tests/fixtures.ts`; fixtures reservados para "sem inscrições" e "sem sessão"

#### 2.1. feed-estado-vazio

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Usuário logado sem inscrições (ou cujos canais não têm vídeos publicados) navega para `/subscriptions`
    - expect: o estado vazio em texto é exibido no lugar da lista

#### 2.2. feed-sem-sessao-redireciona-para-login

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Visitante sem sessão navega para `/subscriptions`
    - expect: é redirecionado para `/login?next=/subscriptions`

### 3. Casca do menu

**Setup:** `next-frontend/tests/fixtures.ts`; usuário autenticado por login com credenciais de fixture

#### 3.1. feed-menu-visivel-com-item-ativo

**Covers AC:** #5
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Usuário logado navega para `/subscriptions`
    - expect: o menu lateral é exibido
    - expect: o item "Subscriptions" da SideNav expõe `aria-current="page"`
