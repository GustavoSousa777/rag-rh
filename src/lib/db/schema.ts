import { index, integer, pgTable, serial, text, vector } from "drizzle-orm/pg-core";
import { dimensoesEmbedding } from "@/lib/env";

export const chunks = pgTable(
  "chunks",
  {
    id: serial("id").primaryKey(),
    capitulo: text("capitulo").notNull(),
    secao: text("secao").notNull(),
    titulo: text("titulo").notNull(),
    pagina: integer("pagina").notNull(),
    parte: integer("parte").notNull().default(1),
    conteudo: text("conteudo").notNull(),
    embedding: vector("embedding", { dimensions: dimensoesEmbedding() }).notNull(),
  },
  (t) => [index("chunks_secao_idx").on(t.secao)],
);

export type ChunkRow = typeof chunks.$inferSelect;
