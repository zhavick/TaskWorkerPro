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
  Clock,
  Check,
  X,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/tailgrids/core/dialog";
import { toast } from "sonner";
import { BadgeIcon } from "@/components/common/BadgeIcon";

export default function GamificationPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"status" | "badges" | "rewards" | "claims">("status");
  const [selectedReward, setSelectedReward] = useState<any | null>(null);
  const [claimNotes, setClaimNotes] = useState("");

  // 1. Gamification Summary
  const { data: summary } = useQuery<any>({
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

  // 4. Claims History
  const { data: claims = [] } = useQuery<any[]>({
    queryKey: ["gamificationClaims"],
    queryFn: async () => {
      const res = await apiClient.get("/gamification/rewards/claims");
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
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["gamificationSummary"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal check-in"),
  });

  // Claim Reward Mutation
  const claimRewardMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/gamification/rewards/claim", {
        rewardItemId: selectedReward.id,
        userNotes: claimNotes,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Pengajuan klaim hadiah berhasil!");
      setSelectedReward(null);
      setClaimNotes("");
      queryClient.invalidateQueries({ queryKey: ["gamificationSummary"] });
      queryClient.invalidateQueries({ queryKey: ["gamificationRewards"] });
      queryClient.invalidateQueries({ queryKey: ["gamificationClaims"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal mengajukan klaim"),
  });

  return (
    <div className="space-y-6 px-2 py-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Gamifikasi, Prestasi & Reward Store
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Kumpulkan poin check-in harian, pertahankan streak api, raih lencana prestasi, dan tukarkan hadiah resmi.
          </p>
        </div>

        {/* Navigation & Subpage Links */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-gray-200/80 bg-white p-1 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs">
            <Flame className="h-3.5 w-3.5" />
            Status &amp; Streak
          </div>
          <Link
            href="/gamification/badges"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <Award className="h-3.5 w-3.5 text-indigo-500" />
            Galeri Lencana ({badges.filter((b) => b.isUnlocked).length})
          </Link>
          <Link
            href="/gamification/rewards"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <Gift className="h-3.5 w-3.5 text-emerald-500" />
            Reward Store
          </Link>
        </div>
      </div>

      {activeTab === "status" && (
        <div className="space-y-6">
          {/* Hero Gamification Card */}
          <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-purple-500/10 p-6 shadow-xs dark:border-amber-900/60">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Saldo Poin Aktif
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-4xl font-black text-gray-900 dark:text-white">
                    {summary?.totalCurrentPoints || 0}
                  </span>
                  <span className="text-base font-bold text-amber-600 dark:text-amber-400">
                    POIN (Rp {((summary?.totalCurrentPoints || 0) * 100).toLocaleString("id-ID")})
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Check-in Bulanan: {summary?.monthlyCheckInPoints || 0} pts | Lencana Permanen: +{summary?.badgePoints || 0} pts
                </p>
              </div>

              {/* Flame Streak & Check In Action */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 shadow-xs dark:bg-gray-900">
                  <Flame className="h-8 w-8 text-orange-500 animate-pulse fill-orange-500" />
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Rangkaian Streak</span>
                    <div className="text-xl font-black text-orange-600 dark:text-orange-400">
                      {summary?.currentStreakDays || 0} Hari
                    </div>
                  </div>
                </div>

                {!summary?.hasCheckedInToday ? (
                  <Button
                    onClick={() => checkInMutation.mutate()}
                    disabled={checkInMutation.isPending}
                    className="h-14 gap-2 bg-gradient-to-r from-amber-500 to-orange-500 px-6 font-bold text-white shadow-lg shadow-orange-500/25 hover:from-amber-600 hover:to-orange-600"
                  >
                    <Sparkles className="h-5 w-5" />
                    1-Click Check-In (+10 Pts)
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 rounded-2xl bg-emerald-100 px-4 py-3 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <CheckCircle2 className="h-5 w-5" />
                    Sudah Check-In Hari Ini
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 15 & 30 Days Milestones */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* 15-Day Milestone (50%) */}
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

            {/* 30-Day Milestone (100%) */}
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

          {/* Quick Action Navigation Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link
              href="/gamification/badges"
              className="group flex items-center justify-between rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/70 to-purple-50/40 p-5 shadow-xs transition hover:border-indigo-300 hover:shadow-md dark:border-indigo-900/50 dark:from-indigo-950/20 dark:to-purple-950/10"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30 transition group-hover:scale-105">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 transition group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                    Galeri 40+ Lencana Prestasi
                  </h4>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    Koleksi lencana Common, Rare, Epic, &amp; Legendary dengan poin permanen.
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 transition group-hover:translate-x-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
            </Link>

            <Link
              href="/gamification/rewards"
              className="group flex items-center justify-between rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/70 to-teal-50/40 p-5 shadow-xs transition hover:border-emerald-300 hover:shadow-md dark:border-emerald-900/50 dark:from-emerald-950/20 dark:to-teal-950/10"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30 transition group-hover:scale-105">
                  <Gift className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 transition group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400">
                    Toko Hadiah (Reward Store)
                  </h4>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    Tukarkan saldo poin aktif dengan voucher e-wallet, pulsa, &amp; merchandise.
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 transition group-hover:translate-x-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
            </Link>
          </div>
        </div>
      )}

      {activeTab === "badges" && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {badges.map((b) => (
            <div
              key={b.id}
              className={`flex flex-col items-center justify-center rounded-2xl border p-5 text-center transition ${
                b.isUnlocked
                  ? "border-amber-300 bg-white shadow-xs dark:border-amber-800 dark:bg-gray-900"
                  : "border-gray-100 bg-gray-50/50 opacity-40 grayscale dark:border-gray-800 dark:bg-gray-900/40"
              }`}
            >
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl font-bold text-white shadow-md mb-3"
                style={{ backgroundColor: b.color || "#10B981" }}
              >
                <BadgeIcon name={b.icon} className="h-7 w-7" />
              </div>
              <h4 className="font-bold text-xs text-gray-900 dark:text-white leading-tight">
                {b.name}
              </h4>
              <p className="mt-1 text-[10px] text-gray-500 line-clamp-2">{b.description}</p>
              <span className="mt-2 rounded-full bg-amber-100 px-2 py-0.2 text-[10px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                +{b.points} Poin
              </span>
            </div>
          ))}
        </div>
      )}

      {activeTab === "rewards" && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rewards.map((r) => (
            <div
              key={r.id}
              className="flex flex-col justify-between rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
                    {r.category}
                  </span>
                  <span className="text-xs text-gray-400">Stok: {r.stock}</span>
                </div>

                <h3 className="mt-3 font-bold text-base text-gray-900 dark:text-white">
                  {r.name}
                </h3>
                <p className="mt-1 text-xs text-gray-500 line-clamp-2">{r.description}</p>

                <div className="mt-4 rounded-xl bg-amber-50/70 p-3 dark:bg-amber-950/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Harga Poin:</span>
                    <span className="font-mono text-base font-black text-amber-600 dark:text-amber-400">
                      {r.pointCost} Pts
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-400 text-right mt-0.5">
                    (Setara Rp {Number(r.rupiahEquivalent).toLocaleString("id-ID")})
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-gray-100 pt-3 dark:border-gray-800">
                <Button
                  onClick={() => setSelectedReward(r)}
                  disabled={r.stock <= 0 || (summary?.totalCurrentPoints || 0) < r.pointCost}
                  className="w-full gap-2 bg-indigo-600 font-semibold text-white hover:bg-indigo-700"
                >
                  <Gift className="h-4 w-4" />
                  Tukar Hadiah
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "claims" && (
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-3">
            Riwayat Pengajuan Klaim Hadiah Anda
          </h4>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/75 dark:border-gray-800 dark:bg-gray-800/50">
                  <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Tanggal</th>
                  <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Item Hadiah</th>
                  <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Poin Terpakai</th>
                  <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Status</th>
                  <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {claims.map((c: any) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-mono text-gray-400">
                      {new Date(c.claimedAt).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                      {c.rewardItemName}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-amber-600">
                      {c.pointsSpent} Pts
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          c.status === 1
                            ? "bg-emerald-100 text-emerald-800"
                            : c.status === 2
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {c.status === 1 ? "Disetujui" : c.status === 2 ? "Ditolak" : "Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{c.userNotes || "-"}</td>
                  </tr>
                ))}

                {claims.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">
                      Belum ada riwayat penukaran hadiah.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Klaim Hadiah */}
      <Dialog
        open={!!selectedReward}
        onOpenChange={(open) => !open && setSelectedReward(null)}
      >
        <DialogContent className="max-w-md bg-white p-6 shadow-2xl dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
              Konfirmasi Penukaran: {selectedReward?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-3.5">
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Saldo poin Anda akan dipotong sebanyak{" "}
              <span className="font-bold text-amber-600">{selectedReward?.pointCost} Poin</span>{" "}
              (Setara Rp {Number(selectedReward?.rupiahEquivalent).toLocaleString("id-ID")}).
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Nomor Akun E-Wallet / Catatan Pengiriman
              </label>
              <Input
                placeholder="Contoh: GoPay / OVO 081234567890 an Budi Santoso"
                value={claimNotes}
                onChange={(e) => setClaimNotes(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSelectedReward(null)}>
                Batal
              </Button>
              <Button
                onClick={() => claimRewardMutation.mutate()}
                disabled={claimRewardMutation.isPending}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Konfirmasi Tukar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
