---
kind: phase
name: phase-03-videos
status: dirty
issue_count: 10
sources_mtime:
  docs/phases/phase-03-videos/context.md: "2026-09-20T10:44:27-04:00"
  docs/decisions/technical-decisions-phase-03-videos.md: "2026-09-17T20:03:46-04:00"
issues:
  - id: AMB-1
    status: open
    summary: "Thumbnail frame/timestamp not specified (which point in the video)"
  - id: AMB-2
    status: open
    summary: "Draft/processing status vs Phase 04 publish flow — one state field or two?"
  - id: MD-1
    status: open
    summary: "No cleanup policy for abandoned multipart uploads / orphan draft videos"
  - id: OQ-1
    status: open
    summary: "TD-01 (queue technology) pending decision"
  - id: OQ-2
    status: open
    summary: "TD-02 (upload strategy for 10GB) pending decision"
  - id: OQ-3
    status: open
    summary: "TD-03 (worker execution model) pending decision"
  - id: OQ-4
    status: open
    summary: "TD-04 (metadata/thumbnail extraction) pending decision"
  - id: OQ-5
    status: open
    summary: "TD-05 (unique URL & streaming/download) pending decision"
  - id: OQ-6
    status: open
    summary: "TD-06 (status lifecycle & failure handling) pending decision"
  - id: OQ-7
    status: open
    summary: "TD-07 (storage bucket/key organization) pending decision"
---

# phase-03-videos — Validation

## Findings

### Inconsistencies

_None._

### Ambiguities

- **AMB-1** — A capability "Geração automática de thumbnail a partir de um frame do vídeo" não especifica **qual** frame/timestamp deve ser usado (primeiro frame? um percentual fixo do vídeo, ex. 10%? o primeiro keyframe após um `-ss`?). `phase-03-videos/TD-04` decide a ferramenta (`fluent-ffmpeg`) mas não o ponto de extração. Explicit choice: adicionar ao contexto/decisão de `phase-03-videos/TD-04` (via `/plan-resolve`) um timestamp/percentual padrão para a extração da thumbnail.
- **AMB-2** — Não fica claro se o campo de status `draft → processing → ready/error` (capability "Pré-cadastro automático do vídeo como rascunho") é a **mesma** dimensão de estado usada pelo "fluxo de rascunho e publicação" da Fase 04 (Gerenciamento de Vídeos e Canal — `docs/project-plan.md`, Fase 04), ou se são duas dimensões distintas (pipeline técnico de processamento vs. visibilidade/publicação de conteúdo). Isso afeta diretamente o Data Model (um único enum `status` ou dois campos separados, ex. `processing_status` + `publication_status`). Explicit choice: esclarecer em `phase-03-videos/TD-06` (via `/plan-resolve`) que o enum desta fase é exclusivamente o pipeline técnico de upload/processamento, e que a dimensão de publicação (rascunho ↔ publicado) pertence à Fase 04 — ou decidir unificá-los, se for essa a intenção.

### Missing Decisions

- **MD-1** — Nenhuma TD define uma política de limpeza para (a) uploads multipart iniciados via `phase-03-videos/TD-02` que nunca são completados (partes órfãs no storage, cobradas indefinidamente) nem para (b) registros de vídeo em `draft` (pré-cadastrados ao iniciar o upload, per capability "Pré-cadastro automático") cujo upload nunca é finalizado. Explicit choice: rodar `/research phase-03-videos` para adicionar uma TD cobrindo a estratégia de limpeza (ex. TTL/job periódico que aborta multipart uploads expirados via `AbortMultipartUpload` e remove/expira vídeos `draft` sem atividade), ou documentar explicitamente que isso é aceito como débito técnico fora do escopo desta fase.

### Dependency Gaps

_None._

### Inherited Constraint Conflicts

_None._

### Unresolved Open Questions

- **OQ-1** — `phase-03-videos/TD-01` pending — Tecnologia de fila de processamento em segundo plano. Resolution: preencher o campo **Decision:** da TD-01 em `docs/decisions/technical-decisions-phase-03-videos.md`, depois rodar `/plan-validate phase-03-videos` novamente.
- **OQ-2** — `phase-03-videos/TD-02` pending — Estratégia de upload de vídeos de até 10GB sem travar a API. Resolution: preencher o campo **Decision:** da TD-02, depois rodar `/plan-validate phase-03-videos` novamente.
- **OQ-3** — `phase-03-videos/TD-03` pending — Modelo de execução do worker de vídeo. Resolution: preencher o campo **Decision:** da TD-03, depois rodar `/plan-validate phase-03-videos` novamente.
- **OQ-4** — `phase-03-videos/TD-04` pending — Extração de metadados e geração de thumbnail. Resolution: preencher o campo **Decision:** da TD-04, depois rodar `/plan-validate phase-03-videos` novamente.
- **OQ-5** — `phase-03-videos/TD-05` pending — URL única por vídeo e estratégia de streaming/download. Resolution: preencher o campo **Decision:** da TD-05, depois rodar `/plan-validate phase-03-videos` novamente.
- **OQ-6** — `phase-03-videos/TD-06` pending — Ciclo de status do vídeo e tratamento de falha de processamento. Resolution: preencher o campo **Decision:** da TD-06, depois rodar `/plan-validate phase-03-videos` novamente.
- **OQ-7** — `phase-03-videos/TD-07` pending — Organização de buckets/chaves no object storage. Resolution: preencher o campo **Decision:** da TD-07, depois rodar `/plan-validate phase-03-videos` novamente.

### UI Coverage Gaps

_None._ (No UI scope in this phase — backend-only, `## UI Inventory` not emitted in context.md.)

## Resolved Issues

_No issues resolved yet._
