import type { Metadata } from "next";
import { Orbitron, Rajdhani } from "next/font/google"; // Importando fontes games
import "./globals.css";

// Configurando as fontes
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" });
const rajdhani = Rajdhani({ 
  subsets: ["latin"], 
  weight: ['300', '400', '500', '600', '700'],
  variable: "--font-rajdhani" 
});

export const metadata: Metadata = {
  title: "Zenith Finance",
  description: "Cyberpunk Financial System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br">
      <body className={`${orbitron.variable} ${rajdhani.variable} antialiased font-sans`}>
        {children}
      </body>
    </html>
  );
}