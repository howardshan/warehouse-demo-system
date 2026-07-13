import type { Locale } from "./config";
import zh from "@/messages/zh.json";
import en from "@/messages/en.json";
import esMX from "@/messages/es-MX.json";

const DICTS = {
  zh,
  en,
  "es-MX": esMX,
} as const;

export type Messages = typeof zh;

export function getDictionary(locale: Locale): Messages {
  return DICTS[locale] ?? DICTS.zh;
}

export function t(
  messages: Messages,
  path: string,
  fallback?: string,
): string {
  const parts = path.split(".");
  let cur: unknown = messages;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return fallback ?? path;
    }
  }
  return typeof cur === "string" ? cur : (fallback ?? path);
}
