"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  Calendar,
  FileSpreadsheet,
  Plus,
  Pencil,
  Trash2,
  Lock,
  Unlock,
  Upload,
  RefreshCw,
  Save,
  CheckCircle2,
  Building2,
  ArrowUpDown,
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

const SOURCE_FIELDS = [
  { value: "TaskKey", label: "Kode Tugas (Issue Key, misal: TSK-0836)" },
  { value: "TaskSummary", label: "Judul Tugas (Issue Summary)" },
  { value: "Hours", label: "Durasi Jam Kerja (Hours)" },
  { value: "ManDaysFormula", label: "Rumus Man-Days (=Hours/8)" },
  { value: "WorkDate", label: "Tanggal Kerja (DD/MM/YYYY)" },
  { value: "ClockIn", label: "Jam Masuk (Clock In / Absensi)" },
  { value: "ClockOut", label: "Jam Keluar (Clock Out / Absensi)" },
  { value: "Username", label: "Username Pengguna" },
  { value: "FullName", label: "Nama Lengkap Personel" },
  { value: "PeriodCode", label: "Kode Periode Cut-Off (misal: 09/26)" },
  { value: "ProjectName", label: "Nama Proyek" },
  { value: "ActivityType", label: "Kategori Tugas (Activity Type)" },
  { value: "WorkingPlace", label: "Lokasi Kerja (WFO / WFH)" },
  { value: "Evidence", label: "Catatan / Link Evidence" },
];

export function TimesheetTemplateManager() {
  const queryClient = useQueryClient();

  // Query Companies for selection
  const { data: companies = [] } = useQuery<any[]>({
    queryKey: ["masterCompanies"],
    queryFn: async () => {
      const res = await apiClient.get("/companies");
      return res.data?.data || [];
    },
  });

  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);

  // Default to first company if not selected
  const activeCompanyId = selectedCompanyId ?? companies[0]?.id ?? 1;

  // Query Periods
  const { data: periodsData, isLoading: loadingPeriods } = useQuery({
    queryKey: ["timesheetPeriods", activeCompanyId],
    queryFn: async () => {
      const res = await apiClient.get(`/companies/${activeCompanyId}/timesheet-periods`);
      return res.data?.data || [];
    },
    enabled: !!activeCompanyId,
  });

  // Query Config
  const { data: configData, isLoading: loadingConfig } = useQuery({
    queryKey: ["timesheetConfig", activeCompanyId],
    queryFn: async () => {
      const res = await apiClient.get(`/companies/${activeCompanyId}/timesheet-config`);
      return res.data?.data;
    },
    enabled: !!activeCompanyId,
  });

  // Period Modal State
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [editingPeriodId, setEditingPeriodId] = useState<number | null>(null);
  const [periodForm, setPeriodForm] = useState({
    periodCode: "",
    name: "",
    startDate: "",
    endDate: "",
    workingDaysCount: 21,
    notes: "",
  });

  // Config Form State
  const [headerTitle, setHeaderTitle] = useState("ELISTEC - Timesheet");
  const [clientName, setClientName] = useState("Tugu Insurance");
  const [sowNumber, setSowNumber] = useState("");
  const [approverTitle, setApproverTitle] = useState("Mengetahui,");
  const [approverName, setApproverName] = useState("xxxx");
  const [resourceTitle, setResourceTitle] = useState("Resource,");
  const [includeWeekends, setIncludeWeekends] = useState(true);
  const [weekendTextFormat, setWeekendTextFormat] = useState(
    "Hari Libur Akhir Pekan ({DayName}) - Tidak Ada Pengerjaan Task"
  );
  const [columnsMapping, setColumnsMapping] = useState<any[]>([]);

  // Sync config form state when configData loads
  React.useEffect(() => {
    if (configData) {
      setHeaderTitle(configData.headerTitle || "ELISTEC - Timesheet");
      setClientName(configData.clientName || "Tugu Insurance");
      setSowNumber(configData.sowNumber || "");
      setApproverTitle(configData.approverTitle || "Mengetahui,");
      setApproverName(configData.approverName || "xxxx");
      setResourceTitle(configData.resourceTitle || "Resource,");
      setIncludeWeekends(configData.includeWeekends ?? true);
      setWeekendTextFormat(
        configData.weekendTaskTextFormat ||
          "Hari Libur Akhir Pekan ({DayName}) - Tidak Ada Pengerjaan Task"
      );
      setColumnsMapping(configData.columnsMapping || []);
    }
  }, [configData]);

  // Mutations
  const savePeriodMutation = useMutation({
    mutationFn: async () => {
      if (editingPeriodId) {
        return await apiClient.put(
          `/companies/${activeCompanyId}/timesheet-periods/${editingPeriodId}`,
          {
            ...periodForm,
            isClosed: false,
          }
        );
      } else {
        return await apiClient.post(
          `/companies/${activeCompanyId}/timesheet-periods`,
          periodForm
        );
      }
    },
    onSuccess: () => {
      toast.success(
        editingPeriodId
          ? "Periode cut-off berhasil diperbarui!"
          : "Periode cut-off baru berhasil dibuat!"
      );
      setPeriodModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["timesheetPeriods", activeCompanyId] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Gagal menyimpan periode"),
  });

  const deletePeriodMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiClient.delete(
        `/companies/${activeCompanyId}/timesheet-periods/${id}`
      );
    },
    onSuccess: () => {
      toast.success("Periode berhasil dihapus.");
      queryClient.invalidateQueries({ queryKey: ["timesheetPeriods", activeCompanyId] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Gagal menghapus periode"),
  });

  const toggleClosePeriodMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiClient.post(
        `/companies/${activeCompanyId}/timesheet-periods/${id}/toggle-close`
      );
    },
    onSuccess: () => {
      toast.success("Status periode berhasil diubah.");
      queryClient.invalidateQueries({ queryKey: ["timesheetPeriods", activeCompanyId] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Gagal mengubah status periode"),
  });

  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.put(`/companies/${activeCompanyId}/timesheet-config`, {
        headerTitle,
        clientName,
        sowNumber,
        approverTitle,
        approverName,
        resourceTitle,
        includeWeekends,
        weekendTaskTextFormat: weekendTextFormat,
        headerRowIndex: 7,
        dataStartRowIndex: 8,
        columnsMapping,
      });
    },
    onSuccess: () => {
      toast.success("Konfigurasi template dan mapping berhasil disimpan!");
      queryClient.invalidateQueries({ queryKey: ["timesheetConfig", activeCompanyId] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Gagal menyimpan konfigurasi"),
  });

  const resetDefaultMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.post(
        `/companies/${activeCompanyId}/timesheet-config/reset-default`
      );
    },
    onSuccess: () => {
      toast.success("Template berhasil direset ke standar bawaan ELISTEC.");
      queryClient.invalidateQueries({ queryKey: ["timesheetConfig", activeCompanyId] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Gagal mereset template"),
  });

  const uploadTemplateMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return await apiClient.post(
        `/companies/${activeCompanyId}/timesheet-config/upload-template`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
    },
    onSuccess: () => {
      toast.success("File template kustom berhasil diunggah!");
      queryClient.invalidateQueries({ queryKey: ["timesheetConfig", activeCompanyId] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Gagal mengunggah file template"),
  });

  const openCreatePeriodModal = () => {
    setEditingPeriodId(null);
    setPeriodForm({
      periodCode: "",
      name: "",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      workingDaysCount: 21,
      notes: "",
    });
    setPeriodModalOpen(true);
  };

  const openEditPeriodModal = (p: any) => {
    setEditingPeriodId(p.id);
    setPeriodForm({
      periodCode: p.periodCode,
      name: p.name,
      startDate: p.startDate,
      endDate: p.endDate,
      workingDaysCount: p.workingDaysCount,
      notes: p.notes || "",
    });
    setPeriodModalOpen(true);
  };

  const handleAddColumn = () => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const nextLetter = letters[columnsMapping.length % 26];
    setColumnsMapping([
      ...columnsMapping,
      {
        columnLetter: nextLetter,
        headerTitle: `Kolom ${nextLetter}`,
        sourceField: "TaskSummary",
        formula: null,
        defaultValue: "",
      },
    ]);
  };

  const handleRemoveColumn = (index: number) => {
    const updated = [...columnsMapping];
    updated.splice(index, 1);
    setColumnsMapping(updated);
  };

  const handleUpdateColumn = (index: number, field: string, val: any) => {
    const updated = [...columnsMapping];
    updated[index] = { ...updated[index], [field]: val };
    setColumnsMapping(updated);
  };

  return (
    <div className="space-y-8">
      {/* Company Selector Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-gray-900">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Pengaturan Template & Periode Cut-Off Perusahaan
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Kelola kalender periode cut-off bulanan dan pemetaan kolom template Excel resmi standar ELISTEC.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Pilih Perusahaan:
          </label>
          <select
            value={activeCompanyId}
            onChange={(e) => setSelectedCompanyId(Number(e.target.value))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-xs focus:border-indigo-500 focus:outline-none dark:border-gray-800 dark:bg-gray-800 dark:text-white"
          >
            {companies.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* PANEL 1: KALENDER PERIODE CUT-OFF BULANAN */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Kalender Periode Cut-Off Bulanan
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Daftar siklus tanggal cut-off pembuatan timesheet bulanan untuk perusahaan ini.
            </p>
          </div>

          <Button
            onClick={openCreatePeriodModal}
            className="gap-2 bg-emerald-600 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah Periode Baru
          </Button>
        </div>

        {/* Table Periods */}
        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/75 dark:border-gray-800 dark:bg-gray-800/50">
                <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Kode</th>
                <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Nama Periode</th>
                <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Rentang Tanggal Cut-Off</th>
                <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300 text-center">Hari Kerja</th>
                <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300 text-center">Status</th>
                <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Catatan</th>
                <th className="px-4 py-3 text-right font-bold text-gray-600 dark:text-gray-300">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {periodsData?.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                  <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {p.periodCode}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                    {p.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-400">
                    {p.startDate} s/d {p.endDate}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-gray-900 dark:text-white">
                    {p.workingDaysCount} Hari
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.isClosed ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        <Lock className="h-2.5 w-2.5" /> Ditutup
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <Unlock className="h-2.5 w-2.5" /> Aktif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                    {p.notes || "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-gray-500 hover:text-indigo-600"
                        title={p.isClosed ? "Buka Periode" : "Tutup Periode"}
                        onClick={() => toggleClosePeriodMutation.mutate(p.id)}
                      >
                        {p.isClosed ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-gray-500 hover:text-amber-600"
                        onClick={() => openEditPeriodModal(p)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-gray-500 hover:text-red-600"
                        onClick={() => {
                          if (confirm(`Hapus periode "${p.name}"?`)) {
                            deletePeriodMutation.mutate(p.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {periodsData?.length === 0 && !loadingPeriods && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    Belum ada periode cut-off yang dibuat untuk perusahaan ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PANEL 2: TEMPLATE FILE & DYNAMIC COLUMN MAPPING */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Template Excel Fisik & Metadata Dokumen
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Konfigurasi teks header, nama klien, penandatangan resmi, dan file template `.xlsx`.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => resetDefaultMutation.mutate()}
              className="gap-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:text-gray-300"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset ke Standar ELISTEC
            </Button>

            <Button
              type="button"
              onClick={() => saveConfigMutation.mutate()}
              disabled={saveConfigMutation.isPending}
              className="gap-1.5 bg-indigo-600 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
            >
              <Save className="h-3.5 w-3.5" />
              Simpan Konfigurasi
            </Button>
          </div>
        </div>

        {/* Template File Card */}
        <div className="flex flex-col gap-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-indigo-950/60 dark:bg-indigo-950/20">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              File Template Acuan Aktif:
            </span>
            <div className="mt-1 font-mono text-sm font-bold text-gray-900 dark:text-white">
              {configData?.templateFileName || "timesheet_elistec_default.xlsx (Preset)"}
            </div>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Template ini mempertahankan format border, warna header Navy Blue, dan formula Excel bawaan.
            </p>
          </div>

          <div>
            <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 shadow-xs hover:bg-indigo-50 dark:border-indigo-800 dark:bg-gray-900 dark:text-indigo-300">
              <Upload className="h-3.5 w-3.5" />
              Unggah File .xlsx Baru
              <input
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    uploadTemplateMutation.mutate(file);
                  }
                }}
              />
            </label>
          </div>
        </div>

        {/* Metadata Inputs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Judul Header (Cell E2)
            </label>
            <Input
              value={headerTitle}
              onChange={(e) => setHeaderTitle(e.target.value)}
              className="mt-1 text-xs"
              placeholder="ELISTEC - Timesheet"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Nama Klien / Mitra (Cell G4)
            </label>
            <Input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="mt-1 text-xs"
              placeholder="Tugu Insurance"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Nomor SOW / PO (Cell L5)
            </label>
            <Input
              value={sowNumber}
              onChange={(e) => setSowNumber(e.target.value)}
              className="mt-1 text-xs"
              placeholder="SOW-2026-TUGU-01"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Judul Pengesah (Approver Title)
            </label>
            <Input
              value={approverTitle}
              onChange={(e) => setApproverTitle(e.target.value)}
              className="mt-1 text-xs"
              placeholder="Mengetahui,"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Nama Pengesah (Approver Name)
            </label>
            <Input
              value={approverName}
              onChange={(e) => setApproverName(e.target.value)}
              className="mt-1 text-xs"
              placeholder="Manager Operasional / Anton"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Judul Pelaksana (Resource Title)
            </label>
            <Input
              value={resourceTitle}
              onChange={(e) => setResourceTitle(e.target.value)}
              className="mt-1 text-xs"
              placeholder="Resource,"
            />
          </div>
        </div>

        {/* Weekend Options */}
        <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/30 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeWeekends}
              onChange={(e) => setIncludeWeekends(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs font-bold text-gray-900 dark:text-white">
              Sertakan Baris Hari Libur Akhir Pekan (Sabtu & Minggu) Otomatis
            </span>
          </label>

          {includeWeekends && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Format Teks Keterangan Akhir Pekan (Gunakan {"{DayName}"} untuk nama hari):
              </label>
              <Input
                value={weekendTextFormat}
                onChange={(e) => setWeekendTextFormat(e.target.value)}
                className="mt-1 text-xs max-w-lg"
              />
            </div>
          )}
        </div>

        {/* Dynamic Column Mapping */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                Pemetaan Kolom Dinamis (Dynamic Column Mapping)
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Hubungkan kolom template Excel dengan atribut data pada sistem.
              </p>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAddColumn}
              className="gap-1.5 text-xs text-indigo-600 dark:text-indigo-400"
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah Kolom
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/75 dark:border-gray-800 dark:bg-gray-800/50">
                  <th className="px-3 py-2.5 font-bold text-gray-600 dark:text-gray-300 w-16 text-center">Kolom</th>
                  <th className="px-3 py-2.5 font-bold text-gray-600 dark:text-gray-300">Judul Header</th>
                  <th className="px-3 py-2.5 font-bold text-gray-600 dark:text-gray-300">Sumber Data (Field)</th>
                  <th className="px-3 py-2.5 font-bold text-gray-600 dark:text-gray-300">Formula (Opsional)</th>
                  <th className="px-3 py-2.5 font-bold text-gray-600 dark:text-gray-300">Nilai Default</th>
                  <th className="px-3 py-2.5 text-right font-bold text-gray-600 dark:text-gray-300 w-12">Hapus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {columnsMapping.map((col, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                    <td className="px-3 py-2 text-center">
                      <Input
                        value={col.columnLetter}
                        onChange={(e) => handleUpdateColumn(idx, "columnLetter", e.target.value.toUpperCase())}
                        className="w-12 text-center font-mono font-bold text-xs p-1"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={col.headerTitle}
                        onChange={(e) => handleUpdateColumn(idx, "headerTitle", e.target.value)}
                        className="text-xs p-1 min-w-[140px]"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={col.sourceField}
                        onChange={(e) => handleUpdateColumn(idx, "sourceField", e.target.value)}
                        className="w-full rounded-md border border-gray-200 bg-white p-1 text-xs text-gray-900 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                      >
                        {SOURCE_FIELDS.map((sf) => (
                          <option key={sf.value} value={sf.value}>
                            {sf.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={col.formula || ""}
                        onChange={(e) => handleUpdateColumn(idx, "formula", e.target.value || null)}
                        placeholder="misal: =IF(C{row}=&quot;&quot;,&quot;&quot;,C{row}/8)"
                        className="text-xs font-mono p-1 min-w-[180px]"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={col.defaultValue || ""}
                        onChange={(e) => handleUpdateColumn(idx, "defaultValue", e.target.value)}
                        placeholder="misal: -"
                        className="text-xs p-1 w-24"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveColumn(idx)}
                        className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Tambah/Edit Periode */}
      <Dialog open={periodModalOpen} onOpenChange={setPeriodModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 shadow-2xl dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-white">
              {editingPeriodId ? "Edit Periode Cut-Off" : "Tambah Periode Cut-Off Baru"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              savePeriodMutation.mutate();
            }}
            className="mt-4 space-y-3.5"
          >
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Kode Periode * (misal: 09/26)
              </label>
              <Input
                required
                value={periodForm.periodCode}
                onChange={(e) => setPeriodForm({ ...periodForm, periodCode: e.target.value })}
                placeholder="09/26"
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Nama Periode * (misal: September 2026)
              </label>
              <Input
                required
                value={periodForm.name}
                onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
                placeholder="September 2026"
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Tanggal Mulai *
                </label>
                <Input
                  type="date"
                  required
                  value={periodForm.startDate}
                  onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Tanggal Selesai *
                </label>
                <Input
                  type="date"
                  required
                  value={periodForm.endDate}
                  onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Jumlah Hari Kerja Efektif (Duration)
              </label>
              <Input
                type="number"
                min={1}
                max={31}
                required
                value={periodForm.workingDaysCount}
                onChange={(e) =>
                  setPeriodForm({ ...periodForm, workingDaysCount: Number(e.target.value) })
                }
                className="mt-1 text-xs"
              />
              <span className="text-[10px] text-gray-500">
                Otomatis dihitung 21 hari (Senin-Jumat), bisa disesuaikan bila ada libur nasional.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Catatan (Opsional)
              </label>
              <textarea
                rows={2}
                value={periodForm.notes}
                onChange={(e) => setPeriodForm({ ...periodForm, notes: e.target.value })}
                placeholder="Keterangan tambahan periode cut-off..."
                className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent p-2 text-xs text-gray-900 dark:border-gray-800 dark:text-white"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPeriodModalOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={savePeriodMutation.isPending}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Simpan Periode
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
