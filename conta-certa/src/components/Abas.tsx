"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { href: "/", rotulo: "Mês", icone: "☑" },
  { href: "/adicionar", rotulo: "Adicionar", icone: "＋" },
  { href: "/meses", rotulo: "Meses", icone: "▤" },
  { href: "/simular", rotulo: "Simular", icone: "◈" },
  { href: "/ajustes", rotulo: "Ajustes", icone: "⚙" },
] as const;

export function Abas() {
  const caminho = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="sticky bottom-0 z-10 border-t border-borda bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {ABAS.map((aba) => {
          const ativo = caminho === aba.href;
          return (
            <li key={aba.href} className="flex-1">
              <Link
                href={aba.href}
                aria-current={ativo ? "page" : undefined}
                className={`botao-min flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] font-medium ${
                  ativo ? "text-previsao" : "text-foreground/60"
                }`}
              >
                <span aria-hidden className="text-lg leading-none">
                  {aba.icone}
                </span>
                {aba.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
