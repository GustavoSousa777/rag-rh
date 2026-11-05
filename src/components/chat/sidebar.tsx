"use client";

import { IconeFechar, IconeLivro, IconeMais, Marca } from "./icones";

export const PERGUNTAS_FREQUENTES = [
  "Quantos dias de home office posso fazer por semana?",
  "Qual o auxílio home office para quem é 100% remoto?",
  "Quanto custa incluir meu cônjuge nos planos de saúde e odontológico?",
  "Posso dividir minhas férias?",
  "Qual o prazo para avisar sobre um incidente com dados pessoais?",
  "Qual o limite de presentes de fornecedores?",
];

export function Sidebar({
  aberta,
  onFechar,
  onNova,
  onPergunta,
  desabilitado,
}: {
  aberta: boolean;
  onFechar: () => void;
  onNova: () => void;
  onPergunta: (p: string) => void;
  desabilitado: boolean;
}) {
  return (
    <>
      {aberta && <div className="fixed inset-0 z-30 bg-ink/30 backdrop-blur-[1px] md:hidden" onClick={onFechar} aria-hidden />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-line bg-white transition-transform duration-200 md:static md:translate-x-0 ${aberta ? "translate-x-0" : "-translate-x-full"}`}
        aria-label="Navegação"
      >
        <div className="flex items-center justify-between px-4 pb-3 pt-4">
          <div className="flex items-center gap-2.5">
            <Marca className="h-8 w-8" />
            <div className="leading-tight">
              <p className="text-[0.95rem] font-semibold tracking-tight">Assistente de RH</p>
              <p className="text-[0.75rem] text-muted">G.Sousa Consultoria em IA</p>
            </div>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar menu" className="rounded-lg p-1.5 text-muted hover:bg-wash md:hidden">
            <IconeFechar className="h-5 w-5" />
          </button>
        </div>

        <div className="px-3">
          <button
            type="button"
            onClick={() => {
              onNova();
              onFechar();
            }}
            className="flex w-full items-center gap-2 rounded-xl bg-brand px-3.5 py-2.5 text-[0.9rem] font-medium text-white shadow-[0_6px_16px_-8px_rgba(240,23,43,0.8)] transition-colors hover:bg-brand-strong"
          >
            <IconeMais className="h-4 w-4" />
            Nova conversa
          </button>
        </div>

        <nav className="mt-5 flex-1 overflow-y-auto px-3" aria-label="Perguntas frequentes">
          <p className="px-2 pb-1.5 text-[0.78rem] font-medium text-muted">Perguntas frequentes</p>
          <ul className="space-y-0.5">
            {PERGUNTAS_FREQUENTES.map((p) => (
              <li key={p}>
                <button
                  type="button"
                  disabled={desabilitado}
                  onClick={() => {
                    onPergunta(p);
                    onFechar();
                  }}
                  className="w-full rounded-lg px-2.5 py-2 text-left text-[0.86rem] leading-snug text-ink/85 transition-colors hover:bg-brand-50 hover:text-brand-strong disabled:opacity-50"
                >
                  {p}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="m-3 flex items-start gap-2.5 rounded-xl border border-line bg-wash p-3 text-[0.78rem] leading-snug text-muted">
          <IconeLivro className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <p>
            Base: Manual de Políticas Internas 2026.1. Documento fictício, criado para demonstração.
          </p>
        </div>
      </aside>
    </>
  );
}
