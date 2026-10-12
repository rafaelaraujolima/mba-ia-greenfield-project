---
subproject: backend
runner: jest+supertest
scope: phase-06-social-interactions
si: SI-06.9
target_file: test/comments-create.e2e-spec.ts
---

# Criação de comentários (POST /videos/{id}/comments) — Test Plan

## Application Overview

`POST /videos/{id}/comments` cria um comentário de topo ou, com `parentId`, uma resposta (profundidade máxima 2, social-interactions/TD-04); o corpo é texto puro e não pode ser vazio após `trim` (social-interactions/TD-09). A rota exige token válido e devolve `201` com o `CommentItem` criado.

## Test Scenarios

### 1. Criar comentário e resposta

**Setup:** `beforeEach` trunca as tabelas do banco de teste; sobe o módulo de teste do Nest com os filtros globais de `main.ts`; cria um vídeo `ready`, `public` e publicado, um usuário com canal e token.

#### 1.1. comentario-de-topo-criado

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. `POST /videos/{id}/comments` com `{ "body": "texto" }` e token válido
    - expect: status `201`
    - expect: resposta com `id`, `parentId: null`, `body: "texto"`, `author` (`channelName`, `channelNickname`), `likeCount: 0` e `replyCount: 0`

#### 1.2. resposta-a-comentario-de-topo

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Cria um comentário de topo e `POST /videos/{id}/comments` com `{ "body": "resposta", "parentId": "<id do topo>" }`
    - expect: status `201` com `parentId` igual ao id do comentário de topo

#### 1.3. resposta-profundidade-excedida-e-pai-invalido

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. `POST` com `parentId` de uma resposta
    - expect: status `400` com `error: "COMMENT_DEPTH_EXCEEDED"`
  2. `POST` com `parentId` inexistente e com `parentId` de comentário de outro vídeo
    - expect: status `404` com `error: "COMMENT_NOT_FOUND"` nas duas chamadas

### 2. Validação e erros

**Setup:** mesmo da seção 1.

#### 2.1. comentario-corpo-vazio

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. `POST /videos/{id}/comments` com `{ "body": "" }` e com `{ "body": "   " }`
    - expect: status `400` com erro de validação nas duas chamadas
    - expect: nenhum comentário criado

#### 2.2. comentario-video-inexistente-ou-invisivel

**Covers AC:** #5
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. `POST /videos/{uuid-inexistente}/comments` e em um vídeo rascunho de outro canal, com token válido
    - expect: status `404` com `error: "VIDEO_NOT_FOUND"` nas duas chamadas

#### 2.3. comentario-sem-token

**Covers AC:** #5
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. `POST /videos/{id}/comments` sem `Authorization`
    - expect: status `401`
