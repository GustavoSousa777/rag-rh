# Assistente RAG de RH

[![CI](https://github.com/GustavoSousa777/rag-rh/actions/workflows/ci.yml/badge.svg)](https://github.com/GustavoSousa777/rag-rh/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)
![License](https://img.shields.io/badge/license-MIT-green)

Chatbot que responde dúvidas dos colaboradores sobre o Manual de Políticas Internas da G.Sousa Consultoria em IA (empresa fictícia). Cada resposta é gerada a partir de trechos recuperados do manual e indica a seção e a página de origem.

![Interface do assistente](docs/visual.png)

## Funcionalidades

- Respostas em streaming, com histórico completo da conversa (perguntas de acompanhamento como "e para remoto?" funcionam).
- Citação da fonte em cada resposta: seção, título e página do manual.
- Recusa de perguntas fora do escopo de RH e de tentativas de prompt injection.
- Interface responsiva em branco e vermelho, com perguntas frequentes e botão para copiar ou gerar a resposta de novo.
- Rate limit, validação de entrada e cabeçalhos de segurança.
- Suíte de testes e um eval com 35 perguntas para medir a qualidade da recuperação e das respostas.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Aplicação | Next.js (App Router), React, TypeScript, Tailwind CSS |
| IA | Vercel AI SDK v7, Gemini (chat e `gemini-embedding-001`) |
| Dados | PostgreSQL com pgvector, Drizzle ORM |
| Validação | zod |
| Testes | Vitest |
| Infra | Docker, Docker Compose, Caddy, GitHub Actions |

## Como funciona

```
Navegador (useChat)
   │  POST /api/chat
   ▼
Route Handler
   ├─ rate limit por IP e validação da entrada
   ├─ streamText (Gemini) com a tool buscarPolitica
   │        ▼
   │   retriever: embedding da pergunta → busca por cosseno no pgvector (top 5)
   └─ resposta em streaming, citando as seções

Ingestão (offline): PDF → limpeza → chunks por seção → embeddings → Postgres
```

### Decisões de projeto

**Chunking por seção.** O manual é organizado em seções numeradas (1.3.1, 2.2, 6.3). Cada seção vira um chunk, com o cabeçalho (`Cap. 1 › 1.3.2 Auxílio Home Office`) incluído no texto embedado. Seções longas são divididas apenas entre parágrafos. Isso evita que uma regra seja cortada ao meio e permite citar a seção exata.

**Ingestão separada da aplicação.** O PDF é processado uma vez, por script, e os vetores ficam no Postgres. A aplicação só consulta, sem reprocessar nem gastar cota de embeddings a cada execução.

**Retrieval como tool.** O modelo decide quando consultar o manual e reescreve a pergunta usando o histórico. Isso evita buscas em cumprimentos e resolve perguntas dependentes de contexto. O eval compara essa abordagem com "buscar sempre" (`--strategy always`).

**Embeddings assimétricos.** Chunks usam `RETRIEVAL_DOCUMENT` e perguntas usam `RETRIEVAL_QUERY`, que é o uso recomendado pelo modelo.

**Busca exata.** Com algumas dezenas de chunks, a busca por similaridade exata é rápida e dispensa índice HNSW.

**Extração tolerante do PDF.** Alguns extratores colam o fim de uma página ao início da próxima (`BENEFÍCIOS2.1 Estrutura Salarial`). A limpeza separa esses cabeçalhos sem quebrar numerações legítimas como `1.3.1`, e o chunker só aceita seções cuja numeração avança dentro do capítulo, o que descarta referências cruzadas como falsos cabeçalhos.

## Pré-requisitos

- Node.js 22 ou superior
- Docker
- Chave de API do [Google AI Studio](https://aistudio.google.com/apikey)

## Executando localmente

```bash
git clone https://github.com/GustavoSousa777/rag-rh.git
cd rag-rh

cp .env.example .env
# edite o .env: GOOGLE_GENERATIVE_AI_API_KEY e, se quiser, GEMINI_MODEL

docker compose -f docker-compose.dev.yml up -d   # Postgres com pgvector
npm install
npm run ingest                                   # PDF → chunks → embeddings → Postgres
npm run dev                                      # http://localhost:3000
```

A senha do banco em `DATABASE_URL` deve ser a mesma usada pelo Postgres. O compose de desenvolvimento usa `postgres` quando `POSTGRES_PASSWORD` não está definida.

## Configuração

As variáveis são validadas na inicialização (`src/lib/env.ts`). Se algo estiver errado, o erro diz qual variável corrigir.

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `GOOGLE_GENERATIVE_AI_API_KEY` | obrigatória | Chave do Gemini. Usada apenas no servidor |
| `DATABASE_URL` | obrigatória | Conexão com o Postgres (extensão `vector`) |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Modelo de chat. Consulte a lista atual do Google |
| `GEMINI_EMBEDDING_MODEL` | `gemini-embedding-001` | Modelo de embeddings |
| `EMBEDDING_DIMENSIONS` | `768` | 768, 1536 ou 3072. Ao alterar, recrie a tabela e rode a ingestão de novo |
| `RATE_LIMIT_MAX` | `15` | Requisições por IP por janela |
| `RATE_LIMIT_WINDOW_S` | `60` | Tamanho da janela, em segundos |

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e execução em produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verificação de tipos |
| `npm test` | Testes unitários |
| `npm run ingest [arquivo.pdf]` | Cria a tabela e recarrega os chunks |
| `npm run db:migrate` | Cria apenas a extensão e a tabela |
| `npm run eval` | Eval de recuperação |
| `npm run eval -- --mode full` | Eval completo, com juiz LLM |

## Testes

```bash
npm test
```

Os testes cobrem:

- **Chunker**, executado contra o PDF real: cada seção do manual vira chunk, os valores esperados aparecem na seção certa (por exemplo, R$ 180,00 em 2.2 e 4 horas em 6.3), nenhum chunk passa do tamanho máximo e o rodapé das páginas é removido.
- **Limpeza**: emendas entre capítulo e seção, numerações legítimas preservadas e valores monetários e leis que não são confundidos com cabeçalhos.
- **Validação de entrada**: papéis forjados, partes de tool enviadas pelo cliente, limites de tamanho e de quantidade.
- **Rate limiter** e extração do IP do cliente.
- **Fontes**: apenas as seções citadas na resposta aparecem como fonte.

## Avaliação

O eval usa a API real e o banco populado.

```bash
npm run eval                                      # recuperação
npm run eval -- --mode full                       # resposta completa
npm run eval -- --mode full --strategy always     # compara com "buscar sempre"
```

O dataset (`eval/dataset.jsonl`) tem 35 perguntas com a seção esperada, divididas em perguntas diretas, de valor, de condição, que dependem de duas seções, de similaridade enganosa (o prazo de incidente com dados é 6.3, não 5.7), fora de escopo e de injection.

Métricas:

- Recuperação: hit@1, hit@3, hit@5, MRR e presença de todas as seções esperadas no top 5.
- Resposta: fidelidade aos trechos (juiz LLM com saída estruturada), presença dos fatos esperados, citação da seção correta, taxa de recusa correta, latência e tokens.

O processo termina com erro se o hit@5 ficar abaixo de `EVAL_MIN_HIT5` (padrão `0.85`). Os resultados de cada execução são salvos em `eval/results/`.

## Segurança

- A chave da API fica só no servidor (`server-only`, sem `NEXT_PUBLIC_`) e o `.env` não é versionado. O gitleaks roda na CI.
- O `useChat` reenvia todo o histórico, então o servidor não confia nele. Só texto de `user` e `assistant` é aceito, resultados de tool enviados pelo cliente são descartados e a última mensagem precisa ser do usuário.
- O prompt trata os trechos recuperados como dados, restringe o escopo ao RH e não revela as próprias instruções. A tool não tem efeitos colaterais.
- Rate limit por IP, limite de passos e de tokens de saída e limite de tamanho das mensagens.
- Respostas renderizadas como Markdown sem HTML cru e sem imagens. CSP, `X-Content-Type-Options`, `Referrer-Policy` e `X-Frame-Options` configurados em `next.config.ts`.
- Os logs registram tamanho, latência, tokens e seções recuperadas, nunca o texto das perguntas.
- Container multi-stage com usuário não root, banco sem porta publicada e verificação da imagem com Trivy na CI.

O rate limiter é em memória, adequado para um único container. Com várias réplicas, use um armazenamento compartilhado, como Redis.

## Deploy

### Docker Compose

```bash
cp .env.example .env     # defina POSTGRES_PASSWORD, a chave do Gemini e DOMAIN
docker compose up -d --build
docker compose run --rm app-tools     # ingestão
```

O Caddy faz o HTTPS automaticamente quando `DOMAIN` aponta para o servidor. O banco só é acessível pela rede interna do Compose.

### CI/CD

- `ci.yml`: lint, tipos, testes, build, gitleaks, `npm audit`, build da imagem e Trivy. Em push na `main`, publica a imagem no GHCR e faz o deploy por SSH.
- `eval.yml`: execução manual ou semanal, usa a chave real e falha se o hit@5 cair. Não roda a cada pull request, para não gastar cota.
- Secrets: `GOOGLE_GENERATIVE_AI_API_KEY` (eval) e `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH` (deploy).

Também é possível publicar na Vercel, usando um Postgres gerenciado com pgvector.

## Estrutura do projeto

```
src/
  app/api/chat/       endpoint de chat (rate limit, validação, streamText)
  app/api/health/     health check
  components/chat/    interface do chat
  lib/ai/             modelo, prompts, tools
  lib/rag/            pdf, limpeza, chunker, embeddings, retriever
  lib/db/             schema, cliente e migração
  lib/security/       rate limit e validação de entrada
scripts/              ingestão e migração
eval/                 dataset e runner do eval
tests/                testes unitários
data/source/          PDF do manual
```

## Autor

Gustavo Pereira Sousa

[GitHub](https://github.com/GustavoSousa777) · [LinkedIn](https://linkedin.com/in/gustavosousa777)

O manual usado como base é um documento fictício, criado para demonstração.
