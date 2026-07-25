"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type Tone = "success" | "error";
type ToastItem = { id: number; text: string; tone: Tone };

const ToastCtx = createContext<{
  notify: (text: string, tone?: Tone) => void;
} | null>(null);

/** 在客户端组件里触发全局提示：const { notify } = useToast(); notify("已保存") */
export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast 必须在 <ToastProvider> 内使用");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const notify = useCallback((text: string, tone: Tone = "success") => {
    const id = ++seq.current;
    setItems((list) => [...list, { id, text, tone }]);
    setTimeout(() => {
      setItems((list) => list.filter((x) => x.id !== id));
    }, 3200);
  }, []);

  return (
    <ToastCtx.Provider value={{ notify }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[60] flex flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ring-1 ring-black/5",
              "animate-[toast-in_180ms_ease-out]",
              t.tone === "success" ? "bg-teal-700" : "bg-red-700",
            )}
          >
            <span aria-hidden className="text-base leading-none">
              {t.tone === "success" ? "✓" : "!"}
            </span>
            <span>{t.text}</span>
          </div>
        ))}
      </div>
      <style>{`@keyframes toast-in{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </ToastCtx.Provider>
  );
}
