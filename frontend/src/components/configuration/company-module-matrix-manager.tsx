"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  Building2,
  FileText,
  LifeBuoy,
  Receipt,
  Search,
  RefreshCw,
  Save,
  Info,
  Users,
  Briefcase,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { toast } from "sonner";

export interface CompanyModuleMatrixItem {
  companyId: number;
  companyName: string;
  companyCode: string;
  enableDms: boolean;
  enableTicketing: boolean;
  enableInvoicing: boolean;
  userCount: number;
  projectCount: number;
}

export function CompanyModuleMatrixManager() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [localMatrix, setLocalMatrix] = useState<CompanyModuleMatrixItem[] | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch Matrix
  const {
    data: remoteMatrix = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery<CompanyModuleMatrixItem[]>({
    queryKey: ["companyModuleMatrix"],
    queryFn: async () => {
      const res = await apiClient.get("/companies/module-matrix");
      return res.data?.data || [];
    },
  });

  // Sync initial local matrix
  useEffect(() => {
    if (remoteMatrix.length > 0 && !hasUnsavedChanges) {
      setLocalMatrix(remoteMatrix);
    }
  }, [remoteMatrix, hasUnsavedChanges]);

  const matrix = localMatrix || remoteMatrix;

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async (items: CompanyModuleMatrixItem[]) => {
      const payload = {
        items: items.map((m) => ({
          companyId: m.companyId,
          enableDms: m.enableDms,
          enableTicketing: m.enableTicketing,
          enableInvoicing: m.enableInvoicing,
        })),
      };
      const res = await apiClient.put("/companies/module-matrix", payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Matriks modul perusahaan berhasil disimpan!");
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ["companyModuleMatrix"] });
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || "Gagal menyimpan perubahan matriks modul."
      );
    },
  });

  // Single company update mutation
  const singleUpdateMutation = useMutation({
    mutationFn: async ({
      companyId,
      enableDms,
      enableTicketing,
      enableInvoicing,
    }: {
      companyId: number;
      enableDms: boolean;
      enableTicketing: boolean;
      enableInvoicing: boolean;
    }) => {
      const res = await apiClient.put(`/companies/${companyId}/modules`, {
        enableDms,
        enableTicketing,
        enableInvoicing,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Modul perusahaan berhasil diperbarui!");
      queryClient.invalidateQueries({ queryKey: ["companyModuleMatrix"] });
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || "Gagal memperbarui modul perusahaan."
      );
    },
  });

  // Handle single toggle
  const handleToggle = (
    companyId: number,
    moduleKey: "enableDms" | "enableTicketing" | "enableInvoicing"
  ) => {
    setLocalMatrix((prev) => {
      const next = (prev || remoteMatrix).map((item) => {
        if (item.companyId === companyId) {
          return { ...item, [moduleKey]: !item[moduleKey] };
        }
        return item;
      });
      return next;
    });
    setHasUnsavedChanges(true);
  };

  // Toggle all for a specific company
  const handleToggleAllForCompany = (companyId: number, enable: boolean) => {
    setLocalMatrix((prev) => {
      const next = (prev || remoteMatrix).map((item) => {
        if (item.companyId === companyId) {
          return {
            ...item,
            enableDms: enable,
            enableTicketing: enable,
            enableInvoicing: enable,
          };
        }
        return item;
      });
      return next;
    });
    setHasUnsavedChanges(true);
  };

  // Bulk enable/disable specific module across all filtered companies
  const handleBulkToggleModule = (
    moduleKey: "enableDms" | "enableTicketing" | "enableInvoicing",
    enable: boolean
  ) => {
    setLocalMatrix((prev) => {
      const next = (prev || remoteMatrix).map((item) => ({
        ...item,
        [moduleKey]: enable,
      }));
      return next;
    });
    setHasUnsavedChanges(true);
  };

  // Filtered rows
  const filteredMatrix = useMemo(() => {
    if (!search.trim()) return matrix;
    const s = search.toLowerCase().trim();
    return matrix.filter(
      (m) =>
        m.companyName.toLowerCase().includes(s) ||
        m.companyCode.toLowerCase().includes(s)
    );
  }, [matrix, search]);

  // Statistics
  const stats = useMemo(() => {
    const total = matrix.length;
    const dmsActive = matrix.filter((m) => m.enableDms).length;
    const ticketingActive = matrix.filter((m) => m.enableTicketing).length;
    const invoicingActive = matrix.filter((m) => m.enableInvoicing).length;
    return { total, dmsActive, ticketingActive, invoicingActive };
  }, [matrix]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Explanation */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-indigo-50/40 p-5 shadow-xs dark:border-indigo-900/40 dark:from-indigo-950/30 dark:via-gray-900 dark:to-indigo-950/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Matriks Pengaturan Modul Perusahaan
              </h2>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 leading-relaxed max-w-3xl">
                Tentukan akses modul enterprise per entitas perusahaan. Ketika suatu modul dinonaktifkan, menu terkait akan disembunyikan secara otomatis dari sidebar karyawan/manajer perusahaan tersebut dan pembuatan berkas/tiket/faktur baru dibatasi dengan aman.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasUnsavedChanges && (
              <Button
                onClick={() => localMatrix && bulkUpdateMutation.mutate(localMatrix)}
                disabled={bulkUpdateMutation.isPending}
                className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
              >
                {bulkUpdateMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Simpan Matriks
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setHasUnsavedChanges(false);
                refetch();
              }}
              disabled={isFetching}
              className="gap-2 border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Muat Ulang
            </Button>
          </div>
        </div>

        {hasUnsavedChanges && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3.5 py-2 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
            <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Terdapat perubahan yang belum disimpan. Klik tombol <strong>Simpan Matriks</strong> untuk menerapkan ke seluruh sistem.</span>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Perusahaan */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total Perusahaan</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</span>
            <span className="text-xs text-gray-400">Entitas Terdaftar</span>
          </div>
        </div>

        {/* DMS Active */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">DMS (Manajemen Dokumen)</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.dmsActive}</span>
            <span className="text-xs text-gray-400">/ {stats.total} Perusahaan Aktif</span>
          </div>
          <div className="mt-2">
            <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-300"
                style={{ width: `${stats.total ? (stats.dmsActive / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Ticketing Active */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Ticketing System</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
              <LifeBuoy className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.ticketingActive}</span>
            <span className="text-xs text-gray-400">/ {stats.total} Perusahaan Aktif</span>
          </div>
          <div className="mt-2">
            <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-rose-500 transition-all duration-300"
                style={{ width: `${stats.total ? (stats.ticketingActive / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Invoicing Active */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Invoice Management</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.invoicingActive}</span>
            <span className="text-xs text-gray-400">/ {stats.total} Perusahaan Aktif</span>
          </div>
          <div className="mt-2">
            <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${stats.total ? (stats.invoicingActive / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari perusahaan atau kode..."
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mr-2">
              <span>Aksi Massal:</span>
            </div>
            <button
              onClick={() => handleBulkToggleModule("enableDms", true)}
              className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 transition"
              title="Aktifkan modul Dokumen untuk semua perusahaan"
            >
              + Semua DMS
            </button>
            <button
              onClick={() => handleBulkToggleModule("enableTicketing", true)}
              className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 transition"
              title="Aktifkan modul Ticketing untuk semua perusahaan"
            >
              + Semua Tiket
            </button>
            <button
              onClick={() => handleBulkToggleModule("enableInvoicing", true)}
              className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 transition"
              title="Aktifkan modul Invoice untuk semua perusahaan"
            >
              + Semua Invoice
            </button>
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-r-transparent"></div>
            <p className="mt-3 text-xs text-gray-500">Memuat matriks konfigurasi modul...</p>
          </div>
        ) : filteredMatrix.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-700" />
            <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">Tidak ada data perusahaan</h3>
            <p className="mt-1 text-xs text-gray-500">Tidak ada data yang sesuai dengan kriteria pencarian.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-100 bg-gray-50/80 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-400">
                <tr>
                  <th className="py-3.5 pl-6 pr-4">Entitas Perusahaan</th>
                  <th className="px-4 py-3.5 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-amber-500" />
                      <span>Document Management (DMS)</span>
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <LifeBuoy className="h-3.5 w-3.5 text-rose-500" />
                      <span>Issues & Ticketing</span>
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <Receipt className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Invoice Management</span>
                    </div>
                  </th>
                  <th className="py-3.5 pl-4 pr-6 text-right">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredMatrix.map((item) => {
                  const allActive = item.enableDms && item.enableTicketing && item.enableInvoicing;
                  const allDisabled = !item.enableDms && !item.enableTicketing && !item.enableInvoicing;

                  return (
                    <tr
                      key={item.companyId}
                      className="transition hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                    >
                      {/* Company Info */}
                      <td className="py-4 pl-6 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 font-bold text-xs uppercase">
                            {item.companyCode?.slice(0, 3) || "CO"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 dark:text-white">
                                {item.companyName}
                              </span>
                              <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                {item.companyCode}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-3 text-[11px] text-gray-400">
                              <span className="inline-flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {item.userCount} Member
                              </span>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1">
                                <Briefcase className="h-3 w-3" />
                                {item.projectCount} Proyek
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Module 1: DMS */}
                      <td className="px-4 py-4 text-center">
                        <div className="inline-flex flex-col items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggle(item.companyId, "enableDms")}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                              item.enableDms ? "bg-amber-500" : "bg-gray-200 dark:bg-gray-700"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                item.enableDms ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </button>
                          <span
                            className={`text-[10px] font-semibold ${
                              item.enableDms
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-gray-400 dark:text-gray-500"
                            }`}
                          >
                            {item.enableDms ? "Aktif" : "Nonaktif"}
                          </span>
                        </div>
                      </td>

                      {/* Module 2: Ticketing */}
                      <td className="px-4 py-4 text-center">
                        <div className="inline-flex flex-col items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggle(item.companyId, "enableTicketing")}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                              item.enableTicketing ? "bg-rose-500" : "bg-gray-200 dark:bg-gray-700"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                item.enableTicketing ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </button>
                          <span
                            className={`text-[10px] font-semibold ${
                              item.enableTicketing
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-gray-400 dark:text-gray-500"
                            }`}
                          >
                            {item.enableTicketing ? "Aktif" : "Nonaktif"}
                          </span>
                        </div>
                      </td>

                      {/* Module 3: Invoicing */}
                      <td className="px-4 py-4 text-center">
                        <div className="inline-flex flex-col items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggle(item.companyId, "enableInvoicing")}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                              item.enableInvoicing ? "bg-emerald-500" : "bg-gray-200 dark:bg-gray-700"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                item.enableInvoicing ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </button>
                          <span
                            className={`text-[10px] font-semibold ${
                              item.enableInvoicing
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-gray-400 dark:text-gray-500"
                            }`}
                          >
                            {item.enableInvoicing ? "Aktif" : "Nonaktif"}
                          </span>
                        </div>
                      </td>

                      {/* Quick Actions */}
                      <td className="py-4 pl-4 pr-6 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {!allActive && (
                            <button
                              onClick={() => handleToggleAllForCompany(item.companyId, true)}
                              className="rounded-md border border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 transition"
                              title="Aktifkan semua 3 modul untuk perusahaan ini"
                            >
                              Aktifkan Semua
                            </button>
                          )}
                          {!allDisabled && (
                            <button
                              onClick={() => handleToggleAllForCompany(item.companyId, false)}
                              className="rounded-md border border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 transition"
                              title="Nonaktifkan semua modul untuk perusahaan ini"
                            >
                              Matikan Semua
                            </button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              singleUpdateMutation.mutate({
                                companyId: item.companyId,
                                enableDms: item.enableDms,
                                enableTicketing: item.enableTicketing,
                                enableInvoicing: item.enableInvoicing,
                              })
                            }
                            disabled={singleUpdateMutation.isPending}
                            className="h-7 px-2 text-[11px] border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-900/50 dark:text-indigo-400"
                          >
                            {singleUpdateMutation.isPending ? "Menyimpan..." : "Simpan"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
