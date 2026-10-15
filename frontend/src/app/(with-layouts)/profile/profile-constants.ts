export interface CoverPreset {
  id: string;
  name: string;
  gradient: string;
  accent: string;
}

export const COVER_PRESETS: CoverPreset[] = [
  {
    id: "nebula",
    name: "Deep Space Nebula",
    gradient: "from-indigo-950 via-purple-900 to-slate-950",
    accent: "#6366F1",
  },
  {
    id: "emerald",
    name: "Emerald Aurora",
    gradient: "from-teal-950 via-emerald-900 to-slate-950",
    accent: "#10B981",
  },
  {
    id: "sunset",
    name: "Sunset Horizon",
    gradient: "from-rose-950 via-amber-900 to-slate-950",
    accent: "#F59E0B",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk Violet",
    gradient: "from-fuchsia-950 via-violet-900 to-slate-950",
    accent: "#EC4899",
  },
  {
    id: "oceanic",
    name: "Oceanic Azure",
    gradient: "from-blue-950 via-sky-900 to-slate-950",
    accent: "#3B82F6",
  },
  {
    id: "obsidian",
    name: "Minimal Obsidian",
    gradient: "from-slate-900 via-zinc-900 to-black",
    accent: "#64748B",
  },
];

export const AVATAR_COLORS = [
  { name: "Indigo", value: "#6366F1" },
  { name: "Emerald", value: "#10B981" },
  { name: "Amber", value: "#F59E0B" },
  { name: "Rose", value: "#EF4444" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Pink", value: "#EC4899" },
  { name: "Cyan", value: "#06B6D4" },
];

export function getCoverGradientClass(coverPictureUrl?: string | null): string {
  if (!coverPictureUrl) {
    return COVER_PRESETS[0].gradient;
  }
  const preset = COVER_PRESETS.find((p) => p.id === coverPictureUrl || `preset:${p.id}` === coverPictureUrl);
  if (preset) {
    return preset.gradient;
  }
  return COVER_PRESETS[0].gradient;
}

export function getInitials(name?: string | null): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
