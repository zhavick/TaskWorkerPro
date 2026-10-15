"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import { toast } from "sonner";
import Link from "next/link";
import {
  Gift,
  Award,
  Flame,
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Coins,
  Sparkles,
  Wallet,
  Smartphone,
  Coffee,
  Check,
  X,
  ShieldCheck,
  Search,
  Filter,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/tailgrids/core/dialog";

export default function RewardStorePage() {
  const queryClient = useQueryClient();

  // Tab states
  const [activeTab, setActiveTab] = useState<"catalog" | "my-claims" | "admin-manage" | "admin-approvals">("catalog");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // User Claim Modal states
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<any | null>(null);
  const [claimNotes, setClaimNotes] = useState("");

  // Admin Reward CRUD Modal states
  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [rewardFormMode, setRewardFormMode] = useState<"create" | "edit">("create");
  const [editingRewardId, setEditingRewardId] = useState<number | null>(null);
  const [rewardForm, setRewardForm] = useState({
    name: "",
    description: "",
    pointCost: 100,
    stock: 10,
    category: "Voucher",
    icon: "gift",
    color: "indigo",
    isActive: true,
    isMonthlyMilestoneReward: false,
    orderIndex: 0,
  });

  // Admin Process Claim Modal states
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [claimToProcess, setClaimToProcess] = useState<any | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  // 1. User Profile & Admin Check
  const { data: userProfile } = useQuery<any>({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const res = await apiClient.get("/profile");
      return res.data.data;
    },
  });

  const isAdmin = useMemo(() => {
    if (!userProfile) return false;
    const title = (userProfile.jobTitle || "").toLowerCase();
    const email = (userProfile.email || "").toLowerCase();
    return (
      title.includes("admin") ||
      title.includes("architect") ||
      email.includes("admin@") ||
      userProfile.id === "usr-superadmin"
    );
  }, [userProfile]);

  // 2. User Gamification Status (Balance & Points)
  const { data: status, refetch: refetchStatus } = useQuery<any>({
    queryKey: ["gamificationStatus"],
    queryFn: async () => {
      const res = await apiClient.get("/gamification/status");
      return res.data.data;
    },
  });

  // 3. Rewards Catalog (Active)
  const { data: rewards = [], isLoading: loadingRewards, refetch: refetchRewards } = useQuery<any[]>({
    queryKey: ["gamificationRewards"],
    queryFn: async () => {
      const res = await apiClient.get("/gamification/rewards");
      return res.data.data || [];
    },
  });

  // 4. Admin All Rewards (Active + Inactive)
  const { data: adminRewards = [], refetch: refetchAdminRewards } = useQuery<any[]>({
    queryKey: ["adminRewardsList"],
    queryFn: async () => {
      const res = await apiClient.get("/gamification/admin/rewards");
      return res.data.data || [];
    },
    enabled: isAdmin,
  });

  // 5. User Personal Claims History
  const { data: myClaims = [], isLoading: loadingMyClaims, refetch: refetchMyClaims } = useQuery<any[]>({
    queryKey: ["myRewardClaims"],
    queryFn: async () => {
      const res = await apiClient.get("/gamification/rewards/claims");
      return res.data.data || [];
    },
  });

  // 6. Admin Team Claims Queue
  const { data: adminClaims = [], isLoading: loadingAdminClaims, refetch: refetchAdminClaims } = useQuery<any[]>({
    queryKey: ["adminTeamClaims"],
    queryFn: async () => {
      const res = await apiClient.get("/gamification/admin/claims");
      return res.data.data || [];
    },
    enabled: isAdmin,
  });

  // Mutations
  const claimMutation = useMutation({
    mutationFn: async (payload: { rewardItemId: number; userNotes?: string }) => {
      const res = await apiClient.post("/gamification/rewards/claim", payload);
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success(data.message || "Pengajuan klaim hadiah berhasil dikirim!");
      setClaimModalOpen(false);
      setClaimNotes("");
      setSelectedReward(null);
      refetchStatus();
      refetchRewards();
      refetchMyClaims();
      if (isAdmin) refetchAdminClaims();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal mengajukan klaim hadiah");
    },
  });

  const saveRewardMutation = useMutation({
    mutationFn: async () => {
      if (rewardFormMode === "create") {
        const res = await apiClient.post("/gamification/admin/rewards", rewardForm);
        return res.data;
      } else {
        const res = await apiClient.put(`/gamification/admin/rewards/${editingRewardId}`, rewardForm);
        return res.data;
      }
    },
    onSuccess: (data: any) => {
      toast.success(data.message || "Katalog hadiah berhasil disimpan!");
      setRewardModalOpen(false);
      refetchRewards();
      refetchAdminRewards();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal menyimpan item hadiah");
    },
  });

  const deleteRewardMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete(`/gamification/admin/rewards/${id}`);
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success(data.message || "Hadiah berhasil dihapus/dinonaktifkan");
      refetchRewards();
      refetchAdminRewards();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal memproses hadiah");
    },
  });

  const processClaimMutation = useMutation({
    mutationFn: async ({ id, isApproved, notes }: { id: number; isApproved: boolean; notes?: string }) => {
      const res = await apiClient.post(`/gamification/admin/claims/${id}/process`, {
        isApproved,
        adminNotes: notes,
      });
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success(data.message || "Klaim berhasil diproses!");
      setProcessModalOpen(false);
      setClaimToProcess(null);
      setAdminNotes("");
      refetchAdminClaims();
      refetchRewards();
      refetchAdminRewards();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal memproses klaim hadiah");
    },
  });

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    rewards.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set);
  }, [rewards]);

  // Filtered Rewards for Catalog
  const filteredRewards = useMemo(() => {
    return rewards.filter((r) => {
      const matchSearch =
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.description && r.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.category && r.category.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCategory = categoryFilter === "all" || r.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [rewards, searchTerm, categoryFilter]);

  const currentPoints = status?.totalCurrentPoints ?? 0;
  const rupiahValue = currentPoints * 100;

  const pendingClaimsCount = useMemo(() => {
    return adminClaims.filter((c: any) => c.status === 0 || c.status === "Pending").length;
  }, [adminClaims]);

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumbs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
            <Link href="/gamification" className="hover:text-indigo-600 dark:hover:text-indigo-400">
              Gamifikasi
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-gray-900 dark:text-white">Reward Store</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            Toko Penukaran Hadiah (Reward Store)
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Tukarkan saldo poin produktivitas Anda dengan voucher e-wallet, pulsa, kopi, dan merchandise.
          </p>
        </div>

        {/* Subpage Switcher Tabs */}
        <div className="flex items-center gap-1.5 rounded-xl border border-gray-200/80 bg-white p-1 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <Link
            href="/gamification"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <Flame className="h-3.5 w-3.5 text-amber-500" />
            Status &amp; Streak
          </Link>
          <Link
            href="/gamification/badges"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <Award className="h-3.5 w-3.5 text-indigo-500" />
            Lencana Prestasi
          </Link>
          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs">
            <Gift className="h-3.5 w-3.5" />
            Reward Store
          </div>
        </div>
      </div>

      {/* Saldo Poin & Valuasi Rupiah Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 p-6 text-white shadow-lg shadow-emerald-900/10 dark:border-emerald-900/50">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md shadow-inner text-amber-300">
              <Coins className="h-8 w-8" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-100">
                Saldo Poin Aktif Anda
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-black sm:text-4xl">
                  {currentPoints.toLocaleString("id-ID")}
                </span>
                <span className="text-sm font-bold text-emerald-200">Poin</span>
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold text-white backdrop-blur-md">
                  ≈ Rp {rupiahValue.toLocaleString("id-ID")}
                </span>
              </div>
              <p className="mt-1 text-xs text-emerald-100/80">
                Nilai tukar resmi: 1 Poin = Rp 100. Poin diperoleh dari check-in absensi &amp; lencana prestasi.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchStatus();
                refetchRewards();
                refetchMyClaims();
              }}
              className="border-white/30 bg-white/10 text-xs font-semibold text-white hover:bg-white/20 backdrop-blur-md"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Segarkan
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs Inside Reward Store */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200/80 pb-3 dark:border-gray-800">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("catalog")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === "catalog"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            Katalog Hadiah
          </button>

          <button
            onClick={() => setActiveTab("my-claims")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === "my-claims"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            <Clock className="h-4 w-4" />
            Riwayat Klaim Saya ({myClaims.length})
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab("admin-approvals")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                  activeTab === "admin-approvals"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                Persetujuan Klaim Tim
                {pendingClaimsCount > 0 && (
                  <span className="rounded-full bg-rose-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                    {pendingClaimsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("admin-manage")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                  activeTab === "admin-manage"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300"
                }`}
              >
                <Pencil className="h-4 w-4" />
                Kelola Katalog Admin
              </button>
            </>
          )}
        </div>

        {isAdmin && activeTab === "admin-manage" && (
          <Button
            size="sm"
            onClick={() => {
              setRewardFormMode("create");
              setEditingRewardId(null);
              setRewardForm({
                name: "",
                description: "",
                pointCost: 200,
                stock: 10,
                category: "Voucher",
                icon: "gift",
                color: "indigo",
                isActive: true,
                isMonthlyMilestoneReward: false,
                orderIndex: 0,
              });
              setRewardModalOpen(true);
            }}
            className="gap-1.5 bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah Hadiah Baru
          </Button>
        )}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: KATALOG HADIAH */}
      {/* ======================================================== */}
      {activeTab === "catalog" && (
        <div className="space-y-6">
          {/* Search & Category Filter Toolbar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari voucher, e-wallet, kopi, merchandise..."
                className="pl-9 text-xs"
              />
            </div>

            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="all">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Catalog Cards Grid */}
          {loadingRewards ? (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
                Memuat katalog hadiah...
              </div>
            </div>
          ) : filteredRewards.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center dark:border-gray-800 dark:bg-gray-900">
              <Gift className="h-10 w-10 text-gray-300 dark:text-gray-600" />
              <h4 className="mt-3 text-sm font-bold text-gray-900 dark:text-white">
                Belum ada hadiah yang tersedia
              </h4>
              <p className="mt-1 text-xs text-gray-400">
                Katalog hadiah akan segera diperbarui oleh Administrator.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredRewards.map((item) => {
                const canAfford = currentPoints >= item.pointCost && item.stock > 0;

                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div>
                      {/* Category & Stock */}
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          {item.category || "Voucher"}
                        </span>
                        <span
                          className={`text-[10px] font-semibold ${
                            item.stock > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {item.stock > 0 ? `Tersisa ${item.stock} unit` : "Stok Habis"}
                        </span>
                      </div>

                      {/* Icon & Title */}
                      <div className="mt-4 flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                          <Gift className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">
                            {item.name}
                          </h3>
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                            {item.description || "Tukarkan poin Anda dengan hadiah menarik ini."}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Price & Action Button */}
                    <div className="mt-5 border-t border-gray-100 pt-3 dark:border-gray-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-base font-black text-gray-900 dark:text-white">
                            {item.pointCost} <span className="text-xs font-bold text-emerald-600">Poin</span>
                          </div>
                          <span className="text-[10px] text-gray-400">
                            ≈ Rp {(item.pointCost * 100).toLocaleString("id-ID")}
                          </span>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedReward(item);
                            setClaimNotes("");
                            setClaimModalOpen(true);
                          }}
                          disabled={!canAfford}
                          className={`text-xs font-semibold ${
                            canAfford
                              ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20"
                              : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed"
                          }`}
                        >
                          {item.stock <= 0
                            ? "Habis"
                            : !canAfford
                            ? "Poin Kurang"
                            : "Tukar Hadiah"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: RIWAYAT KLAIM SAYA */}
      {/* ======================================================== */}
      {activeTab === "my-claims" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-100 pb-3 dark:border-gray-800">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Riwayat Pengajuan Klaim Hadiah Anda
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Pantau status verifikasi dan pencairan hadiah yang Anda tukarkan.
            </p>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:border-gray-800">
                <tr>
                  <th className="py-2.5 pr-4">Tanggal Pengajuan</th>
                  <th className="py-2.5 pr-4">Nama Hadiah</th>
                  <th className="py-2.5 pr-4">Poin Terpakai</th>
                  <th className="py-2.5 pr-4">Nilai Rupiah</th>
                  <th className="py-2.5 pr-4">Status Klaim</th>
                  <th className="py-2.5 pr-4">Catatan Anda</th>
                  <th className="py-2.5">Catatan Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {myClaims.map((claim: any) => (
                  <tr key={claim.id} className="transition hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                    <td className="py-3 pr-4 font-mono text-[11px] text-gray-500">
                      {new Date(claim.claimedAt).toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 pr-4 font-semibold text-gray-900 dark:text-white">
                      {claim.rewardItemName}
                    </td>
                    <td className="py-3 pr-4 font-bold text-emerald-600 dark:text-emerald-400">
                      -{claim.pointsSpent} Poin
                    </td>
                    <td className="py-3 pr-4 font-mono text-gray-600 dark:text-gray-300">
                      Rp {claim.rupiahEquivalent?.toLocaleString("id-ID") || "-"}
                    </td>
                    <td className="py-3 pr-4">
                      {claim.status === 0 || claim.status === "Pending" ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                          <Clock className="h-3 w-3" />
                          Menunggu Review
                        </span>
                      ) : claim.status === 1 || claim.status === "Approved" ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Disetujui
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
                          <XCircle className="h-3 w-3" />
                          Ditolak (Poin Kembali)
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-gray-500">
                      {claim.userNotes || "-"}
                    </td>
                    <td className="py-3 text-gray-500">
                      {claim.adminNotes || "-"}
                    </td>
                  </tr>
                ))}

                {myClaims.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      Anda belum pernah mengajukan penukaran hadiah.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: ADMIN APPROVALS QUEUE */}
      {/* ======================================================== */}
      {isAdmin && activeTab === "admin-approvals" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Antrean Persetujuan Klaim Hadiah Tim
              </h3>
              <p className="mt-0.5 text-xs text-gray-500">
                Tinjau dan proses pengajuan penukaran hadiah dari staf perusahaan.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchAdminClaims()}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className="h-3 w-3" />
              Segarkan
            </Button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:border-gray-800">
                <tr>
                  <th className="py-2.5 pr-4">Waktu</th>
                  <th className="py-2.5 pr-4">Nama Staf</th>
                  <th className="py-2.5 pr-4">Hadiah Diminta</th>
                  <th className="py-2.5 pr-4">Poin</th>
                  <th className="py-2.5 pr-4">Rupiah</th>
                  <th className="py-2.5 pr-4">Catatan Pengguna</th>
                  <th className="py-2.5 pr-4">Status</th>
                  <th className="py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {adminClaims.map((claim: any) => {
                  const isPending = claim.status === 0 || claim.status === "Pending";

                  return (
                    <tr key={claim.id} className="transition hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                      <td className="py-3 pr-4 font-mono text-[11px] text-gray-500">
                        {new Date(claim.claimedAt).toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 pr-4 font-semibold text-gray-900 dark:text-white">
                        {claim.userName}
                      </td>
                      <td className="py-3 pr-4 font-semibold text-gray-800 dark:text-gray-200">
                        {claim.rewardItemName}
                      </td>
                      <td className="py-3 pr-4 font-bold text-emerald-600 dark:text-emerald-400">
                        {claim.pointsSpent} Pts
                      </td>
                      <td className="py-3 pr-4 font-mono text-gray-600 dark:text-gray-300">
                        Rp {claim.rupiahEquivalent?.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 pr-4 text-gray-500 max-w-xs truncate">
                        {claim.userNotes || "-"}
                      </td>
                      <td className="py-3 pr-4">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                            <Clock className="h-3 w-3" />
                            Pending
                          </span>
                        ) : claim.status === 1 || claim.status === "Approved" ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            Disetujui
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
                            <XCircle className="h-3 w-3" />
                            Ditolak
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {isPending ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              setClaimToProcess(claim);
                              setAdminNotes("");
                              setProcessModalOpen(true);
                            }}
                            className="bg-indigo-600 text-[11px] font-semibold text-white hover:bg-indigo-700"
                          >
                            Proses Klaim
                          </Button>
                        ) : (
                          <span className="text-[11px] text-gray-400">Sudah Diproses</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {adminClaims.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-400">
                      Belum ada klaim hadiah dari staf yang masuk.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: ADMIN MANAGE REWARDS */}
      {/* ======================================================== */}
      {isAdmin && activeTab === "admin-manage" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-100 pb-3 dark:border-gray-800">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Daftar Seluruh Item Hadiah (Katalog Master)
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Kelola stok, harga poin, nama voucher, dan status tayang di Reward Store.
            </p>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:border-gray-800">
                <tr>
                  <th className="py-2.5 pr-4">Nama Hadiah</th>
                  <th className="py-2.5 pr-4">Kategori</th>
                  <th className="py-2.5 pr-4">Biaya Poin</th>
                  <th className="py-2.5 pr-4">Ekuivalen Rp</th>
                  <th className="py-2.5 pr-4">Sisa Stok</th>
                  <th className="py-2.5 pr-4">Status Tayang</th>
                  <th className="py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {adminRewards.map((reward: any) => (
                  <tr key={reward.id} className="transition hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                    <td className="py-3 pr-4 font-semibold text-gray-900 dark:text-white">
                      {reward.name}
                    </td>
                    <td className="py-3 pr-4 text-gray-500">
                      {reward.category}
                    </td>
                    <td className="py-3 pr-4 font-bold text-emerald-600 dark:text-emerald-400">
                      {reward.pointCost} Poin
                    </td>
                    <td className="py-3 pr-4 font-mono text-gray-600 dark:text-gray-300">
                      Rp {(reward.pointCost * 100).toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`font-semibold ${reward.stock > 0 ? "text-gray-900 dark:text-white" : "text-rose-600"}`}>
                        {reward.stock} unit
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      {reward.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                          Non-Aktif
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRewardFormMode("edit");
                            setEditingRewardId(reward.id);
                            setRewardForm({
                              name: reward.name,
                              description: reward.description || "",
                              pointCost: reward.pointCost,
                              stock: reward.stock,
                              category: reward.category || "Voucher",
                              icon: reward.icon || "gift",
                              color: reward.color || "indigo",
                              isActive: reward.isActive,
                              isMonthlyMilestoneReward: false,
                              orderIndex: 0,
                            });
                            setRewardModalOpen(true);
                          }}
                          className="h-7 w-7 p-0"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Hapus/nonaktifkan '${reward.name}' dari katalog?`)) {
                              deleteRewardMutation.mutate(reward.id);
                            }
                          }}
                          className="h-7 w-7 p-0 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}

                {adminRewards.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      Belum ada hadiah dalam katalog master.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: REDEEM / CLAIM HADIAH OLEH PENGGUNA */}
      {/* ======================================================== */}
      <Dialog isOpen={claimModalOpen} onOpenChange={setClaimModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <Gift className="h-5 w-5" />
              Konfirmasi Penukaran Hadiah
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {selectedReward && (
              <>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                      {selectedReward.name}
                    </h4>
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      {selectedReward.pointCost} Poin
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                    {selectedReward.description}
                  </p>
                  <div className="mt-3 flex items-center justify-between border-t border-emerald-200/60 pt-2 text-xs dark:border-emerald-900/60">
                    <span className="text-gray-500">Saldo poin setelah penukaran:</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">
                      {(currentPoints - selectedReward.pointCost).toLocaleString("id-ID")} Poin
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                    Catatan Penukaran (Nomor HP, E-Wallet, atau Rekening) *
                  </label>
                  <Input
                    value={claimNotes}
                    onChange={(e) => setClaimNotes(e.target.value)}
                    placeholder="misal: GoPay 0812-3456-7890 an. Budi"
                    className="text-xs"
                    autoFocus
                  />
                  <p className="mt-1 text-[11px] text-gray-400">
                    Informasi ini digunakan administrator untuk mengirimkan voucher/hadiah Anda.
                  </p>
                </div>

                <div className="mt-4 flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setClaimModalOpen(false)}
                    disabled={claimMutation.isPending}
                  >
                    Batal
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      claimMutation.mutate({
                        rewardItemId: selectedReward.id,
                        userNotes: claimNotes.trim(),
                      });
                    }}
                    disabled={!claimNotes.trim() || claimMutation.isPending}
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    {claimMutation.isPending ? "Mengajukan..." : "Kirim Pengajuan Klaim"}
                  </Button>
                </div>
              </>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL 2: ADMIN FORM TAMBAH / EDIT HADIAH */}
      {/* ======================================================== */}
      <Dialog isOpen={rewardModalOpen} onOpenChange={setRewardModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-600">
              <Gift className="h-5 w-5" />
              {rewardFormMode === "create" ? "Tambah Item Hadiah Baru" : "Edit Katalog Hadiah"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3.5">
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                Nama Hadiah *
              </label>
              <Input
                value={rewardForm.name}
                onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                placeholder="misal: Voucher OVO Rp 50.000"
                className="text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                Deskripsi
              </label>
              <Input
                value={rewardForm.description}
                onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
                placeholder="Penjelasan rincian hadiah atau syarat penukaran"
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                  Biaya Poin *
                </label>
                <Input
                  type="number"
                  min="10"
                  value={rewardForm.pointCost}
                  onChange={(e) => setRewardForm({ ...rewardForm, pointCost: Number(e.target.value) || 0 })}
                  className="text-xs"
                />
                <span className="text-[10px] text-gray-400">
                  ≈ Rp {(rewardForm.pointCost * 100).toLocaleString("id-ID")}
                </span>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                  Stok Tersedia *
                </label>
                <Input
                  type="number"
                  min="0"
                  value={rewardForm.stock}
                  onChange={(e) => setRewardForm({ ...rewardForm, stock: Number(e.target.value) || 0 })}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                  Kategori
                </label>
                <select
                  value={rewardForm.category}
                  onChange={(e) => setRewardForm({ ...rewardForm, category: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 bg-white p-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="Voucher">Voucher E-Wallet</option>
                  <option value="Pulsa">Pulsa &amp; Paket Data</option>
                  <option value="F&B">F&amp;B / Kopi</option>
                  <option value="Merchandise">Merchandise Kantor</option>
                  <option value="Gadget">Gadget &amp; Aksesoris</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                  Status Tayang
                </label>
                <select
                  value={rewardForm.isActive ? "1" : "0"}
                  onChange={(e) => setRewardForm({ ...rewardForm, isActive: e.target.value === "1" })}
                  className="w-full rounded-xl border border-gray-300 bg-white p-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="1">Aktif (Tampil di Katalog)</option>
                  <option value="0">Non-Aktif (Disembunyikan)</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRewardModalOpen(false)}
                disabled={saveRewardMutation.isPending}
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={() => saveRewardMutation.mutate()}
                disabled={!rewardForm.name.trim() || rewardForm.pointCost <= 0 || saveRewardMutation.isPending}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {saveRewardMutation.isPending ? "Menyimpan..." : "Simpan Hadiah"}
              </Button>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL 3: ADMIN PROSES KLAIM (SETUJUI / TOLAK) */}
      {/* ======================================================== */}
      <Dialog isOpen={processModalOpen} onOpenChange={setProcessModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <ShieldCheck className="h-5 w-5" />
              Proses Pengajuan Klaim Hadiah
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {claimToProcess && (
              <>
                <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 text-xs dark:border-gray-800 dark:bg-gray-800/40">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Pemohon:</span>
                    <strong className="text-gray-900 dark:text-white">{claimToProcess.userName}</strong>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span className="text-gray-500">Hadiah:</span>
                    <strong className="text-gray-900 dark:text-white">{claimToProcess.rewardItemName}</strong>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span className="text-gray-500">Biaya Poin:</span>
                    <span className="font-bold text-emerald-600">{claimToProcess.pointsSpent} Poin</span>
                  </div>
                  <div className="mt-2 border-t border-gray-200/60 pt-2 dark:border-gray-700/60">
                    <span className="text-gray-500">Catatan Pemohon:</span>
                    <p className="mt-0.5 font-semibold text-gray-800 dark:text-gray-200">
                      {claimToProcess.userNotes || "-"}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                    Catatan Administrator (Nomor Resi / Bukti Transfer)
                  </label>
                  <Input
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="misal: Saldo GoPay telah ditransfer via Bank BCA"
                    className="text-xs"
                    autoFocus
                  />
                </div>

                <div className="mt-4 flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProcessModalOpen(false)}
                    disabled={processClaimMutation.isPending}
                  >
                    Batal
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      processClaimMutation.mutate({
                        id: claimToProcess.id,
                        isApproved: false,
                        notes: adminNotes.trim(),
                      });
                    }}
                    disabled={processClaimMutation.isPending}
                    className="bg-rose-600 text-white hover:bg-rose-700"
                  >
                    Tolak &amp; Kembalikan Poin
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      processClaimMutation.mutate({
                        id: claimToProcess.id,
                        isApproved: true,
                        notes: adminNotes.trim(),
                      });
                    }}
                    disabled={processClaimMutation.isPending}
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Setujui Klaim
                  </Button>
                </div>
              </>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
