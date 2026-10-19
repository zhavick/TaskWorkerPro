import Providers from "@/app/providers";
import { cn } from "@/utils/cn";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import {
  Inter,
  Plus_Jakarta_Sans,
  Outfit,
  Poppins,
  Roboto,
} from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const fontInter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fontJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const fontOutfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const fontPoppins = Poppins({
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
});

const fontRoboto = Roboto({
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | TrackerKerja Pro",
    default: "TrackerKerja Pro - Enterprise Work & Task Tracker",
  },
  description:
    "Aplikasi Pelacak Kerja & Manajemen Tugas Modern Terpadu dengan Multi-Tenant, Presensi, Timesheet, dan Analitik Proyek.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      suppressHydrationWarning
      lang="id"
      className={cn(
        "h-full overflow-hidden antialiased",
        fontInter.variable,
        fontJakarta.variable,
        fontOutfit.variable,
        fontPoppins.variable,
        fontRoboto.variable,
        fontInter.className
      )}
    >
      <head>
        {/* Anti-FOUC Script for Themes & Global Font Switcher */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var savedPalette = localStorage.getItem('wtp_theme_palette') || 'indigo-nebula';
                  var savedFont = localStorage.getItem('wtp_font_family') || 'inter';
                  document.documentElement.setAttribute('data-theme-palette', savedPalette);
                  document.documentElement.setAttribute('data-font', savedFont);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="h-full overflow-hidden bg-background-gray-secondary_alt_2">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
