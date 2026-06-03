import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { GlobalErrorBoundary } from "@/components/shared/GlobalErrorBoundary";

export const metadata: Metadata = {
  title: "PlanningPro - Gestion d'Emplois du Temps",
  description: "Application SaaS de gestion d'emplois du temps pour établissements scolaires et universitaires",
  keywords: ["PlanningPro", "emploi du temps", "schedule", "timetable", "gestion", "éducation"],
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PlanningPro",
  },
};

export const viewport: Viewport = {
  themeColor: "#201D1D",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#201D1D" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="font-mono antialiased bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <GlobalErrorBoundary>
            {children}
          </GlobalErrorBoundary>
          <Toaster position="top-right" />
        </ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
