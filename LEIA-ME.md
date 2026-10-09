# Conta Certa — arquivos da logo e ícones

| Arquivo | Uso |
|---|---|
| `logo.svg` | Logo vetorial, fundo transparente (cifrão já em contorno, não depende de fonte) |
| `logo.png` | Logo 1024×1024, fundo transparente |
| `logo-nome.png` | Logo + nome "Conta Certa", fundo transparente |
| `icon-192.png`, `icon-512.png` | Ícones do PWA (propósito `any`, cantos arredondados) |
| `icon-maskable-512.png` | Ícone do PWA (propósito `maskable`, fundo cheio, logo dentro da zona segura) |
| `apple-touch-icon.png` | Ícone do iOS (180×180, sem transparência) |
| `favicon.ico` | Favicon (16, 32 e 48 px) |
| `favicon-16.png`, `favicon-32.png`, `favicon-48.png` | Favicons em PNG |

## No Next.js (App Router)

- Copie `favicon.ico` para `app/favicon.ico`.
- Copie `icon-512.png` para `app/icon.png` e `apple-touch-icon.png` para `app/apple-icon.png`.
- Copie `icon-192.png`, `icon-512.png` e `icon-maskable-512.png` para `public/icons/`.

`app/manifest.ts`:

```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Conta Certa",
    short_name: "Conta Certa",
    start_url: "/",
    display: "standalone",
    background_color: "#F1FBF6",
    theme_color: "#5EEAC0",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
```
