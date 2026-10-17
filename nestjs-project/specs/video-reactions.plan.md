---
subproject: backend
runner: jest+supertest
scope: phase-06-social-interactions
si: SI-06.6
target_file: test/video-reactions.e2e-spec.ts
---

# Reações em vídeos (PUT/DELETE /videos/{id}/reaction) — Test Plan

## Application Overview

`PUT /videos/{id}/reaction` define a reação do usuário autenticado a um vídeo (`like` ou `dislike`, corpo `{ type }`), com no máximo uma reação por usuário e vídeo; trocar o `type` substitui a reação. `DELETE /videos/{id}/reaction` a remove. Ambos são idempotentes e respondem `204` (social-interactions/TD-03). Vídeo inexistente ou não visível devolve `404 VIDEO_NOT_FOUND`.

## Test Scenarios

### 1. Definir e trocar a reação

**Setup:** `beforeEach` trunca as tabelas do banco de teste; sobe o módulo de teste do Nest com os filtros globais de `main.ts`; cria um vídeo `ready`, `public` e publicado e um usuário com token.

#### 1.1. reacao-like-cria-registro-unico

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. `PUT /videos/{id}/reaction` com `{ "type": "like" }` e token válido
    - expect: status `204`
    - expect: existe exatamente uma linha em `video_reactions` para (usuário, vídeo) com `type = like`

#### 1.2. reacao-dislike-troca-a-existente

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. `PUT` com `like` e, em seguida, `PUT` com `{ "type": "dislike" }`
    - expect: as duas respostas são `204`
    - expect: continua uma única linha em `video_reactions` para (usuário, vídeo), agora com `type = dislike`

### 2. Remover a reação

**Setup:** mesmo da seção 1.

#### 2.1. reacao-delete-idempotente

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Cria uma reação e chama `DELETE /videos/{id}/reaction`
    - expect: status `204` e a linha some de `video_reactions`
  2. Chama `DELETE /videos/{id}/reaction` de novo
    - expect: status `204`

### 3. Erros

**Setup:** mesmo da seção 1.

#### 3.1. reacao-tipo-invalido

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. `PUT /videos/{id}/reaction` com `{}` e com `{ "type": "love" }`
    - expect: status `400` com erro de validação nas duas chamadas

#### 3.2. reacao-video-inexistente-ou-invisivel

**Covers AC:** #5
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. `PUT /videos/{uuid-inexistente}/reaction` e `PUT` em um vídeo rascunho de outro canal, com token válido
    - expect: status `404` com `error: "VIDEO_NOT_FOUND"` nas duas chamadas

#### 3.3. reacao-sem-token

**Covers AC:** #5
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. `PUT` e `DELETE /videos/{id}/reaction` sem `Authorization`
    - expect: status `401` nas duas chamadas
