"use client";
import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

const key = "github-kanban:theme";
function subscribe(callback: () => void) {
  function storage(event: StorageEvent) {
    if (event.key !== key) return;
    document.documentElement.dataset.theme =
      event.newValue === "dark" ? "dark" : "light";
    callback();
  }
  window.addEventListener("kanban-theme", callback);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener("kanban-theme", callback);
    window.removeEventListener("storage", storage);
  };
}
export function ThemeToggle() {
  const dark = useSyncExternalStore(
    subscribe,
    () => document.documentElement.dataset.theme === "dark",
    () => false,
  );
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={dark ? "切換淺色主題" : "切換黑色主題"}
      aria-pressed={dark}
      onClick={() => {
        const theme = dark ? "light" : "dark";
        document.documentElement.dataset.theme = theme;
        try {
          localStorage.setItem(key, theme);
        } catch {
          /* Theme still works when storage is disabled. */
        }
        window.dispatchEvent(new Event("kanban-theme"));
      }}
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
      <span>{dark ? "淺色" : "黑色"}</span>
    </button>
  );
}
