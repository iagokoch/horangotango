import type { Metadata, Viewport } from "next";
import { Archivo, Martian_Mono } from "next/font/google";

import { Providers } from "./providers";
import "./globals.css";

// Archivo: grotesca de origem técnica com eixo de largura variável. A mesma família faz o corpo
// (largura normal), os títulos (expandida, como placa de máquina) e os códigos (condensada).
const sans = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-sans",
  display: "swap",
});

// Martian Mono: só para identificadores técnicos (UUIDs), onde cada caractere precisa ser
// inconfundível. Não é usada em rótulos.
const mono = Martian_Mono({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Monitoolring", template: "%s · Monitoolring" },
  description: "Gestão de ferramentas e empréstimos para makerspaces e oficinas compartilhadas.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ebece9" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1012" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${sans.variable} ${mono.variable}`}>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
