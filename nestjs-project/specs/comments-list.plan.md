---
subproject: backend
runner: jest+supertest
scope: phase-06-social-interactions
si: SI-06.10
target_file: test/comments-list.e2e-spec.ts
---

# Listagem de comentários e respostas (GET /videos/{id}/comments, GET /comments/{id}/replies) — Test Plan

## Application Overview

`GET /videos/{id}/comments` lista os comentários de topo, mais recentes primeiro, paginados por cursor opaco (`cursor`/`limit`, `nextCursor`, `totalCount`); `GET /comments/{id}/replies` lista as respostas de um comentário de topo com a mesma paginação (social-interactions/TD-05). Ambas as rotas são públicas com autenticação opcional: token válido popula `viewerState`; token ausente, inválido ou expirado devolve `200` anônimo com `viewerState: null` (social-interactions/TD-06).

## Test Scenarios

### 1. Leitura anônima e autenticada

**Setup:** `beforeEach` trunca as tabelas do banco de teste; sobe o módulo de teste do Nest com os filtros globais de `main.ts`; cria um vídeo publicado com vários comentários de topo, respostas, uma reação `like` do usuário de teste e um token válido e um expirado.

#### 1.1. comentarios-leitura-anonima

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. `GET /videos/{id}/comments` sem `Authorization`
    - expect: status `200` com `items` dos comentários de topo do mais recente ao mais antigo
    - expect: `nextCursor`, `totalCount` e `viewerState: null` em todos os itens

#### 1.2. comentarios-leitura-com-viewer-state

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. `GET /videos/{id}/comments` com token válido do usuário que deu `like` em um comentário
    - expect: o item reagido traz `viewerState.reaction = "like"`
    - expect: os demais itens trazem `viewerState.reaction = null`

#### 1.3. comentarios-token-expirado-vira-anonimo

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. `GET /videos/{id}/comments` com token expirado
    - expect: status `200` (sem `401`) com `viewerState: null` em todos os itens

### 2. Paginação por cursor

**Setup:** mesmo da seção 1, com mais comentários de topo do que o tamanho de uma página.

#### 2.1. comentarios-paginacao-por-cursor

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Lê a primeira página e segue `GET /videos/{id}/comments?cursor=<nextCursor>` até o fim
    - expect: nenhum item se repete entre as páginas
    - expect: `nextCursor` é `null` na última página
  2. `GET /videos/{id}/comments?cursor=lixo`
    - expect: status `400` com `error: "INVALID_CURSOR"`

### 3. Respostas

**Setup:** mesmo da seção 1.

#### 3.1. respostas-de-comentario-de-topo

**Covers AC:** #5
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. `GET /comments/{id-do-topo}/replies`
    - expect: status `200` com `items` cujo `parentId` é o id do comentário de topo e `nextCursor`

#### 3.2. respostas-comentario-inexistente-ou-resposta

**Covers AC:** #5
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. `GET /comments/{uuid-inexistente}/replies` e `GET /comments/{id-de-uma-resposta}/replies`
    - expect: status `404` com `error: "COMMENT_NOT_FOUND"` nas duas chamadas
