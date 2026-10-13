"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Layers,
  FolderKanban,
  Users,
  User,
  CheckCircle2,
  Briefcase,
  Loader2,
  FileText,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/tailgrids/core/dialog";
import { toast } from "sonner";

interface ExportTasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportTasksDialog({ open, onOpenChange }: ExportTasksDialogProps) {
  const [format, setFormat] = useState<"standard" | "arms">("standard");
  const [datePreset, setDatePreset] = useState<"all" | "7d" | "thisMonth" | "30d" | "custom">("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [scope, setScope] = useState<"all" | "mine">("all");
  const [isExporting, setIsExporting] = useState(false);

  // 1. Fetch User Profile to check Admin RBAC
  const { data: userProfile } = useQuery<any>({
    queryKey: ["currentUserProfileForExport"],
    queryFn: async () => {
      const res = await apiClient.get("/profile");
      return res.data.data;
    },
    enabled: open,
  });

  const isAdmin =
    userProfile?.roles?.includes("Administrator") ||
    userProfile?.jobTitle?.toLowerCase().includes("admin") ||
    false;

  // 2. Fetch Projects for Dropdown Filter
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projectsListForExport"],
    queryFn: async () => {
      const res = await apiClient.get("/projects");
      return res.data.data || [];
    },
    enabled: open,
  });

  const handleExport = async () => {
    try {
      setIsExporting(true);

      const params: Record<string, string> = {
        format,
        scope: isAdmin ? scope : "mine",
      };

      if (selectedProjectId !== "all") {
        params.projectId = selectedProjectId;
      }

      if (selectedStatus !== "all") {
        params.status = selectedStatus;
      }

      // Compute date boundaries based on preset
      const now = new Date();
      if (datePreset === "7d") {
        const start = new Date();
        start.setDate(now.getDate() - 7);
        params.startDate = start.toISOString();
        params.endDate = now.toISOString();
      } else if (datePreset === "30d") {
        const start = new Date();
        start.setDate(now.getDate() - 30);
        params.startDate = start.toISOString();
        params.endDate = now.toISOString();
      } else if (datePreset === "thisMonth") {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        params.startDate = start.toISOString();
        params.endDate = end.toISOString();
      } else if (datePreset === "custom") {
        if (customStartDate) {
          params.startDate = new Date(customStartDate).toISOString();
        }
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          params.endDate = end.toISOString();
        }
      }

      toast.loading("Mempersiapkan dokumen spreadsheet...", { id: "exportTaskExcel" });

      const res = await apiClient.get("/tasks/export", {
        params,
        responseType: "blob",
      });

      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      let fileName =
        format === "arms"
          ? `Laporan_ARMS_Enterprise_${Date.now()}.xlsx`
          : `Laporan_Tugas_${Date.now()}.xlsx`;

      const contentDisposition = res.headers["content-disposition"];
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match?.[1]) {
          fileName = match[1];
        }
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Berkas Excel berhasil diunduh!", { id: "exportTaskExcel" });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Gagal mengunduh berkas laporan Excel", {
        id: "exportTaskExcel",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog isOpen={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
              <FileSpreadsheet className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle className="text-lg font-black text-gray-900 dark:text-white">
                Ekspor Laporan Tugas ke Excel
              </DialogTitle>
              <p className="text-xs text-gray-500">
                Pilih format standar operasional atau format ARMS Enterprise berstandar SDLC Waterfall.
              </p>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* 1. Format Selection Cards */}
          <div>
            <label className="mb-2 block text-xs font-bold text-gray-700 dark:text-gray-300">
              Pilih Format Spreadsheet:
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div
                onClick={() => setFormat("standard")}
                className={`cursor-pointer rounded-xl border p-3.5 transition ${
                  format === "standard"
                    ? "border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500 dark:border-indigo-500 dark:bg-indigo-950/20"
                    : "border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      Format Standar (9 Kolom)
                    </span>
                  </div>
                  <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    Operasional
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-gray-500 line-clamp-2">
                  Tabel ringkas: No, Proyek, Judul, Prioritas, Status, Progres %, PIC, Tenggat, dan Kendala/Solusi.
                </p>
              </div>

              <div
                onClick={() => setFormat("arms")}
                className={`cursor-pointer rounded-xl border p-3.5 transition ${
                  format === "arms"
                    ? "border-blue-600 bg-blue-50/30 ring-2 ring-blue-500 dark:border-blue-500 dark:bg-blue-950/20"
                    : "border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      ARMS Enterprise (21 Kolom)
                    </span>
                  </div>
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    SDLC + Summary
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-gray-500 line-clamp-2">
                  Laporan resmi SDLC Waterfall, pemetaan milestone, durasi jam kerja, dan sheet Ringkasan Eksekutif.
                </p>
              </div>
            </div>
          </div>

          {/* 2. Date Range Filter & Presets */}
          <div>
            <label className="mb-2 block text-xs font-bold text-gray-700 dark:text-gray-300">
              Rentang Tanggal (Berdasarkan Tenggat/Mulai):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "all", label: "Semua Waktu" },
                { id: "7d", label: "7 Hari Terakhir" },
                { id: "thisMonth", label: "Bulan Ini" },
                { id: "30d", label: "30 Hari Terakhir" },
                { id: "custom", label: "Kustom" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setDatePreset(p.id as any)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    datePreset === p.id
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {datePreset === "custom" && (
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[11px] text-gray-400 font-medium">Dari Tanggal:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-medium">Sampai Tanggal:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. Project & Status Filters */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <FolderKanban className="h-3.5 w-3.5 text-gray-400" />
                Filter Proyek:
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">Semua Proyek</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-gray-400" />
                Filter Status Tugas:
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">Semua Status</option>
                <option value="0">To Do</option>
                <option value="1">In Progress</option>
                <option value="2">Done</option>
                <option value="3">Overdue</option>
              </select>
            </div>
          </div>

          {/* 4. RBAC Scope Switcher */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-gray-700 dark:text-gray-300">
              Cakupan Personil (RBAC Scope):
            </label>
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScope("all")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    scope === "all"
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  Semua Tim
                </button>
                <button
                  type="button"
                  onClick={() => setScope("mine")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    scope === "mine"
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  Tugas Saya Sendiri
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
                <User className="h-3.5 w-3.5 text-indigo-500" />
                <span>Khusus Tugas Saya Sendiri (Otorisasi terbatas oleh hak akses peran)</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-5 flex items-center justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
            <Button
              variant="outline"
              size="sm"
              disabled={isExporting}
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button
              size="sm"
              disabled={isExporting}
              onClick={handleExport}
              className="gap-2 bg-emerald-600 font-bold text-white shadow-xs hover:bg-emerald-700"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Mengunduh...
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  Unduh Berkas Excel
                </>
              )}
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
