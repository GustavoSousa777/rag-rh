import { z } from "zod";

const schema = z.object({
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(10, "GOOGLE_GENERATIVE_AI_API_KEY ausente ou curta demais"),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  GEMINI_EMBEDDING_MODEL: z.string().min(1).default("gemini-embedding-001"),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().refine((n) => [768, 1536, 3072].includes(n), "use 768, 1536 ou 3072").default(768),
  DATABASE_URL: z.string().url("DATABASE_URL invalida"),
  RATE_LIMIT_WINDOW_S: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(15),
});

export type Env = z.infer<typeof schema>;

let cache: Env | undefined;

/** Valida as variaveis na primeira chamada (nao no build) e falha cedo com mensagem clara. */
export function getEnv(): Env {
  if (cache) return cache;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const detalhes = parsed.error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Variaveis de ambiente invalidas:\n${detalhes}`);
  }
  cache = parsed.data;
  return cache;
}

/** Dimensao usada pelo schema. Lida direto do ambiente para que o schema possa ser importado sem a chave da API. */
export function dimensoesEmbedding(): number {
  const n = Number(process.env.EMBEDDING_DIMENSIONS ?? 768);
  return [768, 1536, 3072].includes(n) ? n : 768;
}
