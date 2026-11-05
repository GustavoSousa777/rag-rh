import type { MensagemChat } from "@/lib/ai/tipos";

export type Fonte = { secao: string; titulo: string; pagina: number };

/** Seções devolvidas pela ferramenta, sem repetição, na ordem de relevância. */
export function fontesRecuperadas(m: MensagemChat): Fonte[] {
  const vistas = new Map<string, Fonte>();
  for (const parte of m.parts) {
    if (parte.type !== "tool-buscarPolitica" || parte.state !== "output-available") continue;
    for (const t of parte.output) {
      if (!vistas.has(t.secao)) vistas.set(t.secao, { secao: t.secao, titulo: t.titulo, pagina: t.pagina });
    }
  }
  return [...vistas.values()];
}

/** Mantém só as seções que a resposta de fato cita (ex.: "seção 2.2"), sem confundir 1.3 com 1.3.2. */
export function fontesCitadas(texto: string, fontes: Fonte[]): Fonte[] {
  return fontes.filter((f) => {
    const re = new RegExp(`(?<![\\d.])${f.secao.replace(/\./g, "\\.")}(?!\\d|\\.\\d)`);
    return re.test(texto);
  });
}

export function Fontes({ fontes }: { fontes: Fonte[] }) {
  if (fontes.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Fontes no manual">
      <span className="text-[0.8rem] font-medium text-muted">Fontes</span>
      {fontes.map((f) => (
        <span
          key={f.secao}
          title={`Seção ${f.secao}, página ${f.pagina}`}
          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[0.8rem] text-brand-strong"
        >
          <span className="font-semibold tabular-nums">{/^\d/.test(f.secao) ? `§ ${f.secao}` : f.secao}</span>
          <span className="truncate text-ink/80">{f.titulo}</span>
          <span className="shrink-0 text-muted tabular-nums">p. {f.pagina}</span>
        </span>
      ))}
    </div>
  );
}
