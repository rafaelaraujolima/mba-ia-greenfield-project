---
subproject: frontend
runner: playwright
scope: phase-04-videos-channel-frontend
si: SI-04.35b
target_file: tests/public-channel-page.e2e-spec.ts
---

# Página pública do canal — Test Plan

## Application Overview

A rota `/channel/[nickname]` é pública (anônima) e renderiza `ChannelHeader` (nome, nickname, descrição) e uma listagem paginada de `VideoCard` a partir de `GET /channels/{nickname}` e `GET /channels/{nickname}/videos`. Cada card linka para `/watch/[id]` (404 até a Fase 05). Não usa `requireSession()` e não é cacheada.

## Test Scenarios

### 1. Ver a página pública do canal

**Setup:** `next-frontend/tests/fixtures.ts` (MSW network fixture auto-applied; server-side upstream faked via `instrumentation.ts`; sem sessão)

#### 1.1. public-channel-header-e-lista-sem-sessao

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-30T12:55:56Z

**Steps:**
  1. Visitante anônimo navega para `/channel/{nickname}`
    - expect: o nome do canal é renderizado em um `<h1>`, com nickname e descrição
    - expect: os vídeos públicos publicados do canal são renderizados em cards
    - expect: nenhum redirect para `/login` ocorre

#### 1.2. public-channel-card-link-unico

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-09-30T12:55:56Z

**Steps:**
  1. Visitante clica em um `VideoCard`
    - expect: navega para `/watch/{id}` através de um único link cujo nome acessível é o título do vídeo

### 2. Navegar entre páginas

**Setup:** `next-frontend/tests/fixtures.ts` (fixture com `total` > `pageSize`)

#### 2.1. public-channel-paginacao-por-url

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-09-30T12:55:56Z

**Steps:**
  1. Visitante clica no link da página 2
    - expect: a URL passa a `?page=2` e a requisição ao upstream usa `page=2`
    - expect: o link da página 2 expõe `aria-current="page"`

### 3. Canal inexistente

**Setup:** `next-frontend/tests/fixtures.ts`

#### 3.1. public-channel-not-found

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-09-30T12:55:56Z

**Steps:**
  1. Visitante navega para `/channel/inexistente`
    - expect: a página not-found é exibida
