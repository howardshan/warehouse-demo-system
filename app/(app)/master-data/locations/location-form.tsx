"use client";

import { useState, useTransition } from "react";
import { createLocation } from "@/app/actions/master-data";
import { LOCATION_TYPES, TEMP_ZONES } from "@/lib/domain/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { useI18n } from "@/components/i18n/provider";

export function LocationCreateForm() {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">
          {t("pg.masterData.locations.form.newTitle")}
        </h2>
        <p className="text-sm text-stone-500">
          {t("pg.masterData.locations.form.newHint")}
        </p>
      </CardHeader>
      <CardBody>
        <form
          className="grid gap-4 md:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setError(null);
            start(async () => {
              const res = await createLocation({
                code: String(fd.get("code")),
                type: String(fd.get("type")),
                temp_zone: String(fd.get("temp_zone")),
                is_active: true,
              });
              if (!res.ok) setError(res.error);
              else e.currentTarget.reset();
            });
          }}
        >
          <div>
            <Label>{t("pg.masterData.common.code")}</Label>
            <Input name="code" placeholder="PF-A01" required />
          </div>
          <div>
            <Label>{t("pg.masterData.locations.typeHeader")}</Label>
            <Select name="type" defaultValue="pick_face">
              {LOCATION_TYPES.map((lt) => (
                <option key={lt} value={lt}>
                  {lt}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{t("pg.masterData.common.tempZone")}</Label>
            <Select name="temp_zone" defaultValue="chilled">
              {TEMP_ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </Select>
          </div>
          {error && (
            <p className="md:col-span-3 text-sm text-red-700">{error}</p>
          )}
          <div className="md:col-span-3">
            <Button type="submit" disabled={pending}>
              {pending
                ? t("pg.masterData.common.saving")
                : t("pg.masterData.common.create")}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
