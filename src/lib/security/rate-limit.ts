/** Limitador de janela deslizante em memoria. Basta para um unico container; com varias replicas, use Redis. */
export class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(
    private readonly max: number,
    private readonly janelaMs: number,
  ) {}

  permitir(chave: string, agora = Date.now()): boolean {
    const recentes = (this.hits.get(chave) ?? []).filter((t) => agora - t < this.janelaMs);
    if (recentes.length >= this.max) {
      this.hits.set(chave, recentes);
      return false;
    }
    recentes.push(agora);
    this.hits.set(chave, recentes);
    if (this.hits.size > 10_000) this.limpar(agora);
    return true;
  }

  private limpar(agora: number) {
    for (const [k, v] of this.hits) {
      if (v.every((t) => agora - t >= this.janelaMs)) this.hits.delete(k);
    }
  }
}

/** Atras do Caddy, o IP real e o ultimo item de X-Forwarded-For (o proxy acrescenta o seu). */
export function ipDe(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",").at(-1)!.trim() || "desconhecido";
  return req.headers.get("x-real-ip") ?? "desconhecido";
}
