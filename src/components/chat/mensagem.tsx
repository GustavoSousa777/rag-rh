"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { MensagemChat } from "@/lib/ai/tipos";
import { IconeCopiar, IconeOk, IconeRefazer, Marca } from "./icones";
import { Fontes, fontesCitadas, fontesRecuperadas } from "./fontes";

function textoDe(m: MensagemChat): string {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

export function MensagemUsuario({ mensagem }: { mensagem: MensagemChat }) {
  return (
    <div className="entrada flex justify-end">
      <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-[22px] rounded-br-md bg-brand px-4 py-2.5 text-[0.98rem] leading-relaxed text-white shadow-[0_6px_18px_-8px_rgba(240,23,43,0.6)] sm:max-w-[75%]">
        {textoDe(mensagem)}
      </div>
    </div>
  );
}

function Pensando({ buscando }: { buscando: boolean }) {
  return (
    <div className="flex items-center gap-2.5 py-1 text-sm text-muted" role="status">
      <span className="flex gap-1" aria-hidden>
        <span className="ponto h-1.5 w-1.5 rounded-full bg-brand" />
        <span className="ponto h-1.5 w-1.5 rounded-full bg-brand" />
        <span className="ponto h-1.5 w-1.5 rounded-full bg-brand" />
      </span>
      {buscando ? "Consultando o manual…" : "Pensando…"}
    </div>
  );
}

export function MensagemAssistente({
  mensagem,
  ativa,
  ultima,
  onRefazer,
}: {
  mensagem: MensagemChat;
  ativa: boolean; // ainda recebendo resposta
  ultima: boolean;
  onRefazer: () => void;
}) {
  const [copiado, setCopiado] = useState(false);
  const texto = textoDe(mensagem);
  const buscando = mensagem.parts.some((p) => p.type === "tool-buscarPolitica" && p.state !== "output-available" && p.state !== "output-error");
  const fontes = ativa ? [] : fontesCitadas(texto, fontesRecuperadas(mensagem));

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      /* clipboard indisponivel (http sem TLS): ignora */
    }
  }

  return (
    <div className="entrada flex gap-3 sm:gap-4">
      <Marca className="mt-0.5 h-7 w-7" />
      <div className="min-w-0 flex-1">
        {texto ? (
          <div className="md">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              disallowedElements={["img"]}
              components={{
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer nofollow">
                    {children}
                  </a>
                ),
                table: ({ children }) => (
                  <div className="tabela">
                    <table>{children}</table>
                  </div>
                ),
              }}
            >
              {texto}
            </ReactMarkdown>
          </div>
        ) : (
          ativa && <Pensando buscando={buscando} />
        )}
        {ativa && texto && buscando && <Pensando buscando />}
        <Fontes fontes={fontes} />
        {!ativa && texto && (
          <div className="mt-3 flex items-center gap-1 text-muted">
            <button
              type="button"
              onClick={copiar}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[0.8rem] transition-colors hover:bg-brand-50 hover:text-brand-strong"
            >
              {copiado ? <IconeOk className="h-4 w-4" /> : <IconeCopiar className="h-4 w-4" />}
              {copiado ? "Copiado" : "Copiar"}
            </button>
            {ultima && (
              <button
                type="button"
                onClick={onRefazer}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[0.8rem] transition-colors hover:bg-brand-50 hover:text-brand-strong"
              >
                <IconeRefazer className="h-4 w-4" />
                Gerar de novo
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
