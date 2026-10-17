---
subproject: backend
runner: jest+supertest
scope: phase-06-social-interactions
si: SI-06.4
target_file: test/subscriptions-lists.e2e-spec.ts
---

# Canais seguidos e feed (GET /subscriptions, GET /subscriptions/videos) — Test Plan

## Application Overview

`GET /subscriptions` devolve os canais seguidos pelo usuário autenticado, do mais recente para o mais antigo, limitados por `limit` (o menu lateral envia `10`). `GET /subscriptions/videos` devolve o feed paginado (`page`/`pageSize`) com vídeos publicados (`ready`, `public`, `published_at` não nulo) dos canais seguidos, por `published_at DESC` (social-interactions/TD-07). Ambos exigem token válido.

## Test Scenarios

### 1. Lista de canais seguidos

**Setup:** `beforeEach` trunca as tabelas do banco de teste; sobe o módulo de teste do Nest com os filtros globais de `main.ts`; cria um usuário com token e três canais de outros usuários.

#### 1.1. subscriptions-lista-ordenada-e-limitada

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Usuário se inscreve nos três canais em sequência e chama `GET /subscriptions?limit=2`
    - expect: status `200` com `items` contendo apenas 2 canais
    - expect: o primeiro item é o canal seguido por último
    - expect: cada item traz `channelId`, `channelName`, `channelNickname` e `subscribedAt`

#### 1.2. subscriptions-lista-vazia

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Usuário sem inscrições chama `GET /subscriptions`
    - expect: status `200` com `items: []`

### 2. Feed de vídeos dos canais seguidos

**Setup:** mesmo da seção 1, com vídeos de estados variados (publicado, rascunho, não listado) nos canais seguidos e em um canal não seguido.

#### 2.1. subscriptions-feed-so-publicados-dos-seguidos

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Usuário chama `GET /subscriptions/videos`
    - expect: status `200` com `items` apenas de vídeos `ready`, `public` e publicados de canais seguidos
    - expect: itens ordenados por `published_at` decrescente
    - expect: resposta traz `page`, `pageSize` e `total`; rascunhos e vídeos de canais não seguidos ficam de fora

#### 2.2. subscriptions-feed-paginacao-invalida

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Usuário chama `GET /subscriptions/videos?page=0`
    - expect: status `400` com erro de validação

### 3. Autenticação

**Setup:** mesmo da seção 1.

#### 3.1. subscriptions-sem-token

**Covers AC:** #5
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. `GET /subscriptions` e `GET /subscriptions/videos` sem `Authorization`
    - expect: status `401` nas duas chamadas
