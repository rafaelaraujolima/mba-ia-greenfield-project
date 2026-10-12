---
subproject: frontend
runner: playwright
scope: phase-06-social-interactions
si: SI-06.20b
target_file: tests/studio-left-menu-subscriptions.e2e-spec.ts
---

# Menu lateral — canais seguidos — Test Plan

## Application Overview

O layout `(studio)/*` busca `GET /subscriptions?limit=10` no Server Component e passa a lista ao `SideNav`, substituindo o placeholder estático por até 10 canais seguidos, o mais recentemente seguido primeiro (social-interactions/TD-07). A seção "Subscriptions" é ocultada sem inscrições ou se a busca falhar, e o item "Subscriptions" leva a `/subscriptions`.

## Test Scenarios

### 1. Lista de canais seguidos no menu

**Setup:** `next-frontend/tests/fixtures.ts` (MSW network fixture auto-applied; server-side upstream faked via `instrumentation.ts`); usuário autenticado por login com credenciais de fixture (cookie `iron-session` real)

#### 1.1. menu-lista-canais-seguidos

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Usuário logado com inscrições navega para `/studio/videos`
    - expect: a SideNav exibe o título "Subscriptions" e a lista de canais seguidos (no máximo 10), o mais recente primeiro
    - expect: cada item mostra avatar e nome do canal

#### 1.2. menu-clique-leva-ao-canal

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Usuário clica em um canal da lista
    - expect: a navegação vai para `/channel/{nickname}` do canal clicado

### 2. Estados sem dados

**Setup:** `next-frontend/tests/fixtures.ts`; usuário autenticado (fixtures reservados para "sem inscrições" e "falha na busca")

#### 2.1. menu-sem-inscricoes-oculta-secao

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Usuário logado sem inscrições navega para `/studio/videos`
    - expect: o título "Subscriptions" e a lista de canais não são renderizados

#### 2.2. menu-falha-na-busca-nao-quebra-o-shell

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Usuário logado navega para `/studio/videos` quando `GET /subscriptions` falha no upstream
    - expect: o shell `(studio)` e o conteúdo da rota são renderizados normalmente
    - expect: a seção de canais seguidos não é exibida

### 3. Atalho para o feed

**Setup:** `next-frontend/tests/fixtures.ts`; usuário autenticado por login com credenciais de fixture

#### 3.1. menu-item-subscriptions-leva-ao-feed

**Covers AC:** #5
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Usuário clica no item "Subscriptions" da SideNav
    - expect: a navegação vai para `/subscriptions`
