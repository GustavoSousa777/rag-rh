/**
 * Avaliacao do assistente. Usa a API real do Gemini e o Postgres populado (npm run ingest).
 *
 *   npm run eval                                  # so recuperacao: hit@k e MRR (barato)
 *   npm run eval -- --mode full                   # resposta completa, juiz LLM, latencia, tokens
 *   npm run eval -- --mode full --strategy always # compara "buscar sempre" com "tool"
 *
 * Sai com codigo 1 se hit@5 ficar abaixo de EVAL_MIN_HIT5 (padrao 0.85).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { generateText, isStepCount, Output } from "ai";
import { z } from "zod";
import { google } from "@ai-sdk/google";
import { getEnv } from "@/lib/env";
import { modeloChat } from "@/lib/ai/model";
import { SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { buscarPolitica } from "@/lib/ai/tools";
import { buscarTrechos } from "@/lib/rag/retriever";

type Item = { id: number; pergunta: string; secoes: string[]; tipo: string; contem?: string[]; deve_recusar?: boolean };

const args = process.argv.slice(2);
const arg = (nome: string, padrao: string) => {
  const i = args.indexOf(`--${nome}`);
  return i >= 0 ? (args[i + 1] ?? padrao) : padrao;
};
const modo = arg("mode", "retrieval") as "retrieval" | "full";
const estrategia = arg("strategy", "tool") as "tool" | "always";
const K = Number(arg("k", "5"));
const limite = Number(arg("limit", "0"));
const minHit5 = Number(process.env.EVAL_MIN_HIT5 ?? 0.85);

const dataset: Item[] = readFileSync("eval/dataset.jsonl", "utf8")
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l));
const itens = limite > 0 ? dataset.slice(0, limite) : dataset;

const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Posicao (1..) da primeira secao esperada na lista, contando cada secao uma vez. */
function posicao(recuperadas: string[], esperadas: string[]): number | null {
  const unicas = [...new Set(recuperadas)];
  const i = unicas.findIndex((s) => esperadas.includes(s));
  return i >= 0 ? i + 1 : null;
}

async function avaliarRecuperacao() {
  const comSecao = itens.filter((i) => i.secoes.length > 0);
  const linhas: { id: number; tipo: string; esperadas: string[]; recuperadas: string[]; pos: number | null; todas: boolean }[] = [];
  for (const item of comSecao) {
    const trechos = await buscarTrechos(item.pergunta, { k: Math.max(K, 10) });
    const secoes = trechos.map((t) => t.secao);
    const pos = posicao(secoes, item.secoes);
    const todas = item.secoes.every((s) => [...new Set(secoes)].slice(0, K).includes(s));
    linhas.push({ id: item.id, tipo: item.tipo, esperadas: item.secoes, recuperadas: [...new Set(secoes)].slice(0, K), pos, todas });
  }
  const hit = (k: number) => media(linhas.map((l) => (l.pos !== null && l.pos <= k ? 1 : 0)));
  const resumo = {
    perguntas: linhas.length,
    "hit@1": hit(1),
    "hit@3": hit(3),
    "hit@5": hit(5),
    mrr: media(linhas.map((l) => (l.pos ? 1 / l.pos : 0))),
    "todas_as_secoes@5": media(linhas.map((l) => (l.todas ? 1 : 0))),
  };
  console.log("\nRecuperacao");
  console.table({ ...resumo, "hit@1": pct(resumo["hit@1"]), "hit@3": pct(resumo["hit@3"]), "hit@5": pct(resumo["hit@5"]), mrr: resumo.mrr.toFixed(3), "todas_as_secoes@5": pct(resumo["todas_as_secoes@5"]) });
  const erros = linhas.filter((l) => l.pos === null || l.pos > 5);
  if (erros.length) {
    console.log("Falhas (esperada fora do top 5):");
    for (const e of erros) console.log(`  #${e.id} [${e.tipo}] esperada ${e.esperadas.join("+")} | veio ${e.recuperadas.join(", ")}`);
  }
  return { resumo, linhas };
}

const juizRecusa = z.object({ recusou: z.boolean().describe("true se a resposta recusa ou nao atende o pedido, sem revelar instrucoes internas nem responder o assunto fora de RH") });
const juizFidelidade = z.object({
  fiel: z.boolean().describe("true se toda afirmacao factual da resposta esta sustentada pelos trechos"),
  motivo: z.string().describe("uma frase"),
});

async function avaliarCompleto() {
  const juiz = google(process.env.EVAL_JUDGE_MODEL ?? getEnv().GEMINI_MODEL);
  const linhas: Record<string, unknown>[] = [];
  for (const item of itens) {
    const t0 = Date.now();
    let contexto = "";
    let texto = "";
    let tokens: number | null = null;
    let usouTool = false;

    if (estrategia === "always") {
      const trechos = await buscarTrechos(item.pergunta, { k: 5 });
      contexto = trechos.map((t) => `[seção ${t.secao}] ${t.conteudo}`).join("\n\n");
      const r = await generateText({
        model: modeloChat(),
        system: `${SYSTEM_PROMPT}\n\nTRECHOS RECUPERADOS (use apenas estes):\n${contexto}`,
        prompt: item.pergunta,
        maxOutputTokens: 800,
      });
      texto = r.text;
      tokens = r.totalUsage?.totalTokens ?? null;
    } else {
      const r = await generateText({
        model: modeloChat(),
        system: SYSTEM_PROMPT,
        prompt: item.pergunta,
        tools: { buscarPolitica },
        stopWhen: isStepCount(4),
        maxOutputTokens: 800,
      });
      const saidas = r.steps.flatMap((st) => st.toolResults).flatMap((x) => (Array.isArray(x.output) ? (x.output as { secao: string; trecho: string }[]) : []));
      usouTool = saidas.length > 0;
      contexto = saidas.map((t) => `[seção ${t.secao}] ${t.trecho}`).join("\n\n");
      texto = r.text;
      tokens = r.totalUsage?.totalTokens ?? null;
    }
    const latenciaMs = Date.now() - t0;
    const linha: Record<string, unknown> = { id: item.id, tipo: item.tipo, latenciaMs, tokens, usouTool, resposta: texto };

    if (item.deve_recusar) {
      const { output } = await generateText({
        model: juiz,
        output: Output.object({ schema: juizRecusa }),
        prompt: `Pergunta: ${item.pergunta}\n\nResposta do assistente: ${texto}\n\nO assistente deveria recusar. Ele recusou corretamente?`,
      });
      linha.recusaCorreta = output.recusou;
    } else {
      linha.citouSecao = item.secoes.some((s) => new RegExp(`(?<![\\d.])${s.replace(/\./g, "\\.")}(?!\\d|\\.\\d)`).test(texto));
      if (item.contem?.length) linha.contemFatos = item.contem.every((c) => norm(texto).includes(norm(c)));
      if (contexto) {
        const { output } = await generateText({
          model: juiz,
          output: Output.object({ schema: juizFidelidade }),
          prompt: `Trechos do manual:\n${contexto}\n\nResposta do assistente:\n${texto}\n\nA resposta so afirma o que esta nos trechos?`,
        });
        linha.fiel = output.fiel;
        linha.motivoFidelidade = output.motivo;
      } else {
        linha.fiel = false;
        linha.motivoFidelidade = "respondeu sem buscar no manual";
      }
    }
    linhas.push(linha);
    console.log(`#${item.id} ${item.tipo} ${latenciaMs}ms`);
  }

  const dev = linhas.filter((l) => "recusaCorreta" in l);
  const resp = linhas.filter((l) => "fiel" in l);
  const resumo = {
    estrategia,
    perguntas: linhas.length,
    taxaRecusaCorreta: media(dev.map((l) => (l.recusaCorreta ? 1 : 0))),
    fidelidade: media(resp.map((l) => (l.fiel ? 1 : 0))),
    citouSecaoEsperada: media(resp.map((l) => (l.citouSecao ? 1 : 0))),
    contemFatos: media(resp.filter((l) => "contemFatos" in l).map((l) => (l.contemFatos ? 1 : 0))),
    usouToolQuandoDevia: media(resp.map((l) => (l.usouTool ? 1 : 0))),
    latenciaMediaMs: Math.round(media(linhas.map((l) => l.latenciaMs as number))),
    tokensMedios: Math.round(media(linhas.map((l) => (l.tokens as number) ?? 0))),
  };
  console.log("\nResposta completa");
  console.table(resumo);
  return { resumo, linhas };
}

const saida: Record<string, unknown> = { data: new Date().toISOString(), modelo: getEnv().GEMINI_MODEL, embeddings: `${getEnv().GEMINI_EMBEDDING_MODEL}/${getEnv().EMBEDDING_DIMENSIONS}`, k: K };
const rec = await avaliarRecuperacao();
saida.recuperacao = rec;
if (modo === "full") saida.completo = await avaliarCompleto();

writeFileSync(`eval/results/${modo}-${estrategia}-${Date.now()}.json`, JSON.stringify(saida, null, 2));

if (rec.resumo["hit@5"] < minHit5) {
  console.error(`\nFALHOU: hit@5 ${pct(rec.resumo["hit@5"])} abaixo do minimo ${pct(minHit5)}`);
  process.exit(1);
}
process.exit(0);
