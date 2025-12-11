import "@/app/globals.css";

import { Inter } from "next/font/google";

import Navbar from "@/components/layout/Navbar";
import { ThemeProvider } from "@/components/theme-provider";
import { ToasterClient } from "@/components/ToasterClient";
import { QueryProvider } from "@/providers/QueryProvider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "HeyVersus",
  description: "실시간 투표 플레이그라운드",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href="https://nsdezyvsxkyjnfnqprhe.supabase.co"
        />
        <link
          rel="dns-prefetch"
          href="https://nsdezyvsxkyjnfnqprhe.supabase.co"
        />
        <link rel="preconnect" href="https://images.vercel.com" />
        <link rel="dns-prefetch" href="https://images.vercel.com" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <Navbar />
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tighter mb-2 text-center mt-4 md:mt-6 lg:mt-8 px-4">
              <span className="text-brand-gold">Hey!</span>
              <span className="text-brand-orange"> Vote Here!!</span>
            </h1>
            {children}
            <ToasterClient />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
