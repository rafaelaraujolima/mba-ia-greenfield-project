---
scope_type: phase
related_phases: [3]
status: pending
date: 2026-09-17
scope_description: "Upload e processamento assíncrono de vídeos: fila de background jobs, estratégia de upload de arquivos grandes (até 10GB), worker de vídeo (FFmpeg), URL única, streaming e ciclo de status."
---

# Technical Decisions — Fase 03: Upload e Processamento de Vídeos

_Subprojects in scope:_

- `nestjs-project/` — recebe o novo módulo de vídeos, a fila de processamento, o worker de vídeo e a integração com o object storage. Todas as TDs abaixo são `Backend`.
- `next-frontend/` — sem decisão nesta fase. Por definição explícita do escopo da Fase 03 (backend-only), a interface de upload/reprodução de vídeo não é construída neste desafio; nenhuma capability desta fase exige mudança no frontend.

---

## TD-01: Tecnologia de fila de processamento em segundo plano

**Scope:** Backend

**Capability:** Serviço de processamento em segundo plano (filas)

**Context:** O `docs/project-plan.md` e o `docs/diagrams/software-arch.mermaid` definem a fila como container próprio ("Message Queue", tecnologia `TBD`) responsável por entregar jobs de processamento de vídeo ao worker. Nenhuma decisão anterior (Fase 01/02) fixou tecnologia de mensageria — esta é a primeira vez que o projeto precisa de processamento assíncrono real. A escolha determina como o worker (TD-03) consome jobs e como falhas são tratadas (TD-06).

**Options:**

### Option A: BullMQ + Redis (via `@nestjs/bullmq`)
- Fila baseada em Redis com módulo oficial do NestJS (`@nestjs/bullmq`, mantido pela própria organização NestJS). Jobs são registrados via `BullModule.registerQueue()` e consumidos com `@Processor`/`@InjectQueue`.
- **Pros:** integração NestJS de primeira classe (decorators, DI, testável via `TestingModule`); suporta retries com backoff, progresso de job, prioridade e concorrência configurável nativamente — exatamente o que processamento de vídeo (longo, falha-propenso) precisa; dashboard de monitoramento pronto (Bull Board) se necessário depois.
- **Cons:** adiciona Redis como nova infraestrutura no Compose (novo container).

### Option B: RabbitMQ via `@nestjs/microservices` (`Transport.RMQ`)
- Usa o transporter RabbitMQ nativo do NestJS: a API publica mensagens com `ClientProxy`, o worker roda como microserviço NestJS (`NestFactory.createMicroservice`) escutando a fila.
- **Pros:** também é suporte oficial do NestJS; RabbitMQ é um message broker maduro e robusto para roteamento mais complexo (exchanges, routing keys).
- **Cons:** o transporter de microservices do NestJS é pensado para padrões de mensagem (RPC/eventos), não para "job queue" com retry/backoff/progresso — isso teria que ser implementado à mão sobre `noAck`/requeue manual; mais peças para reconstruir o que BullMQ já entrega pronto. Adiciona RabbitMQ como nova infraestrutura no Compose.

### Option C: pg-boss (fila sobre o PostgreSQL já existente)
- Fila implementada como tabelas + `LISTEN/NOTIFY` no próprio Postgres, sem novo serviço de infraestrutura.
- **Pros:** zero infraestrutura nova — reaproveita o Postgres que já está no Compose; simplifica operação (um banco a menos para monitorar).
- **Cons:** sem integração oficial `@nestjs/*` (exigiria um wrapper de módulo manual); recursos de fila (concorrência fina, dashboards, rate limiting por fila) mais limitados que BullMQ; acopla a carga de jobs de vídeo (potencialmente pesada) ao mesmo Postgres usado pelas queries transacionais da aplicação.

**Recommendation:** Option A (BullMQ + Redis via `@nestjs/bullmq`) — é o módulo oficial do NestJS para filas, entrega retry/backoff/progresso/concorrência nativamente (necessário para jobs de vídeo longos e falha-propensos, ver TD-06), e é o par mais idiomático para um worker de vídeo em NestJS. O custo de adicionar Redis ao Compose é aceitável: a arquitetura já prevê a fila como container dedicado e distinto do Postgres.

**Decision:** _[pending]_

---

## TD-02: Estratégia de upload de vídeos de até 10GB sem travar a API

**Scope:** Backend

**Capability:** Upload de vídeos com suporte a arquivos de até 10GB sem impacto na performance

**Context:** `docs/project-plan.md` (seção "Pontos de Atenção") exige explicitamente que o upload de até 10GB "não trave o sistema e permita retomar em caso de falha de conexão". O `CLAUDE.md` da fase reforça: passar o arquivo pela API de forma que trave o sistema é reprova automática. A decisão aqui é como os bytes do vídeo chegam ao object storage sem passar pelo processo da API.

**Options:**

### Option A: Upload multipart direto ao storage via URLs pré-assinadas
- A API expõe endpoints para iniciar (`createMultipartUpload`), assinar cada parte (`getSignedUrl` + `UploadPartCommand`, um por parte) e concluir (`completeMultipartUpload`) o upload — o cliente envia os bytes diretamente ao MinIO/S3, nunca à API. Cada parte (mínimo 5MB) pode ser reenviada individualmente em caso de falha de conexão.
- **Pros:** suporta os 10GB completos sem esbarrar no limite de PUT único do S3 (5GB); resumível de verdade — só a parte que falhou é reenviada, não o arquivo inteiro; a API nunca segura a conexão nem os bytes do upload.
- **Cons:** exige orquestração de múltiplas partes no lado do cliente (fora do escopo desta fase, que é backend-only — mas o contrato de API já fica pronto para quando o frontend existir).

### Option B: URL pré-assinada única (PUT simples)
- A API gera uma única `PutObjectCommand` pré-assinada; o cliente faz um único PUT direto ao storage.
- **Pros:** mais simples de implementar (uma única URL, sem etapa de "complete").
- **Cons:** S3 (e MinIO, que replica a mesma API) limita um único PUT a 5GB — não cobre o requisito de 10GB; qualquer falha de conexão obriga reenviar o arquivo inteiro, violando o requisito de retomada.

### Option C: Streaming do upload através da API (multipart/form-data + proxy para o storage)
- O arquivo é enviado à API (via Multer) e a API repassa (stream) para o storage.
- **Pros:** nenhuma mudança de contrato — um único endpoint HTTP tradicional.
- **Cons:** os bytes do upload atravessam o processo da API durante toda a transferência (10GB), prendendo uma conexão/worker por upload — exatamente o comportamento que a fase proíbe explicitamente.

**Recommendation:** Option A (multipart direto ao storage com URLs pré-assinadas por parte) — é a única opção que atende simultaneamente aos três requisitos explícitos: suportar 10GB (acima do limite de PUT único), não travar a API (bytes nunca passam pelo processo Node) e permitir retomada em falha de conexão (reenvio por parte, não do arquivo inteiro). Confirmado como compatível com a API S3 usada pelo MinIO via `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`.

**Decision:** _[pending]_

---

## TD-03: Modelo de execução do worker de vídeo

**Scope:** Backend

**Capability:** Transversal — covers: Serviço de processamento em segundo plano (filas), Processamento automático do vídeo após upload (extração de duração e metadados)

**Context:** `docs/diagrams/software-arch.mermaid` já define "Video Worker" como container próprio, distinto da API. Esta TD decide se o código do worker roda mesmo como processo/container separado (como o diagrama prevê) e como ele se relaciona com o módulo de vídeos da API.

**Options:**

### Option A: Processo/container dedicado, mesmo módulo compartilhado
- Um segundo entrypoint (ex.: `src/main-worker.ts`, bootstrap via `NestFactory.createApplicationContext` ou uma aplicação NestJS mínima) roda em container próprio no Compose, importando o mesmo `VideosModule` da API e registrando o `@Processor` da fila (TD-01).
- **Pros:** casa com a arquitetura já desenhada (container "Video Worker" separado); um job de FFmpeg longo não compete por event loop/recursos com as requisições HTTP da API; escala e reinicia independentemente da API.
- **Cons:** um Dockerfile/serviço de Compose a mais para manter (mitigado por reaproveitar a mesma imagem/codebase da API, só trocando o comando de start).

### Option B: Worker no mesmo processo da API
- O `@Processor` é registrado dentro da própria aplicação HTTP da API — um único container faz as duas coisas.
- **Pros:** menos infraestrutura (um serviço a menos no Compose).
- **Cons:** contradiz a arquitetura já definida (que separa API e Video Worker como containers distintos); um job de processamento de vídeo pesado (FFmpeg) compete por CPU/event loop com o tráfego HTTP da API; não é possível escalar ou reiniciar o worker isoladamente.

**Recommendation:** Option A (processo/container dedicado) — é a arquitetura já prevista no diagrama C4 do projeto (container "Video Worker" separado da API), e evita que processamento pesado de vídeo degrade a latência da API. Ambos os processos compartilham o mesmo `VideosModule`/codebase; só o entrypoint de bootstrap difere.

**Decision:** _[pending]_

---

## TD-04: Extração de metadados e geração de thumbnail

**Scope:** Backend

**Capability:** Transversal — covers: Processamento automático do vídeo após upload (extração de duração e metadados), Geração automática de thumbnail a partir de um frame do vídeo

**Context:** O worker (TD-03) precisa extrair duração/metadados do vídeo e gerar uma thumbnail a partir de um frame. `docs/diagrams/software-arch.mermaid` já nomeia FFmpeg como a tecnologia do Video Worker — a decisão aqui é a forma de integração com o FFmpeg a partir do Node, não a ferramenta em si.

**Options:**

### Option A: `fluent-ffmpeg`
- Wrapper Node para os binários `ffmpeg`/`ffprobe`. `ffmpeg.ffprobe()` retorna duração/codecs/resolução em JSON; `.screenshots({ timestamps, folder, size })` extrai thumbnail de um frame específico.
- **Pros:** API estável e documentada para exatamente as duas operações desta fase (probe + screenshot); já resolve parsing de stdout/stderr do `ffprobe` e ciclo de vida do processo `ffmpeg`.
- **Cons:** ainda depende dos binários `ffmpeg`/`ffprobe` instalados na imagem do worker (`apt install ffmpeg`).

### Option B: `child_process.spawn` direto sobre `ffmpeg`/`ffprobe`
- Chamar os binários diretamente, sem wrapper, montando os argumentos de linha de comando e parseando a saída manualmente.
- **Pros:** zero dependência Node adicional.
- **Cons:** reimplementa (parsing de JSON do `ffprobe`, tratamento de stdout/stderr, timeouts) o que `fluent-ffmpeg` já entrega testado, sem ganho real — os binários precisam estar na imagem de qualquer forma.

**Recommendation:** Option A (`fluent-ffmpeg`) — cobre com uma API estável exatamente as duas operações que esta fase precisa (`ffprobe` para metadados, `screenshots()` para thumbnail), evitando reescrever parsing de processo por nenhum benefício real.

**Decision:** _[pending]_

---

## TD-05: URL única por vídeo e estratégia de streaming/download

**Scope:** Backend

**Capability:** Transversal — covers: URL única por vídeo, sem conflito com outros vídeos, Reprodução via streaming (sem necessidade de download completo), Download do vídeo pelo usuário

**Context:** O vídeo precisa de uma URL pública única e de reprodução via streaming (range requests / 206 Partial Content), além de download completo. Depende de TD-07 (organização de chaves no storage) para saber qual objeto resolver a partir do identificador do vídeo.

**Options:**

### Option A: API proxeia os bytes do vídeo (streaming manual com suporte a `Range`)
- `GET /videos/:id/stream` lê o header `Range` da requisição, busca o range correspondente no storage (`GetObjectCommand` com parâmetro `Range`) e responde `206 Partial Content` com `Content-Range`/`Accept-Ranges`, repassando o stream ao cliente (`StreamableFile` cobre o caso sem range; range exige resposta manual via `@Res({ passthrough: true })`).
- **Pros:** um único ponto de acesso (a própria API) controla toda a resposta.
- **Cons:** volta a fazer a API carregar bytes de vídeo em escala de streaming contínuo — o mesmo gargalo que a TD-02 evitou para upload, agora no download/reprodução.

### Option B: Redirect para URL pré-assinada de leitura (GET) direto no storage
- `GET /videos/:id/stream` (e `/download`) resolve o identificador único (UUID do vídeo) para a chave no storage (TD-07) e responde com um redirect (ou o corpo da URL) para uma `GetObjectCommand` pré-assinada de curta duração. MinIO/S3 já implementa `Range`/206 nativamente para `GetObject`. O download usa o mesmo mecanismo, com `ResponseContentDisposition: attachment`.
- **Pros:** MinIO/S3 já resolve `Range`/206 corretamente — não é preciso reimplementar; a API nunca proxeia bytes de vídeo, mantendo o mesmo princípio de não-bloqueio da TD-02; a URL pré-assinada é de curta duração, controlando acesso sem expor o bucket publicamente.
- **Cons:** o cliente faz uma segunda requisição (à URL pré-assinada) — irrelevante para vídeo, que já é consumido via elemento `<video>`/downloads.

**Recommendation:** Option B (redirect para URL pré-assinada de leitura) — evita reimplementar `Range`/206 (o storage já faz isso corretamente) e mantém o princípio já decidido na TD-02: a API nunca deve proxear bytes de arquivos grandes. O UUID do vídeo (chave primária da entidade) é o identificador público estável; a URL pré-assinada é um ponteiro de curta duração e sem colisão para o objeto.

**Decision:** _[pending]_

---

## TD-06: Ciclo de status do vídeo e tratamento de falha de processamento

**Scope:** Backend

**Capability:** Transversal — covers: Pré-cadastro automático do vídeo como rascunho ao iniciar o upload, Processamento automático do vídeo após upload (extração de duração e metadados)

**Context:** O vídeo precisa existir como rascunho assim que o upload é iniciado (antes de qualquer processamento) e transicionar conforme o job de processamento avança. Depende de TD-01 (a fila escolhida determina os mecanismos de retry disponíveis).

**Options:**

### Option A: Coluna de status (enum `draft | processing | ready | error`) sem retry automático
- A API grava `draft` ao pré-cadastrar o vídeo (TD-02) e `processing` ao enfileirar o job; o worker grava `ready` no sucesso ou `error` (+ motivo) na falha, sem nova tentativa automática.
- **Pros:** simples de raciocinar — uma falha é definitiva e visível imediatamente.
- **Cons:** falhas transitórias (hiccup de storage, worker reiniciando) exigem que o usuário refaça o upload inteiro, mesmo quando um retry resolveria.

### Option B: Mesmo enum, com retry automático via BullMQ (`attempts` + `backoff`) antes de marcar `error`
- Mesma máquina de estados da Option A, mas o job só é marcado `error` depois de esgotar um número configurado de tentativas com backoff exponencial (recurso nativo do BullMQ, já escolhido na TD-01).
- **Pros:** absorve falhas transitórias sem exigir reenvio do arquivo pelo usuário; recurso já incluído na fila escolhida (TD-01), sem custo de implementação extra.
- **Cons:** um vídeo com erro persistente demora mais para reportar `error` (tempo das tentativas + backoff) — aceitável dado que processamento de vídeo já é assíncrono por natureza.

**Recommendation:** Option B (retry automático via BullMQ antes de `error`) — como a TD-01 já escolhe uma fila com `attempts`/`backoff` nativos, não hesitar em falhas transitórias antes de expor `error` ao usuário é ganho "de graça" e evita retrabalho de upload para problemas que se resolveriam sozinhos.

**Decision:** _[pending]_

---

## TD-07: Organização de buckets/chaves no object storage

**Scope:** Backend

**Capability:** Serviço de armazenamento de arquivos (vídeos e thumbnails)

**Context:** O object storage em si (S3-compatível / MinIO em Docker) já é uma decisão fechada do projeto, não desta TD (ver `docs/project-plan.md` e o enunciado da fase). O que resta decidir é como o vídeo e sua thumbnail são organizados dentro dele, para dar suporte às URLs pré-assinadas de upload (TD-02) e leitura (TD-05).

**Options:**

### Option A: Bucket único, chaves prefixadas por UUID do vídeo (`videos/{videoId}/original.<ext>`, `videos/{videoId}/thumbnail.jpg`)
- Um único bucket (ex.: `streamtube`) configurado no cliente `@aws-sdk/client-s3` com `forcePathStyle: true` e `endpoint` apontando para o serviço `minio` do Compose.
- **Pros:** o UUID do vídeo (chave primária da entidade) já garante ausência de colisão entre chaves; um bucket é mais simples de provisionar no Compose; casa com o único container "Object Storage" do diagrama de arquitetura.
- **Cons:** nenhuma política de retenção/lifecycle diferenciada entre vídeos e thumbnails dentro do mesmo bucket (não é um requisito desta fase).

### Option B: Buckets separados por tipo de artefato (`streamtube-videos`, `streamtube-thumbnails`)
- Um bucket para vídeos originais, outro para thumbnails.
- **Pros:** permitiria políticas de lifecycle/retenção distintas por bucket no futuro.
- **Cons:** overhead de provisionar e configurar dois buckets sem benefício nesta fase; a separação por prefixo de chave já entrega a mesma organização lógica.

**Recommendation:** Option A (bucket único, chave prefixada por UUID do vídeo) — o UUID já elimina colisões sem precisar de um segundo bucket, e um único bucket é mais simples de provisionar e é consistente com o único container de Object Storage do diagrama de arquitetura.

**Decision:** _[pending]_

---

## Decisions Summary

| ID | Scope | Decision | Recommendation | Choice |
|----|-------|----------|---------------|--------|
| TD-01 | Backend | Tecnologia de fila de processamento | BullMQ + Redis (`@nestjs/bullmq`) | _[pending]_ |
| TD-02 | Backend | Estratégia de upload de até 10GB | Multipart direto ao storage via URLs pré-assinadas | _[pending]_ |
| TD-03 | Backend | Modelo de execução do worker | Processo/container dedicado, módulo compartilhado | _[pending]_ |
| TD-04 | Backend | Extração de metadados e thumbnail | `fluent-ffmpeg` | _[pending]_ |
| TD-05 | Backend | URL única e streaming/download | Redirect para URL pré-assinada de leitura (GET) | _[pending]_ |
| TD-06 | Backend | Ciclo de status e falha de processamento | Enum de status + retry automático via BullMQ | _[pending]_ |
| TD-07 | Backend | Organização de buckets/chaves | Bucket único, chave prefixada por UUID do vídeo | _[pending]_ |
