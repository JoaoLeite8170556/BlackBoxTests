import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Car Found — Mercedes, Audi, BMW e Volvo",
  description:
    "Car Found: encontra Mercedes, Audi, BMW e Volvo até 25 000 € e 100 000 km no AutoScout24, com estimativa de importação para Portugal.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
