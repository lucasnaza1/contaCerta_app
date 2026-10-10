"use client";

import { useSyncExternalStore } from "react";

const EVENTO = "conta-certa:tema";

function inscrever(callback: () => void) {
  window.addEventListener(EVENTO, callback);
  return () => window.removeEventListener(EVENTO, callback);
}

/** Modo escuro: classe no <html> + preferência no localStorage. */
export function useModoEscuro() {
  const escuro = useSyncExternalStore(
    inscrever,
    () => document.documentElement.classList.contains("dark"),
    () => false
  );

  function alternar(valor: boolean) {
    document.documentElement.classList.toggle("dark", valor);
    try {
      localStorage.setItem("conta-certa-tema", valor ? "escuro" : "claro");
    } catch {
      // localStorage indisponível (modo privado): só aplica em memória
    }
    window.dispatchEvent(new Event(EVENTO));
  }

  return { escuro, alternar };
}
