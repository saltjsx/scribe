import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist_Mono, Playfair_Display } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { ThemeProvider } from "@/lib/theme-context";
import "./globals.css";

const themeScript = `(function(){try{var t=localStorage.getItem("theme")||"system";var r=t==="system"?window.matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light":t;document.documentElement.setAttribute("data-theme",r)}catch(e){}})()`;


const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Scribe",
  description: "Scribe — your writing companion",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Scribe",
  },
  icons: {
    icon: "/icon-192x192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a6eff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        </head>
        <body
          className={`${playfair.variable} ${geistMono.variable} antialiased`}
        >
          <ThemeProvider>
            {children}
          </ThemeProvider>
          <ServiceWorkerRegister />
        </body>
      </html>
    </ClerkProvider>
  );
}
