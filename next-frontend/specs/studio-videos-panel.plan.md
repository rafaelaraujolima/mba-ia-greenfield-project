---
subproject: frontend
runner: playwright
scope: phase-04-videos-channel-frontend
si: SI-04.32b
target_file: tests/studio-videos-panel.e2e-spec.ts
---

# Painel de gerenciamento de vídeos — Test Plan

## Application Overview

A rota `/studio/videos` é um RSC async que carrega, com o `channelId` da sessão (via `authed-upstream`), a listagem paginada de vídeos do canal (`GET /channels/{id}/manage/videos`) e renderiza cada item como `VideoListRow` com thumbnail, título, contadores e status. A paginação é por URL (`?page=N`); a thumbnail é servida pelo BFF via redirect (`GET /api/videos/[id]/thumbnail`). Clicar em uma linha navega para a edição do vídeo. A rota exige sessão (herdada do layout `(studio)`).

## Test Scenarios

### 1. Listar vídeos paginados do canal

**Setup:** `next-frontend/tests/fixtures.ts` (MSW network fixture auto-applied; server-side upstream faked via `instrumentation.ts`)

#### 1.1. painel-lista-videos-com-total

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-30T12:55:56Z

**Steps:**
  1. Usuário com sessão navega para `/studio/videos`
    - expect: as linhas retornadas por `GET /channels/{id}/manage/videos` são renderizadas com thumbnail, título e contadores
    - expect: a contagem "N videos" reflete o `total` da resposta

#### 1.2. painel-thumbnail-via-redirect-bff

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-09-30T12:55:56Z

**Steps:**
  1. Usuário com sessão navega para `/studio/videos`
    - expect: a imagem de thumbnail de cada linha aponta para `/api/videos/{id}/thumbnail?v={updatedAt}`
    - expect: a imagem carrega com sucesso (o BFF repassa o `302` do upstream)

### 2. Navegar entre páginas

**Setup:** `next-frontend/tests/fixtures.ts` (fixture com `total` > `pageSize`)

#### 2.1. painel-paginacao-por-url

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-09-30T12:55:56Z

**Steps:**
  1. Usuário com sessão navega para `/studio/videos` e clica no link da página 2
    - expect: a URL passa a `?page=2` e a requisição ao upstream usa `page=2`
    - expect: o link da página 2 expõe `aria-current="page"`

### 3. Abrir a edição de um vídeo a partir da linha

**Setup:** `next-frontend/tests/fixtures.ts`

#### 3.1. painel-linha-navega-para-edicao

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-09-30T12:55:56Z

**Steps:**
  1. Usuário com sessão clica em uma linha do painel
    - expect: navega para `/studio/videos/{id}/edit`

### 4. Guarda de rota

**Setup:** `next-frontend/tests/fixtures.ts`

#### 4.1. painel-guarda-de-rota-sem-sessao

**Covers AC:** #5
**Source:** auto
**Last sync:** 2026-09-30T12:55:56Z

**Steps:**
  1. Usuário sem sessão navega para `/studio/videos`
    - expect: é redirecionado para `/login?next=/studio/videos`
