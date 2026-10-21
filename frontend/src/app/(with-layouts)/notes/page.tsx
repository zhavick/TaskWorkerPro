"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  BookOpen,
  Pin,
  Plus,
  Trash2,
  Paperclip,
  Download,
  Upload,
  Search,
  Filter,
  FileText,
  Tag,
  ExternalLink,
  File,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  Image as ImageIcon,
  Eye,
  Edit2,
  CheckCircle2,
  X,
  Clock,
  User,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/tailgrids/core/dialog";
import { RichTextEditor } from "@/components/common/rich-text-editor";
import { SearchableSelect } from "@/components/tailgrids/core/searchable-select";
import { toast } from "sonner";

const categories = ["Semua", "General", "Backend", "Frontend", "Database", "DevOps", "SOP"];
const colorPresets = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4"];

function getFileIcon(ext: string) {
  const e = ext.toLowerCase();
  if (e === ".pdf") return <FileText className="h-4 w-4 text-rose-500" />;
  if (e === ".xlsx" || e === ".xls") return <FileSpreadsheet className="h-4 w-4 text-emerald-500" />;
  if (e === ".png" || e === ".jpg" || e === ".jpeg" || e === ".webp")
    return <ImageIcon className="h-4 w-4 text-sky-500" />;
  if (e === ".zip" || e === ".rar" || e === ".tar" || e === ".gz")
    return <FileArchive className="h-4 w-4 text-amber-500" />;
  if (e === ".sql" || e === ".json" || e === ".ts" || e === ".js")
    return <FileCode className="h-4 w-4 text-indigo-500" />;
  return <File className="h-4 w-4 text-gray-500" />;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function NotesPage() {
  const queryClient = useQueryClient();

  // Search & Filters
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [onlyPinned, setOnlyPinned] = useState(false);
  const [search, setSearch] = useState("");

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);

  // Detail Modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);

  // Upload Modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadTargetNote, setUploadTargetNote] = useState<any | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Form Fields
  const [title, setTitle] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [category, setCategory] = useState("General");
  const [color, setColor] = useState("#6366F1");
  const [taskId, setTaskId] = useState<number | undefined>(undefined);
  const [isPinned, setIsPinned] = useState(false);

  // 1. Query Notes List
  const { data: notes = [], isLoading } = useQuery<any[]>({
    queryKey: ["notesList", selectedCategory, onlyPinned, search],
    queryFn: async () => {
      let url = "/notes?";
      if (selectedCategory !== "Semua") url += `category=${encodeURIComponent(selectedCategory)}&`;
      if (onlyPinned) url += `isPinned=true&`;
      if (search) url += `search=${encodeURIComponent(search)}&`;
      const res = await apiClient.get(url);
      return res.data.data;
    },
  });

  // 2. Query Tasks for dropdown link
  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["tasksForNotesSelect"],
    queryFn: async () => {
      const res = await apiClient.get("/tasks");
      return res.data.data;
    },
    enabled: formModalOpen,
  });

  const categoryOptions = categories
    .filter((c) => c !== "Semua")
    .map((c) => ({ value: c, label: c }));

  const taskOptions = [
    { value: "", label: "-- Tanpa Tautan Tugas --" },
    ...tasks.map((t: any) => ({
      value: t.id,
      label: t.title,
      badge: t.priority,
      description: t.projectTitle ? `Proyek: ${t.projectTitle}` : undefined,
    })),
  ];

  // 3. Query Note Detail (when detail modal is open)
  const { data: noteDetail, isLoading: isDetailLoading } = useQuery<any>({
    queryKey: ["noteDetail", selectedNoteId],
    queryFn: async () => {
      if (!selectedNoteId) return null;
      const res = await apiClient.get(`/notes/${selectedNoteId}`);
      return res.data.data;
    },
    enabled: !!selectedNoteId && detailModalOpen,
  });

  // Reset form
  const resetForm = () => {
    setTitle("");
    setContentHtml("");
    setCategory("General");
    setColor("#6366F1");
    setTaskId(undefined);
    setIsPinned(false);
    setEditingNoteId(null);
    setFormMode("create");
  };

  const openCreateModal = () => {
    resetForm();
    setFormMode("create");
    setFormModalOpen(true);
  };

  const openEditModal = (note: any) => {
    setEditingNoteId(note.id);
    setTitle(note.title);
    setContentHtml(note.contentHtml);
    setCategory(note.category || "General");
    setColor(note.color || "#6366F1");
    setTaskId(note.taskId || undefined);
    setIsPinned(note.isPinned || false);
    setFormMode("edit");
    setFormModalOpen(true);
  };

  const openDetailModal = (noteId: number) => {
    setSelectedNoteId(noteId);
    setDetailModalOpen(true);
  };

  // Create Note Mutation
  const createNoteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/notes", {
        title: title.trim(),
        contentHtml,
        category,
        color,
        isPinned,
        taskId: taskId || null,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Catatan baru berhasil disimpan!");
      setFormModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["notesList"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal membuat catatan"),
  });

  // Update Note Mutation
  const updateNoteMutation = useMutation({
    mutationFn: async () => {
      if (!editingNoteId) return;
      const res = await apiClient.put(`/notes/${editingNoteId}`, {
        title: title.trim(),
        contentHtml,
        category,
        color,
        isPinned,
        taskId: taskId || null,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Catatan berhasil diperbarui!");
      setFormModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["notesList"] });
      if (selectedNoteId) {
        queryClient.invalidateQueries({ queryKey: ["noteDetail", selectedNoteId] });
      }
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal memperbarui catatan"),
  });

  // Pin Toggle Mutation
  const togglePinMutation = useMutation({
    mutationFn: async (noteId: number) => {
      const res = await apiClient.patch(`/notes/${noteId}/pin`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["notesList"] });
      if (selectedNoteId) {
        queryClient.invalidateQueries({ queryKey: ["noteDetail", selectedNoteId] });
      }
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal mengubah status pin"),
  });

  // Delete Note Mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      const res = await apiClient.delete(`/notes/${noteId}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Catatan dan seluruh lampiran berhasil dihapus.");
      if (detailModalOpen && selectedNoteId) {
        setDetailModalOpen(false);
      }
      queryClient.invalidateQueries({ queryKey: ["notesList"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal menghapus catatan"),
  });

  // Delete Attachment Mutation
  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachmentId: number) => {
      const res = await apiClient.delete(`/notes/attachments/${attachmentId}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Lampiran berkas berhasil dihapus.");
      queryClient.invalidateQueries({ queryKey: ["notesList"] });
      if (selectedNoteId) {
        queryClient.invalidateQueries({ queryKey: ["noteDetail", selectedNoteId] });
      }
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal menghapus lampiran"),
  });

  // Download Attachment
  const handleDownload = async (attachmentId: number, fileName: string) => {
    try {
      toast.loading(`Mengunduh ${fileName}...`, { id: `down-${attachmentId}` });
      const res = await apiClient.get(`/notes/attachments/${attachmentId}/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Unduhan selesai!", { id: `down-${attachmentId}` });
    } catch {
      toast.error("Gagal mengunduh berkas.", { id: `down-${attachmentId}` });
    }
  };

  // Upload Attachment
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetNoteId?: number) => {
    const file = e.target.files?.[0];
    const nId = targetNoteId || uploadTargetNote?.id || selectedNoteId;
    if (!file || !nId) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsUploading(true);
      toast.loading("Mengunggah berkas lampiran...", { id: "uploadAttach" });
      await apiClient.post(`/notes/${nId}/attachments`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Berkas berhasil dilampirkan!", { id: "uploadAttach" });
      setUploadModalOpen(false);
      setUploadTargetNote(null);
      queryClient.invalidateQueries({ queryKey: ["notesList"] });
      queryClient.invalidateQueries({ queryKey: ["noteDetail", nId] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Gagal mengunggah berkas", { id: "uploadAttach" });
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  return (
    <div className="space-y-6 px-2 py-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Dokumentasi Kerja & SOP Teknis
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Pusat penyimpanan catatan teknis, prosedur operasional (*SOP*), dan multi-lampiran berkas fisik terproteksi.
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="gap-2 bg-indigo-600 font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 text-xs"
        >
          <Plus className="h-4 w-4" />
          Catatan Baru
        </Button>
      </div>

      {/* Filter and Category Pills */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                selectedCategory === cat
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              {cat}
            </button>
          ))}

          <button
            onClick={() => setOnlyPinned(!onlyPinned)}
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition ${
              onlyPinned
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            <Pin className={`h-3 w-3 ${onlyPinned ? "fill-current" : ""}`} />
            Sematkan
          </button>
        </div>

        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Cari judul atau isi catatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs"
          />
        </div>
      </div>

      {/* Masonry Note Cards Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {notes.map((note) => (
          <div
            key={note.id}
            className={`group flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-xs transition hover:shadow-md dark:bg-gray-900 ${
              note.isPinned
                ? "border-indigo-400/80 bg-indigo-50/15 dark:border-indigo-600/80"
                : "border-gray-200/80 dark:border-gray-800"
            }`}
          >
            <div>
              {/* Header: Category, Color & Pin */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: note.color || "#6366F1" }}
                  />
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {note.category}
                  </span>
                  {note.taskTitle && (
                    <span className="max-w-[120px] truncate rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                      Tugas: {note.taskTitle}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => togglePinMutation.mutate(note.id)}
                    className={`rounded-lg p-1 text-xs transition ${
                      note.isPinned
                        ? "text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                        : "text-gray-300 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400"
                    }`}
                    title={note.isPinned ? "Lepas sematan" : "Sematkan di atas"}
                  >
                    <Pin className={`h-4 w-4 ${note.isPinned ? "fill-current" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Title & Clickable to View */}
              <h3
                onClick={() => openDetailModal(note.id)}
                className="mt-3 font-bold text-base text-gray-900 dark:text-white leading-snug cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition"
              >
                {note.title}
              </h3>

              {/* Body snippet */}
              <div
                onClick={() => openDetailModal(note.id)}
                className="mt-2 line-clamp-3 text-xs text-gray-600 dark:text-gray-300 leading-relaxed cursor-pointer"
                dangerouslySetInnerHTML={{ __html: note.contentHtml }}
              />

              {/* Attachments Indicator */}
              {note.attachmentsCount > 0 && (
                <button
                  type="button"
                  onClick={() => openDetailModal(note.id)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 transition"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  <span>{note.attachmentsCount} Berkas Terlampir</span>
                </button>
              )}
            </div>

            {/* Footer */}
            <div className="mt-5 border-t border-gray-100 pt-3 flex items-center justify-between text-[11px] text-gray-400 dark:border-gray-800">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(note.createdAt).toLocaleDateString("id-ID")}
              </span>

              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 px-2 text-[11px] text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                  onClick={() => openDetailModal(note.id)}
                  title="Lihat Detail & Berkas"
                >
                  <Eye className="h-3 w-3" />
                  Detail
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  onClick={() => openEditModal(note)}
                  title="Edit Catatan"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  onClick={() => {
                    setUploadTargetNote(note);
                    setUploadModalOpen(true);
                  }}
                  title="Unggah Lampiran Berkas"
                >
                  <Upload className="h-3.5 w-3.5" />
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                  onClick={() => {
                    if (confirm(`Hapus catatan "${note.title}" beserta seluruh lampiran fisiknya?`)) {
                      deleteNoteMutation.mutate(note.id);
                    }
                  }}
                  title="Hapus Catatan"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {notes.length === 0 && !isLoading && (
          <div className="col-span-full py-16 text-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-2xl dark:border-gray-800">
            <BookOpen className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
            Tidak ada catatan yang sesuai dengan filter atau kata kunci pencarian.
          </div>
        )}
      </div>

      {/* Modal 1: Buat & Edit Catatan */}
      <Dialog open={formModalOpen} onOpenChange={setFormModalOpen}>
        <DialogContent className="max-w-2xl bg-white p-6 shadow-2xl dark:bg-gray-900 rounded-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              <span>{formMode === "create" ? "Buat Catatan Kerja / SOP Baru" : "Edit Catatan Kerja"}</span>
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (formMode === "create") {
                createNoteMutation.mutate();
              } else {
                updateNoteMutation.mutate();
              }
            }}
            className="mt-4 space-y-3.5"
          >
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Judul Catatan *
              </label>
              <Input
                required
                placeholder="Contoh: Arsitektur Database & Connection Pooling"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Kategori
                </label>
                <SearchableSelect
                  options={categoryOptions}
                  value={category}
                  onChange={(val) => setCategory(val || "General")}
                  searchPlaceholder="Cari kategori..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Tautkan ke Tugas (Opsional)
                </label>
                <SearchableSelect
                  options={taskOptions}
                  value={taskId || ""}
                  onChange={(val) => setTaskId(val ? Number(val) : undefined)}
                  searchPlaceholder="Ketik untuk mencari tugas..."
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Warna Label Aksen
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  {colorPresets.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`h-5 w-5 rounded-full transition ${
                        color === c ? "ring-2 ring-offset-2 ring-indigo-500 scale-110" : ""
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer pt-3">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Sematkan (*Pin to top*)
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Isi Dokumentasi Teknis (Editor Format Teks Kaya / Rich Text) *
              </label>
              <RichTextEditor
                value={contentHtml}
                onChange={setContentHtml}
                placeholder="Tuliskan panduan teknis, langkah instruksi, atau spesifikasi dokumen..."
                minHeight="220px"
                required
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFormModalOpen(false)} className="text-xs">
                Batal
              </Button>
              <Button
                type="submit"
                disabled={createNoteMutation.isPending || updateNoteMutation.isPending}
                className="bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold"
              >
                {formMode === "create"
                  ? createNoteMutation.isPending
                    ? "Menyimpan..."
                    : "Simpan Catatan"
                  : updateNoteMutation.isPending
                  ? "Memperbarui..."
                  : "Perbarui Catatan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Detail Catatan & Lampiran Berkas */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl bg-white p-6 shadow-2xl dark:bg-gray-900 rounded-2xl max-h-[90vh] overflow-y-auto">
          {isDetailLoading || !noteDetail ? (
            <div className="py-12 text-center text-xs text-gray-500">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-indigo-600 mb-2" />
              Memuat isi catatan...
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3 dark:border-gray-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: noteDetail.color || "#6366F1" }}
                    />
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      {noteDetail.category}
                    </span>
                    {noteDetail.isPinned && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                        <Pin className="h-3 w-3 fill-current" /> Disematkan
                      </span>
                    )}
                  </div>
                  <h2 className="mt-2 text-lg font-bold text-gray-900 dark:text-white">
                    {noteDetail.title}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Penulis: {noteDetail.authorUserName || "Sistem"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(noteDetail.createdAt).toLocaleString("id-ID")}
                    </span>
                    {noteDetail.taskTitle && (
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        Terkait Tugas: {noteDetail.taskTitle}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 text-xs"
                    onClick={() => {
                      setDetailModalOpen(false);
                      openEditModal(noteDetail);
                    }}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                </div>
              </div>

              {/* Note Content */}
              <div className="rounded-xl bg-gray-50/70 p-4 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                <div
                  className="prose dark:prose-invert max-w-none text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-sans"
                  dangerouslySetInnerHTML={{ __html: noteDetail.contentHtml }}
                />
              </div>

              {/* Attachments Section */}
              <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Paperclip className="h-4 w-4 text-indigo-600" />
                    <span>Berkas Lampiran Dokumen ({noteDetail.attachments?.length || 0})</span>
                  </h4>

                  {/* Inline quick upload button */}
                  <label className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 cursor-pointer dark:bg-indigo-950/60 dark:text-indigo-400 transition">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Unggah Berkas</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, noteDetail.id)}
                    />
                  </label>
                </div>

                {noteDetail.attachments && noteDetail.attachments.length > 0 ? (
                  <div className="space-y-2">
                    {noteDetail.attachments.map((att: any) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between rounded-xl border border-gray-200/80 bg-white p-2.5 shadow-xs dark:border-gray-800 dark:bg-gray-800/50"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-800 shrink-0">
                            {getFileIcon(att.fileExtension || "")}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate max-w-xs">
                              {att.fileName}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {formatFileSize(att.fileSize)} •{" "}
                              {new Date(att.uploadedAt).toLocaleDateString("id-ID")}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                            onClick={() => handleDownload(att.id, att.fileName)}
                            title="Unduh Berkas"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            onClick={() => {
                              if (confirm(`Hapus berkas lampiran "${att.fileName}"?`)) {
                                deleteAttachmentMutation.mutate(att.id);
                              }
                            }}
                            title="Hapus Berkas"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl dark:border-gray-800">
                    Belum ada berkas yang dilampirkan pada catatan ini.
                  </div>
                )}
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDetailModalOpen(false)}
                  className="text-xs"
                >
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal 3: Unggah Lampiran Cepat */}
      <Dialog
        open={uploadModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setUploadModalOpen(false);
            setUploadTargetNote(null);
          }
        }}
      >
        <DialogContent className="max-w-md bg-white p-6 shadow-2xl dark:bg-gray-900 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Upload className="h-5 w-5 text-indigo-600" />
              <span>Lampirkan Berkas: {uploadTargetNote?.title}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 text-center border-2 border-dashed border-gray-200 p-8 rounded-2xl dark:border-gray-800">
            {isUploading ? (
              <div className="py-4">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600 mb-2" />
                <p className="text-xs text-gray-600 dark:text-gray-300 font-semibold">
                  Mengunggah berkas ke server...
                </p>
              </div>
            ) : (
              <>
                <Upload className="mx-auto h-10 w-10 text-gray-400 mb-3" />
                <p className="text-xs text-gray-600 dark:text-gray-300 font-semibold">
                  Pilih file dokumen atau gambar untuk dilampirkan
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Format didukung: .pdf, .docx, .xlsx, .png, .jpg, .zip, .json, .sql (Maks. 50MB)
                </p>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="mt-4 block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-950 dark:file:text-indigo-300"
                />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
