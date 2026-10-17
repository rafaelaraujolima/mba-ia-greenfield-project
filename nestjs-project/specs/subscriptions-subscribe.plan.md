---
subproject: backend
runner: jest+supertest
scope: phase-06-social-interactions
si: SI-06.3
target_file: test/subscriptions-subscribe.e2e-spec.ts
---

# Inscrição em canais (PUT/DELETE /channels/{nickname}/subscription) — Test Plan

## Application Overview

`PUT /channels/{nickname}/subscription` inscreve o usuário autenticado no canal e `DELETE` cancela a inscrição; ambos são sub-recursos idempotentes que respondem `204` (social-interactions/TD-03). O dono do canal não pode se inscrever no próprio canal (`CANNOT_SUBSCRIBE_OWN_CHANNEL`, 403) e as duas rotas exigem token válido. Canal inexistente devolve `404 CHANNEL_NOT_FOUND`.

## Test Scenarios

### 1. Inscrever-se e cancelar a inscrição

**Setup:** `beforeEach` trunca as tabelas do banco de teste; sobe o módulo de teste do Nest com os filtros globais de `main.ts`; cria dois usuários com canal (inscrito e dono) e obtém o token do inscrito.

#### 1.1. subscribe-cria-inscricao

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. `PUT /channels/{nickname-do-dono}/subscription` com o token do outro usuário
    - expect: status `204` sem corpo
    - expect: existe exatamente uma linha em `subscriptions` para (usuário, canal)

#### 1.2. subscribe-idempotente

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. `PUT /channels/{nickname}/subscription` duas vezes seguidas com o mesmo token
    - expect: as duas respostas são `204`
    - expect: continua existindo uma única linha em `subscriptions` para (usuário, canal)

#### 1.3. subscribe-canal-proprio-proibido

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. `PUT /channels/{nickname-do-proprio-usuario}/subscription` com o token do dono do canal
    - expect: status `403` com `error: "CANNOT_SUBSCRIBE_OWN_CHANNEL"`
    - expect: nenhuma linha criada em `subscriptions`

#### 1.4. unsubscribe-remove-e-e-idempotente

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Cria a inscrição e chama `DELETE /channels/{nickname}/subscription`
    - expect: status `204` e a linha some de `subscriptions`
  2. Chama `DELETE /channels/{nickname}/subscription` de novo, sem inscrição existente
    - expect: status `204`

### 2. Erros de canal e de autenticação

**Setup:** mesmo da seção 1.

#### 2.1. subscribe-canal-inexistente

**Covers AC:** #5
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. `PUT /channels/nao-existe/subscription` e `DELETE /channels/nao-existe/subscription` com token válido
    - expect: status `404` com `error: "CHANNEL_NOT_FOUND"` nas duas chamadas

#### 2.2. subscribe-sem-token

**Covers AC:** #5
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. `PUT /channels/{nickname}/subscription` e `DELETE /channels/{nickname}/subscription` sem `Authorization`
    - expect: status `401` nas duas chamadas
