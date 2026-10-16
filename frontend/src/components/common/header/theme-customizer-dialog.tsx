"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/tailgrids/core/dialog";
import { Button } from "@/components/tailgrids/core/button";
import {
  Palette,
  Type,
  Sun,
  Moon,
  Laptop,
  Check,
  RotateCcw,
  Sparkles,
  Search,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  useThemeFont,
  THEME_PALETTES,
  GOOGLE_FONTS,
  ThemeOption,
} from "@/context/ThemeFontContext";
import { toast } from "sonner";

export default function ThemeCustomizerDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<"all" | "light" | "dark">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { theme, setTheme } = useTheme();
  const { currentPalette, currentFont, setPalette, setFont, resetToDefault } =
    useThemeFont();

  const activeThemeObj = THEME_PALETTES.find((t) => t.id === currentPalette);

  // Filter themes
  const filteredThemes = THEME_PALETTES.filter((t) => {
    const matchesMode =
      filterMode === "all" ? true : t.mode === filterMode;
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMode && matchesSearch;
  });

  const handleSelectPalette = (t: ThemeOption) => {
    setPalette(t.id);
    toast.success(`Tema diubah: ${t.name}`);
  };

  const handleSelectFont = (fontId: string, fontName: string) => {
    setFont(fontId);
    toast.success(`Tipografi global diubah: ${fontName}`);
  };

  const handleReset = () => {
    resetToDefault();
    toast.info("Tema dan font telah dikembalikan ke pengaturan standar.");
  };

  return (
    <>
      {/* Trigger Button in Header */}
      <button
        onClick={() => setIsOpen(true)}
        title="Theme & Font Studio (40 Tema)"
        aria-label="Theme & Font Studio"
        className="group relative flex h-10 w-10 items-center justify-center rounded-lg border border-border-secondary-alt text-icon-tertiary transition-all hover:border-primary-500/40 hover:bg-background-gray-secondary hover:text-primary-600 focus:outline-none"
      >
        <Palette className="h-5 w-5 transition-transform group-hover:scale-110" />
        {/* Dynamic color dot indicator */}
        <span
          className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-gray-900 shadow-xs"
          style={{ backgroundColor: activeThemeObj?.primaryColor || "#3758f9" }}
        />
      </button>

      {/* Theme Studio Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto bg-white p-6 shadow-2xl dark:bg-gray-900 rounded-3xl">
          <DialogHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-black tracking-tight text-gray-900 dark:text-white">
                    Theme & Typography Studio
                  </DialogTitle>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    40 Tema Eye-Friendly (22 Terang + 18 Gelap) & 5 Google Fonts Global
                  </p>
                </div>
              </div>

              {/* Mode Switcher & Reset */}
              <div className="flex items-center gap-2">
                <div className="flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
                  <button
                    onClick={() => setTheme("light")}
                    title="Mode Terang"
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      theme === "light"
                        ? "bg-white text-amber-600 shadow-xs dark:bg-gray-900"
                        : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
                    }`}
                  >
                    <Sun className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Terang</span>
                  </button>
                  <button
                    onClick={() => setTheme("dark")}
                    title="Mode Gelap"
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      theme === "dark"
                        ? "bg-white text-indigo-400 shadow-xs dark:bg-gray-900"
                        : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
                    }`}
                  >
                    <Moon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Gelap</span>
                  </button>
                  <button
                    onClick={() => setTheme("system")}
                    title="Ikuti Sistem"
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      theme === "system"
                        ? "bg-white text-gray-900 shadow-xs dark:bg-gray-900 dark:text-white"
                        : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
                    }`}
                  >
                    <Laptop className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Sistem</span>
                  </button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="h-8 gap-1 border-gray-200 px-2 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
                  title="Kembalikan ke Default"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-4 space-y-6">
            {/* Section 1: Global Font Switcher (5 Fonts) */}
            <div>
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                  Tipografi Global (5 Google Fonts)
                </h4>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">
                Pilih tipografi preferensi Anda. Perubahan langsung diaplikasikan ke seluruh halaman aplikasi.
              </p>

              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
                {GOOGLE_FONTS.map((f) => {
                  const isSelected = currentFont === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => handleSelectFont(f.id, f.name)}
                      className={`group relative flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/60 shadow-xs dark:border-indigo-500 dark:bg-indigo-950/40"
                          : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          {f.name}
                        </span>
                        {isSelected && (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white dark:bg-indigo-500">
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </div>
                      <p
                        className="mt-2 text-xs font-medium text-gray-700 dark:text-gray-300 line-clamp-2"
                        style={{
                          fontFamily: `var(--font-${f.id}), sans-serif`,
                        }}
                      >
                        The quick brown fox jumps over the lazy dog. 1234567890
                      </p>
                      <span className="mt-2 text-[10px] text-gray-400 line-clamp-1">
                        {f.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: 40 Dynamic Themes */}
            <div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                      Koleksi 40 Tema Tampilan Eye-Friendly
                    </h4>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    22 Tema Terang seimbang & 18 Tema Gelap ramah mata untuk kenyamanan bekerja.
                  </p>
                </div>

                {/* Filter Tabs & Search */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
                    <button
                      onClick={() => setFilterMode("all")}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                        filterMode === "all"
                          ? "bg-white text-indigo-700 shadow-xs dark:bg-gray-900 dark:text-indigo-400"
                          : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
                      }`}
                    >
                      Semua (40)
                    </button>
                    <button
                      onClick={() => setFilterMode("light")}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                        filterMode === "light"
                          ? "bg-white text-indigo-700 shadow-xs dark:bg-gray-900 dark:text-indigo-400"
                          : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
                      }`}
                    >
                      Terang (22)
                    </button>
                    <button
                      onClick={() => setFilterMode("dark")}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                        filterMode === "dark"
                          ? "bg-white text-indigo-700 shadow-xs dark:bg-gray-900 dark:text-indigo-400"
                          : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
                      }`}
                    >
                      Gelap (18)
                    </button>
                  </div>

                  <div className="relative flex items-center">
                    <Search className="absolute left-2.5 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Cari tema..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 rounded-xl border border-gray-200 bg-white pl-8 pr-3 text-xs text-gray-700 outline-none focus:border-indigo-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
                    />
                  </div>
                </div>
              </div>

              {/* Theme Grid */}
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {filteredThemes.map((t) => {
                  const isSelected = currentPalette === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleSelectPalette(t)}
                      className={`group relative flex flex-col justify-between rounded-2xl border p-3 text-left transition-all hover:scale-[1.01] ${
                        isSelected
                          ? "border-indigo-600 ring-2 ring-indigo-500/30 bg-indigo-50/40 dark:border-indigo-400 dark:bg-indigo-950/30"
                          : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
                      }`}
                    >
                      {/* Top Swatch */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-4 w-4 rounded-full ring-2 ring-white dark:ring-gray-800 shadow-xs"
                            style={{ backgroundColor: t.primaryColor }}
                          />
                          <span
                            className="h-3 w-3 rounded-full ring-1 ring-white dark:ring-gray-800"
                            style={{ backgroundColor: t.brandColor }}
                          />
                          <span
                            className="h-2.5 w-2.5 rounded-full ring-1 ring-white dark:ring-gray-800"
                            style={{ backgroundColor: t.bgColor }}
                          />
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                              t.mode === "dark"
                                ? "bg-gray-800 text-gray-300 dark:bg-gray-700"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                            }`}
                          >
                            {t.mode}
                          </span>

                          {isSelected && (
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white dark:bg-indigo-500">
                              <Check className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Theme Name & Description */}
                      <div className="mt-2.5">
                        <p className="font-bold text-xs text-gray-900 dark:text-white truncate">
                          {t.name}
                        </p>
                        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                          {t.description}
                        </p>
                      </div>

                      {/* Active Indicator Bar */}
                      <div className="mt-3 flex items-center gap-1">
                        <div
                          className="h-1.5 w-full rounded-full"
                          style={{
                            background: `linear-gradient(90deg, ${t.primaryColor}, ${t.brandColor})`,
                          }}
                        />
                      </div>
                    </button>
                  );
                })}

                {filteredThemes.length === 0 && (
                  <div className="col-span-full py-12 text-center text-gray-400">
                    Tidak ada tema yang cocok dengan pencarian "{searchQuery}".
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
