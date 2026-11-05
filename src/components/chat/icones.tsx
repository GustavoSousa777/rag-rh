type P = { className?: string };
const base = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export const IconeEnviar = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);
export const IconeParar = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden>
    <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" />
  </svg>
);
export const IconeMais = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const IconeMenu = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);
export const IconeFechar = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const IconeCopiar = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <rect x="9" y="9" width="11" height="11" rx="2.5" />
    <path d="M5 15V6.5A1.5 1.5 0 0 1 6.5 5H15" />
  </svg>
);
export const IconeOk = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
export const IconeRefazer = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />
  </svg>
);
export const IconeLivro = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base}>
    <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5v-15zM5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3" />
  </svg>
);

export function Marca({ className = "h-8 w-8" }: P) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-[10px] bg-brand text-white shadow-[0_2px_10px_-2px_rgba(240,23,43,0.55)] ${className}`} aria-hidden>
      <svg viewBox="0 0 24 24" className="h-[58%] w-[58%]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6a2.5 2.5 0 0 1-2.5 2.5H11l-4 3.5V15h-.5A1.5 1.5 0 0 1 5 13.5z" />
        <path d="M9 9h6M9 12h3.5" />
      </svg>
    </span>
  );
}
