import type postgres from "postgres";
import { dimensoesEmbedding } from "@/lib/env";

/** Cria extensao, tabela e indices de forma idempotente. A dimensao vem de EMBEDDING_DIMENSIONS. */
export async function migrar(sql: ReturnType<typeof postgres>) {
  const dim = dimensoesEmbedding();
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS chunks (
      id serial PRIMARY KEY,
      capitulo text NOT NULL,
      secao text NOT NULL,
      titulo text NOT NULL,
      pagina integer NOT NULL,
      parte integer NOT NULL DEFAULT 1,
      conteudo text NOT NULL,
      embedding vector(${dim}) NOT NULL
    )`);
  await sql`CREATE INDEX IF NOT EXISTS chunks_secao_idx ON chunks (secao)`;
  // Sem indice vetorial: o manual tem poucas dezenas de chunks e a busca exata e rapida.
  // (HNSW/IVFFlat so valem a pena com milhares de chunks, e o tipo vector indexa ate 2000 dimensoes.)
}
