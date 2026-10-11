"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ChartColumn, PiggyBank, Plus, Settings } from "lucide-react";

const ABAS = [
  { href: "/", rotulo: "Mês", Icone: CalendarDays },
  { href: "/adicionar", rotulo: "Adicionar", Icone: Plus },
  { href: "/meses", rotulo: "Meses", Icone: ChartColumn },
  { href: "/simular", rotulo: "Simular", Icone: PiggyBank },
  { href: "/ajustes", rotulo: "Ajustes", Icone: Settings },
] as const;

export function Abas() {
  const caminho = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="sticky bottom-0 z-10 border-t border-borda bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {ABAS.map(({ href, rotulo, Icone }) => {
          const ativo = caminho === href;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={ativo ? "page" : undefined}
                className={`botao-min flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] font-medium ${
                  ativo ? "text-previsao" : "text-foreground/60"
                }`}
              >
                <Icone aria-hidden className="h-6 w-6" strokeWidth={2} />
                {rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
