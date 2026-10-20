"use client";
import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "@/components/common/header/icons";
import { Button } from "@/components/tailgrids/core/button";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="size-10 rounded-lg border border-card-border bg-card-background" />
    );
  }

  const isDark = resolvedTheme === "dark";

  const toggleTheme = () => {
    const nextMode = isDark ? "light" : "dark";
    setTheme(nextMode);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", nextMode);
      if (nextMode === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
      }
    }
  };

  return (
    <Button
      iconOnly
      appearance="outline"
      onClick={toggleTheme}
      title={isDark ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
      aria-label={isDark ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
      className="size-10 rounded-lg border border-card-border bg-card-background text-icon-primary shadow-xs outline-none focus-visible:border-input-primary-focus-border focus-visible:ring-4 focus-visible:ring-input-primary-focus-border/20 [&>svg]:size-auto transition-transform active:scale-95"
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}
