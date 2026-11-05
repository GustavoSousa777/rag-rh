"use client";

import { useEffect, useRef, useState } from "react";
import { IconeEnviar, IconeParar } from "./icones";

const MAX = 1000;

export function Composer({
  ocupado,
  onEnviar,
  onParar,
  foco,
}: {
  ocupado: boolean;
  onEnviar: (texto: string) => void;
  onParar: () => void;
  foco: number; // muda para devolver o foco ao campo
}) {
  const [valor, setValor] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, [foco]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 176)}px`;
  }, [valor]);

  function enviar() {
    const t = valor.trim();
    if (!t || ocupado) return;
    onEnviar(t);
    setValor("");
  }

  const pode = valor.trim().length > 0 && !ocupado;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-3 sm:px-6">
      <div className="flex items-end gap-2 rounded-[28px] border border-line bg-white p-2 pl-5 shadow-[0_8px_30px_-12px_rgba(27,27,32,0.18)] transition-colors focus-within:border-brand focus-within:shadow-[0_8px_30px_-10px_rgba(240,23,43,0.35)]">
        <textarea
          ref={ref}
          value={valor}
          rows={1}
          maxLength={MAX}
          placeholder="Pergunte sobre benefícios, férias, reembolsos…"
          aria-label="Sua pergunta"
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              enviar();
            }
          }}
          className="max-h-44 min-h-[2.5rem] flex-1 resize-none bg-transparent py-2 text-[0.98rem] leading-6 text-ink outline-none placeholder:text-muted/80"
        />
        {ocupado ? (
          <button
            type="button"
            onClick={onParar}
            aria-label="Parar resposta"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-white transition-transform hover:scale-105"
          >
            <IconeParar className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={enviar}
            disabled={!pode}
            aria-label="Enviar pergunta"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-[0_6px_16px_-6px_rgba(240,23,43,0.8)] transition-all hover:bg-brand-strong enabled:hover:scale-105 disabled:bg-brand-100 disabled:text-brand-200 disabled:shadow-none"
          >
            <IconeEnviar className="h-5 w-5" />
          </button>
        )}
      </div>
      <p className="mt-2 text-center text-[0.75rem] text-muted">
        {valor.length > MAX * 0.8 ? `${valor.length}/${MAX} · ` : ""}O assistente pode errar. Em caso de dúvida, confirme com o RH (ramal 5000).
      </p>
    </div>
  );
}
