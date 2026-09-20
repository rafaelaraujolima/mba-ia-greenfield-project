---
scope_type: ad-hoc
related_phases: [3]
status: pending
date: 2026-09-20
scope_description: "Política de limpeza para uploads multipart abandonados/incompletos e para vídeos em rascunho (draft) cujo upload nunca é finalizado — lacuna identificada por /plan-validate (MD-1) na Fase 03."
---

# Technical Decisions — Upload Cleanup Policy

_Subprojects in scope:_

- `nestjs-project/` — dono da política de limpeza (job agendado e/ou configuração do bucket de storage).
- `next-frontend/` — sem decisão aberta neste documento; fora do escopo da Fase 03 (backend-only).

---

## TD-01: Política de limpeza de uploads multipart abandonados e vídeos rascunho órfãos

**Scope:** Backend

**Capability:** Transversal — covers: Upload de vídeos com suporte a arquivos de até 10GB sem impacto na performance, Pré-cadastro automático do vídeo como rascunho ao iniciar o upload

**Context:** A estratégia de upload decidida em `phase-03-videos/TD-02` (multipart direto ao storage via URLs pré-assinadas) cria um upload multipart no S3/MinIO por vídeo e pré-cadastra o registro do vídeo como `draft` (capability "Pré-cadastro automático..."). Nenhuma das duas decisões trata o que acontece quando o cliente nunca completa o upload — o usuário fecha a aba, a conexão cai definitivamente, ou o upload é simplesmente abandonado. Sem uma política explícita: (a) partes já enviadas ao storage ficam órfãs e cobradas indefinidamente (custo de armazenamento crescendo sem limite); (b) o registro `draft` no banco nunca transiciona para `ready`/`error`, poluindo listagens e métricas. Esta TD decide como esses dois recursos órfãos são limpos.

**Options:**

### Option A: Lifecycle rule nativa do storage + cron de banco para os drafts
- A regra de lifecycle `AbortIncompleteMultipartUpload` é configurada no bucket do MinIO/S3 (via `PutBucketLifecycleConfiguration`), instruindo o próprio storage a abortar automaticamente qualquer upload multipart incompleto após N dias — sem nenhum código de aplicação. Separadamente, um job agendado (`@nestjs/schedule`, `@Cron`) roda periodicamente e marca como `error` (ou remove) os vídeos em `draft` sem atividade após um TTL.
- **Pros:** A limpeza de storage é garantida pelo próprio MinIO/S3, inclusive se a aplicação ficar fora do ar por dias — não depende de nenhum processo da aplicação estar rodando. Cada mecanismo cuida exclusivamente do recurso que já possui (storage cuida do storage; app cuida do seu próprio estado no banco), sem duplicar responsabilidade.
- **Cons:** Exige configurar a lifecycle rule do bucket como parte do bootstrap de infraestrutura (uma chamada de API/config adicional no setup do MinIO); duas mecânicas distintas a documentar (regra de bucket + cron de aplicação), mesmo que cada uma seja simples isoladamente.

### Option B: Limpeza inteiramente via aplicação (cron único cobrindo storage + banco)
- Um único job agendado (`@nestjs/schedule`) lista uploads multipart incompletos via `ListMultipartUploadsCommand`, aborta os mais antigos que o TTL via `AbortMultipartUploadCommand`, e no mesmo ciclo marca/remove os vídeos `draft` órfãos no banco.
- **Pros:** Um único mecanismo, um único lugar para entender toda a política; não depende de nenhuma feature específica do storage (funciona igual em qualquer S3-compatível, mesmo um que não suporte lifecycle rules).
- **Cons:** Se a aplicação ficar fora do ar por um período prolongado, partes órfãs continuam se acumulando sem limite até o worker voltar a rodar; adiciona `@nestjs/schedule` como nova dependência (ainda não instalada no projeto).

### Option C: Sem limpeza automática (aceitar como débito técnico documentado)
- Nenhum código novo; a limpeza seria um processo manual/operacional, fora do escopo desta fase.
- **Pros:** Custo de implementação zero nesta fase.
- **Cons:** É exatamente o cenário que a MD-1 do `plan-validate` sinalizou como risco — custo de storage crescendo sem controle e banco acumulando registros `draft` órfãos indefinidamente.

**Recommendation:** Option A (lifecycle rule nativa do storage + cron de banco para os drafts) — divide a responsabilidade pela fronteira natural entre os dois recursos: o storage cuida do que é dele (partes multipart) através de um mecanismo nativo e garantido mesmo com a aplicação fora do ar, enquanto a aplicação cuida apenas do que é exclusivamente seu (o registro `draft` no Postgres, que o storage não enxerga). Isso é mais robusto que a Option B, que depende inteiramente do processo da aplicação estar de pé para proteger o storage contra custo ilimitado.

**Decision:** _[pending]_

---

## Decisions Summary

| ID | Scope | Decision | Recommendation | Choice |
|----|-------|----------|---------------|--------|
| TD-01 | Backend | Política de limpeza de uploads/drafts abandonados | Option A (lifecycle rule do storage + cron de banco) | _[pending]_ |
