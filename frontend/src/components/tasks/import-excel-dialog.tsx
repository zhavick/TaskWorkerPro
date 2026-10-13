"use client";

import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  FileCheck,
  FolderPlus,
  ListTodo,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/tailgrids/core/dialog";
import { toast } from "sonner";

interface ImportExcelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ImportResult {
  totalProcessed?: number;
  totalImported?: number;
  totalProjectsCreated?: number;
  totalRowsProcessed?: number;
  tasksImportedCount?: number;
  projectsCreatedCount?: number;
  messages?: string[];
  errors?: string[];
}

export function ImportExcelDialog({ open, onOpenChange, onSuccess }: ImportExcelDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [defaultProjectId, setDefaultProjectId] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Projects Query for optional default selection
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projectsSelect"],
    queryFn: async () => {
      const res = await apiClient.get("/projects");
      return res.data.data;
    },
    enabled: open,
  });

  // Import Mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("Silakan pilih file Excel terlebih dahulu.");

      const formData = new FormData();
      formData.append("file", selectedFile);
      if (defaultProjectId) {
        formData.append("defaultProjectId", defaultProjectId);
      }

      const res = await apiClient.post("/tasks/import-excel", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return res.data;
    },
    onSuccess: (data) => {
      const result: ImportResult = data.data;
      setImportResult(result);
      const count = result.totalImported ?? result.tasksImportedCount ?? 0;
      toast.success(`Berhasil mengimpor ${count} tugas!`);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["tasksList"] });
      queryClient.invalidateQueries({ queryKey: ["kanbanTasks"] });
      queryClient.invalidateQueries({ queryKey: ["projectsSelect"] });
      queryClient.invalidateQueries({ queryKey: ["projectsList"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardOverview"] });

      onSuccess?.();
    },
    onError: (err: any) => {
      const errorMsg =
        err.response?.data?.message || err.message || "Gagal mengimpor file Excel";
      toast.error(errorMsg);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (
        file.name.endsWith(".xlsx") ||
        file.name.endsWith(".xls") ||
        file.type.includes("spreadsheet")
      ) {
        setSelectedFile(file);
        setImportResult(null);
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
        setImportResult(null);
      } else {
        toast.error("Hanya file Excel (.xlsx atau .xls) yang diperbolehkan.");
      }
    }
  };

  const resetState = () => {
    setSelectedFile(null);
    setDefaultProjectId("");
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg bg-white p-6 shadow-2xl dark:bg-gray-900 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <span>Impor Tugas dari Excel</span>
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Mendukung format file <strong>Task Tracker v2.xlsx</strong>, Multi-Sheet ARMS (25 kolom per PIC),
          serta tabel Master Data standar (8 kolom). Proyek dan status akan dipetakan secara otomatis.
        </p>

        {/* If successfully imported, show summary card */}
        {importResult ? (
          <div className="space-y-4 pt-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/40">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>Impor Excel Selesai</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-white/80 p-2.5 shadow-xs dark:bg-gray-900">
                  <div className="flex items-center justify-center text-gray-500 mb-1">
                    <FileCheck className="h-4 w-4" />
                  </div>
                  <span className="font-extrabold text-base text-gray-900 dark:text-white">
                    {importResult.totalProcessed ?? importResult.totalRowsProcessed ?? 0}
                  </span>
                  <p className="text-[10px] text-gray-500">Baris Diproses</p>
                </div>
                <div className="rounded-lg bg-white/80 p-2.5 shadow-xs dark:bg-gray-900">
                  <div className="flex items-center justify-center text-indigo-600 mb-1">
                    <ListTodo className="h-4 w-4" />
                  </div>
                  <span className="font-extrabold text-base text-indigo-600 dark:text-indigo-400">
                    {importResult.totalImported ?? importResult.tasksImportedCount ?? 0}
                  </span>
                  <p className="text-[10px] text-gray-500">Tugas Disimpan</p>
                </div>
                <div className="rounded-lg bg-white/80 p-2.5 shadow-xs dark:bg-gray-900">
                  <div className="flex items-center justify-center text-emerald-600 mb-1">
                    <FolderPlus className="h-4 w-4" />
                  </div>
                  <span className="font-extrabold text-base text-emerald-600 dark:text-emerald-400">
                    {importResult.totalProjectsCreated ?? importResult.projectsCreatedCount ?? 0}
                  </span>
                  <p className="text-[10px] text-gray-500">Proyek Baru</p>
                </div>
              </div>
            </div>

            {((importResult.messages && importResult.messages.length > 0) ||
              (importResult.errors && importResult.errors.length > 0)) && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
                <div className="flex items-center gap-1.5 font-semibold mb-1">
                  <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>
                    Catatan Impor (
                    {(importResult.messages || importResult.errors || []).length}
                    ):
                  </span>
                </div>
                <div className="max-h-24 overflow-y-auto space-y-1 text-[11px] pr-1">
                  {(importResult.messages || importResult.errors || []).map((msg, idx) => (
                    <div key={idx}>• {msg}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={resetState}
                className="text-xs font-medium"
              >
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
        ) : (
          <div className="space-y-4 pt-2">
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
                      resetState();
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
                      Format didukung: .xlsx atau .xls (Maks. 50MB)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Optional Project Assignment */}
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Pilih Proyek Cadangan (Opsional)
              </label>
              <p className="text-[11px] text-gray-400 mb-1.5">
                Jika baris di Excel tidak memiliki nama proyek, tugas akan otomatis dimasukkan ke proyek ini.
              </p>
              <select
                value={defaultProjectId}
                onChange={(e) => setDefaultProjectId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-transparent p-2.5 text-xs text-gray-900 outline-hidden focus:border-indigo-600 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              >
                <option value="">-- Otomatis buat proyek dari nama kolom Excel --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={importMutation.isPending}
                className="text-xs font-medium"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={() => importMutation.mutate()}
                disabled={!selectedFile || importMutation.isPending}
                className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold gap-1.5 shadow-md shadow-emerald-600/20"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Mengimpor Data...
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" />
                    Mulai Impor
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
