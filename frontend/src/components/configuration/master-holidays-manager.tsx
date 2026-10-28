"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  Calendar as CalendarIcon,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Building2,
  Globe2,
  Sparkles,
  Search,
  AlertCircle,
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

interface HolidayItem {
  id: number;
  date: string;
  name: string;
  description?: string | null;
  isNational: boolean;
  companyId?: number | null;
  companyName?: string | null;
}

interface CompanyItem {
  id: number;
  name: string;
  code: string;
}

const INDONESIAN_DAYS = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

const INDONESIAN_MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function MasterHolidaysManager() {
  const queryClient = useQueryClient();

  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formDate, setFormDate] = useState("2026-08-17");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIsNational, setFormIsNational] = useState(true);
  const [formCompanyId, setFormCompanyId] = useState<number | null>(null);

  // Delete Confirmation State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<HolidayItem | null>(null);

  // Fetch Companies
  const { data: companies = [] } = useQuery<CompanyItem[]>({
    queryKey: ["masterCompanies"],
    queryFn: async () => {
      const res = await apiClient.get("/companies");
      return res.data?.data || [];
    },
  });

  // Fetch Holidays
  const {
    data: holidays = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<HolidayItem[]>({
    queryKey: ["masterHolidays", selectedYear, selectedCompanyId],
    queryFn: async () => {
      let url = `/master/holidays?year=${selectedYear}`;
      if (selectedCompanyId !== "all") {
        url += `&companyId=${selectedCompanyId}`;
      }
      const res = await apiClient.get(url);
      return res.data?.data || [];
    },
  });

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        date: formDate,
        name: formName.trim(),
        description: formDescription.trim() || null,
        isNational: formIsNational,
        companyId: formIsNational ? null : formCompanyId,
      };

      if (modalMode === "create") {
        const res = await apiClient.post("/master/holidays", payload);
        return res.data;
      } else {
        const res = await apiClient.put(`/master/holidays/${editingId}`, payload);
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success(
        modalMode === "create"
          ? "Hari libur berhasil ditambahkan!"
          : "Hari libur berhasil diperbarui!"
      );
      queryClient.invalidateQueries({ queryKey: ["masterHolidays"] });
      setModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || "Gagal menyimpan data hari libur."
      );
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete(`/master/holidays/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Hari libur berhasil dihapus!");
      queryClient.invalidateQueries({ queryKey: ["masterHolidays"] });
      setDeleteModalOpen(false);
      setItemToDelete(null);
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || "Gagal menghapus hari libur."
      );
    },
  });

  // Seed National Holidays Mutation
  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(
        `/master/holidays/seed-national?year=${selectedYear}`
      );
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success(
        data.message ||
          `Berhasil memuat daftar hari libur nasional tahun ${selectedYear}!`
      );
      queryClient.invalidateQueries({ queryKey: ["masterHolidays"] });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message ||
          "Gagal memuat daftar libur nasional bawaan."
      );
    },
  });

  const handleOpenCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setFormDate(`${selectedYear}-01-01`);
    setFormName("");
    setFormDescription("");
    setFormIsNational(true);
    setFormCompanyId(companies[0]?.id || null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: HolidayItem) => {
    setModalMode("edit");
    setEditingId(item.id);
    setFormDate(item.date);
    setFormName(item.name);
    setFormDescription(item.description || "");
    setFormIsNational(item.isNational);
    setFormCompanyId(item.companyId || companies[0]?.id || null);
    setModalOpen(true);
  };

  const handleConfirmDelete = (item: HolidayItem) => {
    setItemToDelete(item);
    setDeleteModalOpen(true);
  };

  // Filtered list
  const filteredHolidays = holidays.filter((h) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      h.name.toLowerCase().includes(q) ||
      h.date.includes(q) ||
      (h.description && h.description.toLowerCase().includes(q)) ||
      (h.companyName && h.companyName.toLowerCase().includes(q))
    );
  });

  const totalNational = holidays.filter((h) => h.isNational).length;
  const totalCompany = holidays.filter((h) => !h.isNational).length;

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) {
      return { full: "-", dayName: "-", badge: "-" };
    }
    const [year, month, day] = dateStr.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayName = INDONESIAN_DAYS[dateObj.getDay()] || "-";
    const monthName = INDONESIAN_MONTHS[month - 1] || "";
    return {
      full: `${day} ${monthName} ${year}`,
      dayName,
      badge: `${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}`,
    };
  };

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
            <CalendarIcon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">
              Total Hari Libur ({selectedYear})
            </p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {holidays.length} Hari
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <Globe2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">
              Libur Nasional
            </p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {totalNational} Hari
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">
              Libur Khusus Perusahaan
            </p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {totalCompany} Hari
            </h3>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Master Data Hari Libur
            </h2>
            <p className="text-xs text-gray-500">
              Hari libur akan otomatis dilongkapi oleh sistem pada pembuatan
              dan pelaporan timesheet pengerjaan task harian.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
            >
              <Sparkles className="h-4 w-4" />
              {seedMutation.isPending
                ? "Memuat..."
                : `Muat Libur Nasional ${selectedYear}`}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading || isRefetching}
              className="gap-1.5"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
              />
              Segarkan
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleOpenCreate}
              className="gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Tambah Hari Libur
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
              Tahun Kalender
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value={2025}>Tahun 2025</option>
              <option value={2026}>Tahun 2026</option>
              <option value={2027}>Tahun 2027</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
              Cakupan Entitas
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="all">Semua (Nasional + Seluruh Perusahaan)</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
              Pencarian
            </label>
            <div className="relative">
              <Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Cari nama hari libur atau keterangan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Holidays Table */}
        <div className="mt-5 overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/75 text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3 font-semibold">Tanggal & Hari</th>
                <th className="px-4 py-3 font-semibold">Nama Hari Libur</th>
                <th className="px-4 py-3 font-semibold">Jenis / Entitas</th>
                <th className="px-4 py-3 font-semibold">Keterangan</th>
                <th className="px-4 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Memuat data master hari libur...
                  </td>
                </tr>
              ) : filteredHolidays.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center">
                    <div className="mx-auto flex max-w-xs flex-col items-center">
                      <CalendarIcon className="mb-2 h-10 w-10 text-gray-300 dark:text-gray-600" />
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Belum ada hari libur untuk tahun {selectedYear}
                      </p>
                      <p className="mt-1 text-[11px] text-gray-400">
                        Klik tombol &quot;Muat Libur Nasional {selectedYear}&quot;
                        untuk memasukkan hari libur resmi secara instan.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredHolidays.map((item) => {
                  const dateInfo = formatDisplayDate(item.date);
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg bg-indigo-50 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">
                            {dateInfo.dayName}
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {dateInfo.full}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                        {item.name}
                      </td>

                      <td className="px-4 py-3">
                        {item.isNational ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                            <Globe2 className="h-3 w-3" />
                            Libur Nasional
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                            <Building2 className="h-3 w-3" />
                            {item.companyName || "Perusahaan Khusus"}
                          </span>
                        )}
                      </td>

                      <td className="max-w-xs truncate px-4 py-3 text-gray-500 dark:text-gray-400">
                        {item.description || "-"}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(item)}
                            className="h-7 w-7 p-0"
                            title="Edit Hari Libur"
                          >
                            <Pencil className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleConfirmDelete(item)}
                            className="h-7 w-7 border-red-200 p-0 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
                            title="Hapus Hari Libur"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Holiday Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-white">
              {modalMode === "create"
                ? "Tambah Hari Libur Baru"
                : "Ubah Data Hari Libur"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="mt-4 space-y-4"
          >
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Tanggal Libur <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Nama Hari Libur <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                required
                placeholder="Misal: Hari Kemerdekaan RI Ke-81"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Cakupan Libur
              </label>
              <div className="mt-1 flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="radio"
                    name="isNational"
                    checked={formIsNational}
                    onChange={() => setFormIsNational(true)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Libur Nasional (Semua Perusahaan)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="radio"
                    name="isNational"
                    checked={!formIsNational}
                    onChange={() => setFormIsNational(false)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Perusahaan Khusus</span>
                </label>
              </div>
            </div>

            {!formIsNational && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Pilih Perusahaan <span className="text-red-500">*</span>
                </label>
                <select
                  value={formCompanyId || ""}
                  onChange={(e) => setFormCompanyId(Number(e.target.value))}
                  required={!formIsNational}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                >
                  <option value="" disabled>
                    -- Pilih Perusahaan --
                  </option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Keterangan / Deskripsi
              </label>
              <textarea
                rows={3}
                placeholder="Catatan tambahan mengenai hari libur ini..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-800 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saveMutation.isPending}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-sm p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Konfirmasi Hapus
            </DialogTitle>
          </DialogHeader>

          <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
            Apakah Anda yakin ingin menghapus data hari libur{" "}
            <span className="font-bold text-gray-900 dark:text-white">
              &quot;{itemToDelete?.name}&quot;
            </span>{" "}
            ({itemToDelete?.date})? Tindakan ini tidak dapat dibatalkan.
          </p>

          <div className="mt-5 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (itemToDelete) {
                  deleteMutation.mutate(itemToDelete.id);
                }
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
