"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import { toast } from "sonner";
import Link from "next/link";
import {
  Award,
  Flame,
  Gift,
  CheckCircle2,
  Lock,
  Unlock,
  Sparkles,
  Search,
  Filter,
  ShieldCheck,
  User,
  Clock,
  Layers,
  ChevronRight,
  Plus,
  RefreshCw,
  Trophy,
  Star,
  Check,
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

const RARITY_CONFIG: Record<
  number,
  { label: string; badgeClass: string; borderClass: string; bgClass: string; glowClass: string }
> = {
  0: {
    label: "Common",
    badgeClass: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    borderClass: "border-gray-200 dark:border-gray-800",
    bgClass: "from-gray-50/50 to-white dark:from-gray-900/60 dark:to-gray-900",
    glowClass: "",
  },
  1: {
    label: "Rare",
    badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
    borderClass: "border-blue-200 dark:border-blue-900/50",
    bgClass: "from-blue-50/30 to-white dark:from-blue-950/20 dark:to-gray-900",
    glowClass: "shadow-xs shadow-blue-500/10",
  },
  2: {
    label: "Epic",
    badgeClass: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-200 dark:border-purple-800",
    borderClass: "border-purple-200 dark:border-purple-900/50",
    bgClass: "from-purple-50/30 to-white dark:from-purple-950/20 dark:to-gray-900",
    glowClass: "shadow-md shadow-purple-500/15",
  },
  3: {
    label: "Legendary",
    badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-bold",
    borderClass: "border-amber-300 dark:border-amber-700/60",
    bgClass: "from-amber-50/40 via-yellow-50/20 to-white dark:from-amber-950/30 dark:to-gray-900",
    glowClass: "shadow-lg shadow-amber-500/20 ring-1 ring-amber-400/30",
  },
};

export default function BadgesGalleryPage() {
  const queryClient = useQueryClient();

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "unlocked" | "locked">("all");

  // Admin Award Modal state
  const [awardModalOpen, setAwardModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedBadgeId, setSelectedBadgeId] = useState<number | "">("");

  // 1. Current User Profile (for Admin check)
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

  // 2. Badges List
  const { data: badges = [], isLoading: loadingBadges } = useQuery<any[]>({
    queryKey: ["gamificationBadges"],
    queryFn: async () => {
      const res = await apiClient.get("/gamification/badges");
      return res.data.data;
    },
  });

  // 3. Members List (for Admin modal)
  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["membersListForBadges"],
    queryFn: async () => {
      const res = await apiClient.get("/members?isApproved=true");
      return res.data.data || [];
    },
    enabled: isAdmin,
  });

  // Award Mutation
  const awardMutation = useMutation({
    mutationFn: async (payload: { userId: string; badgeId: number }) => {
      const res = await apiClient.post("/gamification/admin/badges/award", payload);
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success(data.message || "Lencana berhasil dianugerahkan!");
      setAwardModalOpen(false);
      setSelectedUserId("");
      setSelectedBadgeId("");
      queryClient.invalidateQueries({ queryKey: ["gamificationBadges"] });
      queryClient.invalidateQueries({ queryKey: ["gamificationSummary"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal menganugerahkan lencana");
    },
  });

  // Summary Metrics
  const unlockedCount = useMemo(() => badges.filter((b) => b.isUnlocked).length, [badges]);
  const unlockedPoints = useMemo(
    () => badges.filter((b) => b.isUnlocked).reduce((sum, b) => sum + (b.points || 0), 0),
    [badges]
  );
  const highestRarityUnlocked = useMemo(() => {
    const unlocked = badges.filter((b) => b.isUnlocked);
    if (!unlocked.length) return "Belum Ada";
    const maxRarity = Math.max(...unlocked.map((b) => b.rarity));
    return RARITY_CONFIG[maxRarity]?.label || "Common";
  }, [badges]);

  // Available Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    badges.forEach((b) => {
      if (b.category) set.add(b.category);
    });
    return Array.from(set);
  }, [badges]);

  // Filtered Badges
  const filteredBadges = useMemo(() => {
    return badges.filter((b) => {
      const matchSearch =
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.description && b.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (b.category && b.category.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCategory = categoryFilter === "all" || b.category === categoryFilter;
      const matchRarity = rarityFilter === "all" || String(b.rarity) === rarityFilter;
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "unlocked" && b.isUnlocked) ||
        (statusFilter === "locked" && !b.isUnlocked);

      return matchSearch && matchCategory && matchRarity && matchStatus;
    });
  }, [badges, searchTerm, categoryFilter, rarityFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
            <Link href="/gamification" className="hover:text-indigo-600 dark:hover:text-indigo-400">
              Gamifikasi
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-gray-900 dark:text-white">Lencana Prestasi</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            Galeri Lencana Prestasi
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Raih pencapaian produktivitas tim untuk membuka 40+ Master Badges dan poin permanen.
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
          <div className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs">
            <Award className="h-3.5 w-3.5" />
            Lencana Prestasi
          </div>
          <Link
            href="/gamification/rewards"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <Gift className="h-3.5 w-3.5 text-emerald-500" />
            Reward Store
          </Link>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Lencana Diraih
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
            {loadingBadges ? "..." : `${unlockedCount} / ${badges.length}`}
          </div>
          <p className="mt-1 text-[11px] text-gray-400">
            {badges.length > 0 ? Math.round((unlockedCount / badges.length) * 100) : 0}% lencana berhasil dibuka
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Poin Permanen
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            +{loadingBadges ? "..." : unlockedPoints.toLocaleString("id-ID")}
          </div>
          <p className="mt-1 text-[11px] text-gray-400">
            Ditambahkan permanen di atas saldo bulanan
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Tingkat Tertinggi
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
              <Trophy className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-bold text-amber-600 dark:text-amber-400">
            {highestRarityUnlocked}
          </div>
          <p className="mt-1 text-[11px] text-gray-400">
            Kelangkaan terbaik yang Anda miliki
          </p>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-gradient-to-br from-indigo-50/60 to-purple-50/40 p-4 shadow-xs dark:border-gray-800 dark:from-indigo-950/30 dark:to-purple-950/20">
          <div>
            <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
              Akses Khusus Admin
            </span>
            <p className="mt-0.5 text-[11px] text-indigo-800/80 dark:text-indigo-300/80">
              {isAdmin
                ? "Anda memiliki wewenang untuk menganugerahkan lencana ke anggota tim."
                : "Hanya Administrator yang dapat memberikan lencana manual."}
            </p>
          </div>
          {isAdmin ? (
            <Button
              size="sm"
              onClick={() => setAwardModalOpen(true)}
              className="mt-3 gap-1.5 bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm shadow-indigo-600/30"
            >
              <Plus className="h-3.5 w-3.5" />
              Beri Lencana Manual
            </Button>
          ) : (
            <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-gray-400">
              <Lock className="h-3 w-3" />
              Mode Staf / Member
            </span>
          )}
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari lencana berdasarkan nama, deskripsi, atau kategori..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <option value="all">Semua Status</option>
            <option value="unlocked">Hanya Yang Diraih ({unlockedCount})</option>
            <option value="locked">Hanya Yang Terkunci ({badges.length - unlockedCount})</option>
          </select>

          {/* Rarity Filter */}
          <select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <option value="all">Semua Kelangkaan</option>
            <option value="0">Common</option>
            <option value="1">Rare</option>
            <option value="2">Epic</option>
            <option value="3">Legendary</option>
          </select>

          {/* Category Filter */}
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
      </div>

      {/* Badges Grid */}
      {loadingBadges ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
            Memuat daftar lencana prestasi...
          </div>
        </div>
      ) : filteredBadges.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <Award className="h-10 w-10 text-gray-300 dark:text-gray-600" />
          <h4 className="mt-3 text-sm font-bold text-gray-900 dark:text-white">
            Tidak ada lencana yang sesuai
          </h4>
          <p className="mt-1 text-xs text-gray-400">
            Coba ubah kata kunci pencarian atau bersihkan filter yang aktif.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setCategoryFilter("all");
              setRarityFilter("all");
              setStatusFilter("all");
            }}
            className="mt-4 text-xs"
          >
            Reset Filter
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredBadges.map((badge) => {
            const rarity = RARITY_CONFIG[badge.rarity] || RARITY_CONFIG[0];
            const isUnlocked = badge.isUnlocked;

            return (
              <div
                key={badge.id}
                className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-gradient-to-b p-5 transition-all ${
                  rarity.borderClass
                } ${rarity.bgClass} ${
                  isUnlocked
                    ? `${rarity.glowClass} hover:-translate-y-1 hover:shadow-md`
                    : "opacity-60 grayscale-[80%] hover:grayscale-0"
                }`}
              >
                {/* Header card: Icon & Rarity Badge */}
                <div>
                  <div className="flex items-start justify-between">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm text-white font-bold"
                      style={{
                        backgroundColor: isUnlocked ? badge.color || "#6366F1" : "#9CA3AF",
                      }}
                    >
                      <Award className="h-6 w-6" />
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${rarity.badgeClass}`}>
                        {rarity.label}
                      </span>
                      {badge.category && (
                        <span className="text-[10px] font-medium text-gray-400">
                          {badge.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="mt-3">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      {badge.name}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                      {badge.description || "Lencana pencapaian performa kerja."}
                    </p>
                  </div>
                </div>

                {/* Footer: Points & Status */}
                <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      +{badge.points} Poin
                    </span>

                    {isUnlocked ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Terbuka
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-medium text-gray-400">
                        <Lock className="h-3.5 w-3.5" />
                        Terkunci
                      </span>
                    )}
                  </div>

                  {isUnlocked && badge.unlockedAt && (
                    <div className="mt-1 text-[10px] text-gray-400 font-mono">
                      Diraih: {new Date(badge.unlockedAt).toLocaleDateString("id-ID")}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Beri Lencana Manual (Admin Only) */}
      <Dialog isOpen={awardModalOpen} onOpenChange={setAwardModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-600">
              <ShieldCheck className="h-5 w-5" />
              Anugerahkan Lencana Prestasi
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Pilih anggota tim dan master badge yang ingin Anda berikan. Poin lencana akan otomatis ditambahkan secara permanen ke akun penerima.
            </p>

            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                Pilih Anggota Tim *
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="">-- Pilih Anggota Tim --</option>
                {members.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.jobTitle || "Member"}) - {m.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                Pilih Lencana Prestasi *
              </label>
              <select
                value={selectedBadgeId}
                onChange={(e) => setSelectedBadgeId(Number(e.target.value) || "")}
                className="w-full rounded-xl border border-gray-300 bg-white p-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="">-- Pilih Master Badge --</option>
                {badges.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} (+{b.points} Poin) - [{RARITY_CONFIG[b.rarity]?.label || "Common"}]
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAwardModalOpen(false)}
                disabled={awardMutation.isPending}
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (selectedUserId && selectedBadgeId) {
                    awardMutation.mutate({
                      userId: selectedUserId,
                      badgeId: Number(selectedBadgeId),
                    });
                  }
                }}
                disabled={!selectedUserId || !selectedBadgeId || awardMutation.isPending}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {awardMutation.isPending ? "Menganugerahkan..." : "Anugerahkan Lencana"}
              </Button>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
