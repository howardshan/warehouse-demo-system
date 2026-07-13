"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import type { Locale } from "@/lib/i18n/config";
import { LOCALES } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/dictionaries";
import { t as translate } from "@/lib/i18n/dictionaries";
import { setLocaleAction } from "@/app/actions/i18n";

type Ctx = {
  locale: Locale;
  messages: Messages;
  t: (path: string) => string;
  setLocale: (locale: Locale) => void;
  pending: boolean;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  const [current, setCurrent] = useState(locale);
  const [msgs, setMsgs] = useState(messages);
  const [pending, start] = useTransition();

  useEffect(() => {
    setCurrent(locale);
    setMsgs(messages);
  }, [locale, messages]);

  const setLocale = useCallback((next: Locale) => {
    start(async () => {
      const res = await setLocaleAction(next);
      if (res?.messages) {
        setCurrent(next);
        setMsgs(res.messages);
      }
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      locale: current,
      messages: msgs,
      t: (path: string) => translate(msgs, path),
      setLocale,
      pending,
    }),
    [current, msgs, setLocale, pending],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function LanguageSwitcher() {
  const { locale, setLocale, t, pending } = useI18n();
  return (
    <label className="flex items-center gap-2 text-sm text-stone-600">
      <span className="hidden sm:inline">{t("app.language")}</span>
      <select
        className="h-8 rounded-md border border-stone-300 bg-white px-2 text-sm"
        value={locale}
        disabled={pending}
        onChange={(e) => setLocale(e.target.value as Locale)}
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
