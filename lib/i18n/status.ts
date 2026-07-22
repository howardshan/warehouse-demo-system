import type { Messages } from "./dictionaries";
import { t } from "./dictionaries";

/** 按当前语言显示状态枚举；缺词条时回退英文 key */
export function statusLabel(
  messages: Messages,
  group: "gr" | "po",
  status: string,
): string {
  return t(messages, `status.${group}.${status}`, status);
}
