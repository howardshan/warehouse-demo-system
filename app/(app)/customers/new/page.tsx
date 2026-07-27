import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { CustomerCreateForm } from "../customer-form";

export default async function NewCustomerPage() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t(messages, "pg.customers.newCustomer")}</h1>
        <p className="mt-1 text-sm text-stone-500">
          {t(messages, "pg.customers.newCustomerHint")}
        </p>
      </div>
      <CustomerCreateForm />
    </div>
  );
}
