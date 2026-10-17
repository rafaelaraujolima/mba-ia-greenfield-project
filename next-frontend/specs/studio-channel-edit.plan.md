---
subproject: frontend
runner: playwright
scope: phase-04-videos-channel-frontend
si: SI-04.34b
target_file: tests/studio-channel-edit.e2e-spec.ts
---

# Tela de edição do canal — Test Plan

## Application Overview

A rota `/studio/channel` é um RSC que carrega o canal do usuário logado (`GET /channels/me`) e renderiza `ChannelSummary` (nome + handle) e `ChannelSettingsForm` (Client Component, react-hook-form + Zod) com os campos handle (nickname), display name (nome) e description. Salvar dispara `PATCH /api/channels/[id]`; se o nickname mudar, o BFF regrava `channelSlug` na sessão. O erro `NICKNAME_ALREADY_EXISTS` é mapeado para erro inline no campo handle.

## Test Scenarios

### 1. Carregar e salvar informações do canal

**Setup:** `next-frontend/tests/fixtures.ts` (MSW network fixture auto-applied; server-side upstream faked via `instrumentation.ts`)

#### 1.1. channel-edit-pre-preenchido-e-salvo

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-30T12:55:56Z

**Steps:**
  1. Usuário com sessão navega para `/studio/channel`
    - expect: os campos handle, nome e descrição vêm pré-preenchidos com os dados de `GET /channels/me`
  2. Usuário edita nome e descrição e clica em "Save Changes"
    - expect: `PATCH /api/channels/{id}` é disparado com os valores editados
    - expect: "Last updated" reflete o novo `updatedAt` após o salvamento

### 2. Nickname já em uso

**Setup:** `next-frontend/tests/fixtures.ts` (fixture retorna `409 NICKNAME_ALREADY_EXISTS` para um nickname reservado)

#### 2.1. channel-edit-nickname-ja-em-uso

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-09-30T12:55:56Z

**Steps:**
  1. Usuário troca o "Channel handle" para um nickname já em uso e salva
    - expect: um erro inline aparece no campo "Channel handle" com `aria-invalid="true"`
    - expect: nenhuma navegação ou mudança de sessão ocorre

### 3. Trocar o nickname atualiza a sessão

**Setup:** `next-frontend/tests/fixtures.ts`

#### 3.1. channel-edit-troca-nickname-atualiza-sessao

**Covers AC:** #4
**Source:** auto
**Last sync:** 2026-09-30T12:55:56Z

**Steps:**
  1. Usuário troca o "Channel handle" para um nickname disponível e salva com sucesso
    - expect: a sessão passa a conter o novo `channelSlug`
    - expect: o menu de conta (avatar) passa a exibir `@{novo nickname}`
