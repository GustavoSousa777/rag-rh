import postgres from "postgres";
import { migrar } from "@/lib/db/migrate";
import { lerPaginasPdf } from "@/lib/rag/pdf";
import { chunkPorSecao } from "@/lib/rag/chunker";
import { embedDocumentos } from "@/lib/rag/embed";
import { getEnv } from "@/lib/env";

const caminho = process.argv[2] ?? "data/source/politica_rh.pdf";
const env = getEnv();

console.log(`Lendo ${caminho}...`);
const paginas = await lerPaginasPdf(caminho);
const chunks = chunkPorSecao(paginas);
console.log(`${paginas.length} paginas -> ${chunks.length} chunks`);

console.log(`Gerando embeddings (${env.GEMINI_EMBEDDING_MODEL}, ${env.EMBEDDING_DIMENSIONS} dims)...`);
const vetores = await embedDocumentos(chunks.map((c) => c.textoEmbedado));

const sql = postgres(env.DATABASE_URL, { max: 1 });
await migrar(sql);
await sql.begin(async (tx) => {
  await tx`TRUNCATE chunks RESTART IDENTITY`;
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    await tx`
      INSERT INTO chunks (capitulo, secao, titulo, pagina, parte, conteudo, embedding)
      VALUES (${c.capitulo}, ${c.secao}, ${c.titulo}, ${c.pagina}, ${c.parte}, ${c.conteudo}, ${JSON.stringify(vetores[i])}::vector)`;
  }
});
await sql.end();
console.log("Ingestao concluida.");
