import * as React from "react";
import { useStore } from "@tanstack/react-store";
import { uiStore, removeToast } from "~/store/ui-store";
import {
  Toast,
  ToastProvider,
  ToastViewport,
  ToastTitle,
  ToastDescription,
  ToastClose,
} from "./toast";

export function Toaster() {
  const { toasts } = useStore(uiStore, (s) => ({ toasts: s.toasts }));

  return (
    <ToastProvider>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          variant={toast.variant}
          onOpenChange={(open) => {
            if (!open) removeToast(toast.id);
          }}
          open
        >
          <div className="grid gap-1">
            {toast.title && <ToastTitle>{toast.title}</ToastTitle>}
            {toast.description && (
              <ToastDescription>{toast.description}</ToastDescription>
            )}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
