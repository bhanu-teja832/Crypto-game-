"use client";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import type { Toast as ToastType } from "@/lib/types";

// ─── Context ──────────────────────────────────────────────────────────────────

interface ToastContextValue {
  toasts: ToastType[];
  addToast: (t: Omit<ToastType, "id">) => void;
  removeToast: (id: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside <ToastProvider>");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastType[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (t: Omit<ToastType, "id">) => {
      const id = Math.random().toString(36).slice(2);
      const toast: ToastType = { ...t, id, durationMs: t.durationMs ?? 4000 };
      setToasts((prev) => [toast, ...prev].slice(0, 5));
      setTimeout(() => removeToast(id), toast.durationMs);
    },
    [removeToast]
  );

  const success = useCallback((message: string) => addToast({ type: "success", message }), [addToast]);
  const error   = useCallback((message: string) => addToast({ type: "error",   message }), [addToast]);
  const info    = useCallback((message: string) => addToast({ type: "info",    message }), [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// ─── Container ────────────────────────────────────────────────────────────────

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: ToastType[];
  onRemove: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 pointer-events-none"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

// ─── Individual Toast ─────────────────────────────────────────────────────────

const TOAST_STYLES: Record<ToastType["type"], string> = {
  success: "border-cashout/40 bg-cashout/10 text-cashout",
  error:   "border-crash/40   bg-crash/10   text-crash",
  info:    "border-accent/40  bg-accent/10  text-accent",
  warning: "border-warning/40 bg-warning/10 text-warning",
};

const TOAST_ICONS: Record<ToastType["type"], string> = {
  success: "✓",
  error:   "✕",
  info:    "ℹ",
  warning: "⚠",
};

function ToastItem({
  toast,
  onRemove,
}: {
  toast: ToastType;
  onRemove: (id: string) => void;
}) {
  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl
                  border backdrop-blur-sm animate-slide-up ${TOAST_STYLES[toast.type]}`}
    >
      <span className="text-base font-bold flex-shrink-0">
        {TOAST_ICONS[toast.type]}
      </span>
      <span className="flex-1 text-sm font-medium text-primary">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-muted hover:text-primary transition-colors text-xs ml-1"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
