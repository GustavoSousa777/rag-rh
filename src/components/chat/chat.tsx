"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import type { MensagemChat } from "@/lib/ai/tipos";
import { Composer } from "./composer";
import { IconeMenu, Marca } from "./icones";
import { MensagemAssistente, MensagemUsuario } from "./mensagem";
import { PERGUNTAS_FREQUENTES, Sidebar } from "./sidebar";

const SUGESTOES = [
  { titulo: "Home office", texto: PERGUNTAS_FREQUENTES[0] },
  { titulo: "Benefícios", texto: PERGUNTAS_FREQUENTES[2] },
  { titulo: "Férias e licenças", texto: PERGUNTAS_FREQUENTES[3] },
  { titulo: "Segurança de dados", texto: PERGUNTAS_FREQUENTES[4] },
];

export function Chat() {
  const { messages, sendMessage, status, stop, setMessages, regenerate, error, clearError } = useChat<MensagemChat>();
  const [menu, setMenu] = useState(false);
  const [foco, setFoco] = useState(0);
  const fim = useRef<HTMLDivElement>(null);
  const rolagem = useRef<HTMLDivElement>(null);
  const colado = useRef(true);

  const ocupado = status === "submitted" || status === "streaming";

  const enviar = useCallback(
    (texto: string) => {
      colado.current = true;
      clearError();
      void sendMessage({ text: texto });
    },
    [sendMessage, clearError],
  );

  // Acompanha o fim da conversa, a menos que a pessoa tenha rolado para cima.
  useEffect(() => {
    if (colado.current) fim.current?.scrollIntoView({ block: "end" });
  }, [messages, status]);

  function aoRolar() {
    const el = rolagem.current;
    if (!el) return;
    colado.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  function novaConversa() {
    stop();
    setMessages([]);
    clearError();
    setFoco((n) => n + 1);
  }

  const vazio = messages.length === 0;
  const ultima = messages.at(-1);
  const aguardando = status === "submitted" && ultima?.role === "user";

  return (
    <div className="flex h-dvh bg-white">
      <Sidebar aberta={menu} onFechar={() => setMenu(false)} onNova={novaConversa} onPergunta={enviar} desabilitado={ocupado} />

      <main className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 px-4 py-3 md:px-6">
          <button type="button" onClick={() => setMenu(true)} aria-label="Abrir menu" className="rounded-lg p-1.5 text-ink hover:bg-wash md:hidden">
            <IconeMenu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 text-[0.9rem] font-medium">
            <span className="h-2 w-2 rounded-full bg-brand" aria-hidden />
            Manual de Políticas · v2026.1
          </div>
        </header>

        <div ref={rolagem} onScroll={aoRolar} className="flex-1 overflow-y-auto">
          {vazio ? (
            <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center px-4 pb-10 text-center sm:px-6">
              <Marca className="h-14 w-14 rounded-2xl" />
              <h1 className="mt-6 text-balance text-[1.75rem] font-semibold tracking-tight sm:text-[2rem]">Como posso ajudar com o RH hoje?</h1>
              <p className="mt-2 max-w-md text-balance text-[0.95rem] text-muted">
                Respondo com base no Manual de Políticas Internas e indico a seção de cada resposta.
              </p>
              <div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
                {SUGESTOES.map((s) => (
                  <button
                    key={s.titulo}
                    type="button"
                    onClick={() => enviar(s.texto)}
                    className="group rounded-2xl border border-line bg-white p-4 text-left transition-all hover:border-brand hover:bg-brand-50 hover:shadow-[0_10px_28px_-16px_rgba(240,23,43,0.55)]"
                  >
                    <span className="text-[0.82rem] font-semibold text-brand-strong">{s.titulo}</span>
                    <span className="mt-1 block text-[0.92rem] leading-snug text-ink/85">{s.texto}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-3xl space-y-7 px-4 py-6 sm:px-6" role="log" aria-live="polite" aria-label="Conversa">
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <MensagemUsuario key={m.id} mensagem={m} />
                ) : (
                  <MensagemAssistente
                    key={m.id}
                    mensagem={m}
                    ativa={ocupado && i === messages.length - 1}
                    ultima={i === messages.length - 1}
                    onRefazer={() => {
                      colado.current = true;
                      void regenerate();
                    }}
                  />
                ),
              )}
              {aguardando && (
                <div className="flex gap-3 sm:gap-4" role="status">
                  <Marca className="mt-0.5 h-7 w-7" />
                  <div className="flex items-center gap-1 py-2" aria-label="Pensando">
                    <span className="ponto h-1.5 w-1.5 rounded-full bg-brand" />
                    <span className="ponto h-1.5 w-1.5 rounded-full bg-brand" />
                    <span className="ponto h-1.5 w-1.5 rounded-full bg-brand" />
                  </div>
                </div>
              )}
              {error && (
                <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-[0.9rem] text-brand-strong">
                  <span>{error.message || "Não consegui responder agora."}</span>
                  <button
                    type="button"
                    onClick={() => {
                      clearError();
                      void regenerate();
                    }}
                    className="rounded-lg bg-brand px-3 py-1.5 text-[0.82rem] font-medium text-white hover:bg-brand-strong"
                  >
                    Tentar de novo
                  </button>
                </div>
              )}
              <div ref={fim} />
            </div>
          )}
        </div>

        <Composer ocupado={ocupado} onEnviar={enviar} onParar={stop} foco={foco} />
      </main>
    </div>
  );
}
