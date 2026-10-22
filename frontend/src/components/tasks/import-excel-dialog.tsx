"use client";

import React, { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  X,
  FileCheck,
  FolderPlus,
  ListTodo,
  Download,
  Users,
  Search,
  ArrowLeft,
  ChevronRight,
  Info,
  UserCheck,
  UserPlus,
  UserX,
  Key,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/tailgrids/core/dialog";
import { toast } from "sonner";

interface ImportExcelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export type TaskImportValidationStatus = "Valid" | "Warning" | "Error" | 0 | 1 | 2;

export interface TaskImportRow {
  rowIndex: number;
  taskCode?: string | null;
  parentTaskCode?: string | null;
  title: string;
  description?: string | null;
  projectName?: string | null;
  matchedProjectId?: number | null;
  picIdentifier?: string | null;
  matchedUserId?: string | null;
  matchedUserName?: string | null;
  priority: number;
  status: number;
  progress: number;
  startDate?: string | null;
  dueDate?: string | null;
  milestone?: string | null;
  obstacle?: string | null;
  solution?: string | null;
  validationStatus: TaskImportValidationStatus;
  validationMessages: string[];
  isUpdate?: boolean;
  existingTaskId?: number | null;
  picEmail?: string | null;
}

export interface TaskImportPreview {
  fileName: string;
  totalRows: number;
  validCount: number;
  warningCount: number;
  errorCount: number;
  rows: TaskImportRow[];
}

export interface ImportResult {
  totalProcessed: number;
  totalImported: number;
  totalProjectsCreated: number;
  totalUsersCreated?: number;
  totalUpdated?: number;
  messages: string[];
}


export function ImportExcelDialog({ open, onOpenChange, onSuccess }: ImportExcelDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wizard Step: 'upload' | 'preview' | 'result'
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [defaultProjectId, setDefaultProjectId] = useState<string>("");
  const [bulkAssignUserId, setBulkAssignUserId] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  // Account creation customization state
  const [autoCreateMissingUsers, setAutoCreateMissingUsers] = useState<boolean>(true);
  const [emailDomain, setEmailDomain] = useState<string>("");
  const [defaultJobTitle, setDefaultJobTitle] = useState<string>("Staff Pelaksana");
  const [defaultPassword, setDefaultPassword] = useState<string>("TrackerKerja2026!");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [autoApproveNewUsers, setAutoApproveNewUsers] = useState<boolean>(true);
  const [showPersonnelList, setShowPersonnelList] = useState<boolean>(false);
  const [copiedInfo, setCopiedInfo] = useState<boolean>(false);

  // Preview & Selection State
  const [previewData, setPreviewData] = useState<TaskImportPreview | null>(null);
  const [selectedRowIndexes, setSelectedRowIndexes] = useState<Set<number>>(new Set());
  const [filterTab, setFilterTab] = useState<"all" | "valid" | "warning" | "error">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Result state
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Projects Query
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projectsSelect"],
    queryFn: async () => {
      const res = await apiClient.get("/projects");
      return res.data.data;
    },
    enabled: open,
  });

  // Members Query for Bulk PIC Assignment
  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["membersSelect"],
    queryFn: async () => {
      const res = await apiClient.get("/members");
      return res.data.data;
    },
    enabled: open,
  });

  // Download Template Handler
  const handleDownloadTemplate = async (format: "standard" | "arms") => {
    try {
      setIsDownloading(format);
      const res = await apiClient.get(`/tasks/import/template?format=${format}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Template_Import_Tugas_${format.toUpperCase()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Template ${format.toUpperCase()} berhasil diunduh.`);
    } catch {
      toast.error("Gagal mengunduh template Excel.");
    } finally {
      setIsDownloading(null);
    }
  };

  // Preview Mutation
  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("Silakan pilih file Excel terlebih dahulu.");

      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await apiClient.post("/tasks/import/preview", formData);
      return res.data;
    },
    onSuccess: (data) => {
      const preview: TaskImportPreview = data.data;
      setPreviewData(preview);

      // Pre-select non-error rows
      const validIndexes = new Set<number>();
      preview.rows.forEach((row) => {
        const isError = row.validationStatus === "Error" || row.validationStatus === 2;
        if (!isError) {
          validIndexes.add(row.rowIndex);
        }
      });
      setSelectedRowIndexes(validIndexes);
      setStep("preview");
      toast.success(`Pratinjau siap: ${preview.totalRows} baris terdeteksi.`);
    },
    onError: (err: any) => {
      const errorMsg = err.response?.data?.message || err.message || "Gagal memproses file Excel.";
      toast.error(errorMsg);
    },
  });

  // Commit Mutation
  const commitMutation = useMutation({
    mutationFn: async () => {
      if (!previewData) throw new Error("Data pratinjau tidak ditemukan.");
      if (selectedRowIndexes.size === 0) throw new Error("Pilih setidaknya satu baris tugas yang valid untuk diimpor.");

      const payload = {
        defaultProjectId: defaultProjectId ? parseInt(defaultProjectId, 10) : null,
        bulkAssignUserId: bulkAssignUserId || null,
        selectedRowIndexes: Array.from(selectedRowIndexes),
        rows: previewData.rows,
        autoCreateMissingUsers,
        defaultJobTitle: defaultJobTitle.trim() || "Staff Pelaksana",
        defaultPassword: defaultPassword.trim() || "TrackerKerja2026!",
        emailDomain: emailDomain.trim().replace(/^@/, ""),
        autoApproveNewUsers,
      };

      const res = await apiClient.post("/tasks/import/commit", payload);
      return res.data;
    },
    onSuccess: (data) => {
      const result: ImportResult = data.data;
      setImportResult(result);
      setStep("result");
      const updatedText = (result.totalUpdated ?? 0) > 0 ? ` (${result.totalUpdated} diperbarui)` : "";
      const userText = (result.totalUsersCreated ?? 0) > 0 ? ` & ${result.totalUsersCreated} akun personil baru dibuat!` : "!";
      toast.success(`Berhasil mengimpor ${result.totalImported} tugas${updatedText}${userText}`);


      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["tasksList"] });
      queryClient.invalidateQueries({ queryKey: ["kanbanTasks"] });
      queryClient.invalidateQueries({ queryKey: ["projectsSelect"] });
      queryClient.invalidateQueries({ queryKey: ["projectsList"] });
      queryClient.invalidateQueries({ queryKey: ["membersSelect"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardOverview"] });

      onSuccess?.();
    },
    onError: (err: any) => {
      const errorMsg = err.response?.data?.message || err.message || "Gagal menyimpan data impor.";
      toast.error(errorMsg);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.type.includes("spreadsheet")) {
        setSelectedFile(file);
      } else {
        toast.error("Hanya file Excel (.xlsx atau .xls) yang diperbolehkan.");
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        setSelectedFile(file);
      } else {
        toast.error("Hanya file Excel (.xlsx atau .xls) yang diperbolehkan.");
      }
    }
  };

  const toggleSelectRow = (index: number) => {
    const next = new Set(selectedRowIndexes);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedRowIndexes(next);
  };

  const toggleSelectAll = (selectableRows: TaskImportRow[]) => {
    const selectableIndexes = selectableRows
      .filter((r) => r.validationStatus !== "Error" && r.validationStatus !== 2)
      .map((r) => r.rowIndex);

    const allSelected = selectableIndexes.every((idx) => selectedRowIndexes.has(idx));
    const next = new Set(selectedRowIndexes);

    if (allSelected) {
      selectableIndexes.forEach((idx) => next.delete(idx));
    } else {
      selectableIndexes.forEach((idx) => next.add(idx));
    }
    setSelectedRowIndexes(next);
  };

  const resetState = () => {
    setStep("upload");
    setSelectedFile(null);
    setDefaultProjectId("");
    setBulkAssignUserId("");
    setPreviewData(null);
    setSelectedRowIndexes(new Set());
    setFilterTab("all");
    setSearchQuery("");
    setImportResult(null);
    setAutoCreateMissingUsers(true);
    setEmailDomain("");
    setDefaultJobTitle("Staff Pelaksana");
    setDefaultPassword("TrackerKerja2026!");
    setShowPassword(false);
    setAutoApproveNewUsers(true);
    setShowPersonnelList(false);
    setCopiedInfo(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  // Detect unique unregistered personnel in the preview
  const detectedNewPersonnel = useMemo(() => {
    if (!previewData) return [];
    const set = new Set<string>();
    previewData.rows.forEach((r) => {
      if (r.picIdentifier && !r.matchedUserId && !bulkAssignUserId) {
        const clean = r.picIdentifier.trim();
        if (clean) set.add(clean);
      }
    });
    return Array.from(set);
  }, [previewData, bulkAssignUserId]);

  // Filtered rows for Preview Table
  const filteredRows = useMemo(() => {
    if (!previewData) return [];
    return previewData.rows.filter((row) => {
      const isError = row.validationStatus === "Error" || row.validationStatus === 2;
      const isWarning = row.validationStatus === "Warning" || row.validationStatus === 1;
      const isValid = row.validationStatus === "Valid" || row.validationStatus === 0;

      if (filterTab === "valid" && !isValid) return false;
      if (filterTab === "warning" && !isWarning) return false;
      if (filterTab === "error" && !isError) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = row.title.toLowerCase().includes(query);
        const matchProject = row.projectName?.toLowerCase().includes(query);
        const matchPic = row.picIdentifier?.toLowerCase().includes(query) || row.matchedUserName?.toLowerCase().includes(query);
        const matchCode = row.taskCode?.toLowerCase().includes(query);
        return matchTitle || matchProject || matchPic || matchCode;
      }
      return true;
    });
  }, [previewData, filterTab, searchQuery]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={`bg-white p-6 shadow-2xl dark:bg-gray-900 rounded-2xl transition-all duration-300 ${
          step === "preview" ? "max-w-4xl" : "max-w-lg"
        }`}
      >
        <DialogHeader>
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div className="text-left">
                <span>Impor Tugas dari Excel</span>
                <p className="text-[11px] font-normal text-gray-500 dark:text-gray-400">
                  FSD 5.10 • Template Standar & ARMS dengan Pratinjau Interaktif
                </p>
              </div>
            </DialogTitle>

            {/* Stepper Indicator */}
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                  step === "upload"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                }`}
              >
                1
              </span>
              <ChevronRight className="h-3 w-3 text-gray-400" />
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                  step === "preview"
                    ? "bg-emerald-600 text-white"
                    : step === "result"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                    : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                }`}
              >
                2
              </span>
              <ChevronRight className="h-3 w-3 text-gray-400" />
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                  step === "result"
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                }`}
              >
                3
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* ================= STEP 1: UPLOAD & CONFIGURATION ================= */}
        {step === "upload" && (
          <div className="space-y-4 pt-3">
            {/* Template Download Section */}
            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-800/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                  <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Unduh Template Excel Resmi:
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate("standard")}
                  disabled={isDownloading !== null}
                  className="flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 transition"
                >
                  {isDownloading === "standard" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                  )}
                  Template Standar (9 Kolom)
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate("arms")}
                  disabled={isDownloading !== null}
                  className="flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50/80 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 transition"
                >
                  {isDownloading === "arms" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                  )}
                  Template ARMS (21 Kolom)
                </button>
              </div>
            </div>

            {/* File Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition ${
                isDragging
                  ? "border-emerald-500 bg-emerald-50/50 dark:border-emerald-400 dark:bg-emerald-950/30"
                  : selectedFile
                  ? "border-emerald-400 bg-emerald-50/20 dark:border-emerald-800 dark:bg-emerald-950/10"
                  : "border-gray-200 hover:border-emerald-400 dark:border-gray-800 dark:hover:border-emerald-600"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={handleFileChange}
              />

              {selectedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-400">
                    <FileSpreadsheet className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 dark:text-white max-w-xs truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="mt-1 flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-rose-100 hover:text-rose-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-rose-950 dark:hover:text-rose-400 transition"
                  >
                    <X className="h-3.5 w-3.5" />
                    Ganti File
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      Klik untuk memilih file atau seret file Excel ke sini
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Mendukung format .xlsx / .xls standar & multi-sheet ARMS
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Optional Fallback Project */}
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Proyek Cadangan (Opsional)
              </label>
              <p className="text-[11px] text-gray-400 mb-1">
                Jika kolom nama proyek di Excel kosong, tugas akan dimasukkan ke proyek ini.
              </p>
              <select
                value={defaultProjectId}
                onChange={(e) => setDefaultProjectId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-transparent p-2 text-xs text-gray-900 outline-hidden focus:border-emerald-600 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              >
                <option value="">-- Buat proyek otomatis sesuai nama di Excel --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Customization: Automatic Account Creation Based on Name/PIC */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5 dark:border-indigo-900/40 dark:bg-indigo-950/20 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                      Pembuatan Akun Berdasarkan Nama / PIC
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Otomatis daftarkan akun baru jika nama personil belum ada di master user.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex cursor-pointer items-center shrink-0">
                  <input
                    type="checkbox"
                    checked={autoCreateMissingUsers}
                    onChange={(e) => setAutoCreateMissingUsers(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-5 w-9 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full dark:bg-gray-700"></div>
                </label>
              </div>

              {autoCreateMissingUsers && (
                <div className="space-y-2.5 pt-1 border-t border-indigo-100/70 dark:border-indigo-900/40">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                        Domain Email Akun
                      </label>
                      <input
                        type="text"
                        placeholder="contoh: perusahaan.co.id"
                        value={emailDomain}
                        onChange={(e) => setEmailDomain(e.target.value)}
                        className="w-full mt-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 outline-hidden focus:border-indigo-600 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      />
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Format: nama.lengkap@domain
                      </p>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                        Jabatan / Posisi Default
                      </label>
                      <input
                        type="text"
                        placeholder="Staff Pelaksana"
                        value={defaultJobTitle}
                        onChange={(e) => setDefaultJobTitle(e.target.value)}
                        className="w-full mt-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 outline-hidden focus:border-indigo-600 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      />
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Jabatan standar akun personil baru
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 items-end">
                    <div>
                      <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                        <span>Password Awal</span>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-[10px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
                        >
                          {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          {showPassword ? "Sembunyikan" : "Lihat"}
                        </button>
                      </label>
                      <div className="relative mt-1">
                        <Key className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={defaultPassword}
                          onChange={(e) => setDefaultPassword(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 bg-white pl-8 pr-2.5 py-1.5 text-xs text-gray-900 outline-hidden focus:border-indigo-600 dark:border-gray-700 dark:bg-gray-900 dark:text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pb-2">
                      <input
                        type="checkbox"
                        id="autoApproveToggle"
                        checked={autoApproveNewUsers}
                        onChange={(e) => setAutoApproveNewUsers(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                      />
                      <label
                        htmlFor="autoApproveToggle"
                        className="text-[11px] font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none"
                      >
                        Langsung Aktifkan Akun (Active)
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} className="text-xs font-medium">
                Batal
              </Button>
              <Button
                type="button"
                onClick={() => previewMutation.mutate()}
                disabled={!selectedFile || previewMutation.isPending}
                className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold gap-1.5 shadow-md shadow-emerald-600/20"
              >
                {previewMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Membaca File Excel...
                  </>
                ) : (
                  <>
                    <span>Lanjut ke Pratinjau</span>
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: PREVIEW & VALIDATION TABLE ================= */}
        {step === "preview" && previewData && (
          <div className="space-y-3 pt-2">
            {/* Top Stat Summary Cards */}
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-2.5 text-center dark:border-gray-800 dark:bg-gray-800/40">
                <span className="text-[11px] text-gray-500 font-medium">Total Baris</span>
                <p className="text-base font-extrabold text-gray-900 dark:text-white">{previewData.totalRows}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5 text-center dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">Valid</span>
                <p className="text-base font-extrabold text-emerald-700 dark:text-emerald-400">{previewData.validCount}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-2.5 text-center dark:border-amber-900/40 dark:bg-amber-950/20">
                <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">Peringatan</span>
                <p className="text-base font-extrabold text-amber-700 dark:text-amber-400">{previewData.warningCount}</p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-2.5 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
                <span className="text-[11px] text-rose-700 dark:text-rose-400 font-medium">Error (Ditolak)</span>
                <p className="text-base font-extrabold text-rose-700 dark:text-rose-400">{previewData.errorCount}</p>
              </div>
            </div>

            {/* Detected Personnel Banner */}
            {detectedNewPersonnel.length > 0 && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 dark:border-indigo-900/60 dark:bg-indigo-950/30">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shrink-0">
                      <UserPlus className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">
                        {detectedNewPersonnel.length} Nama Personil Baru Terdeteksi di Excel
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {autoCreateMissingUsers
                          ? `Akan dibuatkan akun login otomatis (${emailDomain ? `@${emailDomain.replace(/^@/, "")}` : "domain default"}) dengan jabatan "${defaultJobTitle}".`
                          : "Pembuatan akun otomatis dinonaktifkan. Tugas akan diimpor tanpa akun personil terkait."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setAutoCreateMissingUsers(!autoCreateMissingUsers)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition ${
                        autoCreateMissingUsers
                          ? "bg-indigo-600 text-white hover:bg-indigo-700"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {autoCreateMissingUsers ? "Buat Akun: Aktif" : "Buat Akun: Nonaktif"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPersonnelList(!showPersonnelList)}
                      className="text-xs text-indigo-600 dark:text-indigo-400 font-medium underline hover:opacity-80"
                    >
                      {showPersonnelList ? "Tutup Daftar" : "Lihat Personil"}
                    </button>
                  </div>
                </div>

                {showPersonnelList && (
                  <div className="mt-2.5 pt-2 border-t border-indigo-200/60 dark:border-indigo-900/40">
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {detectedNewPersonnel.map((name, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-gray-800 shadow-2xs dark:bg-gray-900 dark:text-gray-200 border border-indigo-100 dark:border-indigo-900/50"
                        >
                          <UserPlus className="h-3 w-3 text-indigo-600 shrink-0" />
                          <span>{name}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Filter Tabs & Bulk Assign Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 p-2 dark:bg-gray-800/50">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1">
                {(
                  [
                    { id: "all", label: "Semua", count: previewData.totalRows },
                    { id: "valid", label: "Valid", count: previewData.validCount },
                    { id: "warning", label: "Peringatan", count: previewData.warningCount },
                    { id: "error", label: "Error", count: previewData.errorCount },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterTab(tab.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      filterTab === tab.id
                        ? "bg-white text-gray-900 shadow-xs dark:bg-gray-900 dark:text-white"
                        : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              {/* Bulk PIC Assigner */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 font-medium">
                  <Users className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Bulk PIC:</span>
                </div>
                <select
                  value={bulkAssignUserId}
                  onChange={(e) => setBulkAssignUserId(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 outline-hidden focus:border-indigo-600 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">-- Tetapkan sesuai file Excel --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari judul tugas, proyek, PIC, atau kode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white py-1.5 pl-9 pr-3 text-xs text-gray-900 outline-hidden focus:border-emerald-600 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              />
            </div>

            {/* Preview Table */}
            <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-gray-50 text-[11px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300 z-10">
                  <tr>
                    <th className="py-2 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredRows.filter((r) => r.validationStatus !== "Error" && r.validationStatus !== 2)
                            .length > 0 &&
                          filteredRows
                            .filter((r) => r.validationStatus !== "Error" && r.validationStatus !== 2)
                            .every((r) => selectedRowIndexes.has(r.rowIndex))
                        }
                        onChange={() => toggleSelectAll(filteredRows)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                    </th>
                    <th className="py-2 px-2 w-12 text-center">#</th>
                    <th className="py-2 px-3">Judul Tugas</th>
                    <th className="py-2 px-3">Proyek</th>
                    <th className="py-2 px-3">PIC</th>
                    <th className="py-2 px-2 text-center">Status</th>
                    <th className="py-2 px-3">Validasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-xs text-gray-400">
                        Tidak ada baris tugas yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => {
                      const isError = row.validationStatus === "Error" || row.validationStatus === 2;
                      const isWarning = row.validationStatus === "Warning" || row.validationStatus === 1;
                      const isSelected = selectedRowIndexes.has(row.rowIndex);

                      return (
                        <tr
                          key={row.rowIndex}
                          className={`transition hover:bg-gray-50/80 dark:hover:bg-gray-800/40 ${
                            isError ? "bg-rose-50/30 dark:bg-rose-950/10" : ""
                          }`}
                        >
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              disabled={isError}
                              checked={isSelected}
                              onChange={() => toggleSelectRow(row.rowIndex)}
                              className="rounded text-emerald-600 focus:ring-emerald-500 disabled:opacity-30"
                            />
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-[11px] text-gray-400">
                            {row.rowIndex}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1.5 max-w-xs">
                              <span className="font-semibold text-gray-900 dark:text-white truncate">
                                {row.title || <span className="text-rose-500 italic">(Kosong)</span>}
                              </span>
                              {row.isUpdate && (
                                <span
                                  className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1 py-0.2 text-[9px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300 shrink-0"
                                  title="Tugas ini sudah terdaftar dan nilainya akan diperbarui dengan data ter-update"
                                >
                                  <RefreshCw className="h-2.5 w-2.5" />
                                  Update
                                </span>
                              )}
                            </div>
                            {row.taskCode && (
                              <div className="text-[10px] text-gray-400 font-mono">
                                Code: {row.taskCode}
                                {row.parentTaskCode ? ` • Parent: ${row.parentTaskCode}` : ""}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {row.matchedProjectId ? (
                              <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                                {row.projectName}
                              </span>
                            ) : row.projectName ? (
                              <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                                {row.projectName} (Baru)
                              </span>
                            ) : (
                              <span className="text-gray-400 italic text-[11px]">Default</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {row.matchedUserId ? (
                              <div className="flex flex-col">
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded w-fit">
                                  <UserCheck className="h-3 w-3 shrink-0" />
                                  <span>{row.matchedUserName || row.picIdentifier}</span>
                                </span>
                                {row.picEmail && (
                                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono mt-0.5 truncate max-w-[150px]">
                                    {row.picEmail}
                                  </span>
                                )}
                              </div>
                            ) : bulkAssignUserId ? (
                              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 italic">
                                Sesuai Bulk PIC
                              </span>
                            ) : row.picIdentifier ? (
                              autoCreateMissingUsers ? (
                                <div className="flex flex-col">
                                  <span
                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded w-fit"
                                    title="Akun baru akan dibuat otomatis berdasarkan nama & email ini"
                                  >
                                    <UserPlus className="h-3 w-3 shrink-0 text-blue-600" />
                                    <span>{row.picIdentifier}</span>
                                    <span className="text-[9px] opacity-75 font-normal">(Akun Baru)</span>
                                  </span>
                                  {row.picEmail && (
                                    <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80 font-mono mt-0.5 truncate max-w-[150px]">
                                      {row.picEmail}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded"
                                  title="Personil belum terdaftar & pembuatan akun nonaktif"
                                >
                                  <UserX className="h-3 w-3 shrink-0" />
                                  <span>{row.picIdentifier}</span>
                                  <span className="text-[9px] opacity-75">(Tanpa Akun)</span>
                                </span>
                              )
                            ) : (
                              <span className="text-gray-400 italic text-[11px]">-</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                              {row.status === 2 ? "Done" : row.status === 1 ? "InProg" : "Todo"}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            {isError ? (
                              <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                <span>{row.validationMessages[0] || "Error"}</span>
                              </div>
                            ) : isWarning ? (
                              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-[11px]">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate max-w-[150px]" title={row.validationMessages.join(", ")}>
                                  {row.validationMessages[0]}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                <span>Valid</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("upload")}
                className="text-xs font-medium gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Ganti File
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">
                  {selectedRowIndexes.size} baris dipilih
                </span>
                <Button
                  type="button"
                  onClick={() => commitMutation.mutate()}
                  disabled={selectedRowIndexes.size === 0 || commitMutation.isPending}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold gap-1.5 shadow-md shadow-emerald-600/20"
                >
                  {commitMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Menyimpan Data...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4 w-4" />
                      Simpan & Impor ({selectedRowIndexes.size} Tugas)
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 3: RESULT SUMMARY ================= */}
        {step === "result" && importResult && (
          <div className="space-y-4 pt-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/40">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>Impor Excel Selesai Berhasil!</span>
              </div>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                <div className="rounded-lg bg-white/80 p-2.5 shadow-xs dark:bg-gray-900">
                  <div className="flex items-center justify-center text-gray-500 mb-1">
                    <FileCheck className="h-4 w-4" />
                  </div>
                  <span className="font-extrabold text-base text-gray-900 dark:text-white">
                    {importResult.totalProcessed}
                  </span>
                  <p className="text-[10px] text-gray-500">Baris Diproses</p>
                </div>
                <div className="rounded-lg bg-white/80 p-2.5 shadow-xs dark:bg-gray-900">
                  <div className="flex items-center justify-center text-indigo-600 mb-1">
                    <ListTodo className="h-4 w-4" />
                  </div>
                  <span className="font-extrabold text-base text-indigo-600 dark:text-indigo-400">
                    {importResult.totalImported}
                  </span>
                  <p className="text-[10px] text-gray-500">Tugas Total</p>
                </div>
                <div className="rounded-lg bg-white/80 p-2.5 shadow-xs dark:bg-gray-900">
                  <div className="flex items-center justify-center text-amber-600 mb-1">
                    <RefreshCw className="h-4 w-4" />
                  </div>
                  <span className="font-extrabold text-base text-amber-600 dark:text-amber-400">
                    {importResult.totalUpdated ?? 0}
                  </span>
                  <p className="text-[10px] text-gray-500">Diperbarui</p>
                </div>
                <div className="rounded-lg bg-white/80 p-2.5 shadow-xs dark:bg-gray-900">
                  <div className="flex items-center justify-center text-emerald-600 mb-1">
                    <FolderPlus className="h-4 w-4" />
                  </div>
                  <span className="font-extrabold text-base text-emerald-600 dark:text-emerald-400">
                    {importResult.totalProjectsCreated}
                  </span>
                  <p className="text-[10px] text-gray-500">Proyek Baru</p>
                </div>
                <div className="rounded-lg bg-white/80 p-2.5 shadow-xs dark:bg-gray-900">
                  <div className="flex items-center justify-center text-blue-600 mb-1">
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <span className="font-extrabold text-base text-blue-600 dark:text-blue-400">
                    {importResult.totalUsersCreated ?? 0}
                  </span>
                  <p className="text-[10px] text-gray-500">Akun Personil</p>
                </div>
              </div>
            </div>

            {/* Generated Accounts Credential Card */}
            {(importResult.totalUsersCreated ?? 0) > 0 && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3.5 dark:border-indigo-900/60 dark:bg-indigo-950/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      Info Kredensial Akun Personil Baru:
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const text = `TrackerKerja Akun Baru:\nPassword Awal: ${defaultPassword}\nJabatan Default: ${defaultJobTitle}\nHarap segera mengganti password setelah login pertama kali.`;
                      navigator.clipboard.writeText(text);
                      setCopiedInfo(true);
                      toast.success("Info akun disalin!");
                      setTimeout(() => setCopiedInfo(false), 2000);
                    }}
                    className="flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-indigo-600 shadow-2xs hover:bg-indigo-50 dark:bg-gray-900 dark:text-indigo-400 dark:hover:bg-gray-800 transition"
                  >
                    {copiedInfo ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedInfo ? "Tersalin" : "Salin Info"}</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs bg-white/80 p-2.5 rounded-lg border border-indigo-100 dark:bg-gray-900 dark:border-indigo-900/40">
                  <div>
                    <span className="text-[10px] text-gray-400">Password Awal:</span>
                    <p className="font-mono font-bold text-gray-800 dark:text-gray-200">{defaultPassword}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400">Jabatan:</span>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{defaultJobTitle}</p>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2">
                  Akun personil telah aktif dan dapat langsung digunakan untuk masuk ke TrackerKerja.
                </p>
              </div>
            )}

            {importResult.messages && importResult.messages.length > 0 && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
                <div className="flex items-center gap-1.5 font-semibold mb-1">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Catatan Impor:</span>
                </div>
                <div className="max-h-24 overflow-y-auto space-y-1 text-[11px] pr-1">
                  {importResult.messages.map((msg, idx) => (
                    <div key={idx}>• {msg}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={resetState} className="text-xs font-medium">
                Impor File Lain
              </Button>
              <Button
                onClick={handleClose}
                className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold"
              >
                Tutup & Lihat Data
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

