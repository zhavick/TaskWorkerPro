"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import Link from "next/link";
import {
  Award,
  Flame,
  Gift,
  CheckCircle2,
  Trophy,
  Sparkles,
  ShoppingBag,
  Coins,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { toast } from "sonner";
import { BadgeIcon } from "@/components/common/BadgeIcon";
import { GamificationNav } from "./_components/gamification-nav";

export default function GamificationPage() {
  const queryClient = useQueryClient();

  // 1. Gamification Summary
  const { data: summary, isLoading: loadingSummary } = useQuery<any>({
    queryKey: ["gamificationSummary"],
    queryFn: async () => {
      const res = await apiClient.get("/gamification/status");
      return res.data.data;
    },
  });

  // 2. Badges List
  const { data: badges = [] } = useQuery<any[]>({
    queryKey: ["gamificationBadges"],
    queryFn: async () => {
      const res = await apiClient.get("/gamification/badges");
      return res.data.data;
    },
  });

  // 3. Rewards List
  const { data: rewards = [] } = useQuery<any[]>({
    queryKey: ["gamificationRewards"],
    queryFn: async () => {
      const res = await apiClient.get("/gamification/rewards");
      return res.data.data;
    },
  });

  // Check In Mutation
  const checkInMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/gamification/check-in");
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Check-In Harian berhasil! (+10 Poin)");
      queryClient.invalidateQueries({ queryKey: ["gamificationSummary"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal check-in"),
  });

  const unlockedBadges = badges.filter((b) => b.isUnlocked);
  const totalPoints = summary?.totalCurrentPoints || 0;
  const rupiahValue = totalPoints * 100;

  return (
    <div className="space-y-6 px-2 py-4 lg:px-6">
      {/* Unified Module Navigation & Header */}
      <GamificationNav
        title="Gamifikasi & Prestasi Tim"
        subtitle="Pantau rangkaian streak harian, raih lencana pencapaian, dan kumpulkan poin reward produktivitas."
        action={
          !summary?.hasCheckedInToday ? (
            <Button
              onClick={() => checkInMutation.mutate()}
              disabled={checkInMutation.isPending}
              className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 font-bold text-white shadow-md shadow-orange-500/20 text-xs"
            >
              <Sparkles className="h-4 w-4" />
              1-Click Check-In (+10 Pts)
            </Button>
          ) : (
            <span className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Sudah Check-In Hari Ini
            </span>
          )
        }
      />

      {/* 4 Standardized KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Saldo Poin */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Saldo Poin Aktif
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
            {loadingSummary ? "..." : totalPoints.toLocaleString("id-ID")}{" "}
            <span className="text-xs font-bold text-gray-400">PTS</span>
          </div>
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            Nilai tukar ≈ Rp {rupiahValue.toLocaleString("id-ID")}
          </span>
        </div>

        {/* Card 2: Streak Harian */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Rangkaian Streak
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-orange-600 dark:text-orange-400">
            {loadingSummary ? "..." : summary?.currentStreakDays || 0}{" "}
            <span className="text-xs font-bold text-gray-400">Hari</span>
          </div>
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            Pertahankan streak check-in tanpa terputus
          </span>
        </div>

        {/* Card 3: Lencana Diraih */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Lencana Diraih
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {unlockedBadges.length}{" "}
            <span className="text-xs font-bold text-gray-400">/ {badges.length}</span>
          </div>
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            Lencana prestasi produktivitas terbuka
          </span>
        </div>

        {/* Card 4: Poin Lencana Permanen */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Poin Permanen Lencana
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Trophy className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            +{summary?.badgePoints || 0}{" "}
            <span className="text-xs font-bold text-gray-400">PTS</span>
          </div>
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            Dari seluruh pencapaian permanen
          </span>
        </div>
      </div>

      {/* 15 & 30 Days Milestones Section */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* 15-Day Milestone */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                Milestone 15 Hari Check-In (Bonus 50%)
              </h4>
              <p className="text-xs text-gray-400">Mendapatkan bonus +100 poin bulanan</p>
            </div>
            {summary?.reached15DaysMilestone ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                Tercapai
              </span>
            ) : (
              <span className="text-xs font-bold text-indigo-600">
                {summary?.daysCheckedInThisMonth || 0}/15 Hari
              </span>
            )}
          </div>

          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full bg-indigo-600 transition-all"
              style={{
                width: `${Math.min(100, Math.round(((summary?.daysCheckedInThisMonth || 0) / 15) * 100))}%`,
              }}
            />
          </div>
        </div>

        {/* 30-Day Milestone */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                Milestone 30 Hari Penuh (Bonus 100%)
              </h4>
              <p className="text-xs text-gray-400">Mendapatkan bonus +200 poin bulanan utuh</p>
            </div>
            {summary?.reached30DaysMilestone ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                Tercapai
              </span>
            ) : (
              <span className="text-xs font-bold text-amber-600">
                {summary?.daysCheckedInThisMonth || 0}/30 Hari
              </span>
            )}
          </div>

          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{
                width: `${Math.min(100, Math.round(((summary?.daysCheckedInThisMonth || 0) / 30) * 100))}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/gamification/badges"
          className="group flex items-center justify-between rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs transition hover:border-indigo-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30 transition group-hover:scale-105">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900 transition group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                Galeri Lencana Prestasi ({unlockedBadges.length} Terbuka)
              </h4>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Jelajahi dan raih Master Badges kategori Tugas, Kehadiran, Timesheet, &amp; Kolaborasi.
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400 transition group-hover:translate-x-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
        </Link>

        <Link
          href="/gamification/rewards"
          className="group flex items-center justify-between rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs transition hover:border-emerald-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30 transition group-hover:scale-105">
              <Gift className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900 transition group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400">
                Toko Penukaran Hadiah ({rewards.length} Item Tersedia)
              </h4>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Tukarkan saldo poin aktif Anda dengan voucher belanja, saldo e-wallet, dan merchandise resmi.
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400 transition group-hover:translate-x-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
        </Link>
      </div>

      {/* Unlocked Badges Preview */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Lencana Prestasi Terbaru
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Pencapaian produktivitas yang berhasil Anda buka
            </p>
          </div>
          <Link
            href="/gamification/badges"
            className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400 flex items-center gap-1"
          >
            Lihat Semua Lencana <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {unlockedBadges.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            Belum ada lencana yang terbuka. Selesaikan tugas atau lakukan presensi tepat waktu untuk membuka lencana pertama Anda!
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {unlockedBadges.slice(0, 6).map((b) => (
              <div
                key={b.id}
                className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-gray-50/50 p-3 text-center dark:border-gray-800 dark:bg-gray-800/40"
              >
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl font-bold text-white shadow-xs mb-2"
                  style={{ backgroundColor: b.color || "#6366F1" }}
                >
                  <BadgeIcon name={b.icon} className="h-5 w-5" />
                </div>
                <h5 className="font-bold text-xs text-gray-900 dark:text-white truncate w-full">
                  {b.name}
                </h5>
                <span className="text-[10px] text-amber-600 font-semibold mt-0.5">
                  +{b.points} Pts
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
