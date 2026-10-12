"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  Users,
  CheckCircle2,
  XCircle,
  Unlock,
  Trash2,
  Building,
  Mail,
  ShieldCheck,
  Search,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { toast } from "sonner";

export default function MembersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterPending, setFilterPending] = useState(false);

  // Query Members
  const { data: members = [], isLoading } = useQuery<any[]>({
    queryKey: ["membersList"],
    queryFn: async () => {
      const res = await apiClient.get("/members");
      return res.data.data;
    },
  });

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiClient.post(`/members/${userId}/approve`, {
        adminNotes: "Disetujui oleh Administrator",
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Anggota berhasil disetujui!");
      queryClient.invalidateQueries({ queryKey: ["membersList"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal menyetujui anggota"),
  });

  // Reject / Delete Mutation
  const rejectMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiClient.post(`/members/${userId}/reject`, {
        reason: "Ditolak oleh Administrator",
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Anggota berhasil ditolak/dihapus.");
      queryClient.invalidateQueries({ queryKey: ["membersList"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal menolak anggota"),
  });

  // Unlock Mutation
  const unlockMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiClient.post(`/members/${userId}/unlock`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Akun anggota berhasil dibuka kuncinya!");
      queryClient.invalidateQueries({ queryKey: ["membersList"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal membuka kunci akun"),
  });

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.fullName.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.jobTitle.toLowerCase().includes(search.toLowerCase());
    const matchesPending = filterPending ? !m.isApproved : true;
    return matchesSearch && matchesPending;
  });

  return (
    <div className="space-y-6 px-2 py-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Direktori Anggota & Persetujuan Akun
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Daftar seluruh staf korporat, persetujuan anggota baru (*Approval Queue*), dan pembukaan kunci akun.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={filterPending ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterPending(!filterPending)}
            className="gap-2 text-xs"
          >
            <UserCheck className="h-4 w-4" />
            {filterPending ? "Semua Anggota" : "Menunggu Persetujuan"}
          </Button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-sm flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Cari berdasarkan nama, email, atau jabatan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 text-xs"
        />
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filteredMembers.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-xs transition hover:shadow-md dark:bg-gray-900 ${
              !m.isApproved
                ? "border-amber-300 bg-amber-50/20 dark:border-amber-800"
                : m.isLockedOut
                ? "border-red-300 bg-red-50/20 dark:border-red-800"
                : "border-gray-200/80 dark:border-gray-800"
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl font-bold text-white shadow-xs"
                    style={{ backgroundColor: m.avatarColor || "#6366F1" }}
                  >
                    {m.fullName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">
                      {m.fullName}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{m.jobTitle}</p>
                  </div>
                </div>

                {/* Status Badges */}
                <div>
                  {!m.isApproved ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                      Pending
                    </span>
                  ) : m.isLockedOut ? (
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-extrabold text-red-700 dark:bg-red-950/60 dark:text-red-400">
                      Terkunci
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                      Aktif
                    </span>
                  )}
                </div>
              </div>

              {/* Info Details */}
              <div className="mt-4 space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate">{m.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="h-3.5 w-3.5" />
                  <span>
                    [{m.companyCode || "WCH"}] {m.companyName || "Wahana Holding"}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons for Administrator */}
            <div className="mt-5 border-t border-gray-100 pt-3 flex items-center justify-between dark:border-gray-800">
              <span className="text-[10px] text-gray-400">
                Daftar: {new Date(m.createdAt).toLocaleDateString("id-ID")}
              </span>

              <div className="flex items-center gap-1.5">
                {!m.isApproved && (
                  <Button
                    size="sm"
                    className="h-7 gap-1 bg-emerald-600 px-2 text-[11px] font-semibold text-white hover:bg-emerald-700"
                    onClick={() => approveMutation.mutate(m.id)}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Setujui
                  </Button>
                )}

                {m.isLockedOut && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 border-amber-500 text-amber-600 px-2 text-[11px]"
                    onClick={() => unlockMutation.mutate(m.id)}
                    disabled={unlockMutation.isPending}
                  >
                    <Unlock className="h-3 w-3" />
                    Buka Kunci
                  </Button>
                )}

                {!m.isApproved && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                    onClick={() => {
                      if (confirm(`Tolak dan hapus pendaftaran ${m.fullName}?`)) {
                        rejectMutation.mutate(m.id);
                      }
                    }}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredMembers.length === 0 && !isLoading && (
          <div className="col-span-full py-16 text-center text-sm text-gray-400">
            Tidak ada anggota yang ditemukan.
          </div>
        )}
      </div>
    </div>
  );
}
