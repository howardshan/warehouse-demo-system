import { z } from "zod";

export const TEMP_ZONES = ["ambient", "chilled", "frozen"] as const;
export const ORDERING_UOMS = ["case", "bag", "lb", "pc", "box"] as const;
export const LOCATION_TYPES = [
  "pick_face",
  "reserve",
  "overflow",
  "staging",
  "quarantine",
  "receiving_dock",
] as const;
export const INSPECTION_METHODS = ["skip", "sampling", "full"] as const;
export const CREDIT_STATUSES = [
  "ok",
  "warning",
  "over_limit",
  "hold_new_orders",
  "full_block",
  "cod_only",
] as const;

export const productSchema = z
  .object({
    sku: z
      .string()
      .min(1, "SKU 必填")
      .transform((value) => value.trim().toUpperCase())
      .refine(
        (value) => /^[A-Z0-9]+(?:[_-][A-Z0-9]+)*$/.test(value),
        "SKU 须为字母数字编码（可用 - 或 _ 分隔），例如 GARLIC-CASE",
      ),
    name: z.string().min(1, "销售产品名称必填"),
    temp_zone: z.enum(TEMP_ZONES),
    is_catch_weight: z.boolean(),
    ordering_uom: z.enum(ORDERING_UOMS),
    pricing_uom: z.string().min(1),
    avg_weight_lb: z.coerce.number().positive().nullable().optional(),
    current_price: z.coerce.number().min(0),
    inspection_method: z.enum(INSPECTION_METHODS),
    fixed_pick_location_id: z.string().uuid().nullable().optional(),
    shelf_life_days: z.coerce.number().int().positive().nullable().optional(),
    is_active: z.boolean().default(true),
    family_id: z.string().uuid().nullable().optional(),
    pack_contains_qty: z.coerce.number().positive().default(1),
    family_code: z.string().optional().nullable(),
    family_name: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.is_catch_weight) {
      if (data.pricing_uom !== "lb") {
        ctx.addIssue({
          code: "custom",
          path: ["pricing_uom"],
          message: "称重品 pricing_uom 必须为 lb",
        });
      }
      if (data.ordering_uom === data.pricing_uom) {
        ctx.addIssue({
          code: "custom",
          path: ["ordering_uom"],
          message: "称重品订货单位与计价单位必须不同",
        });
      }
      if (data.avg_weight_lb == null) {
        ctx.addIssue({
          code: "custom",
          path: ["avg_weight_lb"],
          message: "称重品必须填均重(仅预估用,不会填入实重)",
        });
      }
    } else if (data.avg_weight_lb != null) {
      ctx.addIssue({
        code: "custom",
        path: ["avg_weight_lb"],
        message: "非称重品不应填写 avg_weight_lb",
      });
    }
  });

export const supplierSchema = z.object({
  name: z.string().min(1),
  contact: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

export const locationSchema = z.object({
  code: z.string().min(1),
  type: z.enum(LOCATION_TYPES),
  temp_zone: z.enum(TEMP_ZONES),
  is_active: z.boolean().default(true),
});

export const toteSchema = z.object({
  code: z.string().min(1),
  is_active: z.boolean().default(true),
});

export const customerSchema = z
  .object({
    code: z.string().min(1),
    name: z.string().min(1),
    legal_name: z.string().optional().nullable(),
    tax_id: z.string().optional().nullable(),
    credit_limit: z.coerce.number().min(0),
    payment_terms_days: z.coerce.number().int().min(0),
    overdue_block_days: z.coerce.number().int().min(0).default(60),
    credit_status: z.enum(CREDIT_STATUSES).default("ok"),
    credit_status_note: z.string().optional().nullable(),
    sales_permit_url: z.string().url().optional().nullable().or(z.literal("")),
    sales_permit_expiry: z.string().optional().nullable(),
    delivery_route: z.string().optional().nullable(),
    is_active: z.boolean().default(true),
    default_address: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const hasUrl = !!data.sales_permit_url;
    const hasExpiry = !!data.sales_permit_expiry;
    if (hasUrl !== hasExpiry) {
      ctx.addIssue({
        code: "custom",
        path: ["sales_permit_expiry"],
        message: "Sales Permit 必须同时有 URL 和有效期",
      });
    }
  });

export type ProductInput = z.infer<typeof productSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
export type LocationInput = z.infer<typeof locationSchema>;
export type ToteInput = z.infer<typeof toteSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
