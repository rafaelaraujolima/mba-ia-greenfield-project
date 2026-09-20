---
kind: phase
name: phase-03-videos
status: clean
issue_count: 0
sources_mtime:
  docs/phases/phase-03-videos/context.md: "2026-09-20T15:34:30-04:00"
  docs/decisions/technical-decisions-phase-03-videos.md: "2026-09-20T15:32:08-04:00"
  docs/decisions/technical-decisions-upload-cleanup-policy.md: "2026-09-20T15:32:18-04:00"
issues:
  - id: AMB-1
    status: resolved
    summary: "Thumbnail frame/timestamp not specified (which point in the video)"
    resolved_by: phase-03-videos/TD-04
  - id: AMB-2
    status: resolved
    summary: "Draft/processing status vs Phase 04 publish flow — one state field or two?"
    resolved_by: phase-03-videos/TD-06
  - id: MD-1
    status: resolved
    summary: "No cleanup policy for abandoned multipart uploads / orphan draft videos"
    resolved_by: upload-cleanup-policy/TD-01
  - id: OQ-1
    status: resolved
    summary: "TD-01 (queue technology) pending decision"
    resolved_by: phase-03-videos/TD-01
  - id: OQ-2
    status: resolved
    summary: "TD-02 (upload strategy for 10GB) pending decision"
    resolved_by: phase-03-videos/TD-02
  - id: OQ-3
    status: resolved
    summary: "TD-03 (worker execution model) pending decision"
    resolved_by: phase-03-videos/TD-03
  - id: OQ-4
    status: resolved
    summary: "TD-04 (metadata/thumbnail extraction) pending decision"
    resolved_by: phase-03-videos/TD-04
  - id: OQ-5
    status: resolved
    summary: "TD-05 (unique URL & streaming/download) pending decision"
    resolved_by: phase-03-videos/TD-05
  - id: OQ-6
    status: resolved
    summary: "TD-06 (status lifecycle & failure handling) pending decision"
    resolved_by: phase-03-videos/TD-06
  - id: OQ-7
    status: resolved
    summary: "TD-07 (storage bucket/key organization) pending decision"
    resolved_by: phase-03-videos/TD-07
  - id: OQ-8
    status: resolved
    summary: "upload-cleanup-policy TD-01 (cleanup policy) pending decision"
    resolved_by: upload-cleanup-policy/TD-01
---

# phase-03-videos — Validation

## Findings

### Inconsistencies

_None._

### Ambiguities

_None._

### Missing Decisions

_None._

### Dependency Gaps

_None._

### Inherited Constraint Conflicts

_None._

### Unresolved Open Questions

_None._

### UI Coverage Gaps

_None._ (No UI scope in this phase — backend-only.)

## Resolved Issues

- **AMB-1** _(resolved_by phase-03-videos/TD-04)_ — Timestamp da thumbnail indefinido. Resolvido: extração fixada em 10% da duração do vídeo (`screenshots({ timestamps: ['10%'] })`).
- **AMB-2** _(resolved_by phase-03-videos/TD-06)_ — Sobreposição entre o status de processamento desta fase e o fluxo de publicação da Fase 04. Resolvido: dimensões distintas — o enum `draft|processing|ready|error` é exclusivamente o pipeline técnico; publicação é um campo/estado separado, de responsabilidade da Fase 04.
- **MD-1** _(resolved_by upload-cleanup-policy/TD-01)_ — Nenhuma TD definia política de limpeza para uploads multipart abandonados / vídeos rascunho órfãos. Resolvido pela pesquisa ad-hoc que criou `docs/decisions/technical-decisions-upload-cleanup-policy.md`.
- **OQ-1** _(resolved_by phase-03-videos/TD-01)_ — Tecnologia de fila decidida: BullMQ + Redis via `@nestjs/bullmq`.
- **OQ-2** _(resolved_by phase-03-videos/TD-02)_ — Estratégia de upload decidida: multipart direto ao storage via URLs pré-assinadas.
- **OQ-3** _(resolved_by phase-03-videos/TD-03)_ — Modelo de execução do worker decidido: processo/container dedicado, módulo compartilhado com a API.
- **OQ-4** _(resolved_by phase-03-videos/TD-04)_ — Extração de metadados/thumbnail decidida: `fluent-ffmpeg`.
- **OQ-5** _(resolved_by phase-03-videos/TD-05)_ — URL única e streaming/download decididos: redirect para URL pré-assinada de leitura (GET).
- **OQ-6** _(resolved_by phase-03-videos/TD-06)_ — Ciclo de status decidido: enum + retry automático via BullMQ antes de marcar `error`.
- **OQ-7** _(resolved_by phase-03-videos/TD-07)_ — Organização do storage decidida: bucket único, chave prefixada por UUID do vídeo.
- **OQ-8** _(resolved_by upload-cleanup-policy/TD-01)_ — Política de limpeza decidida: lifecycle rule nativa do storage (`AbortIncompleteMultipartUpload`) + cron `@nestjs/schedule` para os drafts órfãos.
