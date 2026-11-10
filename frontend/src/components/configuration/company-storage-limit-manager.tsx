"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  HardDrive,
  Building2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Search,
  RefreshCw,
  Save,
  Pencil,
  Info,
  SlidersHorizontal,
  FolderArchive,
  ArrowUpRight,
  ShieldAlert,
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
import { toast } from "sonner";

export interface CompanyStorageUsageItem {
  companyId: number;
  companyName: string;
  companyCode: string;
  maxStorageSizeBytes: number;
  maxStorageMb: number;
  maxUploadFileSizeBytes: number;
  maxUploadFileSizeMb: number;
  usedStorageBytes: number;
  usedStorageMb: number;
  usedPercentage: number;
  totalFilesCount: number;
  isQuotaExceeded: boolean;
}

const STORAGE_PRESETS = [
  { label: "500 MB", value: 500 },
  { label: "1 GB", value: 1024 },
  { label: "2 GB", value: 2048 },
  { label: "5 GB", value: 5120 },
  { label: "10 GB", value: 10240 },
  { label: "50 GB", value: 51200 },
];

const FILE_SIZE_PRESETS = [
  { label: "10 MB", value: 10 },
  { label: "25 MB", value: 25 },
  { label: "50 MB", value: 50 },
  { label: "100 MB", value: 100 },
  { label: "250 MB", value: 250 },
];

export function CompanyStorageLimitManager() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<CompanyStorageUsageItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form states for modal
  const [formMaxStorageMb, setFormMaxStorageMb] = useState<number>(1024);
  const [formMaxUploadMb, setFormMaxUploadMb] = useState<number>(50);

  // Fetch Storage Quotas
  const {
    data: storageList = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery<CompanyStorageUsageItem[]>({
    queryKey: ["companyStorageQuotas"],
    queryFn: async () => {
      const res = await apiClient.get("/companies/storage-quota");
      return res.data?.data || [];
    },
  });

  // Single Update Mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      companyId,
      maxStorageMb,
      maxUploadFileSizeMb,
    }: {
      companyId: number;
      maxStorageMb: number;
      maxUploadFileSizeMb: number;
    }) => {
      const res = await apiClient.put(`/companies/${companyId}/storage-quota`, {
        maxStorageMb,
        maxUploadFileSizeMb,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Batas kuota penyimpanan berhasil diperbarui.");
      setIsEditModalOpen(false);
      setSelectedCompany(null);
      queryClient.invalidateQueries({ queryKey: ["companyStorageQuotas"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal memperbarui kuota penyimpanan.");
    },
  });

  const handleOpenEdit = (company: CompanyStorageUsageItem) => {
    setSelectedCompany(company);
    setFormMaxStorageMb(company.maxStorageMb);
    setFormMaxUploadMb(company.maxUploadFileSizeMb);
    setIsEditModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    updateMutation.mutate({
      companyId: selectedCompany.companyId,
      maxStorageMb: Number(formMaxStorageMb),
      maxUploadFileSizeMb: Number(formMaxUploadMb),
    });
  };

  // Filtered List
  const filteredList = storageList.filter((item) => {
    const q = search.toLowerCase().trim();
    return (
      item.companyName.toLowerCase().includes(q) ||
      item.companyCode.toLowerCase().includes(q)
    );
  });

  // Aggregated Stats
  const totalAllocatedMb = storageList.reduce((acc, c) => acc + c.maxStorageMb, 0);
  const totalUsedMb = storageList.reduce((acc, c) => acc + c.usedStorageMb, 0);
  const totalFiles = storageList.reduce((acc, c) => acc + c.totalFilesCount, 0);
  const totalExceeded = storageList.filter((c) => c.isQuotaExceeded).length;

  return (
    <div className="space-y-6">
      {/* Header & Description */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Konfigurasi Kuota & Kapasitas Penyimpanan Perusahaan
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Atur batas maksimum kapasitas penyimpanan total (Storage Quota) dan ukuran maksimum per berkas unggahan untuk setiap perusahaan/tenant.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Segarkan Data
        </Button>
      </div>

      {/* Aggregate Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Kuota Terdistribusi</span>
            <span className="rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
              <HardDrive className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {(totalAllocatedMb / 1024).toFixed(2)} <span className="text-sm font-normal text-gray-500">GB</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">Kapasitas penyimpanan across seluruh tenant</div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Ruang Terpakai Saat Ini</span>
            <span className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <FolderArchive className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {totalUsedMb > 1024 ? (totalUsedMb / 1024).toFixed(2) : totalUsedMb.toFixed(1)}{" "}
            <span className="text-sm font-normal text-gray-500">
              {totalUsedMb > 1024 ? "GB" : "MB"}
            </span>
          </div>
          <div className="mt-1 text-xs text-gray-500">Total dokumen & lampiran aktif</div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Berkas Tersimpan</span>
            <span className="rounded-lg bg-purple-50 p-2 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <FileText className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {totalFiles} <span className="text-sm font-normal text-gray-500">berkas</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">DMS Dokumen & Catatan Kerja</div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Status Ambang Kuota</span>
            <span
              className={`rounded-lg p-2 ${
                totalExceeded > 0
                  ? "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                  : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
              }`}
            >
              <ShieldAlert className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {totalExceeded > 0 ? `${totalExceeded} Penuh` : "Semua Aman"}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {totalExceeded > 0
              ? "Perusahaan melebihi kuota terblokir upload"
              : "Seluruh perusahaan berada dalam batas kuota"}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cari perusahaan atau kode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-100 bg-gray-50 font-semibold text-gray-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3.5">Perusahaan</th>
                <th className="px-5 py-3.5">Penggunaan Ruang</th>
                <th className="px-5 py-3.5">Batas Kuota Total</th>
                <th className="px-5 py-3.5">Maks. Ukuran File</th>
                <th className="px-5 py-3.5">Total Berkas</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-indigo-500 mb-2" />
                    Memuat data kuota penyimpanan...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    Tidak ada perusahaan ditemukan.
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const pct = Math.min(100, item.usedPercentage);
                  const isHigh = pct >= 90 || item.isQuotaExceeded;
                  const isMedium = pct >= 70 && pct < 90;

                  return (
                    <tr
                      key={item.companyId}
                      className="hover:bg-gray-50/70 transition-colors dark:hover:bg-gray-800/40"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 font-bold">
                            {item.companyCode.slice(0, 3)}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {item.companyName}
                            </div>
                            <div className="text-[11px] text-gray-400 font-mono">
                              Kode: {item.companyCode}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Progress Bar Ruang */}
                      <td className="px-5 py-4 min-w-[200px]">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-mono font-medium text-gray-900 dark:text-white">
                              {item.usedStorageMb > 1024
                                ? `${(item.usedStorageMb / 1024).toFixed(2)} GB`
                                : `${item.usedStorageMb.toFixed(1)} MB`}
                            </span>
                            <span className="text-gray-400">
                              {item.usedPercentage}%
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                            <div
                              className={`h-full transition-all duration-300 rounded-full ${
                                isHigh
                                  ? "bg-rose-500"
                                  : isMedium
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{ width: `${Math.max(3, pct)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Batas Kuota */}
                      <td className="px-5 py-4">
                        <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">
                          {item.maxStorageMb >= 1024
                            ? `${(item.maxStorageMb / 1024).toFixed(1)} GB`
                            : `${item.maxStorageMb} MB`}
                        </span>
                      </td>

                      {/* Maks Ukuran File */}
                      <td className="px-5 py-4">
                        <span className="font-mono text-gray-600 dark:text-gray-400">
                          {item.maxUploadFileSizeMb} MB
                        </span>
                      </td>

                      {/* Total Berkas */}
                      <td className="px-5 py-4 font-mono text-gray-600 dark:text-gray-400">
                        {item.totalFilesCount} berkas
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        {item.isQuotaExceeded ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                            <AlertTriangle className="h-3 w-3" /> Kuota Penuh
                          </span>
                        ) : isMedium ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                            <Info className="h-3 w-3" /> Waspada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Aman
                          </span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="px-5 py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(item)}
                          className="gap-1.5 text-xs text-indigo-600 hover:text-indigo-700"
                        >
                          <Pencil className="h-3 w-3" /> Atur Kuota
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Quota Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-indigo-600" />
              Atur Batas Kuota Penyimpanan
            </DialogTitle>
          </DialogHeader>

          {selectedCompany && (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/50">
                <div className="text-xs font-semibold text-gray-500">Perusahaan Terpilih</div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {selectedCompany.companyName} ({selectedCompany.companyCode})
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Penggunaan Saat Ini: <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">{selectedCompany.usedStorageMb.toFixed(1)} MB</span> ({selectedCompany.totalFilesCount} berkas)
                </div>
              </div>

              {/* Input Batas Kuota Total */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Kapasitas Total Penyimpanan (MB)
                </label>
                <Input
                  type="number"
                  min="50"
                  step="50"
                  value={formMaxStorageMb}
                  onChange={(e) => setFormMaxStorageMb(Number(e.target.value))}
                  required
                  className="text-xs font-mono"
                />
                {/* Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {STORAGE_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setFormMaxStorageMb(p.value)}
                      className={`rounded-lg px-2 py-0.5 text-[11px] font-medium transition-colors ${
                        formMaxStorageMb === p.value
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Batas Per Upload File */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Batas Maksimum Ukuran Per File Upload (MB)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="500"
                  value={formMaxUploadMb}
                  onChange={(e) => setFormMaxUploadMb(Number(e.target.value))}
                  required
                  className="text-xs font-mono"
                />
                {/* Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {FILE_SIZE_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setFormMaxUploadMb(p.value)}
                      className={`rounded-lg px-2 py-0.5 text-[11px] font-medium transition-colors ${
                        formMaxUploadMb === p.value
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Warning if lower than current used */}
              {formMaxStorageMb < selectedCompany.usedStorageMb && (
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    Batas kuota baru ({formMaxStorageMb} MB) lebih kecil dari kapasitas yang sedang digunakan saat ini ({selectedCompany.usedStorageMb.toFixed(1)} MB). Perusahaan tidak akan dapat mengunggah berkas baru sampai ruang dibersihkan.
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={updateMutation.isPending}
                  className="gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  {updateMutation.isPending ? "Menyimpan..." : "Simpan Batas Kuota"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

