const MAIUSCULA = "A-ZÁÉÍÓÚÂÊÔÃÕÇ";
const MINUSCULA = "a-záéíóúâêôãõç";

/** Remove rodapes "Página N de M" e caracteres invisiveis; normaliza espacos e quebras de linha. */
export function limparPagina(texto: string): string {
  return texto
    .normalize("NFC")
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, " ")
    .replace(/^\s*P[aá]gina\s+\d+\s+de\s+\d+\s*$/gim, "")
    .replace(/[ \u00A0]{2,}/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/**
 * Separa emendas que alguns extratores produzem nas quebras de pagina e de capitulo,
 * como "BENEFICIOS2.1 Estrutura Salarial" ou "...pontoCAPITULO 3 — FERIAS".
 * Insere uma quebra de linha antes do cabecalho colado.
 */
export function repararEmendas(texto: string): string {
  return texto
    .replace(new RegExp(`(?<=[^\\n])(?=CAPÍTULO\\s+\\d{1,2}\\s*[—–-])`, "g"), "\n")
    .replace(
      // O cabecalho colado vem logo apos uma letra ("BENEFÍCIOS2.1") ou apos letra + pontuacao ("contratual.2.1").
      // Um digito antes do ponto ("1.3.1") nunca conta, para nao partir numeracoes legitimas.
      new RegExp(
        `(?<=[${MAIUSCULA}${MINUSCULA}]|[${MAIUSCULA}${MINUSCULA}][.;:)])(\\d{1,2}\\.\\d{1,2}(?:\\.\\d{1,2})?)(?=\\s+[${MAIUSCULA}][${MINUSCULA}])`,
        "g",
      ),
      "\n$1",
    );
}

/** Une linhas quebradas pelo layout do PDF em paragrafos; cada "•" abre um paragrafo novo. */
export function juntarLinhas(linhas: string[]): string {
  const paragrafos: string[] = [];
  for (const linha of linhas) {
    const t = linha.trim();
    if (!t) continue;
    const anterior = paragrafos[paragrafos.length - 1];
    const abre = t.startsWith("•") || anterior === undefined || /[.;:!?]$/.test(anterior);
    if (abre) paragrafos.push(t);
    else paragrafos[paragrafos.length - 1] = `${anterior} ${t}`;
  }
  return paragrafos.join("\n");
}
