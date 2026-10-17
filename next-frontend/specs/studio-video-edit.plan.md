---
subproject: frontend
runner: playwright
scope: phase-04-videos-channel-frontend
si: SI-04.33b
target_file: tests/studio-video-edit.e2e-spec.ts
---

# Tela de edição de vídeo — Test Plan

## Application Overview

A rota `/studio/videos/[id]/edit` é um RSC que carrega o vídeo (`GET /videos/{id}`, enriquecido com descrição/categoria/visibilidade/status) e as categorias (`GET /categories`), renderizando `VideoEditForm` (Client Component, react-hook-form + Zod). Salvar dispara `PATCH /api/videos/[id]` e, se houver arquivo escolhido, `POST /api/videos/[id]/thumbnail`; Publicar dispara `POST /api/videos/[id]/publish`, habilitado só quando o vídeo está `ready` e ainda não publicado. Erros de contrato (categoria inexistente, arquivo inválido, estado de publicação inválido) são mapeados para feedback inline.

## Test Scenarios

### 1. Editar e salvar informações do vídeo

**Setup:** `next-frontend/tests/fixtures.ts` (MSW network fixture auto-applied; server-side upstream faked via `instrumentation.ts`)

#### 1.1. video-edit-salvar-titulo-descricao-categoria

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-30T12:55:56Z

**Steps:**
  1. Usuário com sessão navega para `/studio/videos/{id}/edit`
    - expect: os campos vêm pré-preenchidos com os dados atuais do vídeo
  2. Usuário edita título e descrição e clica em "Save Changes"
    - expect: `PATCH /api/videos/{id}` é disparado com os valores editados
    - expect: o botão fica desabilitado durante o envio e a página reflete os novos valores após `router.refresh()`

#### 1.2. video-edit-thumbnail-enviada-no-save

**Covers AC:** #1
**Source:** auto
**Last sync:** 2026-09-30T12:55:56Z

**Steps:**
  1. Usuário escolhe um novo arquivo de thumbnail (imagem válida) e clica em "Save Changes"
    - expect: `PATCH /api/videos/{id}` e, em seguida, `POST /api/videos/{id}/thumbnail` são disparados
    - expect: a thumbnail exibida reflete o novo arquivo após o salvamento

### 2. Erro de upload de thumbnail

**Setup:** `next-frontend/tests/fixtures.ts`

#### 2.1. video-edit-thumbnail-tipo-invalido

**Covers AC:** #2
**Source:** auto
**Last sync:** 2026-09-30T12:55:56Z

**Steps:**
  1. Usuário escolhe um arquivo não-imagem como thumbnail e salva
    - expect: um erro inline "apenas imagens" aparece abaixo da ThumbUpload
    - expect: nenhuma thumbnail é substituída

### 3. Publicar vídeo

**Setup:** `next-frontend/tests/fixtures.ts` (fixture com vídeo `status: "processing"` e outro `status: "ready"`)

#### 3.1. video-edit-publish-desabilitado-em-processamento

**Covers AC:** #5
**Source:** auto
**Last sync:** 2026-09-30T12:55:56Z

**Steps:**
  1. Usuário abre a edição de um vídeo com `status: "processing"`
    - expect: o botão Publicar está desabilitado
    - expect: o Status não exibe "Checks complete. No issues found."

#### 3.2. video-edit-publish-sucesso-e-conflito

**Covers AC:** #3
**Source:** auto
**Last sync:** 2026-09-30T12:55:56Z

**Steps:**
  1. Usuário abre a edição de um vídeo `ready` e não publicado, e clica em Publicar
    - expect: `POST /api/videos/{id}/publish` retorna sucesso e a página reflete `publishedAt`
  2. Usuário tenta publicar o mesmo vídeo novamente
    - expect: o botão Publicar está desabilitado (vídeo já publicado)

### 4. Vídeo inexistente

**Setup:** `next-frontend/tests/fixtures.ts`

#### 4.1. video-edit-not-found

**Covers AC:** #6
**Source:** auto
**Last sync:** 2026-09-30T12:55:56Z

**Steps:**
  1. Usuário navega para `/studio/videos/inexistente/edit`
    - expect: a página not-found é exibida
