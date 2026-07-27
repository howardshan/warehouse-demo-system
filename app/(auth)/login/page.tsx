import { Suspense } from "react";
import LoginForm from "./login-form";
import { I18nProvider } from "@/components/i18n/provider";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";

export default async function LoginPage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  return (
    <I18nProvider locale={locale} messages={messages}>
      <Suspense
        fallback={
          <div className="p-8 text-center">
            {t(messages, "pg.login.loading")}
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </I18nProvider>
  );
}
