import type { ReactNode } from "react";
import { Abas } from "@/components/Abas";

export function Pagina({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-6">{children}</main>
      <Abas />
    </div>
  );
}
