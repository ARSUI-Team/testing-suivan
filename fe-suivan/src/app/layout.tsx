import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ClientProviders } from "./ClientProviders";
import "./globals.css";

// Primary font - Inter (clean, modern, highly readable)
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

// Secondary font - Space Grotesk (modern geometric for headings)
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

// Accent font for protocol labels, object IDs, counters, and loading states.
const jetBrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Suivan - Community Wealth Protocol on Sui",
  description: "A Sui-native frontend for global ROSCA communities, rotating savings cycles, pool state, APY signals, and transparent member progress.",
  keywords: ["Suivan", "ROSCA", "Arisan", "Sui", "community finance", "rotating savings"],
  icons: {
    icon: [{ url: "/suivan-logo.jpeg", type: "image/jpeg" }],
    apple: [{ url: "/suivan-logo.jpeg" }],
    shortcut: ["/suivan-logo.jpeg"],
  },
  openGraph: {
    title: "Suivan - Community Wealth Protocol on Sui",
    description: "Global ROSCA pools with Sui-native settlement, zkLogin onboarding, and AI-optimized yield signals.",
    url: "https://suivan.vercel.app",
    siteName: "Suivan",
    type: "website",
    images: [{ url: "/suivan-logo.jpeg", width: 772, height: 717, alt: "Suivan" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Suivan - Community Wealth Protocol on Sui",
    description: "Global ROSCA pools with Sui-native settlement, zkLogin onboarding, and AI-optimized yield signals.",
    images: ["/suivan-logo.jpeg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/suivan-logo.jpeg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/suivan-logo.jpeg" />
        <link rel="shortcut icon" href="/suivan-logo.jpeg" />
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${jetBrainsMono.variable} antialiased`}
      >
        <ThemeProvider>
          <ClientProviders>
            <LanguageProvider>
              {children}
            </LanguageProvider>
          </ClientProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
