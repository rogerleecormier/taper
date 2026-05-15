import { Store } from "@tanstack/react-store";

type UIState = {
  sidebarOpen: boolean;
  toasts: Array<{ id: string; title: string; description?: string; variant?: "default" | "destructive" }>;
};

export const uiStore = new Store<UIState>({
  sidebarOpen: true,
  toasts: [],
});

export function toggleSidebar() {
  uiStore.setState((s) => ({ ...s, sidebarOpen: !s.sidebarOpen }));
}

export function addToast(toast: Omit<UIState["toasts"][0], "id">) {
  const id = Math.random().toString(36).slice(2);
  uiStore.setState((s) => ({
    ...s,
    toasts: [...s.toasts, { ...toast, id }],
  }));
  setTimeout(() => removeToast(id), 5000);
}

export function removeToast(id: string) {
  uiStore.setState((s) => ({
    ...s,
    toasts: s.toasts.filter((t) => t.id !== id),
  }));
}
