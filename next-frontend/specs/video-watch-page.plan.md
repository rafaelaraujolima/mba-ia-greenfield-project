---
subproject: frontend
runner: playwright
scope: phase-05-video-watch-page
si: SI-05.5b
target_file: tests/video-watch-page.e2e-spec.ts
---

# Página de visualização do vídeo — Test Plan

## Application Overview

A rota `/watch/[id]` é pública (anônima) e renderiza o player de vídeo, informações do canal/data/descrição/contagem de visualizações e uma sidebar de sugestões (`VideoCard` reutilizado) a partir de `GET /videos/:id` e `GET /api/videos/[id]/suggestions`. Não usa `requireSession()` e não é cacheada (video-watch-page/TD-04, TD-06). Vídeo inexistente ou não visível anonimamente (rascunho/privado) renderiza not-found (video-watch-page/TD-08). O botão de download aponta para `GET /api/videos/[id]/download`; a descrição usa `<details>`/`<summary>` nativo para expandir/recolher (video-watch-page/TD-05); a sidebar permite refiltrar localmente por chip de categoria/canal.

## Test Scenarios

### 1. Ver a página de visualização do vídeo

**Setup:** `next-frontend/tests/fixtures.ts` (MSW network fixture auto-applied; server-side upstream faked via `instrumentation.ts`; sem sessão)

#### 1.1. video-watch-player-e-informacoes-sem-sessao

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-10-05T00:48:51Z

**Steps:**
  1. Visitante anônimo navega para `/watch/{id}`
    - expect: o player de vídeo (`<video>`) é renderizado
    - expect: nome do canal, data de publicação, contagem de visualizações e descrição são exibidos
    - expect: a sidebar de sugestões é renderizada com vídeos da mesma categoria
    - expect: nenhum redirect para `/login` ocorre

### 2. Vídeo não encontrado ou não visível

**Setup:** `next-frontend/tests/fixtures.ts`

#### 2.1. video-watch-not-found

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-10-05T00:48:51Z

**Steps:**
  1. Visitante navega para `/watch/{id-inexistente-ou-nao-visivel-anonimamente}`
    - expect: a página not-found é exibida

### 3. Disparar download

**Setup:** `next-frontend/tests/fixtures.ts`

#### 3.1. video-watch-download-link

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-10-05T00:48:51Z

**Steps:**
  1. Visitante localiza o controle de download na página
    - expect: o link/ação de download aponta para `/api/videos/{id}/download`

### 4. Expandir a descrição

**Setup:** `next-frontend/tests/fixtures.ts`

#### 4.1. video-watch-description-expand

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-10-05T00:48:51Z

**Steps:**
  1. Visitante clica em "ver mais" na descrição
    - expect: o elemento `<details>` expande revelando a descrição completa, sem requisição de rede adicional

### 5. Filtrar sugestões por chip

**Setup:** `next-frontend/tests/fixtures.ts` (fixture com vídeos de múltiplas categorias/canais)

#### 5.1. video-watch-suggestions-filter

**Covers AC:** #5
**Source:** auto
**Last sync:** 2026-10-05T00:48:51Z

**Steps:**
  1. Visitante clica em um chip da `TabMenu`
    - expect: a lista de `VideoCard` na sidebar é refiltrada localmente pelo critério do chip selecionado, sem nova navegação de página
