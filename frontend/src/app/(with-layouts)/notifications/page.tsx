"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiClient } from "@/services/api/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  Bell,
  CheckSquare,
  Sparkles,
  CalendarCheck,
  Megaphone,
  Check,
  CheckCheck,
  Trash2,
  ExternalLink,
  Send,
  Filter,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/tailgrids/core/dialog";
import { toast } from "sonner";
import { cn } from "@/utils/cn";

interface NotificationItem {
  id: number;
  userId: string;
  companyId: number;
  title: string;
  message: string;
  category: string;
  actionUrl?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  createdByUserName?: string | null;
}

const CATEGORIES = [
  { id: "Semua", label: "Semua Notifikasi", icon: Bell },
  { id: "Belum Dibaca", label: "Belum Dibaca", icon: Filter },
  { id: "Task", label: "Tugas & Kanban", icon: CheckSquare },
  { id: "Announcement", label: "Pengumuman", icon: Sparkles },
  { id: "Attendance", label: "Presensi", icon: CalendarCheck },
  { id: "Broadcast", label: "Siaran Manajemen", icon: Megaphone },
];

function getCategoryBadge(category: string) {
  switch (category?.toLowerCase()) {
    case "task":
      return {
        label: "Tugas",
        color: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-900",
        icon: <CheckSquare className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />,
      };
    case "announcement":
      return {
        label: "Pengumuman",
        color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900",
        icon: <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />,
      };
    case "attendance":
      return {
        label: "Presensi",
        color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900",
        icon: <CalendarCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />,
      };
    case "broadcast":
      return {
        label: "Siaran",
        color: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-900",
        icon: <Megaphone className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />,
      };
    default:
      return {
        label: "Sistem",
        color: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
        icon: <Bell className="h-3.5 w-3.5 text-gray-500" />,
      };
  }
}

export default function NotificationCenterPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { isAdmin } = useCurrentUser();

  // Filters & State
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Broadcast Modal State
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastCategory, setBroadcastCategory] = useState("Broadcast");
  const [broadcastActionUrl, setBroadcastActionUrl] = useState("");
  const [broadcastTargetUserId, setBroadcastTargetUserId] = useState("");

  // 1. Fetch unread count
  const { data: unreadData } = useQuery<{ unreadCount: number }>({
    queryKey: ["notifications-unread-count"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/notifications/unread-count");
        return res.data?.data || { unreadCount: 0 };
      } catch {
        return { unreadCount: 0 };
      }
    },
  });

  const unreadCount = unreadData?.unreadCount ?? 0;

  // 2. Fetch notifications
  const { data: notificationsResult, isLoading, refetch } = useQuery({
    queryKey: ["notifications", page, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("pageSize", String(pageSize));

      if (selectedCategory === "Belum Dibaca") {
        params.append("onlyUnread", "true");
      } else if (selectedCategory !== "Semua") {
        params.append("category", selectedCategory);
      }

      const res = await apiClient.get(`/notifications?${params.toString()}`);
      return res.data;
    },
  });

  const notifications: NotificationItem[] = notificationsResult?.data || [];
  const totalItems: number = notificationsResult?.total || 0;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  // 3. Fetch members for broadcast target dropdown
  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["membersForBroadcast"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/members");
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
    enabled: isAdmin && isBroadcastModalOpen,
  });

  // Mutations
  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.put(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-header"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiClient.put("/notifications/read-all");
    },
    onSuccess: () => {
      toast.success("Semua notifikasi berhasil ditandai sebagai dibaca.");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-header"] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/notifications/${id}`);
    },
    onSuccess: () => {
      toast.success("Notifikasi berhasil dihapus.");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-header"] });
    },
  });

  const broadcastMutation = useMutation({
    mutationFn: async () => {
      if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
        throw new Error("Judul dan pesan siaran harus diisi.");
      }
      const res = await apiClient.post("/notifications/broadcast", {
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
        category: broadcastCategory,
        actionUrl: broadcastActionUrl.trim() || null,
        targetUserId: broadcastTargetUserId.trim() || null,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Siaran notifikasi berhasil dikirimkan!");
      setIsBroadcastModalOpen(false);
      setBroadcastTitle("");
      setBroadcastMessage("");
      setBroadcastActionUrl("");
      setBroadcastTargetUserId("");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
    onError: (err: any) => {
      toast.error(err.message || err.response?.data?.message || "Gagal mengirim siaran.");
    },
  });

  const filteredNotifications = notifications.filter((item) => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    return (
      item.title.toLowerCase().includes(s) ||
      item.message.toLowerCase().includes(s) ||
      (item.createdByUserName && item.createdByUserName.toLowerCase().includes(s))
    );
  });

  const handleOpenAction = (item: NotificationItem) => {
    if (!item.isRead) {
      markAsReadMutation.mutate(item.id);
    }
    if (item.actionUrl) {
      router.push(item.actionUrl);
    }
  };

  return (
    <div className="space-y-6 px-2 py-4 lg:px-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white shadow-md shadow-indigo-500/20">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                Pusat Notifikasi & Riwayat Aktivitas
                {unreadCount > 0 && (
                  <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950/70 dark:text-rose-300">
                    {unreadCount} belum dibaca
                  </span>
                )}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Pemberitahuan real-time untuk penugasan tugas, pengumuman manajemen, presensi, dan agenda perusahaan.
              </p>
            </div>
          </div>
        </div>

        {/* Top Header Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5 text-gray-500" />
            Muat Ulang
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending || unreadCount === 0}
            className="gap-1.5 text-xs"
          >
            <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
            Tandai Semua Dibaca
          </Button>

          {isAdmin && (
            <Button
              size="sm"
              onClick={() => setIsBroadcastModalOpen(true)}
              className="gap-1.5 bg-indigo-600 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700"
            >
              <Send className="h-3.5 w-3.5" />
              Kirim Siaran (Broadcast)
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setPage(1);
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition",
                  isSelected
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
          <Input
            placeholder="Cari dalam pesan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 text-xs"
          />
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center dark:border-gray-800 dark:bg-gray-900">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-indigo-500" />
            <p className="mt-3 text-xs font-semibold text-gray-500 dark:text-gray-400">
              Memuat data notifikasi...
            </p>
          </div>
        ) : filteredNotifications.length > 0 ? (
          filteredNotifications.map((item) => {
            const badge = getCategoryBadge(item.category);
            return (
              <div
                key={item.id}
                className={cn(
                  "flex flex-col gap-4 rounded-2xl border p-4.5 transition sm:flex-row sm:items-center sm:justify-between",
                  item.isRead
                    ? "border-gray-200/80 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
                    : "border-indigo-200 bg-indigo-50/20 shadow-xs hover:border-indigo-300 dark:border-indigo-900/60 dark:bg-indigo-950/20"
                )}
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                      badge.color
                    )}
                  >
                    {badge.icon}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          badge.color
                        )}
                      >
                        {badge.label}
                      </span>

                      {!item.isRead && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Baru
                        </span>
                      )}

                      <span className="text-[11px] text-gray-400 font-mono">
                        {new Date(item.createdAt).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      {item.createdByUserName && (
                        <span className="text-[11px] text-gray-400">
                          • Oleh: <strong>{item.createdByUserName}</strong>
                        </span>
                      )}
                    </div>

                    <h3
                      className={cn(
                        "text-sm tracking-tight text-gray-900 dark:text-white",
                        !item.isRead ? "font-bold" : "font-semibold text-gray-800 dark:text-gray-200"
                      )}
                    >
                      {item.title}
                    </h3>

                    <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400 whitespace-pre-line">
                      {item.message}
                    </p>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {item.actionUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenAction(item)}
                      className="h-8 gap-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:border-indigo-900/50 dark:text-indigo-400"
                    >
                      Buka Tautan
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}

                  {!item.isRead && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markAsReadMutation.mutate(item.id)}
                      className="h-8 gap-1 text-xs"
                      title="Tandai telah dibaca"
                    >
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      Dibaca
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteNotificationMutation.mutate(item.id)}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-rose-600"
                    title="Hapus notifikasi"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-gray-200/80 bg-white py-16 text-center dark:border-gray-800 dark:bg-gray-900">
            <Bell className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
            <h4 className="mt-3 text-sm font-bold text-gray-800 dark:text-gray-200">
              Tidak ada notifikasi dalam kategori ini
            </h4>
            <p className="mt-1 text-xs text-gray-400">
              Pemberitahuan baru akan otomatis muncul saat ada aktivitas tugas atau pengumuman.
            </p>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-800">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            Menampilkan halaman {page} dari {totalPages} ({totalItems} total notifikasi)
          </span>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 text-xs font-semibold"
            >
              Sebelumnya
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 text-xs font-semibold"
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}

      {/* Admin Broadcast Modal Dialog */}
      <Dialog open={isBroadcastModalOpen} onOpenChange={setIsBroadcastModalOpen}>
        <DialogContent className="max-w-lg bg-white p-6 shadow-2xl dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
              <Megaphone className="h-5 w-5 text-indigo-600" />
              Kirim Siaran Notifikasi (Admin Broadcast)
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                Judul Siaran
              </label>
              <Input
                placeholder="Contoh: Pembaruan Kebijakan Jam Kerja & Presensi"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                className="text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                Isi Pesan Notifikasi
              </label>
              <textarea
                rows={4}
                placeholder="Tuliskan pesan lengkap yang akan diterima oleh seluruh staf..."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs leading-relaxed text-gray-800 outline-none focus:border-indigo-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                  Kategori
                </label>
                <select
                  value={broadcastCategory}
                  onChange={(e) => setBroadcastCategory(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-800 shadow-2xs dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
                >
                  <option value="Broadcast">Siaran Manajemen</option>
                  <option value="Announcement">Pengumuman Resmi</option>
                  <option value="System">Pemberitahuan Sistem</option>
                  <option value="Task">Aktivitas Tugas</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                  Tautan Aksi (Opsional)
                </label>
                <Input
                  placeholder="/tasks atau /announcements"
                  value={broadcastActionUrl}
                  onChange={(e) => setBroadcastActionUrl(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                Target Penerima
              </label>
              <select
                value={broadcastTargetUserId}
                onChange={(e) => setBroadcastTargetUserId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-800 shadow-2xs dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
              >
                <option value="">Semua Anggota Tim / Staf Perusahaan (Global Broadcast)</option>
                {members.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.email}) - {m.jobTitle || "Member"}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsBroadcastModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={() => broadcastMutation.mutate()}
                disabled={broadcastMutation.isPending || !broadcastTitle.trim() || !broadcastMessage.trim()}
                className="gap-1.5 bg-indigo-600 font-bold text-white hover:bg-indigo-700"
              >
                <Send className="h-3.5 w-3.5" />
                {broadcastMutation.isPending ? "Mengirim..." : "Kirim Sekarang"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
