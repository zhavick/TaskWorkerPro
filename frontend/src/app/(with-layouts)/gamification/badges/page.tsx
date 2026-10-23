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
  Pencil,
  Trash2,
  Power,
  X,
  Palette,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
    label: "Common",
    badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800",
    borderClass: "border-emerald-200 dark:border-emerald-900/50",
    bgClass: "from-emerald-50/30 to-white dark:from-emerald-950/20 dark:to-gray-900",
    glowClass: "",
  },
  2: {
    label: "Rare",
    badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
    borderClass: "border-blue-200 dark:border-blue-900/50",
    bgClass: "from-blue-50/30 to-white dark:from-blue-950/20 dark:to-gray-900",
    glowClass: "shadow-xs shadow-blue-500/10",
  },
  3: {
    label: "Epic",
    badgeClass: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-200 dark:border-purple-800",
    borderClass: "border-purple-200 dark:border-purple-900/50",
    bgClass: "from-purple-50/30 to-white dark:from-purple-950/20 dark:to-gray-900",
    glowClass: "shadow-md shadow-purple-500/15",
  },
  4: {
    label: "Legendary",
    badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-bold",
    borderClass: "border-amber-300 dark:border-amber-700/60",
    bgClass: "from-amber-50/40 via-yellow-50/20 to-white dark:from-amber-950/30 dark:to-gray-900",
    glowClass: "shadow-lg shadow-amber-500/20 ring-1 ring-amber-400/30",
  },
};

const COLOR_PRESETS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#3B82F6", "#EC4899", "#14B8A6"];

export default function BadgesGalleryPage() {
  const queryClient = useQueryClient();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<"gallery" | "admin-manage" | "admin-awards">("gallery");

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "unlocked" | "locked">("all");

  // Admin Master Badge Form state
  const [badgeModalOpen, setBadgeModalOpen] = useState(false);
  const [badgeFormMode, setBadgeFormMode] = useState<"create" | "edit">("create");
  const [editingBadgeId, setEditingBadgeId] = useState<number | null>(null);
  const [badgeForm, setBadgeForm] = useState({
    code: "",
    name: "",
    description: "",
    category: "Tugas",
    points: 50,
    rarity: 1,
    icon: "award",
    color: "#6366F1",
    triggerType: 0,
    triggerThreshold: 1,
    isActive: true,
    orderIndex: 0,
  });

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

  // 2. User Unlocked Badges List
  const { data: badges = [], isLoading: loadingBadges, refetch: refetchBadges } = useQuery<any[]>({
    queryKey: ["gamificationBadges"],
    queryFn: async () => {
      const res = await apiClient.get("/gamification/badges");
      return res.data.data || [];
    },
  });

  // 3. Admin All Master Badges List
  const { data: adminBadges = [], refetch: refetchAdminBadges } = useQuery<any[]>({
    queryKey: ["adminBadgesList"],
    queryFn: async () => {
      const res = await apiClient.get("/gamification/admin/badges");
      return res.data.data || [];
    },
    enabled: isAdmin,
  });

  // 4. Admin All Awards History
  const { data: adminAwards = [], refetch: refetchAdminAwards } = useQuery<any[]>({
    queryKey: ["adminBadgeAwardsList"],
    queryFn: async () => {
      const res = await apiClient.get("/gamification/admin/badges/awards");
      return res.data.data || [];
    },
    enabled: isAdmin,
  });

  // 5. Members List (for Admin award modal)
  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["membersListForBadges"],
    queryFn: async () => {
      const res = await apiClient.get("/members?isApproved=true");
      return res.data.data || [];
    },
    enabled: isAdmin,
  });

  // Save (Create / Update) Badge Mutation
  const saveBadgeMutation = useMutation({
    mutationFn: async () => {
      if (badgeFormMode === "create") {
        const res = await apiClient.post("/gamification/admin/badges", badgeForm);
        return res.data;
      } else {
        const res = await apiClient.put(`/gamification/admin/badges/${editingBadgeId}`, badgeForm);
        return res.data;
      }
    },
    onSuccess: (data: any) => {
      toast.success(data.message || "Lencana master berhasil disimpan!");
      setBadgeModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["gamificationBadges"] });
      queryClient.invalidateQueries({ queryKey: ["adminBadgesList"] });
      queryClient.invalidateQueries({ queryKey: ["gamificationSummary"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal menyimpan lencana");
    },
  });

  // Delete Badge Mutation
  const deleteBadgeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete(`/gamification/admin/badges/${id}`);
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success(data.message || "Lencana berhasil dihapus.");
      queryClient.invalidateQueries({ queryKey: ["gamificationBadges"] });
      queryClient.invalidateQueries({ queryKey: ["adminBadgesList"] });
      queryClient.invalidateQueries({ queryKey: ["adminBadgeAwardsList"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal menghapus lencana");
    },
  });

  // Toggle Active Badge Mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.patch(`/gamification/admin/badges/${id}/toggle-active`);
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success(data.message || "Status lencana berhasil diperbarui.");
      queryClient.invalidateQueries({ queryKey: ["gamificationBadges"] });
      queryClient.invalidateQueries({ queryKey: ["adminBadgesList"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal mengubah status lencana");
    },
  });

  // Award Badge Mutation
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
      queryClient.invalidateQueries({ queryKey: ["adminBadgeAwardsList"] });
      queryClient.invalidateQueries({ queryKey: ["gamificationSummary"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal menganugerahkan lencana");
    },
  });

  // Revoke Badge Mutation
  const revokeMutation = useMutation({
    mutationFn: async ({ badgeId, userId }: { badgeId: number; userId: string }) => {
      const res = await apiClient.delete(`/gamification/admin/badges/${badgeId}/user/${userId}`);
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success(data.message || "Lencana berhasil ditarik.");
      queryClient.invalidateQueries({ queryKey: ["gamificationBadges"] });
      queryClient.invalidateQueries({ queryKey: ["adminBadgeAwardsList"] });
      queryClient.invalidateQueries({ queryKey: ["gamificationSummary"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal menarik lencana");
    },
  });

  // Open Create Badge Modal
  const handleOpenCreateModal = () => {
    setBadgeFormMode("create");
    setEditingBadgeId(null);
    setBadgeForm({
      code: "",
      name: "",
      description: "",
      category: "Tugas",
      points: 50,
      rarity: 1,
      icon: "award",
      color: "#6366F1",
      triggerType: 0,
      triggerThreshold: 1,
      isActive: true,
      orderIndex: (adminBadges.length || 0) + 1,
    });
    setBadgeModalOpen(true);
  };

  // Open Edit Badge Modal
  const handleOpenEditModal = (b: any) => {
    setBadgeFormMode("edit");
    setEditingBadgeId(b.id);
    setBadgeForm({
      code: b.code || "",
      name: b.name || "",
      description: b.description || "",
      category: b.category || "Tugas",
      points: b.points || 0,
      rarity: b.rarity ?? 1,
      icon: b.icon || "award",
      color: b.color || "#6366F1",
      triggerType: b.triggerType || 0,
      triggerThreshold: b.triggerThreshold || 1,
      isActive: b.isActive ?? true,
      orderIndex: b.orderIndex || 0,
    });
    setBadgeModalOpen(true);
  };

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
    const list = activeTab === "admin-manage" ? adminBadges : badges;
    const set = new Set<string>();
    list.forEach((b) => {
      if (b.category) set.add(b.category);
    });
    return Array.from(set);
  }, [badges, adminBadges, activeTab]);

  // Filtered Badges for Gallery
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

  // Filtered Badges for Admin Manage
  const filteredAdminBadges = useMemo(() => {
    return adminBadges.filter((b) => {
      const matchSearch =
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.description && b.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (b.category && b.category.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCategory = categoryFilter === "all" || b.category === categoryFilter;
      const matchRarity = rarityFilter === "all" || String(b.rarity) === rarityFilter;

      return matchSearch && matchCategory && matchRarity;
    });
  }, [adminBadges, searchTerm, categoryFilter, rarityFilter]);

  return (
    <div className="space-y-6 px-2 py-4 lg:px-6">
      {/* Top Header & Breadcrumbs */}
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
            Galeri &amp; Manajemen Lencana Prestasi
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Pencapaian produktivitas tim dengan Master Badges resmi, poin permanen, dan verifikasi admin.
          </p>
        </div>

        {/* Subpage Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-gray-200/80 bg-white p-1 shadow-xs dark:border-gray-800 dark:bg-gray-900">
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
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
              Lencana Diraih
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Trophy className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 dark:text-white">{unlockedCount}</span>
            <span className="text-xs text-gray-400">/ {badges.length} Master Badges</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-500"
              style={{ width: `${badges.length ? (unlockedCount / badges.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
              Poin Permanen Lencana
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              +{unlockedPoints.toLocaleString("id-ID")}
            </span>
            <span className="text-xs font-bold text-gray-400">Pts</span>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">Poin kumulatif dari seluruh perolehan badge.</p>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
              Rarity Tertinggi Diraih
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Star className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {highestRarityUnlocked}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">Tingkat kelangkaan tertinggi dalam koleksi.</p>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
              Tindakan Cepat
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {isAdmin ? (
              <Button
                size="sm"
                onClick={handleOpenCreateModal}
                className="w-full gap-1.5 bg-indigo-600 font-semibold text-white shadow-xs hover:bg-indigo-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Badge Baru
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => refetchBadges()}
                className="w-full gap-1.5 text-xs font-semibold"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Segarkan Koleksi
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Internal Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200/80 pb-3 dark:border-gray-800">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("gallery")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === "gallery"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            <Trophy className="h-4 w-4" />
            Galeri Lencana Saya ({unlockedCount}/{badges.length})
          </button>

          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab("admin-manage")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                  activeTab === "admin-manage"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300"
                }`}
              >
                <Pencil className="h-4 w-4" />
                Kelola Master Badges ({adminBadges.length})
              </button>

              <button
                onClick={() => setActiveTab("admin-awards")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                  activeTab === "admin-awards"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                Penganugerahan Tim ({adminAwards.length})
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && activeTab === "admin-manage" && (
            <Button
              size="sm"
              onClick={handleOpenCreateModal}
              className="gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 font-semibold"
            >
              <Plus className="h-4 w-4" />
              Tambah Badge Baru
            </Button>
          )}
          {isAdmin && activeTab === "admin-awards" && (
            <Button
              size="sm"
              onClick={() => setAwardModalOpen(true)}
              className="gap-1.5 bg-amber-600 text-white hover:bg-amber-700 font-semibold"
            >
              <ShieldCheck className="h-4 w-4" />
              Anugerahkan Lencana Manual
            </Button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              activeTab === "admin-manage"
                ? "Cari lencana berdasarkan nama, kode, atau kategori..."
                : "Cari lencana prestasi yang ingin diraih..."
            }
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-2xs dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200"
          >
            <option value="all">Semua Kategori</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-2xs dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200"
          >
            <option value="all">Semua Rarity</option>
            <option value="1">Common</option>
            <option value="2">Rare</option>
            <option value="3">Epic</option>
            <option value="4">Legendary</option>
          </select>

          {activeTab === "gallery" && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-2xs dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="all">Semua Status</option>
              <option value="unlocked">Hanya Terbuka</option>
              <option value="locked">Hanya Terkunci</option>
            </select>
          )}

          {(searchTerm || categoryFilter !== "all" || rarityFilter !== "all" || statusFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setCategoryFilter("all");
                setRarityFilter("all");
                setStatusFilter("all");
              }}
              className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: GALERI LENCANA SAYA */}
      {/* ======================================================== */}
      {activeTab === "gallery" && (
        <>
          {filteredBadges.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 text-center dark:border-gray-800">
              <Award className="h-12 w-12 text-gray-300 dark:text-gray-700" />
              <h3 className="mt-3 text-sm font-bold text-gray-900 dark:text-white">Tidak Ada Lencana Ditemukan</h3>
              <p className="mt-1 text-xs text-gray-400">Coba ubah kata kunci pencarian atau reset filter.</p>
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
                        : "opacity-65 grayscale-[70%] hover:grayscale-0 hover:opacity-100"
                    }`}
                  >
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

                      <div className="mt-3.5">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                          {badge.name}
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400 line-clamp-2">
                          {badge.description || "Lencana pencapaian performa kerja tim."}
                        </p>
                      </div>
                    </div>

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
                        <div className="mt-1.5 text-[10px] text-gray-400 font-mono">
                          Diraih: {new Date(badge.unlockedAt).toLocaleDateString("id-ID")}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ======================================================== */}
      {/* TAB 2: KELOLA MASTER BADGES (ADMIN ONLY) */}
      {/* ======================================================== */}
      {isAdmin && activeTab === "admin-manage" && (
        <>
          {filteredAdminBadges.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 text-center dark:border-gray-800">
              <Pencil className="h-12 w-12 text-gray-300 dark:text-gray-700" />
              <h3 className="mt-3 text-sm font-bold text-gray-900 dark:text-white">Belum Ada Master Badge</h3>
              <p className="mt-1 text-xs text-gray-400">Mulai tambahkan master badge baru untuk gamifikasi.</p>
              <Button
                size="sm"
                onClick={handleOpenCreateModal}
                className="mt-4 gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                Tambah Badge Baru
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredAdminBadges.map((b) => {
                const rarity = RARITY_CONFIG[b.rarity] || RARITY_CONFIG[0];
                return (
                  <div
                    key={b.id}
                    className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white p-5 shadow-xs transition-all dark:bg-gray-900 ${
                      b.isActive ? "border-gray-200/80 dark:border-gray-800" : "border-rose-200 bg-rose-50/20 dark:border-rose-900/40"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm text-white font-bold"
                          style={{ backgroundColor: b.color || "#6366F1" }}
                        >
                          <Award className="h-6 w-6" />
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              b.isActive
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            }`}
                          >
                            {b.isActive ? "Aktif" : "Non-Aktif"}
                          </span>
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${rarity.badgeClass}`}>
                            {rarity.label}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3.5">
                        <div className="font-mono text-[10px] text-gray-400 font-semibold">{b.code}</div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">{b.name}</h3>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {b.description || "Tidak ada deskripsi rincian."}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">+{b.points} Poin</span>
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          {b.category || "General"}
                        </span>
                      </div>
                    </div>

                    {/* Admin Action Buttons */}
                    <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800 flex items-center justify-between gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActiveMutation.mutate(b.id)}
                        disabled={toggleActiveMutation.isPending}
                        className={`h-7 px-2 text-[11px] gap-1 ${
                          b.isActive ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"
                        }`}
                        title={b.isActive ? "Nonaktifkan badge" : "Aktifkan badge"}
                      >
                        <Power className="h-3 w-3" />
                        {b.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </Button>

                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEditModal(b)}
                          className="h-7 w-7 p-0 text-gray-600 hover:text-indigo-600"
                          title="Edit Master Badge"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Yakin ingin menghapus master badge '${b.name}'? Seluruh data perolehan tim atas badge ini juga akan terhapus.`)) {
                              deleteBadgeMutation.mutate(b.id);
                            }
                          }}
                          disabled={deleteBadgeMutation.isPending}
                          className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                          title="Hapus Master Badge"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ======================================================== */}
      {/* TAB 3: RIWAYAT PENGANUGERAHAN TIM (ADMIN ONLY) */}
      {/* ======================================================== */}
      {isAdmin && activeTab === "admin-awards" && (
        <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/75 dark:border-gray-800 dark:bg-gray-800/50">
                  <th className="px-5 py-3.5 font-bold text-gray-600 dark:text-gray-300">Penerima</th>
                  <th className="px-5 py-3.5 font-bold text-gray-600 dark:text-gray-300">Lencana Prestasi</th>
                  <th className="px-5 py-3.5 font-bold text-gray-600 dark:text-gray-300">Rarity</th>
                  <th className="px-5 py-3.5 font-bold text-gray-600 dark:text-gray-300">Bonus Poin</th>
                  <th className="px-5 py-3.5 font-bold text-gray-600 dark:text-gray-300">Dianugerahkan</th>
                  <th className="px-5 py-3.5 font-bold text-gray-600 dark:text-gray-300">Oleh</th>
                  <th className="px-5 py-3.5 text-right font-bold text-gray-600 dark:text-gray-300">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {adminAwards.map((a: any) => {
                  const rarity = RARITY_CONFIG[a.rarity] || RARITY_CONFIG[0];
                  return (
                    <tr key={a.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                      <td className="px-5 py-3.5 font-semibold text-gray-900 dark:text-white">
                        {a.userName}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="flex h-6 w-6 items-center justify-center rounded-lg text-white font-bold"
                            style={{ backgroundColor: a.badgeColor || "#6366F1" }}
                          >
                            <Award className="h-3.5 w-3.5" />
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-white">{a.badgeName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${rarity.badgeClass}`}>
                          {rarity.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        +{a.points} Pts
                      </td>
                      <td className="px-5 py-3.5 font-mono text-gray-500">
                        {new Date(a.unlockedAt).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">
                        {a.awardedBy || "Sistem Otomatis"}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Yakin ingin menarik lencana '${a.badgeName}' dari '${a.userName}'?`)) {
                              revokeMutation.mutate({ badgeId: a.badgeId, userId: a.userId });
                            }
                          }}
                          disabled={revokeMutation.isPending}
                          className="h-7 px-2 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                        >
                          Tarik
                        </Button>
                      </td>
                    </tr>
                  );
                })}

                {adminAwards.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      Belum ada riwayat penganugerahan lencana.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ADMIN TAMBAH / EDIT MASTER BADGE */}
      {/* ======================================================== */}
      <Dialog open={badgeModalOpen} onOpenChange={setBadgeModalOpen}>
        <DialogContent className="max-w-lg bg-white p-6 shadow-2xl dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <Award className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              {badgeFormMode === "create" ? "Tambah Master Badge Baru" : "Edit Master Badge"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveBadgeMutation.mutate();
            }}
            className="mt-4 space-y-3.5"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Nama Lencana *
                </label>
                <Input
                  required
                  placeholder="misal: Speed Demon"
                  value={badgeForm.name}
                  onChange={(e) => setBadgeForm({ ...badgeForm, name: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Kode Unik (Slug) *
                </label>
                <Input
                  required
                  placeholder="misal: speed-demon"
                  value={badgeForm.code}
                  onChange={(e) => setBadgeForm({ ...badgeForm, code: e.target.value })}
                  className="mt-1 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Deskripsi Rincian Lencana
              </label>
              <textarea
                rows={2}
                placeholder="Penjelasan kriteria pencapaian untuk mendapatkan lencana ini..."
                value={badgeForm.description}
                onChange={(e) => setBadgeForm({ ...badgeForm, description: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent p-2 text-xs text-gray-900 dark:border-gray-800 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Kategori
                </label>
                <select
                  value={badgeForm.category}
                  onChange={(e) => setBadgeForm({ ...badgeForm, category: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 text-xs text-gray-800 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                >
                  <option value="Tugas">Tugas</option>
                  <option value="Presensi">Presensi</option>
                  <option value="Streak">Streak</option>
                  <option value="Kinerja">Kinerja</option>
                  <option value="Kolaborasi">Kolaborasi</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Poin Permanen *
                </label>
                <Input
                  type="number"
                  min="0"
                  required
                  value={badgeForm.points}
                  onChange={(e) => setBadgeForm({ ...badgeForm, points: Number(e.target.value) || 0 })}
                  className="mt-1 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Rarity (Kelangkaan)
                </label>
                <select
                  value={badgeForm.rarity}
                  onChange={(e) => setBadgeForm({ ...badgeForm, rarity: Number(e.target.value) || 1 })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 text-xs text-gray-800 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                >
                  <option value="1">Common (Hijau)</option>
                  <option value="2">Rare (Biru)</option>
                  <option value="3">Epic (Ungu)</option>
                  <option value="4">Legendary (Emas)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Warna Aksen
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setBadgeForm({ ...badgeForm, color: c })}
                      className={`h-6 w-6 rounded-full border-2 transition-transform ${
                        badgeForm.color === c ? "scale-110 border-gray-900 dark:border-white shadow-xs" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Status Tayang
                </label>
                <select
                  value={badgeForm.isActive ? "1" : "0"}
                  onChange={(e) => setBadgeForm({ ...badgeForm, isActive: e.target.value === "1" })}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 text-xs text-gray-800 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                >
                  <option value="1">Aktif (Dapat Diraih Tim)</option>
                  <option value="0">Non-Aktif (Disembunyikan)</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <Button type="button" variant="outline" onClick={() => setBadgeModalOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={!badgeForm.name.trim() || !badgeForm.code.trim() || saveBadgeMutation.isPending}
                className="bg-indigo-600 text-white hover:bg-indigo-700 font-semibold"
              >
                {saveBadgeMutation.isPending ? "Menyimpan..." : "Simpan Master Badge"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL 2: ADMIN ANUGERAHKAN LENCANA MANUAL */}
      {/* ======================================================== */}
      <Dialog open={awardModalOpen} onOpenChange={setAwardModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 shadow-2xl dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <ShieldCheck className="h-5 w-5 text-amber-600" />
              Anugerahkan Lencana Prestasi Tim
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (selectedUserId && selectedBadgeId) {
                awardMutation.mutate({
                  userId: selectedUserId,
                  badgeId: Number(selectedBadgeId),
                });
              }
            }}
            className="mt-4 space-y-4"
          >
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Pilih anggota tim dan master badge yang ingin Anda berikan. Poin lencana akan otomatis ditambahkan secara permanen ke akun penerima.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Pilih Anggota Tim *
              </label>
              <select
                required
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
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
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Pilih Lencana Prestasi *
              </label>
              <select
                required
                value={selectedBadgeId}
                onChange={(e) => setSelectedBadgeId(Number(e.target.value) || "")}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
              >
                <option value="">-- Pilih Master Badge --</option>
                {(adminBadges.length ? adminBadges : badges).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} (+{b.points} Poin) - [{RARITY_CONFIG[b.rarity]?.label || "Common"}]
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <Button type="button" variant="outline" onClick={() => setAwardModalOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={!selectedUserId || !selectedBadgeId || awardMutation.isPending}
                className="bg-amber-600 text-white hover:bg-amber-700 font-semibold"
              >
                {awardMutation.isPending ? "Menganugerahkan..." : "Anugerahkan Lencana"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
