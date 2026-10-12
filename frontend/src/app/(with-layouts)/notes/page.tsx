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
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/tailgrids/core/dialog";
import { toast } from "sonner";

const categories = ["Semua", "General", "Backend", "Frontend", "Database", "DevOps", "SOP"];
const colorPresets = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

export default function NotesPage() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [search, setSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedNoteForUpload, setSelectedNoteForUpload] = useState<any | null>(null);

  // New Note form state
  const [title, setTitle] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [category, setCategory] = useState("General");
  const [color, setColor] = useState("#6366F1");

  // Query Notes
  const { data: notes = [], isLoading } = useQuery<any[]>({
    queryKey: ["notesList", selectedCategory, search],
    queryFn: async () => {
      let url = "/notes?";
      if (selectedCategory !== "Semua") url += `category=${selectedCategory}&`;
      if (search) url += `search=${search}&`;
      const res = await apiClient.get(url);
      return res.data.data;
    },
  });

  // Create Note Mutation
  const createNoteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/notes", {
        title: title.trim(),
        contentHtml,
        category,
        color,
        isPinned: false,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Catatan berhasil dibuat!");
      setCreateModalOpen(false);
      setTitle("");
      setContentHtml("");
      queryClient.invalidateQueries({ queryKey: ["notesList"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal membuat catatan"),
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
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal toggle pin"),
  });

  // Delete Note Mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      const res = await apiClient.delete(`/notes/${noteId}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Catatan dan lampiran berhasil dihapus.");
      queryClient.invalidateQueries({ queryKey: ["notesList"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal menghapus catatan"),
  });

  // Upload Attachment Mutation
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedNoteForUpload) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      toast.loading("Mengunggah berkas lampiran...", { id: "uploadAttach" });
      await apiClient.post(`/notes/${selectedNoteForUpload.id}/attachments`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Berkas berhasil dilampirkan!", { id: "uploadAttach" });
      setSelectedNoteForUpload(null);
      queryClient.invalidateQueries({ queryKey: ["notesList"] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Gagal mengunggah berkas", { id: "uploadAttach" });
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
            Pusat penyimpanan catatan teknis, instruksi kerja (*SOP*), dan lampiran berkas fisik terproteksi.
          </p>
        </div>

        <Button
          onClick={() => setCreateModalOpen(true)}
          className="gap-2 bg-indigo-600 font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Catatan Baru
        </Button>
      </div>

      {/* Filter and Category Pills */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
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
        </div>

        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Cari catatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
      </div>

      {/* Masonry Note Cards Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {notes.map((note) => (
          <div
            key={note.id}
            className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-xs transition hover:shadow-md dark:bg-gray-900 ${
              note.isPinned
                ? "border-indigo-400/80 bg-indigo-50/20 dark:border-indigo-600"
                : "border-gray-200/80 dark:border-gray-800"
            }`}
          >
            <div>
              {/* Header: Category & Pin */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: note.color || "#6366F1" }}
                  />
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {note.category}
                  </span>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  className={`h-7 w-7 p-0 ${
                    note.isPinned ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400"
                  }`}
                  onClick={() => togglePinMutation.mutate(note.id)}
                  title={note.isPinned ? "Lepas Pin" : "Sematkan Catatan"}
                >
                  <Pin className={`h-4 w-4 ${note.isPinned ? "fill-current" : ""}`} />
                </Button>
              </div>

              {/* Title */}
              <h3 className="mt-3 font-bold text-base text-gray-900 dark:text-white leading-snug">
                {note.title}
              </h3>

              {/* Body */}
              <div
                className="mt-2 line-clamp-4 text-xs text-gray-600 dark:text-gray-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: note.contentHtml }}
              />

              {/* Attachments Indicator */}
              {note.attachmentsCount > 0 && (
                <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                  <Paperclip className="h-3.5 w-3.5" />
                  <span>{note.attachmentsCount} Berkas Terlampir</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-5 border-t border-gray-100 pt-3 flex items-center justify-between text-[11px] text-gray-400 dark:border-gray-800">
              <span>{new Date(note.createdAt).toLocaleDateString("id-ID")}</span>

              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 px-2 text-[11px] text-indigo-600"
                  onClick={() => setSelectedNoteForUpload(note)}
                >
                  <Upload className="h-3 w-3" />
                  Lampirkan
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                  onClick={() => {
                    if (confirm("Hapus catatan ini beserta seluruh lampiran?")) {
                      deleteNoteMutation.mutate(note.id);
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {notes.length === 0 && !isLoading && (
          <div className="col-span-full py-16 text-center text-sm text-gray-400">
            Tidak ada catatan yang sesuai dengan filter.
          </div>
        )}
      </div>

      {/* Modal Buat Catatan */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-lg bg-white p-6 shadow-2xl dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
              Buat Catatan Kerja / SOP Baru
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createNoteMutation.mutate();
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Kategori
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent p-2 text-xs text-gray-900 dark:border-gray-800 dark:text-white"
                >
                  {categories.filter((c) => c !== "Semua").map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Warna Kartu
                </label>
                <div className="mt-2 flex items-center gap-2">
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
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Isi Catatan (HTML / Teks)
              </label>
              <textarea
                rows={6}
                required
                placeholder="Tuliskan dokumentasi teknis atau prosedur di sini..."
                value={contentHtml}
                onChange={(e) => setContentHtml(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-transparent p-3 text-xs text-gray-900 dark:border-gray-800 dark:text-white"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={createNoteMutation.isPending}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Simpan Catatan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Upload Attachment */}
      <Dialog
        open={!!selectedNoteForUpload}
        onOpenChange={(open) => !open && setSelectedNoteForUpload(null)}
      >
        <DialogContent className="max-w-md bg-white p-6 shadow-2xl dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
              Lampirkan Berkas: {selectedNoteForUpload?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 text-center border-2 border-dashed border-gray-200 p-8 rounded-2xl dark:border-gray-800">
            <Upload className="mx-auto h-10 w-10 text-gray-400 mb-3" />
            <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">
              Pilih file dokumen atau gambar untuk diunggah
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              Didukung: .pdf, .docx, .xlsx, .png, .jpg, .zip, .json, .sql
            </p>
            <input
              type="file"
              onChange={handleFileUpload}
              className="mt-4 block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
