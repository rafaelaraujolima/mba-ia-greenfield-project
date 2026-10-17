---
subproject: frontend
runner: playwright
scope: phase-04-videos-channel-frontend
si: SI-04.30b
target_file: tests/studio-left-menu.e2e-spec.ts
---

# Menu lateral (Left Menu) — Test Plan

## Application Overview

O layout `(studio)/*` (`app/(studio)/layout.tsx`) é o guarda de rota e a casca compartilhada das telas autenticadas de gerenciamento (`/studio/videos`, `/studio/videos/[id]/edit`, `/studio/channel`). Ele chama `requireSession()` no servidor — sem sessão válida, redireciona para `/login?next=`. Com sessão, renderiza `AppShell` (TopNav + SideNav expandida + conteúdo), com o item "Your videos" marcado como ativo por prefixo de rota (`/studio/videos*`) e o hambúrguer do TopNav alternando a visibilidade da SideNav.

## Test Scenarios

### 1. Guarda de rota e casca autenticada

**Setup:** `next-frontend/tests/fixtures.ts` (MSW network fixture auto-applied; server-side upstream faked via `instrumentation.ts`, no browser `page.route()` of `/api/**`)

#### 1.1. left-menu-guarda-de-rota-sem-sessao

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-30T12:55:56Z

**Steps:**
  1. Usuário sem sessão navega para `/studio/videos`
    - expect: é redirecionado para `/login?next=/studio/videos`

#### 1.2. left-menu-casca-com-sessao

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-09-30T12:55:56Z

**Steps:**
  1. Usuário com sessão navega para `/studio/videos`
    - expect: o TopNav (logo, busca, avatar) é renderizado
    - expect: a SideNav expandida é renderizada com os itens Home, Subscriptions, Your videos, Liked videos
    - expect: o conteúdo da rota `/studio/videos` é renderizado dentro do shell

### 2. Item ativo por prefixo de rota

**Setup:** `next-frontend/tests/fixtures.ts`

#### 2.1. left-menu-item-ativo-your-videos

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-09-30T12:55:56Z

**Steps:**
  1. Usuário com sessão navega para `/studio/videos`
    - expect: o item "Your videos" da SideNav expõe `aria-current="page"`
    - expect: nenhum outro item expõe `aria-current="page"`
  2. Usuário navega para `/studio/videos/{id}/edit`
    - expect: o item "Your videos" continua com `aria-current="page"`

### 3. Alternar visibilidade da SideNav

**Setup:** `next-frontend/tests/fixtures.ts`

#### 3.1. left-menu-toggle-hamburger

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-09-30T12:55:56Z

**Steps:**
  1. Usuário com sessão navega para `/studio/videos`
    - expect: o botão hambúrguer expõe `aria-expanded="true"` e a SideNav está visível
  2. Usuário clica no hambúrguer
    - expect: a SideNav é ocultada e o botão expõe `aria-expanded="false"`
  3. Usuário clica no hambúrguer novamente
    - expect: a SideNav volta a ficar visível e `aria-expanded="true"`
