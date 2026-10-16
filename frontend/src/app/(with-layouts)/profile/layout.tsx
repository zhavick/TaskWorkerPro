"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import { Breadcrumbs } from "@/components/tailgrids/core/breadcrumbs";
import {
  User,
  ShieldCheck,
  Bell,
  Building,
  Calendar,
  Sparkles,
  CheckCircle2,
  Lock,
} from "lucide-react";
import {
  COVER_PRESETS,
  getCoverGradientClass,
  getInitials,
} from "./profile-constants";

export interface UserProfileResponse {
  id: string;
  fullName: string;
  email: string;
  jobTitle: string;
  avatarColor: string;
  profilePictureUrl?: string | null;
  coverPictureUrl?: string | null;
  companyId?: number | null;
  companyName?: string | null;
  companyCode?: string | null;
  isApproved: boolean;
  roles: string[];
  phoneNumber?: string | null;
  createdAt?: string | null;
}

const TABS = [
  {
    href: "/profile/account",
    title: "Data Diri & Akun",
    icon: User,
    description: "Kelola profil, avatar, dan banner cover",
  },
  {
    href: "/profile/security",
    title: "Keamanan & Sandi",
    icon: Lock,
    description: "Perbarui kata sandi dan proteksi akun",
  },
  {
    href: "/profile/notification",
    title: "Preferensi Notifikasi",
    icon: Bell,
    description: "Pengaturan pemberitahuan sistem",
  },
];

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const { data: profile, isLoading } = useQuery<UserProfileResponse>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const response = await apiClient.get("/api/profile");
      return response.data.data;
    },
  });

  const coverGradient = getCoverGradientClass(profile?.coverPictureUrl);
  const initials = getInitials(profile?.fullName || "User");
  const avatarBg = profile?.avatarColor || "#6366F1";
  const roleName = profile?.roles?.includes("Administrator") ? "Administrator" : "Member";

  const formattedDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      })
    : "Oktober 2026";

  const isCustomImageCover = profile?.coverPictureUrl && (profile.coverPictureUrl.startsWith("http") || profile.coverPictureUrl.startsWith("/uploads"));

  return (
    <div className="mt-4 space-y-6">
      {/* Breadcrumbs Header */}
      <div className="flex flex-col-reverse items-start justify-between gap-3 px-2 sm:flex-row sm:items-center lg:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            Profil Pengguna
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              Studio Layout
            </span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Kelola identitas, preferensi visual, dan keamanan akun Anda
          </p>
        </div>
        <div>
          <Breadcrumbs
            dividerType="chevron"
            items={[
              { href: "/", label: "Home" },
              { href: "/profile", label: "Profile" },
            ]}
          />
        </div>
      </div>

      <div className="px-2 lg:px-6 space-y-6">
        {/* Ultra-Wide Panoramic Banner Hero Card */}
        <div className="rounded-2xl border border-card-border bg-card-surface-area overflow-hidden shadow-sm">
          {/* Panoramic Cover */}
          <div
            style={isCustomImageCover ? { backgroundImage: `url(${profile!.coverPictureUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
            className={`w-full h-44 sm:h-56 md:h-64 relative ${isCustomImageCover ? "" : `bg-gradient-to-r ${coverGradient}`} transition-all duration-500 flex items-end p-4 sm:p-6 overflow-hidden`}
          >
            {/* Background Grid Pattern Overlay */}
            <div
              className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"
              aria-hidden="true"
            />
            {/* Ambient Lighting Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

            {/* Top Right Cover Tag */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-md px-3 py-1 text-xs font-medium text-white/90 border border-white/20 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                Panoramic Cover
              </span>
            </div>
          </div>

          {/* Profile Identity Row */}
          <div className="px-5 pb-5 sm:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-16 mb-4">
              {/* Avatar + Main Info */}
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
                {/* Dynamic Avatar */}
                {profile?.profilePictureUrl ? (
                  <img
                    src={profile.profilePictureUrl}
                    alt={profile.fullName || "User Avatar"}
                    className="size-24 sm:size-28 rounded-full ring-4 ring-card-surface-area shadow-xl object-cover shrink-0 transition-transform duration-300 hover:scale-105"
                  />
                ) : (
                  <div
                    style={{ backgroundColor: avatarBg }}
                    className="size-24 sm:size-28 rounded-full ring-4 ring-card-surface-area shadow-xl flex items-center justify-center text-white font-extrabold text-3xl sm:text-4xl shrink-0 transition-transform duration-300 hover:scale-105 select-none"
                  >
                    {initials}
                  </div>
                )}

                {/* User Name & Metadata */}
                <div className="space-y-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                      {isLoading ? "Memuat profil..." : profile?.fullName || "Pengguna"}
                    </h2>
                    {profile?.isApproved && (
                      <span title="Akun Terverifikasi">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {profile?.jobTitle || "Anggota Tim"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {profile?.email}
                  </p>
                </div>
              </div>

              {/* Badges & Meta Info */}
              <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 text-xs">
                {/* Role Badge */}
                <span
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold border ${
                    roleName === "Administrator"
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-800"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800"
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {roleName}
                </span>

                {/* Company Badge */}
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 font-medium text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                  <Building className="h-3.5 w-3.5 text-gray-500" />
                  {profile?.companyCode ? `[${profile.companyCode}] ` : ""}
                  {profile?.companyName || "Perusahaan Utama"}
                </span>

                {/* Joined Date */}
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1 font-normal text-gray-500 border border-gray-200/80 dark:bg-gray-800/60 dark:text-gray-400 dark:border-gray-700/80">
                  <Calendar className="h-3.5 w-3.5" />
                  Bergabung {formattedDate}
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 border-t border-card-border pt-3 overflow-x-auto no-scrollbar">
              {TABS.map((tab) => {
                const isActive = pathname === tab.href;
                const IconComponent = tab.icon;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800"
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span>{tab.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Studio Content Area (Full-Width) */}
        <div>{children}</div>
      </div>
    </div>
  );
}
