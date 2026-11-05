import { readFile } from "node:fs/promises";
import { extractText, getDocumentProxy } from "unpdf";

/** Extrai o texto de cada pagina do PDF (deterministico, sem LLM). */
export async function lerPaginasPdf(caminho: string): Promise<string[]> {
  const buffer = new Uint8Array(await readFile(caminho));
  const pdf = await getDocumentProxy(buffer);
  const { text } = await extractText(pdf, { mergePages: false });
  return Array.isArray(text) ? text : [text];
}
