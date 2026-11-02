"use client";

import React, { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  FolderTree,
  Upload,
  Search,
  Filter,
  Download,
  Trash2,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Building2,
  Briefcase,
  User,
  Clock,
  Layers,
  CheckCircle2,
  FolderArchive,
  HardDrive,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/tailgrids/core/dialog";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";

const CATEGORIES = [
  "Semua",
  "SOP",
  "Kontrak",
  "Laporan",
  "Desain",
  "Legal",
  "Umum",
];

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function getFileIcon(fileName: string, contentType: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "pdf" || contentType.includes("pdf")) {
    return <FileText className="h-6 w-6 text-rose-500" />;
  }
  if (["xls", "xlsx", "csv"].includes(ext || "") || contentType.includes("sheet") || contentType.includes("excel")) {
    return <FileSpreadsheet className="h-6 w-6 text-emerald-500" />;
  }
  if (["png", "jpg", "jpeg", "svg", "webp"].includes(ext || "") || contentType.includes("image")) {
    return <FileImage className="h-6 w-6 text-purple-500" />;
  }
  return <File className="h-6 w-6 text-indigo-500" />;
}

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const { user, isAdmin, isProjectManager, enableDms } = useCurrentUser();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  // Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docDescription, setDocDescription] = useState("");
  const [docCategory, setDocCategory] = useState("SOP");
  const [docCompanyId, setDocCompanyId] = useState<string>("");
  const [docProjectId, setDocProjectId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Documents
  const { data: documents = [], isLoading } = useQuery<any[]>({
    queryKey: ["documentsList", search, selectedCategory, companyFilter, projectFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (selectedCategory !== "Semua") params.append("category", selectedCategory);
      if (companyFilter !== "all") params.append("companyId", companyFilter);
      if (projectFilter !== "all") params.append("projectId", projectFilter);

      const res = await apiClient.get(`/documents?${params.toString()}`);
      return res.data.data;
    },
  });

  // 2. Fetch Companies
  const { data: companies = [] } = useQuery<any[]>({
    queryKey: ["companiesList"],
    queryFn: async () => {
      const res = await apiClient.get("/companies");
      return res.data.data;
    },
  });

  // 3. Fetch Projects
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projectsList"],
    queryFn: async () => {
      const res = await apiClient.get("/projects");
      return res.data.data;
    },
  });

  // Filtered Projects for Upload Modal
  const availableProjectsForUpload = useMemo(() => {
    if (!docCompanyId) return [];
    return projects.filter((p) => String(p.companyId) === String(docCompanyId));
  }, [projects, docCompanyId]);

  const handleOpenUploadModal = () => {
    setDocTitle("");
    setDocDescription("");
    setDocCategory("SOP");
    setSelectedFile(null);
    const defaultComp = user?.companyId ? String(user.companyId) : companies.length > 0 ? String(companies[0].id) : "";
    setDocCompanyId(defaultComp);
    setDocProjectId("");
    setUploadModalOpen(true);
  };

  // 4. Upload Document Mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("Pilih berkas file terlebih dahulu.");
      if (!docCompanyId) throw new Error("Perusahaan wajib dipilih.");

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("title", docTitle.trim() || selectedFile.name);
      formData.append("description", docDescription.trim());
      formData.append("category", docCategory);
      formData.append("companyId", docCompanyId);
      if (docProjectId) {
        formData.append("projectId", docProjectId);
      }

      const res = await apiClient.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Berkas berhasil diunggah ke repositori!");
      setUploadModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["documentsList"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || err.message || "Gagal mengunggah berkas"),
  });

  // 5. Delete Document Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete(`/documents/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Dokumen berhasil dihapus.");
      queryClient.invalidateQueries({ queryKey: ["documentsList"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal menghapus dokumen"),
  });

  // 6. Download Handler
  const handleDownload = async (doc: any) => {
    try {
      const response = await apiClient.get(`/documents/${doc.id}/download`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: doc.contentType || "application/octet-stream" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", doc.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error("Gagal mengunduh dokumen.");
    }
  };

  // Total Storage Metrics
  const totalStorageBytes = useMemo(() => {
    return documents.reduce((sum, d) => sum + (Number(d.fileSize) || 0), 0);
  }, [documents]);

  if (!isAdmin && !enableDms) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 mb-4 shadow-sm">
          <FolderArchive className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Modul Dokumen (DMS) Dinonaktifkan
        </h2>
        <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
          Modul Document Management System dinonaktifkan untuk perusahaan <strong>{user?.companyName || "Anda"}</strong>. Silakan hubungi Administrator jika perusahaan Anda memerlukan akses ke modul ini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-2 py-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5">
            <FolderTree className="h-7 w-7 text-indigo-600" />
            Repositori Berkas & Dokumen Perusahaan (DMS)
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Pusat penyimpanan aman untuk SOP, kontrak legal, deliverable proyek, dan arsip korporat.
          </p>
        </div>

        <Button
          onClick={handleOpenUploadModal}
          className="gap-2 bg-indigo-600 font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700"
        >
          <Upload className="h-4 w-4" />
          Unggah Dokumen
        </Button>
      </div>

      {/* Storage & Quick Stat Bar */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900 flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <FolderArchive className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400">Total Berkas</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{documents.length} Dokumen</p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900 flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400">Kapasitas Penyimpanan</p>
            <p className="text-xl font-mono font-bold text-gray-900 dark:text-white">
              {formatBytes(totalStorageBytes)}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900 flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400">Perusahaan & Proyek</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{companies.length} Korporat</p>
          </div>
        </div>
      </div>

      {/* Filter and Category Pills */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Cari judul dokumen, nama berkas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Company Filter */}
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="all">Semua Perusahaan</option>
              {companies.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Project Filter */}
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="all">Semua Proyek</option>
              {projects.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-gray-100 pt-3 dark:border-gray-800">
          <span className="text-xs font-semibold text-gray-400 mr-2">Kategori:</span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                selectedCategory === cat
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex flex-col justify-between rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs transition hover:border-indigo-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                    {getFileIcon(doc.fileName, doc.contentType)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">
                      {doc.title}
                    </h3>
                    <p className="text-[11px] text-gray-400 font-mono line-clamp-1">{doc.fileName}</p>
                  </div>
                </div>

                <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 shrink-0">
                  {doc.category}
                </span>
              </div>

              {doc.description && (
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                  {doc.description}
                </p>
              )}

              <div className="mt-4 space-y-1 text-[11px] text-gray-400 border-t border-gray-100 pt-3 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <span>Ukuran:</span>
                  <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
                    {formatBytes(doc.fileSize)}
                  </span>
                </div>
                {doc.companyName && (
                  <div className="flex items-center justify-between">
                    <span>Perusahaan:</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{doc.companyName}</span>
                  </div>
                )}
                {doc.projectName && (
                  <div className="flex items-center justify-between">
                    <span>Proyek:</span>
                    <span className="font-medium text-indigo-600 dark:text-indigo-400">{doc.projectName}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span>Pengunggah:</span>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    {doc.uploadedByUserName || "User"}
                  </span>
                </div>
              </div>
            </div>

            {/* Card Actions */}
            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
              <span className="text-[10px] text-gray-400">
                {new Date(doc.createdAt).toLocaleDateString("id-ID")}
              </span>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(doc)}
                  className="gap-1.5 text-xs text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-semibold"
                >
                  <Download className="h-3.5 w-3.5" />
                  Unduh
                </Button>

                {(isAdmin || isProjectManager || doc.uploadedByUserId === user?.id) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm(`Yakin ingin menghapus dokumen "${doc.title}"?`)) {
                        deleteMutation.mutate(doc.id);
                      }
                    }}
                    className="text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}

        {documents.length === 0 && !isLoading && (
          <div className="col-span-full py-16 text-center text-sm text-gray-400 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            Tidak ada dokumen yang ditemukan pada kategori atau filter ini.
          </div>
        )}
      </div>

      {/* Modal Unggah Dokumen Baru */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 shadow-2xl dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Upload className="h-5 w-5 text-indigo-600" />
              Unggah Dokumen ke Repositori
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              uploadMutation.mutate();
            }}
            className="mt-4 space-y-3.5"
          >
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Pilih Berkas File *
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="mt-1 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 p-5 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/20 dark:border-gray-700 dark:hover:border-indigo-500"
              >
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                {selectedFile ? (
                  <div>
                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {selectedFile.name}
                    </p>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {formatBytes(selectedFile.size)}
                    </span>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Klik untuk memilih berkas
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      PDF, DOCX, XLSX, PNG, JPG (Maks. 25MB)
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setSelectedFile(f);
                      if (!docTitle) setDocTitle(f.name.replace(/\.[^/.]+$/, ""));
                    }
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Judul Dokumen *
              </label>
              <Input
                required
                placeholder="cth. SOP Manajemen Krisis Server 2026"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Perusahaan *
                </label>
                <select
                  required
                  value={docCompanyId}
                  onChange={(e) => {
                    setDocCompanyId(e.target.value);
                    setDocProjectId("");
                  }}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-transparent p-2 text-xs text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">-- Pilih Perusahaan --</option>
                  {companies.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Kategori
                </label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-transparent p-2 text-xs text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                >
                  <option value="SOP">SOP & Prosedur</option>
                  <option value="Kontrak">Kontrak Klien</option>
                  <option value="Laporan">Laporan Proyek</option>
                  <option value="Desain">Desain & Aset</option>
                  <option value="Legal">Legal Korporat</option>
                  <option value="Umum">Umum / Lainnya</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Proyek Terkait (Opsional)
              </label>
              <select
                value={docProjectId}
                disabled={!docCompanyId}
                onChange={(e) => setDocProjectId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-transparent p-2.5 text-xs text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white disabled:opacity-50"
              >
                <option value="">-- Tanpa Asosiasi Proyek --</option>
                {availableProjectsForUpload.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Deskripsi Singkat (Opsional)
              </label>
              <textarea
                rows={2}
                placeholder="Penjelasan ringkas tentang isi berkas..."
                value={docDescription}
                onChange={(e) => setDocDescription(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-transparent p-2 text-xs text-gray-900 dark:border-gray-800 dark:text-white"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
              <Button type="button" variant="outline" onClick={() => setUploadModalOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={uploadMutation.isPending || !selectedFile || !docTitle.trim()}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {uploadMutation.isPending ? "Mengunggah..." : "Unggah Sekarang"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

