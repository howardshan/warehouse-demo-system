"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createProductCategory,
  updateProductCategory,
} from "@/app/actions/master-data";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function ProductCategoryCreateForm() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">新增分类</h2>
      </CardHeader>
      <CardBody>
        <form
          className="grid gap-4 md:grid-cols-4"
          onSubmit={(e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            setError(null);
            start(async () => {
              const res = await createProductCategory({
                code: String(fd.get("code")),
                name: String(fd.get("name")),
                sort_order: Number(fd.get("sort_order") || 0),
                is_active: true,
              });
              if (!res.ok) setError(res.error);
              else {
                form.reset();
                router.refresh();
              }
            });
          }}
        >
          <div>
            <Label required>编码</Label>
            <Input
              name="code"
              placeholder="VEG"
              pattern="[A-Za-z0-9]+([_-][A-Za-z0-9]+)*"
              required
            />
          </div>
          <div>
            <Label required>名称</Label>
            <Input name="name" placeholder="蔬菜" required />
          </div>
          <div>
            <Label>排序</Label>
            <Input name="sort_order" type="number" defaultValue={0} />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={pending}>
              {pending ? "保存中…" : "创建分类"}
            </Button>
          </div>
          {error && (
            <p className="md:col-span-4 text-sm text-red-700">{error}</p>
          )}
        </form>
      </CardBody>
    </Card>
  );
}

export function ProductCategoryEditForm({
  category,
}: {
  category: {
    id: string;
    code: string;
    name: string;
    sort_order: number;
    is_active: boolean;
  };
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <form
      className="grid gap-2 md:grid-cols-5 md:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          const res = await updateProductCategory(category.id, {
            code: String(fd.get("code")),
            name: String(fd.get("name")),
            sort_order: Number(fd.get("sort_order") || 0),
            is_active: String(fd.get("status")) !== "off",
          });
          if (!res.ok) setError(res.error);
          else router.refresh();
        });
      }}
    >
      <div>
        <Label required>编码</Label>
        <Input name="code" defaultValue={category.code} required />
      </div>
      <div>
        <Label required>名称</Label>
        <Input name="name" defaultValue={category.name} required />
      </div>
      <div>
        <Label>排序</Label>
        <Input
          name="sort_order"
          type="number"
          defaultValue={category.sort_order}
        />
      </div>
      <div>
        <Label>状态</Label>
        <Select name="status" defaultValue={category.is_active ? "on" : "off"}>
          <option value="on">启用</option>
          <option value="off">停用</option>
        </Select>
      </div>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "…" : "保存"}
        </Button>
        {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
      </div>
    </form>
  );
}
