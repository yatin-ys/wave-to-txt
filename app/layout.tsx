import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link"; // Import Link for navigation
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/mode-toggle"; // Import ModeToggle

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WaveToTxt",
  description: "Convert audio waves to text",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4 h-16 flex items-center">
              {/* Left spacer for centering the title */}
              <div className="flex-1">
                {/* You can add navigation links or a logo here later if needed */}
              </div>

              {/* Centered Title */}
              <div className="flex-shrink-0">
                <Link
                  href="/"
                  className="flex items-center gap-2 transition-opacity hover:opacity-80"
                >
                  <h1 className="text-2xl font-bold text-primary tracking-tight">
                    WaveToTxt
                  </h1>
                </Link>
              </div>

              {/* Right content: Mode Toggle */}
              <div className="flex-1 flex justify-end items-center">
                <ModeToggle />
              </div>
            </div>
          </header>

          <main className="flex-grow container mx-auto px-4 py-8">
            {children}
          </main>

          {/* You can add a <Footer /> component here later if needed */}
        </ThemeProvider>
      </body>
    </html>
  );
}
