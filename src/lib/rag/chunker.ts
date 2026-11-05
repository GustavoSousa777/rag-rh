import { juntarLinhas, limparPagina, repararEmendas } from "./limpeza";

export type Chunk = {
  capitulo: string; // "1", "2", ..., "Anexo A", "Capa", "Final"
  secao: string; // "1.3.2", "Anexo A"...
  titulo: string; // "Auxílio Home Office"
  pagina: number;
  parte: number; // 1 quando a secao cabe em um chunk
  conteudo: string; // texto da secao
  textoEmbedado: string; // cabecalho + conteudo, e o que vai para o embedding
};

type Opcoes = { maxChars?: number };

const MAIUSCULA = "A-ZÁÉÍÓÚÂÊÔÃÕÇ";
const RE_CAPITULO = /^CAPÍTULO\s+(\d{1,2})\s*[—–-]\s*(.+)$/;
const RE_ANEXO = /^ANEXO\s+([A-Z])\s*[—–-]\s*(.+)$/;
const RE_SECAO = new RegExp(`^(\\d{1,2}\\.\\d{1,2}(?:\\.\\d{1,2})?)\\s+([${MAIUSCULA}].*)$`);
const RE_FINAIS = /^DISPOSIÇÕES FINAIS$/;
const RE_SO_MAIUSCULAS = new RegExp(`^[${MAIUSCULA}0-9 ,&/-]+$`);

type Secao = { capitulo: string; secao: string; titulo: string; pagina: number; linhas: string[] };

function tituloCapitulo(titulo: string) {
  const t = titulo.trim().toLocaleLowerCase("pt-BR");
  return t.charAt(0).toLocaleUpperCase("pt-BR") + t.slice(1);
}

/** Divide o texto de uma secao em partes de no maximo maxChars, quebrando so entre paragrafos. */
function dividir(texto: string, maxChars: number): string[] {
  if (texto.length <= maxChars) return [texto];
  const partes: string[] = [];
  let atual = "";
  for (const par of texto.split("\n")) {
    if (atual && atual.length + par.length + 1 > maxChars) {
      partes.push(atual);
      atual = par;
    } else {
      atual = atual ? `${atual}\n${par}` : par;
    }
  }
  if (atual) partes.push(atual);
  return partes;
}

function cabecalho(c: { capitulo: string; secao: string; titulo: string }): string {
  const cap = /^\d+$/.test(c.capitulo) ? `Cap. ${c.capitulo}` : c.capitulo === "Capa" ? "Capa" : c.capitulo;
  if (c.secao === c.capitulo || c.secao === "Capa") return `${cap} › ${c.titulo}`;
  return `${cap} › ${c.secao} ${c.titulo}`;
}

/** Gera um chunk por secao (subsecoes separadas), partindo so as longas. */
export function chunkPorSecao(paginas: string[], opcoes: Opcoes = {}): Chunk[] {
  const maxChars = opcoes.maxChars ?? 1500;
  const secoes: Secao[] = [];
  let atual: Secao = { capitulo: "Capa", secao: "Capa", titulo: "Identificação do manual", pagina: 1, linhas: [] };
  let capituloAtual = "Capa";
  let ultimaSecaoNum: number[] = [];

  const fechar = () => {
    if (atual.linhas.some((l) => l.trim())) secoes.push(atual);
  };

  paginas.forEach((bruto, i) => {
    const pagina = i + 1;
    const linhas = repararEmendas(limparPagina(bruto)).split("\n");
    for (let j = 0; j < linhas.length; j++) {
      const linha = linhas[j].trim();
      if (!linha) continue;

      const cap = RE_CAPITULO.exec(linha);
      if (cap) {
        fechar();
        let titulo = cap[2];
        while (j + 1 < linhas.length && RE_SO_MAIUSCULAS.test(linhas[j + 1].trim()) && !RE_SECAO.test(linhas[j + 1].trim())) {
          titulo += ` ${linhas[++j].trim()}`;
        }
        capituloAtual = cap[1];
        ultimaSecaoNum = [];
        atual = { capitulo: capituloAtual, secao: `Cap. ${cap[1]}`, titulo: tituloCapitulo(titulo), pagina, linhas: [] };
        continue;
      }

      const anexo = RE_ANEXO.exec(linha);
      if (anexo) {
        fechar();
        capituloAtual = `Anexo ${anexo[1]}`;
        atual = { capitulo: capituloAtual, secao: capituloAtual, titulo: tituloCapitulo(anexo[2]), pagina, linhas: [] };
        continue;
      }

      if (RE_FINAIS.test(linha)) {
        fechar();
        capituloAtual = "Final";
        atual = { capitulo: "Final", secao: "Final", titulo: "Disposições finais", pagina, linhas: [] };
        continue;
      }

      const sec = RE_SECAO.exec(linha);
      if (sec && /^\d+$/.test(capituloAtual) && sec[1].split(".")[0] === capituloAtual && avanca(ultimaSecaoNum, sec[1])) {
        fechar();
        ultimaSecaoNum = sec[1].split(".").map(Number);
        atual = { capitulo: capituloAtual, secao: sec[1], titulo: sec[2].trim(), pagina, linhas: [] };
        continue;
      }

      atual.linhas.push(linha);
    }
  });
  fechar();

  const chunks: Chunk[] = [];
  for (const s of secoes) {
    // Cabecalho de capitulo sem corpo proprio nao vira chunk (so "Cap. N" vazio).
    const corpo = juntarLinhas(s.linhas);
    if (!corpo) continue;
    const secao = s.secao.startsWith("Cap. ") ? s.capitulo : s.secao;
    const titulo = s.titulo;
    const partes = dividir(corpo, maxChars);
    partes.forEach((conteudo, idx) => {
      const base = cabecalho({ capitulo: s.capitulo, secao, titulo });
      const sufixo = partes.length > 1 ? ` (parte ${idx + 1}/${partes.length})` : "";
      chunks.push({
        capitulo: s.capitulo,
        secao,
        titulo,
        pagina: s.pagina,
        parte: idx + 1,
        conteudo,
        textoEmbedado: `${base}${sufixo}\n\n${conteudo}`,
      });
    });
  }
  return chunks;
}

/** A numeracao de secoes so avanca dentro do capitulo (1.3 -> 1.3.1 -> 1.4), o que descarta falsos positivos. */
function avanca(anterior: number[], proxima: string): boolean {
  if (anterior.length === 0) return true;
  const n = proxima.split(".").map(Number);
  for (let i = 0; i < Math.max(n.length, anterior.length); i++) {
    const a = anterior[i] ?? -1;
    const b = n[i] ?? -1;
    if (b > a) return true;
    if (b < a) return false;
  }
  return false;
}
