import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "InfraSight — India Infrastructure Transparency Platform",
  description:
    "Track public infrastructure projects across India. View budgets, timelines, contractors, and report issues on roads, bridges, and buildings.",
  keywords: "India infrastructure, government projects, road construction, transparency, RTI",
  openGraph: {
    title: "InfraSight",
    description: "India's public infrastructure transparency platform",
    type: "website",
    locale: "en_IN",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster 
            position="bottom-right"
            toastOptions={{
              className: 'dark:bg-surface-800 bg-white dark:text-white text-slate-900 border dark:border-white/10 border-slate-200',
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
