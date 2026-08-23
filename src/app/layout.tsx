import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-provider";
import { SiteHeader } from "@/components/SiteHeader";
import { PresenceTracker } from "@/components/PresenceTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ICAS Maths Simulator",
  description: "Practice exam simulator for ICAS Mathematics past papers.",
  appleWebApp: {
    capable: true,
    title: "ICAS Maths",
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  themeColor: "#111111",
};

const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('icas-theme');
    var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <PresenceTracker />
          <header className="sticky top-0 z-10 border-b border-border bg-background no-print">
            <div className="mx-auto max-w-4xl px-4 py-3">
              <SiteHeader />
            </div>
          </header>
          <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-6">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
