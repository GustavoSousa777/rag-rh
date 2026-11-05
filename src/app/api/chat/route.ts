import { convertToModelMessages, isStepCount, streamText } from "ai";
import { getEnv } from "@/lib/env";
import { modeloChat } from "@/lib/ai/model";
import { SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { buscarPolitica } from "@/lib/ai/tools";
import { RateLimiter, ipDe } from "@/lib/security/rate-limit";
import { EntradaInvalida, validarEntrada } from "@/lib/security/validar-entrada";

export const maxDuration = 60;

let limiter: RateLimiter | undefined;
function getLimiter() {
  const env = getEnv();
  return (limiter ??= new RateLimiter(env.RATE_LIMIT_MAX, env.RATE_LIMIT_WINDOW_S * 1000));
}

export async function POST(req: Request) {
  if (!getLimiter().permitir(ipDe(req))) {
    return new Response("Muitas requisições. Aguarde um instante e tente de novo.", {
      status: 429,
      headers: { "Retry-After": String(getEnv().RATE_LIMIT_WINDOW_S) },
    });
  }

  let messages;
  try {
    ({ messages } = validarEntrada(await req.json()));
  } catch (e) {
    const msg = e instanceof EntradaInvalida ? e.message : "Requisição inválida.";
    return new Response(msg, { status: 400 });
  }

  const inicio = Date.now();
  const result = streamText({
    model: modeloChat(),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: { buscarPolitica },
    stopWhen: isStepCount(4),
    maxOutputTokens: 800,
    onFinish: (evento) => {
      // Sem texto das perguntas nos logs: funcionarios perguntam coisas pessoais.
      const secoes = evento.steps
        .flatMap((s) => s.toolResults)
        .flatMap((r) => (Array.isArray(r.output) ? (r.output as { secao: string }[]).map((t) => t.secao) : []));
      console.info(
        JSON.stringify({
          evento: "chat",
          mensagens: messages.length,
          tamanhoPergunta: messages.at(-1)?.parts.reduce((n, p) => n + (p.type === "text" ? p.text.length : 0), 0),
          latenciaMs: Date.now() - inicio,
          tokens: evento.totalUsage,
          secoes: [...new Set(secoes)],
        }),
      );
    },
  });

  return result.toUIMessageStreamResponse({
    onError: (erro) => {
      console.error("erro no chat:", erro instanceof Error ? erro.message : "desconhecido");
      return "Não consegui responder agora. Tente novamente em instantes ou fale com o RH.";
    },
  });
}
