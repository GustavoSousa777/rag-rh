import type { InferUITools, UIMessage } from "ai";
import type { buscarPolitica } from "./tools";

export type Ferramentas = InferUITools<{ buscarPolitica: typeof buscarPolitica }>;
export type MensagemChat = UIMessage<never, never, Ferramentas>;
