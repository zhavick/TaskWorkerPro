"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useTheme } from "next-themes";

export interface ThemeOption {
  id: string;
  name: string;
  mode: "light" | "dark";
  primaryColor: string;
  brandColor: string;
  bgColor: string;
  description: string;
}

export interface FontOption {
  id: string;
  name: string;
  specimen: string;
  description: string;
}

export const THEME_PALETTES: ThemeOption[] = [
  // --- 22 TEMA TERANG (LIGHT) ---
  {
    id: "indigo-nebula",
    name: "Indigo Nebula (Default)",
    mode: "light",
    primaryColor: "#3758f9",
    brandColor: "#465fff",
    bgColor: "#ffffff",
    description: "Kombinasi biru kosmik elegan, tajam dan seimbang untuk produktivitas.",
  },
  {
    id: "emerald-forest",
    name: "Emerald Forest",
    mode: "light",
    primaryColor: "#10b981",
    brandColor: "#059669",
    bgColor: "#f0fdf4",
    description: "Nuansa hijau alam yang menenangkan mata saat bekerja marathon.",
  },
  {
    id: "ocean-azure",
    name: "Ocean Azure",
    mode: "light",
    primaryColor: "#0ea5e9",
    brandColor: "#0284c7",
    bgColor: "#f0f9ff",
    description: "Biru laut cerah, memberikan kesan segar dan keterbukaan visual.",
  },
  {
    id: "sunset-crimson",
    name: "Sunset Crimson",
    mode: "light",
    primaryColor: "#f43f5e",
    brandColor: "#e11d48",
    bgColor: "#fff1f2",
    description: "Aksen merah senja yang dinamis dan berenergi tinggi.",
  },
  {
    id: "cyberpunk-neon",
    name: "Cyberpunk Neon",
    mode: "light",
    primaryColor: "#06b6d4",
    brandColor: "#0891b2",
    bgColor: "#ecfeff",
    description: "Sian futuristik cerah dengan sentuhan modern berdensitas tinggi.",
  },
  {
    id: "royal-amethyst",
    name: "Royal Amethyst",
    mode: "light",
    primaryColor: "#8b5cf6",
    brandColor: "#7c3aed",
    bgColor: "#f5f3ff",
    description: "Ungu kerajaan yang anggun, berkelas, dan prestisius.",
  },
  {
    id: "amber-gold",
    name: "Amber Gold",
    mode: "light",
    primaryColor: "#f59e0b",
    brandColor: "#d97706",
    bgColor: "#fffbeb",
    description: "Kuning keemasan hangat yang memicu konsentrasi tinggi.",
  },
  {
    id: "slate-minimalist",
    name: "Slate Minimalist",
    mode: "light",
    primaryColor: "#64748b",
    brandColor: "#475569",
    bgColor: "#f8fafc",
    description: "Abu-abu netral monokromik yang rapi dan bebas distraksi.",
  },
  {
    id: "nordic-teal",
    name: "Nordic Teal",
    mode: "light",
    primaryColor: "#14b8a6",
    brandColor: "#0d9488",
    bgColor: "#f0fdfa",
    description: "Perpaduan biru-hijau Skandinavia yang tenang dan modern.",
  },
  {
    id: "midnight-titanium",
    name: "Midnight Titanium",
    mode: "light",
    primaryColor: "#475569",
    brandColor: "#334155",
    bgColor: "#f8fafc",
    description: "Nuansa logam titanium maskulin dengan kontras teks prima.",
  },
  {
    id: "sakura-blossom",
    name: "Sakura Blossom",
    mode: "light",
    primaryColor: "#ec4899",
    brandColor: "#db2777",
    bgColor: "#fdf2f8",
    description: "Merah muda bunga sakura yang lembut, bersahabat, dan ceria.",
  },
  {
    id: "citrus-lime",
    name: "Citrus Lime",
    mode: "light",
    primaryColor: "#84cc16",
    brandColor: "#65a30d",
    bgColor: "#f7fee7",
    description: "Hijau limau segar yang memicu kreativitas dan antusiasme kerja.",
  },
  {
    id: "terracotta-clay",
    name: "Terracotta Clay",
    mode: "light",
    primaryColor: "#f97316",
    brandColor: "#ea580c",
    bgColor: "#fff7ed",
    description: "Jingga tanah liat mediterania yang hangat dan membumi.",
  },
  {
    id: "lavender-mist",
    name: "Lavender Mist",
    mode: "light",
    primaryColor: "#a855f7",
    brandColor: "#9333ea",
    bgColor: "#faf5ff",
    description: "Ungu lavender yang menenangkan saraf mata saat kerja lembur.",
  },
  {
    id: "peacock-cyan",
    name: "Peacock Cyan",
    mode: "light",
    primaryColor: "#06b6d4",
    brandColor: "#0891b2",
    bgColor: "#ecfeff",
    description: "Biru merak eksotis dengan kontras tajam pada tombol dan kartu.",
  },
  {
    id: "coffee-mocha",
    name: "Coffee Mocha",
    mode: "light",
    primaryColor: "#b45309",
    brandColor: "#78350f",
    bgColor: "#fefce8",
    description: "Warna cokelat kopi nikmat yang memberi kehangatan suasana kerja.",
  },
  {
    id: "sapphire-sky",
    name: "Sapphire Sky",
    mode: "light",
    primaryColor: "#3b82f6",
    brandColor: "#2563eb",
    bgColor: "#eff6ff",
    description: "Biru langit safir klasik yang diandalkan di sistem kelas enterprise.",
  },
  {
    id: "coral-reef",
    name: "Coral Reef",
    mode: "light",
    primaryColor: "#f97316",
    brandColor: "#ea580c",
    bgColor: "#fff7ed",
    description: "Warna koral pesisir tropis yang ramah dan energetik.",
  },
  {
    id: "mint-breeze",
    name: "Mint Breeze",
    mode: "light",
    primaryColor: "#22c55e",
    brandColor: "#16a34a",
    bgColor: "#f0fdf4",
    description: "Hijau mint dingin yang menjaga mata tetap rileks.",
  },
  {
    id: "autumn-maple",
    name: "Autumn Maple",
    mode: "light",
    primaryColor: "#ef4444",
    brandColor: "#dc2626",
    bgColor: "#fef2f2",
    description: "Merah daun maple musim gugur yang berani dan fokus.",
  },
  {
    id: "rose-quartz",
    name: "Rose Quartz",
    mode: "light",
    primaryColor: "#f43f5e",
    brandColor: "#fb7185",
    bgColor: "#fff1f2",
    description: "Kristal kuarsa mawar yang memancarkan estetika lembut.",
  },
  {
    id: "desert-sand",
    name: "Desert Sand",
    mode: "light",
    primaryColor: "#eab308",
    brandColor: "#ca8a04",
    bgColor: "#fefce8",
    description: "Kuning pasir gurun bernuansa vintage yang berkarakter.",
  },

  // --- 18 TEMA GELAP (DARK) ---
  {
    id: "nordic-frost",
    name: "Nordic Frost",
    mode: "dark",
    primaryColor: "#38bdf8",
    brandColor: "#0ea5e9",
    bgColor: "#07111e",
    description: "Tema malam es Arktik dengan aksen biru beku yang sangat eye-friendly.",
  },
  {
    id: "midnight-oled",
    name: "Midnight OLED",
    mode: "dark",
    primaryColor: "#3b82f6",
    brandColor: "#60a5fa",
    bgColor: "#000000",
    description: "Hitam pekat OLED murni (true black) untuk efisiensi baterai & kontras maksimal.",
  },
  {
    id: "cyberpunk-synthwave",
    name: "Cyberpunk Synthwave",
    mode: "dark",
    primaryColor: "#ec4899",
    brandColor: "#06b6d4",
    bgColor: "#0f0728",
    description: "Nuansa neon retro 80s ungu gelap berpadu pink dan sian menyala.",
  },
  {
    id: "emerald-matrix",
    name: "Emerald Matrix",
    mode: "dark",
    primaryColor: "#10b981",
    brandColor: "#34d399",
    bgColor: "#021a0f",
    description: "Inspirasi terminal konsol hacker bernuansa hijau neon pada latar obsidian.",
  },
  {
    id: "dracula-eclipse",
    name: "Dracula Eclipse",
    mode: "dark",
    primaryColor: "#bd93f9",
    brandColor: "#ff79c6",
    bgColor: "#1e1f29",
    description: "Palet ikonik favorit developer dunia: ungu pastel, pink, dan latar arang.",
  },
  {
    id: "abyssal-ocean",
    name: "Abyssal Ocean",
    mode: "dark",
    primaryColor: "#38bdf8",
    brandColor: "#0284c7",
    bgColor: "#06101e",
    description: "Kedalaman palung laut gelap dengan kilau bioluminesensi biru cerah.",
  },
  {
    id: "solar-ember",
    name: "Solar Ember",
    mode: "dark",
    primaryColor: "#f97316",
    brandColor: "#fb923c",
    bgColor: "#170d07",
    description: "Bara api matahari pada latar malam pekat, hangat dan dramatis.",
  },
  {
    id: "neon-violet",
    name: "Neon Violet",
    mode: "dark",
    primaryColor: "#a855f7",
    brandColor: "#c084fc",
    bgColor: "#14092b",
    description: "Ungu ultraviolet gelap bergaya studio musik elektronik modern.",
  },
  {
    id: "crimson-vampire",
    name: "Crimson Vampire",
    mode: "dark",
    primaryColor: "#f43f5e",
    brandColor: "#ef4444",
    bgColor: "#1c0608",
    description: "Merah darah gelap dengan estetika gothic modern yang memukau.",
  },
  {
    id: "deep-forest",
    name: "Deep Forest",
    mode: "dark",
    primaryColor: "#22c55e",
    brandColor: "#4ade80",
    bgColor: "#06180d",
    description: "Hutan pinus malam hari yang meneduhkan dan nyaman dibaca berjam-jam.",
  },
  {
    id: "space-cadet",
    name: "Space Cadet",
    mode: "dark",
    primaryColor: "#6366f1",
    brandColor: "#818cf8",
    bgColor: "#0b0f19",
    description: "Biru antariksa gelap bertabur bintang neon yang proporsional.",
  },
  {
    id: "monochrome-noir",
    name: "Monochrome Noir",
    mode: "dark",
    primaryColor: "#9ca3af",
    brandColor: "#e5e7eb",
    bgColor: "#121212",
    description: "Hitam abu-abu murni tanpa saturasi warna berlebih, zero-distraction.",
  },
  {
    id: "amethyst-dark",
    name: "Amethyst Dark",
    mode: "dark",
    primaryColor: "#8b5cf6",
    brandColor: "#c084fc",
    bgColor: "#1a102f",
    description: "Kristal ungu malam yang memanjakan pandangan.",
  },
  {
    id: "aurora-borealis",
    name: "Aurora Borealis",
    mode: "dark",
    primaryColor: "#2dd4bf",
    brandColor: "#5eead4",
    bgColor: "#051f1d",
    description: "Pancaran aurora teal kutub utara di atas langit malam gelap.",
  },
  {
    id: "obsidian-gold",
    name: "Obsidian Gold",
    mode: "dark",
    primaryColor: "#f59e0b",
    brandColor: "#fbbf24",
    bgColor: "#141204",
    description: "Batu obsidian hitam berpadu kilau emas kuning mewah.",
  },
  {
    id: "twilight-slate",
    name: "Twilight Slate",
    mode: "dark",
    primaryColor: "#64748b",
    brandColor: "#94a3b8",
    bgColor: "#0f172a",
    description: "Biru senja abu-abu yang sangat seimbang untuk sesi coding malam.",
  },
  {
    id: "toxic-green",
    name: "Toxic Green",
    mode: "dark",
    primaryColor: "#84cc16",
    brandColor: "#a3e635",
    bgColor: "#0c1803",
    description: "Hijau radioaktif menyala di atas latar hitam kehijauan.",
  },
  {
    id: "carbon-graphite",
    name: "Carbon Graphite",
    mode: "dark",
    primaryColor: "#71717a",
    brandColor: "#a1a1aa",
    bgColor: "#18181b",
    description: "Serat karbon grafit modern yang solid, presisi, dan elegan.",
  },
];

export const GOOGLE_FONTS: FontOption[] = [
  {
    id: "inter",
    name: "Inter",
    specimen: "Aa Bb Gg 123 - The quick brown fox jumps over the lazy dog",
    description: "Standar UI modern, sangat seimbang, tajam & nyaman dibaca pada semua resolusi.",
  },
  {
    id: "jakarta",
    name: "Plus Jakarta Sans",
    specimen: "Aa Bb Gg 123 - The quick brown fox jumps over the lazy dog",
    description: "Font geometris kontemporer, ramah & elegan khas aplikasi SaaS modern.",
  },
  {
    id: "outfit",
    name: "Outfit",
    specimen: "Aa Bb Gg 123 - The quick brown fox jumps over the lazy dog",
    description: "Tipografi sans-serif modern dengan lekukan halus dan visual berkelas tinggi.",
  },
  {
    id: "poppins",
    name: "Poppins",
    specimen: "Aa Bb Gg 123 - The quick brown fox jumps over the lazy dog",
    description: "Bentuk geometris rounded yang bersahabat, energik, dan mudah dipindai mata.",
  },
  {
    id: "roboto",
    name: "Roboto",
    specimen: "Aa Bb Gg 123 - The quick brown fox jumps over the lazy dog",
    description: "Klasik Google yang presisi, efisien dengan densitas informasi tinggi.",
  },
];

interface ThemeFontContextType {
  currentPalette: string;
  currentFont: string;
  setPalette: (paletteId: string) => void;
  setFont: (fontId: string) => void;
  resetToDefault: () => void;
}

const ThemeFontContext = createContext<ThemeFontContextType | undefined>(undefined);

export function ThemeFontProvider({ children }: { children: React.ReactNode }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [currentPalette, setCurrentPalette] = useState<string>("indigo-nebula");
  const [currentFont, setCurrentFont] = useState<string>("inter");

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedPalette = localStorage.getItem("wtp_theme_palette") || "indigo-nebula";
      const savedFont = localStorage.getItem("wtp_font_family") || "inter";

      setCurrentPalette(savedPalette);
      setCurrentFont(savedFont);

      document.documentElement.setAttribute("data-theme-palette", savedPalette);
      document.documentElement.setAttribute("data-font", savedFont);
    } catch (e) {
      console.error("Failed to load theme/font preferences:", e);
    }
  }, []);

  // Bi-directional synchronization for dark and light themes
  useEffect(() => {
    const activeMode = resolvedTheme || (theme === "dark" ? "dark" : "light");
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", activeMode);
      if (activeMode === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
      }
    }
  }, [resolvedTheme, theme]);

  const setPalette = (paletteId: string) => {
    const found = THEME_PALETTES.find((t) => t.id === paletteId);
    if (!found) return;

    setCurrentPalette(paletteId);
    try {
      localStorage.setItem("wtp_theme_palette", paletteId);
      document.documentElement.setAttribute("data-theme-palette", paletteId);

      // Auto sync mode (light or dark)
      setTheme(found.mode);
      document.documentElement.setAttribute("data-theme", found.mode);
      if (found.mode === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
      }
    } catch (e) {
      console.error("Failed to persist theme palette:", e);
    }
  };

  const setFont = (fontId: string) => {
    const found = GOOGLE_FONTS.find((f) => f.id === fontId);
    if (!found) return;

    setCurrentFont(fontId);
    try {
      localStorage.setItem("wtp_font_family", fontId);
      document.documentElement.setAttribute("data-font", fontId);
    } catch (e) {
      console.error("Failed to persist font family:", e);
    }
  };

  const resetToDefault = () => {
    setPalette("indigo-nebula");
    setFont("inter");
    setTheme("light");
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
  };

  return (
    <ThemeFontContext.Provider
      value={{
        currentPalette,
        currentFont,
        setPalette,
        setFont,
        resetToDefault,
      }}
    >
      {children}
    </ThemeFontContext.Provider>
  );
}

export function useThemeFont() {
  const context = useContext(ThemeFontContext);
  if (!context) {
    throw new Error("useThemeFont must be used within a ThemeFontProvider");
  }
  return context;
}
