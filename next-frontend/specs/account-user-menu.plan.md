---
subproject: frontend
runner: playwright
scope: phase-04-videos-channel-frontend
si: SI-04.31b
target_file: tests/account-user-menu.e2e-spec.ts
---

# Menu de conta do usuário (Account User Menu) — Test Plan

## Application Overview

O menu de conta é um drawer de 320px acionado pelo avatar do TopNav, presente em todas as rotas `(studio)/*`. Sua identidade vem inteiramente da sessão (`SessionProvider`, sem fetch): mostra `@{channelSlug}` e o e-mail do usuário, com avatar de fallback por iniciais. O único item de navegação é "Edit Channel", que leva a `/studio/channel`. O item "Sign Out" foi omitido por decisão do produto (Logout adiado).

## Test Scenarios

### 1. Abrir o menu e ver a identidade da sessão

**Setup:** `next-frontend/tests/fixtures.ts` (MSW network fixture auto-applied; sessão de teste com `channelSlug` e `email` conhecidos)

#### 1.1. account-menu-abre-com-identidade-da-sessao

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-30T12:55:56Z

**Steps:**
  1. Usuário com sessão (`channelSlug: "techmaster"`, `email: "a@b.com"`) navega para `/studio/videos` e clica no avatar do TopNav
    - expect: o painel "Account" abre com `role="dialog"` e `aria-modal="true"`
    - expect: o painel exibe `@techmaster` e `a@b.com`
    - expect: nenhuma requisição de rede é disparada ao abrir o menu

### 2. Navegar para a edição de canal

**Setup:** `next-frontend/tests/fixtures.ts`

#### 2.1. account-menu-edit-channel-navega

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-09-30T12:55:56Z

**Steps:**
  1. Usuário abre o menu de conta e clica em "Edit Channel"
    - expect: navega para `/studio/channel`
    - expect: o menu de conta fecha

### 3. Fechar o menu

**Setup:** `next-frontend/tests/fixtures.ts`

#### 3.1. account-menu-fecha-e-devolve-foco

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-09-30T12:55:56Z

**Steps:**
  1. Usuário abre o menu de conta e pressiona Esc
    - expect: o painel fecha
    - expect: o foco retorna ao avatar (gatilho)
  2. Usuário reabre o menu e clica no backdrop
    - expect: o painel fecha da mesma forma
