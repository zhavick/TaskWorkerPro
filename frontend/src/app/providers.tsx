"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { Toaster } from "sonner";
import { SessionInactivityGuard } from "@/components/guards/SessionInactivityGuard";

import { ThemeFontProvider } from "@/context/ThemeFontContext";

import { useTheme } from "next-themes";

function ThemedToaster() {
  const { theme = "system" } = useTheme();

  return (
    <Toaster
      theme={theme as any}
      richColors
      position="top-right"
      toastOptions={{
        className: "!bg-card-background !text-text-primary !border-card-border !shadow-xl font-sans",
        style: {
          background: "var(--card-background)",
          color: "var(--text-primary)",
          borderColor: "var(--card-border)",
        },
      }}
    />
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 30, // 30 seconds cache
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ThemeFontProvider>
        <QueryClientProvider client={queryClient}>
          <SessionInactivityGuard timeoutMinutes={60} warningMinutes={5}>
            {children}
          </SessionInactivityGuard>
          <ThemedToaster />
        </QueryClientProvider>
      </ThemeFontProvider>
    </ThemeProvider>
  );
}
