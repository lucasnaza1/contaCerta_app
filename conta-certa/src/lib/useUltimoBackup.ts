"use client";

import { useSyncExternalStore } from "react";

const CHAVE = "conta-certa:ultimo-backup";
const EVENTO = "conta-certa:backup-atualizado";

function ler(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CHAVE);
}

function inscrever(callback: () => void): () => void {
  window.addEventListener(EVENTO, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENTO, callback);
    window.removeEventListener("storage", callback);
  };
}

/** Registra agora como data do último backup exportado. */
export function registrarBackupFeito(): void {
  window.localStorage.setItem(CHAVE, new Date().toISOString());
  window.dispatchEvent(new Event(EVENTO));
}

export interface EstadoUltimoBackup {
  /** Data do último backup, ou null se nunca houve. */
  ultimo: Date | null;
  /** Dias desde o último backup; Infinity se nunca houve. */
  diasSemBackup: number;
}

/** Data do último backup (localStorage) para o aviso dos 30 dias. */
export function useUltimoBackup(): EstadoUltimoBackup {
  const iso = useSyncExternalStore(inscrever, ler, () => null);
  if (!iso) return { ultimo: null, diasSemBackup: Infinity };
  const ultimo = new Date(iso);
  const dias = Math.floor((Date.now() - ultimo.getTime()) / 86_400_000);
  return { ultimo, diasSemBackup: dias };
}
