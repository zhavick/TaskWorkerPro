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
  FileCode,
  File,
  Building2,
  Briefcase,
  User,
  Clock,
  Layers,
  CheckCircle2,
  FolderArchive,
  HardDrive,
  Eye,
  ExternalLink,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  AlertCircle,
  RefreshCw,
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

export type PreviewType = "image" | "pdf" | "text" | "unsupported";

export function getPreviewType(fileName: string, contentType = ""): PreviewType {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const ct = contentType.toLowerCase();

  if (ext === "pdf" || ct.includes("pdf")) {
    return "pdf";
  }

  const imageExts = ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico", "avif"];
  if (imageExts.includes(ext) || ct.startsWith("image/")) {
    return "image";
  }

  const textExts = [
    "txt", "md", "markdown", "csv", "json", "xml", "log", "sql", "yaml", "yml",
    "ini", "conf", "env", "sh", "bat", "ps1", "js", "jsx", "ts", "tsx", "html", "css"
  ];
  if (textExts.includes(ext) || ct.startsWith("text/") || ct.includes("json") || ct.includes("xml")) {
    return "text";
  }

  return "unsupported";
}

function getFileIcon(fileName: string, contentType: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const type = getPreviewType(fileName, contentType);

  if (type === "pdf") {
    return <FileText className="h-6 w-6 text-rose-500" />;
  }
  if (type === "image") {
    return <FileImage className="h-6 w-6 text-purple-500" />;
  }
  if (type === "text") {
    return <FileCode className="h-6 w-6 text-emerald-500" />;
  }
  if (["xls", "xlsx"].includes(ext) || contentType.includes("sheet") || contentType.includes("excel")) {
    return <FileSpreadsheet className="h-6 w-6 text-teal-500" />;
  }
  return <File className="h-6 w-6 text-indigo-500" />;
}

function getPreviewBadge(fileName: string, contentType = "") {
  const type = getPreviewType(fileName, contentType);
  if (type === "pdf") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        PDF
      </span>
    );
  }
  if (type === "image") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
        <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
        Gambar
      </span>
    );
  }
  if (type === "text") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Teks
      </span>
    );
  }
  return null;
}

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const { user, isAdmin, isProjectManager, enableDms } = useCurrentUser();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  // Document Preview Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [imageZoom, setImageZoom] = useState(false);

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

  // 7. Open Document Preview Handler
  const handleOpenPreview = async (doc: any) => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPreviewDoc(doc);
    setPreviewText("");
    setPreviewError(null);
    setImageZoom(false);
    setPreviewLoading(true);
    setPreviewModalOpen(true);

    const type = getPreviewType(doc.fileName, doc.contentType);

    try {
      const response = await apiClient.get(`/documents/${doc.id}/preview`, {
        responseType: "blob",
      });

      const mimeType = doc.contentType || (type === "pdf" ? "application/pdf" : "application/octet-stream");
      const blob = new Blob([response.data], { type: mimeType });

      if (type === "text") {
        const text = await blob.text();
        setPreviewText(text);
      }

      const objUrl = window.URL.createObjectURL(blob);
      setPreviewUrl(objUrl);
    } catch (err: any) {
      console.error("Preview load error:", err);
      setPreviewError(err.response?.data?.message || "Gagal memuat pratinjau berkas.");
    } finally {
      setPreviewLoading(false);
    }
  };

  // 8. Close Preview Handler
  const handleClosePreview = () => {
    setPreviewModalOpen(false);
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPreviewDoc(null);
    setPreviewText("");
    setPreviewError(null);
    setImageZoom(false);
  };

  // 9. Copy Text Handler
  const handleCopyText = async () => {
    if (!previewText) return;
    try {
      await navigator.clipboard.writeText(previewText);
      setCopiedText(true);
      toast.success("Isi dokumen berhasil disalin ke clipboard!");
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      toast.error("Gagal menyalin teks ke clipboard.");
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
              <div
                className="flex items-start justify-between gap-3 cursor-pointer group"
                onClick={() => handleOpenPreview(doc)}
                title="Klik untuk membuka pratinjau berkas"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:shadow-xs transition-transform">
                    {getFileIcon(doc.fileName, doc.contentType)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {doc.title}
                    </h3>
                    <p className="text-[11px] text-gray-400 font-mono line-clamp-1">{doc.fileName}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                    {doc.category}
                  </span>
                  {getPreviewBadge(doc.fileName, doc.contentType)}
                </div>
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
                  onClick={() => handleOpenPreview(doc)}
                  className="gap-1.5 text-xs text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-semibold"
                  title="Lihat Pratinjau Berkas"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Pratinjau
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(doc)}
                  className="gap-1 text-xs text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  title="Unduh Berkas"
                >
                  <Download className="h-3.5 w-3.5" />
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
                    title="Hapus Dokumen"
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
                      Bebas semua format berkas (PDF, Gambar, Teks/Kode, Dokumen Kantor, ZIP, dsb. Maks. 50MB)
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

      {/* Modal Pratinjau Dokumen Popup */}
      <Dialog
        open={previewModalOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) handleClosePreview();
        }}
        className="sm:max-w-5xl sm:h-[90vh] sm:p-0 overflow-hidden bg-white dark:bg-gray-900 flex flex-col rounded-2xl"
      >
        <DialogContent className="p-0 space-y-0 h-full flex flex-col overflow-hidden max-h-none">
          {previewDoc && (
            <>
              {/* Preview Header Bar */}
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3.5 dark:border-gray-800 shrink-0 bg-gray-50/70 dark:bg-gray-900/80 backdrop-blur-xs">
                <div className="flex items-center gap-3 min-w-0 pr-4">
                  <div className="h-10 w-10 rounded-xl bg-white dark:bg-gray-800 shadow-xs flex items-center justify-center shrink-0 border border-gray-200 dark:border-gray-700">
                    {getFileIcon(previewDoc.fileName, previewDoc.contentType)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                        {previewDoc.title}
                      </h3>
                      {getPreviewBadge(previewDoc.fileName, previewDoc.contentType)}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono mt-0.5">
                      <span className="truncate max-w-[200px] sm:max-w-xs">{previewDoc.fileName}</span>
                      <span>•</span>
                      <span>{formatBytes(previewDoc.fileSize)}</span>
                      {previewDoc.companyName && (
                        <>
                          <span>•</span>
                          <span className="font-sans text-gray-500 dark:text-gray-400 hidden sm:inline">
                            {previewDoc.companyName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Preview Toolbar Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {getPreviewType(previewDoc.fileName, previewDoc.contentType) === "text" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyText}
                      disabled={previewLoading || !previewText}
                      className="gap-1.5 text-xs font-medium"
                      title="Salin isi teks ke clipboard"
                    >
                      {copiedText ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Salin Teks</span>
                        </>
                      )}
                    </Button>
                  )}

                  {getPreviewType(previewDoc.fileName, previewDoc.contentType) === "image" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setImageZoom(!imageZoom)}
                      className="gap-1.5 text-xs font-medium"
                      title={imageZoom ? "Sesuaikan dengan layar" : "Perbesar ke ukuran asli"}
                    >
                      {imageZoom ? (
                        <>
                          <ZoomOut className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Fit Layar</span>
                        </>
                      ) : (
                        <>
                          <ZoomIn className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Ukuran Asli</span>
                        </>
                      )}
                    </Button>
                  )}

                  {previewUrl && (
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition"
                      title="Buka berkas di tab baru"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Tab Baru</span>
                    </a>
                  )}

                  <Button
                    size="sm"
                    onClick={() => handleDownload(previewDoc)}
                    className="gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-xs"
                    title="Unduh berkas ke komputer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Unduh</span>
                  </Button>
                </div>
              </div>

              {/* Preview Body Content */}
              <div className="flex-1 min-h-0 relative overflow-hidden bg-gray-100/70 dark:bg-gray-950 flex flex-col items-center justify-center">
                {previewLoading ? (
                  <div className="flex flex-col items-center justify-center gap-3 p-8">
                    <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      Memuat pratinjau berkas...
                    </p>
                    <p className="text-xs text-gray-400 font-mono">{previewDoc.fileName}</p>
                  </div>
                ) : previewError ? (
                  <div className="flex flex-col items-center justify-center gap-3 p-8 text-center max-w-md">
                    <AlertCircle className="h-10 w-10 text-rose-500" />
                    <h4 className="font-bold text-gray-900 dark:text-white">Gagal Menampilkan Pratinjau</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{previewError}</p>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleOpenPreview(previewDoc)}>
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        Coba Lagi
                      </Button>
                      <Button size="sm" onClick={() => handleDownload(previewDoc)} className="bg-indigo-600 text-white">
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Unduh Berkas
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* PDF Viewer */}
                    {getPreviewType(previewDoc.fileName, previewDoc.contentType) === "pdf" && previewUrl && (
                      <iframe
                        src={previewUrl}
                        className="w-full h-full border-0 bg-white"
                        title={previewDoc.title}
                      />
                    )}

                    {/* Image Viewer */}
                    {getPreviewType(previewDoc.fileName, previewDoc.contentType) === "image" && previewUrl && (
                      <div className="w-full h-full overflow-auto flex items-center justify-center p-4 select-none">
                        <img
                          src={previewUrl}
                          alt={previewDoc.title}
                          className={`rounded-lg transition-all duration-200 shadow-md ${
                            imageZoom
                              ? "max-w-none cursor-zoom-out"
                              : "max-h-full max-w-full object-contain cursor-zoom-in"
                          }`}
                          onClick={() => setImageZoom(!imageZoom)}
                        />
                      </div>
                    )}

                    {/* Text / Code Viewer */}
                    {getPreviewType(previewDoc.fileName, previewDoc.contentType) === "text" && (
                      <div className="w-full h-full flex flex-col bg-gray-950 text-gray-100 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2 bg-gray-900/90 border-b border-gray-800 text-[11px] text-gray-400 font-mono">
                          <span>
                            {previewText.split("\n").length} baris • {previewText.length} karakter
                          </span>
                          <span className="text-emerald-400 font-semibold">UTF-8 Monospace</span>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                          <pre className="font-mono text-xs leading-relaxed text-emerald-400 select-text whitespace-pre tab-4">
                            <code>{previewText}</code>
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Unsupported Binary Format */}
                    {getPreviewType(previewDoc.fileName, previewDoc.contentType) === "unsupported" && (
                      <div className="flex flex-col items-center justify-center p-8 text-center max-w-lg">
                        <div className="h-16 w-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-sm">
                          {getFileIcon(previewDoc.fileName, previewDoc.contentType)}
                        </div>
                        <h4 className="text-base font-bold text-gray-900 dark:text-white">
                          Format Berkas Siap Diunduh
                        </h4>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                          Pratinjau interaktif langsung di peramban saat ini dioptimalkan untuk berkas <strong>PDF</strong>, <strong>Gambar</strong>, dan <strong>Teks / Script Dokumen</strong>. Anda dapat mengunduh berkas ini untuk membukanya secara penuh dengan aplikasi di perangkat Anda.
                        </p>

                        <div className="mt-5 flex flex-wrap justify-center gap-2">
                          <Button
                            onClick={() => handleDownload(previewDoc)}
                            className="gap-2 bg-indigo-600 font-semibold text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20"
                          >
                            <Download className="h-4 w-4" />
                            Unduh Berkas Sekarang ({formatBytes(previewDoc.fileSize)})
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

