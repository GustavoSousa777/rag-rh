import { describe, expect, it } from "vitest";
import { fontesCitadas } from "@/components/chat/fontes";

const f = (secao: string) => ({ secao, titulo: "x", pagina: 1 });

describe("fontesCitadas", () => {
  it("mostra so as secoes citadas na resposta", () => {
    const r = fontesCitadas("Custa R$ 225,00 (seções 2.2 e 2.3).", [f("2.2"), f("2.3"), f("2.4")]);
    expect(r.map((x) => x.secao)).toEqual(["2.2", "2.3"]);
  });

  it("nao confunde 1.3 com 1.3.2 nem com 11.3", () => {
    expect(fontesCitadas("Veja a seção 1.3.2.", [f("1.3")])).toEqual([]);
    expect(fontesCitadas("Veja a seção 11.3.", [f("1.3")])).toEqual([]);
    expect(fontesCitadas("Veja a seção 1.3.", [f("1.3")])).toHaveLength(1);
  });
});
