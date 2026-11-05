import "server-only";
import { google } from "@ai-sdk/google";
import { getEnv } from "@/lib/env";

export function modeloChat() {
  return google(getEnv().GEMINI_MODEL);
}
