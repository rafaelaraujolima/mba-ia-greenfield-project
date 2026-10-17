---
subproject: backend
runner: jest+supertest
scope: phase-06-social-interactions
si: SI-06.7
target_file: test/comment-reactions.e2e-spec.ts
---

# Reações em comentários (PUT/DELETE /comments/{id}/reaction) — Test Plan

## Application Overview

`PUT /comments/{id}/reaction` define a reação do usuário autenticado a um comentário (`like` ou `dislike`, corpo `{ type }`), com no máximo uma reação por usuário e comentário; `DELETE /comments/{id}/reaction` a remove. Ambos são idempotentes e respondem `204` (social-interactions/TD-03). Comentário inexistente devolve `404 COMMENT_NOT_FOUND`.

## Test Scenarios

### 1. Definir, trocar e remover a reação

**Setup:** `beforeEach` trunca as tabelas do banco de teste; sobe o módulo de teste do Nest com os filtros globais de `main.ts`; cria um vídeo publicado, um comentário de topo e um usuário com token.

#### 1.1. reacao-comentario-like-cria-registro-unico

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. `PUT /comments/{id}/reaction` com `{ "type": "like" }` e token válido
    - expect: status `204`
    - expect: existe exatamente uma linha em `comment_reactions` para (usuário, comentário) com `type = like`

#### 1.2. reacao-comentario-dislike-troca-a-existente

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. `PUT` com `like` e, em seguida, `PUT` com `{ "type": "dislike" }`
    - expect: as duas respostas são `204`
    - expect: continua uma única linha para (usuário, comentário), agora com `type = dislike`

#### 1.3. reacao-comentario-delete-idempotente

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Cria uma reação e chama `DELETE /comments/{id}/reaction`
    - expect: status `204` e a linha some de `comment_reactions`
  2. Chama `DELETE /comments/{id}/reaction` de novo
    - expect: status `204`

### 2. Erros

**Setup:** mesmo da seção 1.

#### 2.1. reacao-comentario-inexistente

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. `PUT` e `DELETE /comments/{uuid-inexistente}/reaction` com token válido
    - expect: status `404` com `error: "COMMENT_NOT_FOUND"` nas duas chamadas

#### 2.2. reacao-comentario-tipo-invalido

**Covers AC:** #5
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. `PUT /comments/{id}/reaction` com `{ "type": "love" }`
    - expect: status `400` com erro de validação

#### 2.3. reacao-comentario-sem-token

**Covers AC:** #5
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. `PUT` e `DELETE /comments/{id}/reaction` sem `Authorization`
    - expect: status `401` nas duas chamadas
