import { cosineDistance, asc, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { chunks } from "@/lib/db/schema";
import { embedPergunta } from "./embed";

export type Trecho = {
  secao: string;
  capitulo: string;
  titulo: string;
  pagina: number;
  conteudo: string;
  similaridade: number;
};

/** Busca os k trechos mais proximos da pergunta por similaridade de cosseno (pgvector). */
export async function buscarTrechos(consulta: string, { k = 5 }: { k?: number } = {}): Promise<Trecho[]> {
  const vetor = await embedPergunta(consulta);
  const distancia = cosineDistance(chunks.embedding, vetor);
  const linhas = await getDb()
    .select({
      secao: chunks.secao,
      capitulo: chunks.capitulo,
      titulo: chunks.titulo,
      pagina: chunks.pagina,
      conteudo: chunks.conteudo,
      similaridade: sql<number>`1 - (${distancia})`,
    })
    .from(chunks)
    .orderBy(asc(distancia))
    .limit(k);
  return linhas.map((l) => ({ ...l, similaridade: Number(l.similaridade) }));
}
