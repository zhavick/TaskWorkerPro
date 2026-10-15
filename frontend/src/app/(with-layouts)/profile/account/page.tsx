"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  User,
  Mail,
  Briefcase,
  Phone,
  Save,
  RotateCcw,
  Palette,
  Sparkles,
  ShieldCheck,
  Building,
  Calendar,
  Lock,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { toast } from "sonner";
import Link from "next/link";
import {
  AVATAR_COLORS,
  COVER_PRESETS,
  getCoverGradientClass,
  getInitials,
} from "../profile-constants";
import type { UserProfileResponse } from "../layout";

export default function AccountPage() {
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery<UserProfileResponse>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const response = await apiClient.get("/api/profile");
      return response.data.data;
    },
  });

  // Form State
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatarColor, setAvatarColor] = useState("#6366F1");
  const [coverPictureUrl, setCoverPictureUrl] = useState("nebula");
  const [customCoverUrl, setCustomCoverUrl] = useState("");
  const [isCustomCover, setIsCustomCover] = useState(false);

  // Sync state when profile loads
  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || "");
      setJobTitle(profile.jobTitle || "");
      setPhoneNumber(profile.phoneNumber || "");
      setAvatarColor(profile.avatarColor || "#6366F1");

      const cover = profile.coverPictureUrl || "nebula";
      const isPreset = COVER_PRESETS.some(
        (p) => p.id === cover || `preset:${p.id}` === cover
      );
      if (isPreset) {
        const cleanId = cover.replace("preset:", "");
        setCoverPictureUrl(cleanId);
        setIsCustomCover(false);
      } else {
        setCustomCoverUrl(cover);
        setIsCustomCover(true);
      }
    }
  }, [profile]);

  // Check if form is dirty
  const isDirty =
    profile &&
    (fullName !== (profile.fullName || "") ||
      jobTitle !== (profile.jobTitle || "") ||
      phoneNumber !== (profile.phoneNumber || "") ||
      avatarColor !== (profile.avatarColor || "#6366F1") ||
      (isCustomCover
        ? customCoverUrl !== (profile.coverPictureUrl || "")
        : coverPictureUrl !== (profile.coverPictureUrl?.replace("preset:", "") || "nebula")));

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const activeCover = isCustomCover ? customCoverUrl.trim() : coverPictureUrl;
      const payload = {
        fullName: fullName.trim(),
        jobTitle: jobTitle.trim(),
        avatarColor,
        phoneNumber: phoneNumber.trim() || null,
        coverPictureUrl: activeCover || null,
        profilePictureUrl: profile?.profilePictureUrl || null,
      };
      const response = await apiClient.put("/api/profile", payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Profil Anda berhasil diperbarui!");
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Gagal memperbarui data profil."
      );
    },
  });

  const handleReset = () => {
    if (profile) {
      setFullName(profile.fullName || "");
      setJobTitle(profile.jobTitle || "");
      setPhoneNumber(profile.phoneNumber || "");
      setAvatarColor(profile.avatarColor || "#6366F1");
      const cover = profile.coverPictureUrl || "nebula";
      const isPreset = COVER_PRESETS.some(
        (p) => p.id === cover || `preset:${p.id}` === cover
      );
      if (isPreset) {
        setCoverPictureUrl(cover.replace("preset:", ""));
        setIsCustomCover(false);
      } else {
        setCustomCoverUrl(cover);
        setIsCustomCover(true);
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Nama lengkap tidak boleh kosong.");
      return;
    }
    updateProfileMutation.mutate();
  };

  const activeCoverClass = isCustomCover
    ? COVER_PRESETS[0].gradient
    : getCoverGradientClass(coverPictureUrl);

  const initials = getInitials(fullName || profile?.fullName || "User");

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {/* 12-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 Kolom): Main Personal Data & Visual Pickers */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Identitas Pribadi */}
          <div className="rounded-2xl border border-card-border bg-card-surface-area p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-card-border">
              <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Identitas & Informasi Akun
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Data utama yang ditampilkan pada kartu tugas dan direktori tim
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-indigo-500" />
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Masukkan nama lengkap"
                  required
                  className="w-full text-sm font-medium"
                />
              </div>

              {/* Email (Readonly) */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-indigo-500" />
                    Alamat Email Terdaftar
                  </span>
                  <span className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Permanen
                  </span>
                </label>
                <div className="relative">
                  <Input
                    value={profile?.email || ""}
                    readOnly
                    disabled
                    className="w-full text-sm bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 cursor-not-allowed"
                  />
                </div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                  Alamat email digunakan sebagai kredensial login utama dan notifikasi sistem.
                </p>
              </div>

              {/* Job Title / Specialization */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-indigo-500" />
                  Spesialisasi / Jabatan <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="contoh: Senior Frontend Engineer"
                  required
                  className="w-full text-sm font-medium"
                />
              </div>

              {/* Phone / WhatsApp */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-indigo-500" />
                  Nomor WhatsApp / Kontak
                </label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="contoh: +62 812-3456-7890"
                  className="w-full text-sm font-medium"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Pemilih Warna Aksen Avatar */}
          <div className="rounded-2xl border border-card-border bg-card-surface-area p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-card-border">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-pink-50 text-pink-600 dark:bg-pink-950/60 dark:text-pink-400">
                  <Palette className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Warna Aksen Avatar Pengguna
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Pilih palet warna yang mewakili inisial avatar Anda di seluruh antarmuka
                  </p>
                </div>
              </div>

              {/* Live Mini Preview */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Pratinjau:</span>
                <div
                  style={{ backgroundColor: avatarColor }}
                  className="size-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-card-border select-none"
                >
                  {initials}
                </div>
              </div>
            </div>

            {/* Color Swatches Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 pt-1">
              {AVATAR_COLORS.map((c) => {
                const isSelected = avatarColor.toLowerCase() === c.value.toLowerCase();
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setAvatarColor(c.value)}
                    title={c.name}
                    className={`group relative flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all border ${
                      isSelected
                        ? "bg-gray-100 border-indigo-600 dark:bg-gray-800 dark:border-indigo-400 shadow-sm"
                        : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/60"
                    }`}
                  >
                    <div
                      style={{ backgroundColor: c.value }}
                      className="size-8 rounded-full flex items-center justify-center text-white shadow-sm ring-2 ring-black/5 dark:ring-white/10 group-hover:scale-105 transition-transform"
                    >
                      {isSelected && <Check className="h-4 w-4 stroke-[3]" />}
                    </div>
                    <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">
                      {c.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 3: Galeri Cover Banner Panoramik */}
          <div className="rounded-2xl border border-card-border bg-card-surface-area p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-card-border">
              <div className="flex size-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Galeri Banner Cover Panoramik
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Pilih preset tema panoramik modern untuk menghiasi header profil Anda
                </p>
              </div>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {COVER_PRESETS.map((preset) => {
                const isSelected = !isCustomCover && coverPictureUrl === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setCoverPictureUrl(preset.id);
                      setIsCustomCover(false);
                    }}
                    className={`relative rounded-xl border p-2 text-left transition-all overflow-hidden group ${
                      isSelected
                        ? "border-indigo-600 ring-2 ring-indigo-600/30 dark:border-indigo-400"
                        : "border-card-border hover:border-gray-400 dark:hover:border-gray-600"
                    }`}
                  >
                    {/* Visual Preview */}
                    <div
                      className={`h-16 w-full rounded-lg bg-gradient-to-r ${preset.gradient} relative overflow-hidden flex items-end p-2 mb-2 shadow-inner`}
                    >
                      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px]" />
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 size-5 rounded-full bg-white text-indigo-600 flex items-center justify-center shadow-md">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                        {preset.name}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                          Aktif
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom URL Option */}
            <div className="pt-3 border-t border-card-border/80">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mb-1.5">
                Atau gunakan URL Gambar Kustom:
              </label>
              <div className="flex gap-2">
                <Input
                  value={customCoverUrl}
                  onChange={(e) => {
                    setCustomCoverUrl(e.target.value);
                    if (e.target.value.trim()) {
                      setIsCustomCover(true);
                    }
                  }}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="text-xs font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (customCoverUrl.trim()) {
                      setIsCustomCover(true);
                      toast.info("Cover kustom diaktifkan");
                    }
                  }}
                  className="text-xs whitespace-nowrap"
                >
                  Terapkan URL
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 Kolom): Summary, Actions & Security Shortcuts */}
        <div className="lg:col-span-4 space-y-6">
          {/* Action Card (Sticky) */}
          <div className="rounded-2xl border border-card-border bg-card-surface-area p-5 shadow-sm space-y-4 lg:sticky lg:top-24">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center justify-between">
              <span>Tindakan Profil</span>
              {isDirty ? (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="h-3 w-3" /> Ada Perubahan
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="h-3 w-3" /> Tersimpan
                </span>
              )}
            </h4>

            <div className="space-y-2.5">
              <Button
                type="submit"
                disabled={updateProfileMutation.isPending || !isDirty}
                className="w-full justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 py-2.5 font-semibold text-sm"
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menyimpan Perubahan...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Simpan Semua Perubahan
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={!isDirty || updateProfileMutation.isPending}
                onClick={handleReset}
                className="w-full justify-center gap-2 text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Kembalikan Perubahan
              </Button>
            </div>

            <div className="border-t border-card-border pt-4 space-y-3">
              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Informasi Keanggotaan
              </h5>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-card-border/60">
                  <span className="text-gray-500">Perusahaan</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                    <Building className="h-3 w-3 text-gray-400" />
                    {profile?.companyName || "Holding"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-card-border/60">
                  <span className="text-gray-500">Kode Perusahaan</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {profile?.companyCode || "DEFAULT"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-card-border/60">
                  <span className="text-gray-500">Peran Akses</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {profile?.roles?.join(", ") || "Member"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-card-border/60">
                  <span className="text-gray-500">Status Akun</span>
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    <ShieldCheck className="h-3.5 w-3.5" /> Aktif & Disetujui
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Link to Security */}
            <div className="pt-2">
              <Link
                href="/profile/security"
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/60 dark:hover:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors border border-card-border/80"
              >
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-indigo-500" />
                  <span>Ingin Mengubah Kata Sandi?</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
