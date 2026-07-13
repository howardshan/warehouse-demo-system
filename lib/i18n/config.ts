export type Locale = "zh" | "en" | "es-MX";

export const LOCALES: { code: Locale; label: string }[] = [
  { code: "zh", label: "中文" },
  { code: "en", label: "English" },
  { code: "es-MX", label: "Español (MX)" },
];

export const DEFAULT_LOCALE: Locale = "zh";
export const LOCALE_COOKIE = "wd_locale";

export function isLocale(v: string | undefined | null): v is Locale {
  return v === "zh" || v === "en" || v === "es-MX";
}
