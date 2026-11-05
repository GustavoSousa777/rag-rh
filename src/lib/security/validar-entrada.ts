import { z } from "zod";
import type { UIMessage } from "ai";

export const LIMITES = {
  maxMensagens: 20,
  maxCharsUsuario: 1000,
  maxCharsAssistente: 6000,
  maxCharsTotal: 20_000,
} as const;

const parteTexto = z.object({ type: z.literal("text"), text: z.string() });

const mensagem = z.object({
  id: z.string().max(100).optional(),
  role: z.enum(["user", "assistant"]),
  // Outras partes (tool-*, reasoning, file...) sao aceitas no formato mas descartadas abaixo.
  parts: z.array(z.object({ type: z.string().max(100) }).passthrough()).max(50),
});

const corpo = z.object({ messages: z.array(mensagem).min(1).max(LIMITES.maxMensagens) });

export class EntradaInvalida extends Error {}

/**
 * O useChat reenvia o historico inteiro, entao o cliente pode forja-lo.
 * Mantemos somente texto de user/assistant (nenhum resultado de tool vindo do cliente)
 * e exigimos que a ultima mensagem seja do usuario.
 */
export function validarEntrada(json: unknown): { messages: UIMessage[] } {
  const parsed = corpo.safeParse(json);
  if (!parsed.success) throw new EntradaInvalida("Formato de mensagens invalido.");

  let total = 0;
  const messages: UIMessage[] = [];
  parsed.data.messages.forEach((m, i) => {
    const texto = m.parts
      .map((p) => (p.type === "text" && typeof p.text === "string" ? p.text : ""))
      .filter(Boolean)
      .join("\n")
      .trim();
    if (!texto) {
      if (m.role === "user") throw new EntradaInvalida("Mensagem vazia.");
      return; // assistente sem texto (so tool call): descarta
    }
    const limite = m.role === "user" ? LIMITES.maxCharsUsuario : LIMITES.maxCharsAssistente;
    if (texto.length > limite) throw new EntradaInvalida(`Mensagem muito longa (maximo ${limite} caracteres).`);
    total += texto.length;
    messages.push({ id: m.id ?? `m${i}`, role: m.role, parts: [{ type: "text", text: texto }] });
  });

  if (total > LIMITES.maxCharsTotal) throw new EntradaInvalida("Conversa muito longa. Inicie uma nova conversa.");
  if (messages.at(-1)?.role !== "user") throw new EntradaInvalida("A ultima mensagem deve ser do usuario.");
  return { messages };
}
