"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  ShieldCheck,
  Activity,
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  Clock,
  User,
  Globe,
  Code,
  Copy,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Layers,
  ArrowUpDown,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/tailgrids/core/dialog";
import { SheetOverlay, SheetContent, SheetTitle } from "@/components/tailgrids/core/sheet";
import { toast } from "sonner";
import { AdminGuard } from "@/components/guards/AdminGuard";

export interface AuditLogItem {
  id: number;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  controllerName?: string | null;
  actionName?: string | null;
  httpMethod?: string | null;
  path?: string | null;
  statusCode: number;
  durationMs: number;
  timestamp: string;
  details?: string | null;
}

export interface AuditLogSummary {
  totalLogs: number;
  todayCount: number;
  successCount: number;
  errorCount: number;
  methodBreakdown: Record<string, number>;
  topUsers: Array<{
    userId?: string | null;
    userName?: string | null;
    userEmail?: string | null;
    count: number;
  }>;
}

export default function AuditTrailPage() {
  const queryClient = useQueryClient();

  // Filters & Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("ALL");
  const [method, setMethod] = useState("ALL");
  const [statusCodeFilter, setStatusCodeFilter] = useState<string>("ALL");
  const [dateRange, setDateRange] = useState<"ALL" | "TODAY" | "7DAYS" | "30DAYS">("ALL");

  // Selected Log for Slide-Over Drawer
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Cleanup Dialog State
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [retentionDays, setRetentionDays] = useState(90);

  // Calculate StartDate filter
  const getStartDateParam = () => {
    if (dateRange === "TODAY") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return today.toISOString();
    }
    if (dateRange === "7DAYS") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d.toISOString();
    }
    if (dateRange === "30DAYS") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString();
    }
    return undefined;
  };

  // 1. Query Summary Analytics
  const { data: summary, isLoading: loadingSummary } = useQuery<AuditLogSummary>({
    queryKey: ["auditLogsSummary"],
    queryFn: async () => {
      const res = await apiClient.get("/audit-logs/summary");
      return res.data.data;
    },
  });

  // 1b. Query Available Business Modules
  const { data: availableModules = [] } = useQuery<string[]>({
    queryKey: ["auditLogModules"],
    queryFn: async () => {
      const res = await apiClient.get("/audit-logs/modules");
      return res.data?.data || [];
    },
  });

  // 2. Query Paginated Audit Logs
  const {
    data: logsData,
    isLoading: loadingLogs,
    refetch,
    isFetching,
  } = useQuery<{
    data: AuditLogItem[];
    pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
  }>({
    queryKey: ["auditLogsList", page, pageSize, search, moduleFilter, method, statusCodeFilter, dateRange],
    queryFn: async () => {
      const params: Record<string, any> = {
        page,
        pageSize,
      };
      if (search.trim()) params.search = search.trim();
      if (moduleFilter !== "ALL") params.module = moduleFilter;
      if (method !== "ALL") params.method = method;
      if (statusCodeFilter !== "ALL") params.statusCode = parseInt(statusCodeFilter, 10);
      const startDate = getStartDateParam();
      if (startDate) params.startDate = startDate;

      const res = await apiClient.get("/audit-logs", { params });
      return res.data;
    },
  });

  // 3. Cleanup Mutation
  const cleanupMutation = useMutation({
    mutationFn: async (days: number) => {
      const res = await apiClient.delete(`/audit-logs/cleanup?days=${days}`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Pembersihan log berhasil dilakukan.");
      setCleanupOpen(false);
      queryClient.invalidateQueries({ queryKey: ["auditLogsList"] });
      queryClient.invalidateQueries({ queryKey: ["auditLogsSummary"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal membersihkan log audit.");
    },
  });

  const logs = logsData?.data || [];
  const pagination = logsData?.pagination || { page: 1, pageSize: 15, totalItems: 0, totalPages: 1 };

  const parseLogDetails = (rawDetails?: string | null) => {
    if (!rawDetails) return { module: undefined, actionSummary: undefined, ipAddress: undefined, userAgent: undefined, parameters: undefined };
    try {
      const parsed = JSON.parse(rawDetails);
      return {
        module: parsed.module as string | undefined,
        actionSummary: parsed.actionSummary as string | undefined,
        ipAddress: parsed.ipAddress as string | undefined,
        userAgent: parsed.userAgent as string | undefined,
        parameters: parsed.parameters,
      };
    } catch {
      return { module: undefined, actionSummary: undefined, ipAddress: undefined, userAgent: undefined, parameters: rawDetails };
    }
  };

  const getModuleBadgeClass = (moduleName?: string) => {
    switch (moduleName) {
      case "Autentikasi & Akun":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
      case "Manajemen Tugas":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800";
      case "Manajemen Proyek":
        return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800";
      case "Presensi & Absensi":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
      case "Timesheet & Jam Kerja":
        return "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800";
      case "Catatan & Quick Notes":
        return "bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/60 dark:text-yellow-300 dark:border-yellow-800";
      case "Gamifikasi & Level":
        return "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 dark:border-fuchsia-800";
      case "Pengumuman Internal":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
      case "Manajemen Anggota":
        return "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800";
      case "Konfigurasi & Pengaturan":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
      case "Sinkronisasi Offline":
        return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
    }
  };

  const getMethodBadgeClass = (m?: string | null) => {
    switch (m?.toUpperCase()) {
      case "POST":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
      case "PUT":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
      case "DELETE":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
      case "PATCH":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
    }
  };

  const getStatusCodeBadge = (code: number) => {
    if (code >= 200 && code < 300) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {code}
        </span>
      );
    }
    if (code >= 400 && code < 500) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-400">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          {code}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-400">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        {code}
      </span>
    );
  };

  const handleCopyJson = (jsonText: string) => {
    navigator.clipboard.writeText(jsonText);
    toast.success("JSON Payload berhasil disalin ke clipboard!");
  };

  return (
    <AdminGuard>
      <div className="space-y-6 p-4 lg:p-8">
      {/* 1. Header Page */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <span>Audit Trail & Log Aktivitas Sistem</span>
          </h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            FSD 5.12 & 5.17 • Rekaman kronologis mutasi data, klasifikasi modul bisnis, pelacakan IP, durasi request, dan keamanan sistem.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Segarkan
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCleanupOpen(true)}
            className="gap-1.5 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Bersihkan Log
          </Button>
        </div>
      </div>

      {/* 2. Top Analytics Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Logs */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Log Audit</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-slate-300">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
            {loadingSummary ? "..." : summary?.totalLogs.toLocaleString() ?? 0}
          </div>
          <span className="text-[11px] text-gray-400">Tercatat dalam basis data</span>
        </div>

        {/* Today's Activity */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Mutasi Hari Ini</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {loadingSummary ? "..." : summary?.todayCount.toLocaleString() ?? 0}
          </div>
          <span className="text-[11px] text-gray-400">Operasi POST/PUT/DELETE</span>
        </div>

        {/* Successful Requests */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Operasi Berhasil (2xx)</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {loadingSummary ? "..." : summary?.successCount.toLocaleString() ?? 0}
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Status HTTP 200 - 299</span>
        </div>

        {/* Warning / Error Requests */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Peringatan & Error</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">
            {loadingSummary ? "..." : summary?.errorCount.toLocaleString() ?? 0}
          </div>
          <span className="text-[11px] text-rose-500 font-medium">Status HTTP 4xx / 5xx</span>
        </div>
      </div>

      {/* 3. Filter & Search Toolbar */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Search Input */}
          <div className="relative lg:col-span-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari aksi, user, path..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-xs text-gray-900 outline-hidden focus:border-indigo-600 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
            />
          </div>

          {/* Module Filter */}
          <div>
            <select
              value={moduleFilter}
              onChange={(e) => {
                setModuleFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-gray-200 bg-white py-2 px-3 text-xs text-gray-900 outline-hidden focus:border-indigo-600 dark:border-gray-800 dark:bg-gray-900 dark:text-white font-medium"
            >
              <option value="ALL">Semua Modul Bisnis</option>
              {availableModules.map((mod) => (
                <option key={mod} value={mod}>
                  {mod}
                </option>
              ))}
            </select>
          </div>

          {/* HTTP Method Filter */}
          <div>
            <select
              value={method}
              onChange={(e) => {
                setMethod(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-gray-200 bg-white py-2 px-3 text-xs text-gray-900 outline-hidden focus:border-indigo-600 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
            >
              <option value="ALL">Semua Metode HTTP</option>
              <option value="POST">POST (Pembuatan)</option>
              <option value="PUT">PUT (Pembaruan Penuh)</option>
              <option value="PATCH">PATCH (Pembaruan Parsial)</option>
              <option value="DELETE">DELETE (Penghapusan)</option>
            </select>
          </div>

          {/* Status Code Filter */}
          <div>
            <select
              value={statusCodeFilter}
              onChange={(e) => {
                setStatusCodeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-gray-200 bg-white py-2 px-3 text-xs text-gray-900 outline-hidden focus:border-indigo-600 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
            >
              <option value="ALL">Semua Status Code</option>
              <option value="200">2xx (Sukses / Berhasil)</option>
              <option value="400">4xx (Client Error / Ditolak)</option>
              <option value="500">5xx (Internal Server Error)</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value as any);
                setPage(1);
              }}
              className="w-full rounded-xl border border-gray-200 bg-white py-2 px-3 text-xs text-gray-900 outline-hidden focus:border-indigo-600 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
            >
              <option value="ALL">Rentang Waktu: Semua</option>
              <option value="TODAY">Hari Ini</option>
              <option value="7DAYS">7 Hari Terakhir</option>
              <option value="30DAYS">30 Hari Terakhir</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Audit Log Table */}
      <div className="rounded-2xl border border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
              <tr>
                <th className="py-3.5 px-4 w-40">Waktu & Tanggal</th>
                <th className="py-3.5 px-4">Pengguna</th>
                <th className="py-3.5 px-3">Modul Bisnis</th>
                <th className="py-3.5 px-4">Aksi & Aktivitas</th>
                <th className="py-3.5 px-3 text-center">Metode</th>
                <th className="py-3.5 px-3 text-center">Status</th>
                <th className="py-3.5 px-3 text-right">Durasi</th>
                <th className="py-3.5 px-4 text-center w-24">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loadingLogs ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-gray-400">
                    Memuat rekaman audit log...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-gray-400">
                    Tidak ada rekaman log audit yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const date = new Date(log.timestamp);
                  const formattedTime = date.toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });
                  const formattedDate = date.toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });

                  const detailsInfo = parseLogDetails(log.details);
                  const displayModule = detailsInfo.module || "Sistem Umum";
                  const displaySummary = detailsInfo.actionSummary || `${log.controllerName} / ${log.actionName}`;

                  return (
                    <tr
                      key={log.id}
                      onClick={() => {
                        setSelectedLog(log);
                        setIsDrawerOpen(true);
                      }}
                      className="cursor-pointer transition hover:bg-gray-50/80 dark:hover:bg-gray-800/40"
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4">
                        <div className="font-mono text-xs font-semibold text-gray-900 dark:text-white">
                          {formattedTime}
                        </div>
                        <div className="text-[10px] text-gray-400">{formattedDate}</div>
                      </td>

                      {/* User */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold dark:bg-indigo-950 dark:text-indigo-400">
                            {log.userName ? log.userName.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div className="truncate max-w-[150px]">
                            <div className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                              {log.userName || "Sistem / Anonim"}
                            </div>
                            <div className="text-[10px] text-gray-400 truncate">{log.userEmail || "-"}</div>
                          </div>
                        </div>
                      </td>

                      {/* Module */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${getModuleBadgeClass(
                            displayModule
                          )}`}
                        >
                          {displayModule}
                        </span>
                      </td>

                      {/* Action & Activity Summary */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-800 dark:text-gray-200 line-clamp-1">
                          {displaySummary}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono mt-0.5">
                          <span>{log.controllerName}</span>
                          <span>•</span>
                          <span>{log.actionName}</span>
                          {log.path && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[160px]" title={log.path}>
                                {log.path}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* HTTP Method */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wider ${getMethodBadgeClass(
                            log.httpMethod
                          )}`}
                        >
                          {log.httpMethod}
                        </span>
                      </td>

                      {/* Status Code */}
                      <td className="py-3 px-3 text-center">{getStatusCodeBadge(log.statusCode)}</td>

                      {/* Duration */}
                      <td className="py-3 px-3 text-right font-mono text-[11px] text-gray-500 dark:text-gray-400">
                        {log.durationMs}ms
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                            setIsDrawerOpen(true);
                          }}
                          className="rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 dark:bg-gray-800 dark:text-indigo-400 dark:hover:bg-indigo-950/40 transition"
                        >
                          Rincian
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-gray-100 p-4 dark:border-gray-800 text-xs">
          <div className="text-gray-500">
            Menampilkan{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              {logs.length > 0 ? (page - 1) * pageSize + 1 : 0}
            </span>{" "}
            -{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              {Math.min(page * pageSize, pagination.totalItems)}
            </span>{" "}
            dari{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              {pagination.totalItems.toLocaleString()}
            </span>{" "}
            rekaman log
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Sebelumnya
            </Button>
            <span className="font-semibold px-2">
              Halaman {page} dari {pagination.totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="text-xs"
            >
              Selanjutnya
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* 5. Slide-Over Detail Drawer (Sheet) */}
      <SheetOverlay isOpen={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent side="right" className="w-full max-w-lg p-0 bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto">
          {selectedLog && (() => {
            const detailsInfo = parseLogDetails(selectedLog.details);
            const displayModule = detailsInfo.module || "Sistem Umum";
            const displaySummary = detailsInfo.actionSummary || `${selectedLog.controllerName} / ${selectedLog.actionName}`;

            return (
              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block rounded-md border px-2.5 py-0.5 text-xs font-bold tracking-wider ${getMethodBadgeClass(
                          selectedLog.httpMethod
                        )}`}
                      >
                        {selectedLog.httpMethod}
                      </span>
                      {getStatusCodeBadge(selectedLog.statusCode)}
                      <span
                        className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-semibold ${getModuleBadgeClass(
                          displayModule
                        )}`}
                      >
                        {displayModule}
                      </span>
                    </div>
                    <SheetTitle className="text-base font-bold text-gray-900 dark:text-white mt-2">
                      {displaySummary}
                    </SheetTitle>
                    <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-0.5">
                      Audit Log #{selectedLog.id} • {new Date(selectedLog.timestamp).toLocaleString("id-ID", {
                        dateStyle: "full",
                        timeStyle: "medium",
                      })}
                    </p>
                  </div>
                </div>

                {/* User Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Informasi Pengguna
                  </h4>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/40 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Nama Lengkap:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {selectedLog.userName || "Sistem / Anonim"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Email:</span>
                      <span className="font-mono text-gray-800 dark:text-gray-200">
                        {selectedLog.userEmail || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">User ID:</span>
                      <span className="font-mono text-[11px] text-gray-600 dark:text-gray-400">
                        {selectedLog.userId || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Request Telemetry */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    Telemetri Permintaan & Jaringan
                  </h4>
                  <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/40 text-xs space-y-2 font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-sans">Modul Bisnis:</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400 font-sans">{displayModule}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-sans">Controller:</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedLog.controllerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-sans">Aksi (Action):</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedLog.actionName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-sans">Endpoint:</span>
                      <span className="text-gray-700 dark:text-gray-300 break-all">{selectedLog.path}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-sans">Alamat IP:</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {detailsInfo.ipAddress || "127.0.0.1"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-sans">Durasi Pemrosesan:</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">{selectedLog.durationMs} ms</span>
                    </div>
                    {detailsInfo.userAgent && (
                      <div className="pt-1 border-t border-gray-200/50 dark:border-gray-700/50">
                        <span className="text-gray-500 font-sans block mb-1">User Agent:</span>
                        <span className="text-[10px] text-gray-600 dark:text-gray-300 break-all block">
                          {detailsInfo.userAgent}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payload Details */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <Code className="h-3.5 w-3.5" />
                      Parameter & Payload (Sanitized)
                    </h4>
                    {selectedLog.details && (
                      <button
                        type="button"
                        onClick={() => handleCopyJson(selectedLog.details || "")}
                        className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                      >
                        <Copy className="h-3 w-3" />
                        Salin JSON
                      </button>
                    )}
                  </div>

                  {selectedLog.details ? (
                    <pre className="max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-gray-900 p-3.5 text-[11px] font-mono text-emerald-400 dark:border-gray-800">
                      {(() => {
                        try {
                          const payloadToDisplay = detailsInfo.parameters !== undefined ? detailsInfo.parameters : JSON.parse(selectedLog.details);
                          return JSON.stringify(payloadToDisplay, null, 2);
                        } catch {
                          return selectedLog.details;
                        }
                      })()}
                    </pre>
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
                      Tidak ada data payload yang dicatat untuk aksi ini.
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </SheetOverlay>

      {/* 6. Cleanup Retention Dialog */}
      <Dialog open={cleanupOpen} onOpenChange={setCleanupOpen}>
        <DialogContent className="max-w-md bg-white p-6 shadow-2xl dark:bg-gray-900 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                <Trash2 className="h-4 w-4" />
              </div>
              <span>Pembersihan Log Audit Lama</span>
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Hapus rekaman log audit yang telah melampaui masa retensi tertentu untuk menghemat ruang penyimpanan database.
          </p>

          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Pilih Masa Retensi Minimal:
            </label>
            <select
              value={retentionDays}
              onChange={(e) => setRetentionDays(parseInt(e.target.value, 10))}
              className="w-full rounded-xl border border-gray-200 bg-white p-2 text-xs text-gray-900 outline-hidden focus:border-rose-600 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
            >
              <option value={30}>Lebih tua dari 30 hari (1 bulan)</option>
              <option value={60}>Lebih tua dari 60 hari (2 bulan)</option>
              <option value={90}>Lebih tua dari 90 hari (3 bulan - Rekomendasi)</option>
              <option value={180}>Lebih tua dari 180 hari (6 bulan)</option>
              <option value={365}>Lebih tua dari 365 hari (1 tahun)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCleanupOpen(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => cleanupMutation.mutate(retentionDays)}
              disabled={cleanupMutation.isPending}
              className="bg-rose-600 text-white hover:bg-rose-700 text-xs font-semibold gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {cleanupMutation.isPending ? "Membersihkan..." : "Hapus Log Sekarang"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </AdminGuard>
  );
}
