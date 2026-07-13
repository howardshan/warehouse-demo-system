/** 客户端权限判断（与 server 版同逻辑，避免把 server client 拉进 client bundle） */
export function can(permissions: string[], key: string): boolean {
  return permissions.includes(key);
}

export function canAny(permissions: string[], keys: string[]): boolean {
  return keys.some((k) => permissions.includes(k));
}
