"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistro() {
  useEffect(() => {
    // Em dev o SW atrapalha mais que ajuda (serve CSS antigo via cache).
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // falha no registro não deve quebrar o app
      });
    }
    // Pede armazenamento persistente (importante no iOS).
    if (typeof navigator.storage?.persist === "function") {
      navigator.storage.persist().catch(() => {});
    }
  }, []);

  return null;
}
