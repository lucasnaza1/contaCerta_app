import { Barcode, CreditCard, QrCode } from "lucide-react";
import type { Forma } from "@/lib/tipos";

interface Props {
  forma: Forma;
  className?: string;
}

/** Ícone da forma de pagamento (lucide-react). Pix usa QrCode (não há oficial). */
export function IconeForma({ forma, className }: Props) {
  const props = { className: className ?? "h-5 w-5", strokeWidth: 2, "aria-hidden": true } as const;
  switch (forma) {
    case "pix":
      return <QrCode {...props} />;
    case "boleto":
      return <Barcode {...props} />;
    case "cartao":
      return <CreditCard {...props} />;
  }
}
