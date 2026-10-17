---
subproject: frontend
runner: playwright
scope: phase-06-social-interactions
si: SI-06.18c
target_file: tests/watch-page-comments.e2e-spec.ts
---

# Página de visualização do vídeo — comentários — Test Plan

## Application Overview

A seção de comentários de `/watch/[id]` mostra o total e a primeira página lidos pelo Server Component com autenticação opcional (`GET /videos/{id}/comments`); o "carregar mais" usa `GET /api/videos/{id}/comments?cursor=...` (social-interactions/TD-05). Usuários logados comentam e respondem por `POST /api/videos/{id}/comments` (resposta com `parentId`, profundidade máxima 2, social-interactions/TD-04), reagem por `PUT`/`DELETE /api/comments/{id}/reaction` e o corpo é texto puro (social-interactions/TD-09). A ordenação exibida é o rótulo estático "Mais recentes".

## Test Scenarios

### 1. Leitura pública dos comentários

**Setup:** `next-frontend/tests/fixtures.ts` (MSW network fixture auto-applied; server-side upstream faked via `instrumentation.ts`; sem sessão)

#### 1.1. comentarios-primeira-pagina-sem-sessao

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Visitante anônimo navega para `/watch/{id}`
    - expect: o total de comentários é exibido em um heading, com separador de milhar
    - expect: a primeira página de comentários é exibida com a contagem de likes de cada um
    - expect: nenhum redirect para `/login` ocorre

#### 1.2. comentarios-carregar-mais

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Visitante clica em "carregar mais"
    - expect: o navegador chama `GET /api/videos/{id}/comments?cursor=<nextCursor>`
    - expect: os itens seguintes são acrescentados sem repetir os já exibidos
    - expect: na última página o botão "carregar mais" não é exibido

### 2. Comentar, responder e reagir

**Setup:** `next-frontend/tests/fixtures.ts`; usuário autenticado por login com credenciais de fixture (cookie `iron-session` real)

#### 2.1. comentarios-enviar-e-validar-corpo-vazio

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Usuário logado digita um texto no campo "Add a comment..." e envia
    - expect: o navegador chama `POST /api/videos/{id}/comments` com `{ "body": "<texto>" }`
    - expect: o novo comentário aparece no topo da lista
  2. Usuário tenta enviar o campo vazio ou só com espaços
    - expect: o envio é bloqueado antes da chamada à API

#### 2.2. comentarios-responder-e-ver-respostas

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Usuário logado clica em Reply num comentário de topo e envia um texto
    - expect: o formulário inline abre abaixo do comentário
    - expect: o navegador chama `POST /api/videos/{id}/comments` com `parentId` do comentário de topo
  2. Usuário expande "Ver N respostas"
    - expect: o navegador chama `GET /api/comments/{id}/replies` e as respostas aparecem recuadas
    - expect: as respostas não exibem botão Reply

#### 2.3. comentarios-texto-escapado

**Covers AC:** #5
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Usuário abre um vídeo cujo comentário contém marcação HTML (fixture reservado)
    - expect: o texto aparece literalmente, sem elementos HTML criados a partir dele

#### 2.4. comentarios-reacao-otimista-e-anonimo

**Covers AC:** #6
**Source:** auto
**Last sync:** 2026-10-09T20:04:34Z

**Steps:**
  1. Usuário logado clica no like de um comentário
    - expect: ícone preenchido e contagem sobem imediatamente
    - expect: o navegador chama `PUT /api/comments/{id}/reaction`
  2. Visitante anônimo clica no like ou dislike de um comentário
    - expect: é levado a `/login?next=/watch/{id}` sem chamada à API
