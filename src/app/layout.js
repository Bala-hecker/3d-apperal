import { Inter, JetBrains_Mono, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import AuthErrorShield from "@/components/AuthErrorShield";
import ChatWidget from "@/components/ChatWidget";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata = {
  title: "Thread3D | Premium 3D Apparel Configurator & Studio",
  description: "Create, customize, and preview stunning 3D apparel designs in real time with our powerful 3D customizer engine using Three.js and Fabric.js.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${cormorantGaramond.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <AuthErrorShield />
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}

