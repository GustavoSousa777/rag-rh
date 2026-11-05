import "server-only";
import { tool } from "ai";
import { z } from "zod";
import { buscarTrechos } from "@/lib/rag/retriever";

export const buscarPolitica = tool({
  description:
    "Busca trechos do Manual de Políticas de RH da G.Sousa. Use para qualquer pergunta sobre regras, benefícios, prazos, valores, licenças, conduta ou segurança. A consulta deve ser completa e autônoma, sem depender do histórico.",
  inputSchema: z.object({
    consulta: z.string().min(3).max(300).describe("Consulta reescrita, em português, com os termos-chave do tema"),
  }),
  execute: async ({ consulta }) => {
    const trechos = await buscarTrechos(consulta, { k: 5 });
    return trechos.map((t) => ({
      secao: t.secao,
      titulo: t.titulo,
      pagina: t.pagina,
      trecho: t.conteudo,
      similaridade: Number(t.similaridade.toFixed(3)),
    }));
  },
});
