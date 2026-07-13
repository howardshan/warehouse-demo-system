"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export async function setLocaleAction(locale: string) {
  if (!isLocale(locale)) return { ok: false as const };
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return { ok: true as const, messages: getDictionary(locale as Locale) };
}

export async function getRequestLocale(): Promise<Locale> {
  const jar = await cookies();
  const v = jar.get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : "zh";
}
