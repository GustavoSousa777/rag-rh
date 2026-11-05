import { embed, embedMany } from "ai";
import { google } from "@ai-sdk/google";
import { getEnv } from "@/lib/env";

function modelo() {
  return google.embedding(getEnv().GEMINI_EMBEDDING_MODEL);
}

/** Embeddings dos chunks (taskType RETRIEVAL_DOCUMENT). */
export async function embedDocumentos(textos: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: modelo(),
    values: textos,
    maxParallelCalls: 2,
    providerOptions: { google: { taskType: "RETRIEVAL_DOCUMENT", outputDimensionality: getEnv().EMBEDDING_DIMENSIONS } },
  });
  return embeddings;
}

/** Embedding da pergunta (taskType RETRIEVAL_QUERY). */
export async function embedPergunta(pergunta: string): Promise<number[]> {
  const { embedding } = await embed({
    model: modelo(),
    value: pergunta,
    providerOptions: { google: { taskType: "RETRIEVAL_QUERY", outputDimensionality: getEnv().EMBEDDING_DIMENSIONS } },
  });
  return embedding;
}
