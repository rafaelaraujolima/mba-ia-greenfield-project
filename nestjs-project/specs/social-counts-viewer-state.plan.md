---
subproject: backend
runner: jest+supertest
scope: phase-06-social-interactions
si: SI-06.11
target_file: test/social-counts-viewer-state.e2e-spec.ts
---

# Contagens e viewerState em vídeo, canal e painel de gestão — Test Plan

## Application Overview

`GET /videos/{id}` passa a devolver `likeCount`, `channelSubscriberCount` e `viewerState`; `GET /channels/{nickname}` devolve `subscriberCount` e `viewerState`; `GET /channels/{id}/manage/videos` troca os placeholders `likes`/`comments` por contagens reais (social-interactions/TD-02, social-interactions/TD-06). `viewerState` só vem preenchido com token válido; token ausente ou expirado devolve `200` anônimo com `viewerState: null`.

## Test Scenarios

### 1. Vídeo

**Setup:** `beforeEach` trunca as tabelas do banco de teste; sobe o módulo de teste do Nest com os filtros globais de `main.ts`; cria um canal com vídeo publicado, inscritos, reações `like` e comentários, e usuários (espectador, dono do canal) com tokens, mais um token expirado.

#### 1.1. video-contagens-anonimo

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. `GET /videos/{id}` sem `Authorization`
    - expect: status `200` com `likeCount` e `channelSubscriberCount` iguais às quantidades gravadas
    - expect: `viewerState: null`

#### 1.2. video-viewer-state-espectador-e-dono

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. `GET /videos/{id}` com o token do espectador que deu `like` e é inscrito
    - expect: `viewerState` igual a `{ reaction: "like", subscribed: true, isChannelOwner: false }`
  2. `GET /videos/{id}` com o token do dono do canal
    - expect: `viewerState.isChannelOwner` é `true`

#### 1.3. video-token-expirado-vira-anonimo

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. `GET /videos/{id}` com token expirado
    - expect: status `200` com `viewerState: null`

### 2. Canal e painel de gestão

**Setup:** mesmo da seção 1.

#### 2.1. canal-subscriber-count-e-viewer-state

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. `GET /channels/{nickname}` sem token e com o token de um inscrito
    - expect: `subscriberCount` igual ao número de inscrições do canal nas duas chamadas
    - expect: `viewerState: null` sem token e `{ subscribed: true, isChannelOwner: false }` com o token do inscrito

#### 2.2. painel-contagens-reais

**Covers AC:** #5
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. `GET /channels/{id}/manage/videos` com o token do dono
    - expect: cada item traz `likes` e `comments` iguais às contagens reais do vídeo (zero para vídeos sem interação)
    - expect: `views` mantém o valor anterior
