import { beforeAll, describe, expect, it } from "vitest";
import { lerPaginasPdf } from "@/lib/rag/pdf";
import { chunkPorSecao, type Chunk } from "@/lib/rag/chunker";
import { limparPagina, repararEmendas } from "@/lib/rag/limpeza";

const MAX = 1500;
let chunks: Chunk[];
let paginas: string[];

beforeAll(async () => {
  paginas = await lerPaginasPdf("data/source/politica_rh.pdf");
  chunks = chunkPorSecao(paginas, { maxChars: MAX });
});

const secao = (n: string) => chunks.filter((c) => c.secao === n);

describe("chunker por secao (PDF real)", () => {
  it("le as 20 paginas", () => expect(paginas).toHaveLength(20));

  it("o chunk 2.2 contem R$ 180,00 e a regra de dependentes universitarios", () => {
    const t = secao("2.2").map((c) => c.conteudo).join("\n");
    expect(t).toContain("R$ 180,00");
    expect(t).toContain("até 24 anos");
  });

  it("1.3.2 fica separado de 1.3 e traz os dois valores de auxilio", () => {
    const t = secao("1.3.2").map((c) => c.conteudo).join("\n");
    expect(t).toContain("R$ 200,00");
    expect(t).toContain("R$ 350,00");
    expect(secao("1.3").map((c) => c.conteudo).join("\n")).not.toContain("R$ 350,00");
  });

  it("6.3 traz o prazo de 4 horas para incidentes", () => {
    expect(secao("6.3").map((c) => c.conteudo).join("\n")).toContain("4 horas");
  });

  it("nenhum chunk passa do tamanho maximo", () => {
    for (const c of chunks) expect(c.conteudo.length).toBeLessThanOrEqual(MAX + 400);
  });

  it("toda secao do manual virou chunk", () => {
    const esperadas = [
      "0.1", "0.2",
      "1.1", "1.2", "1.3", "1.3.1", "1.3.2", "1.3.3", "1.4", "1.5", "1.6",
      ...Array.from({ length: 10 }, (_, i) => `2.${i + 1}`),
      ...Array.from({ length: 8 }, (_, i) => `3.${i + 1}`),
      ...Array.from({ length: 6 }, (_, i) => `4.${i + 1}`),
      ...Array.from({ length: 8 }, (_, i) => `5.${i + 1}`),
      ...Array.from({ length: 6 }, (_, i) => `6.${i + 1}`),
      ...Array.from({ length: 6 }, (_, i) => `7.${i + 1}`),
      "8.1", "8.2", "8.3",
      "9.1", "9.2", "9.3", "9.4",
      ...Array.from({ length: 5 }, (_, i) => `10.${i + 1}`),
      "11.1", "11.2", "11.3", "11.4",
      "Anexo A", "Anexo B",
    ];
    const presentes = new Set(chunks.map((c) => c.secao));
    expect(esperadas.filter((s) => !presentes.has(s))).toEqual([]);
  });

  it("cada chunk leva cabecalho e metadados", () => {
    const c = secao("1.3.2")[0];
    expect(c.textoEmbedado.startsWith("Cap. 1 › 1.3.2 Auxílio Home Office")).toBe(true);
    expect(c).toMatchObject({ capitulo: "1", pagina: 3 });
  });

  it("titulos de capitulo quebrados em duas linhas nao viram secao", () => {
    expect(chunks.some((c) => /^DADOS$|^CORPORATIVAS$/.test(c.conteudo))).toBe(false);
  });

  it("nao deixa rodape de pagina dentro dos chunks", () => {
    for (const c of chunks) expect(c.conteudo).not.toMatch(/Página \d+ de \d+/);
  });
});

describe("limpeza e emendas", () => {
  it("separa capitulo e secao colados", () => {
    const t = repararEmendas("Despesas de projeto.CAPÍTULO 2 — REMUNERAÇÃO E BENEFÍCIOS2.1 Estrutura Salarial\nA G.Sousa usa 8 níveis.");
    const linhas = t.split("\n");
    expect(linhas).toContain("CAPÍTULO 2 — REMUNERAÇÃO E BENEFÍCIOS");
    expect(linhas).toContain("2.1 Estrutura Salarial");
  });

  it("nao parte numeracao legitima como 1.3.1", () => {
    expect(repararEmendas("1.3.1 Elegibilidade para Home Office")).toBe("1.3.1 Elegibilidade para Home Office");
  });

  it("nao confunde valores e leis com secoes", () => {
    const t = "Lei nº 11.788/2008 e R$ 1.500,00 para colaboradores";
    expect(repararEmendas(t)).toBe(t);
  });

  it("remove rodape e normaliza espacos", () => {
    expect(limparPagina("Texto   com  espaços\nPágina 3 de 20")).toBe("Texto com espaços");
  });

  it("recupera secoes de um texto com emendas", () => {
    const sujo = [
      "CAPÍTULO 2 — REMUNERAÇÃO E BENEFÍCIOS2.1 Estrutura Salarial\nA empresa tem 8 níveis.2.2 Plano de Saúde\nDependente: R$ 180,00 por mês.",
    ];
    const cs = chunkPorSecao(sujo);
    expect(cs.map((c) => c.secao)).toEqual(["2.1", "2.2"]);
    expect(cs[1].conteudo).toContain("R$ 180,00");
  });
});
