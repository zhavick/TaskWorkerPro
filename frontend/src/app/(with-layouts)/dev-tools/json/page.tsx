"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  Code,
  Copy,
  Check,
  Sparkles,
  CheckCircle2,
  Save,
  History,
  Trash2,
  Download,
  RefreshCw,
  FolderOpen,
  AlertCircle,
  FileCode,
  Tag,
  Minimize2,
  Layers,
  X,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/tailgrids/core/dialog";
import { SearchableTaskPicker } from "@/components/common/searchable-task-picker";
import { toast } from "sonner";

interface JsonHistoryItem {
  id: number;
  name: string;
  content: string;
  taskId?: number | null;
  taskTitle?: string | null;
  createdAt: string;
}

export default function JsonFormatterPage() {
  const queryClient = useQueryClient();
  const [input, setInput] = useState(
    '{\n  "title": "TrackerKerja Modern",\n  "version": 2,\n  "architecture": "Clean Architecture & Multi-Tenant",\n  "features": [\n    "multi-timer",\n    "postgresql",\n    "task-binding",\n    "excel-import"\n  ]\n}'
  );
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  // Modals
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [snippetName, setSnippetName] = useState("");
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // 1. Fetch Tasks for Binding
  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["tasksForJsonBinding"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/tasks");
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
  });

  // 2. Fetch JSON Snippet History
  const { data: histories = [], refetch: refetchHistories } = useQuery<JsonHistoryItem[]>({
    queryKey: ["jsonHistories"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/dev-tools/json/history");
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
  });

  const handleFormat = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const res = await apiClient.post("/dev-tools/json/format", {
        jsonString: input,
        taskId: selectedTaskId,
      });
      const formatted = res.data?.formatted || res.data?.data?.formatted || "";
      setOutput(formatted);
      toast.success("JSON berhasil divalidasi dan diformat rapi!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Format JSON tidak valid");
    } finally {
      setLoading(false);
    }
  };

  const handleMinify = () => {
    if (!input.trim()) return;
    try {
      const parsed = JSON.parse(input);
      const minified = JSON.stringify(parsed);
      setOutput(minified);
      toast.success("JSON berhasil diminifikasi!");
    } catch (err: any) {
      toast.error("Format JSON tidak valid: " + err.message);
    }
  };

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    toast.success("Tersalin ke clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const contentToDownload = output || input;
    if (!contentToDownload) return;
    const blob = new Blob([contentToDownload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `snippet_${selectedTaskId ? `task_${selectedTaskId}_` : ""}${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Berkas JSON berhasil diunduh!");
  };

  const saveSnippetMutation = useMutation({
    mutationFn: async () => {
      if (!snippetName.trim()) throw new Error("Nama snippet harus diisi.");
      const contentToSave = output.trim() || input.trim();
      const res = await apiClient.post("/dev-tools/json/format", {
        jsonString: contentToSave,
        name: snippetName.trim(),
        taskId: selectedTaskId,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Snippet JSON berhasil disimpan dan ditautkan ke tugas!");
      setSaveModalOpen(false);
      setSnippetName("");
      queryClient.invalidateQueries({ queryKey: ["jsonHistories"] });
    },
    onError: (err: any) => {
      toast.error(err.message || err.response?.data?.message || "Gagal menyimpan snippet");
    },
  });

  const deleteHistoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete(`/dev-tools/json/history/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Riwayat snippet berhasil dihapus!");
      queryClient.invalidateQueries({ queryKey: ["jsonHistories"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal menghapus riwayat snippet");
    },
  });

  const handleLoadHistory = (item: JsonHistoryItem) => {
    if (item.content) {
      setInput(item.content);
      setOutput(item.content);
    }
    if (item.taskId) {
      setSelectedTaskId(item.taskId);
    }
    setHistoryModalOpen(false);
    toast.info(`Snippet '${item.name}' dimuat ke editor.`);
  };

  const boundTask = tasks.find((t: any) => t.id === selectedTaskId);

  return (
    <div className="space-y-6 px-2 py-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Code className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Developer Tools: JSON Beautifier &amp; Task Binding
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Validasi, beautify/minify struktur JSON, dan simpan snippet dengan tautan langsung ke tugas aktif.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHistoryModalOpen(true)}
            className="gap-1.5 text-xs text-gray-700 dark:text-gray-300"
          >
            <History className="h-4 w-4 text-indigo-500" />
            Riwayat ({histories.length})
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSaveModalOpen(true)}
            disabled={!input.trim()}
            className="gap-1.5 text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-900/40 dark:text-indigo-400"
          >
            <Save className="h-4 w-4" />
            Simpan Snippet
          </Button>

          <Button
            onClick={handleFormat}
            disabled={loading || !input.trim()}
            size="sm"
            className="gap-2 bg-indigo-600 font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700"
          >
            <Sparkles className="h-4 w-4" />
            Format JSON
          </Button>
        </div>
      </div>

      {/* Task Binding Bar */}
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-950/60 dark:bg-indigo-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 dark:text-white">
              Tautkan ke Tugas yang Sedang Dikerjakan (Task Binding)
            </h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Setiap snippet yang disimpan akan otomatis terasosiasi dengan tugas ini dalam riwayat.
            </p>
          </div>
        </div>

        <div className="w-full sm:w-auto min-w-[260px] sm:min-w-[340px]">
          <SearchableTaskPicker
            value={selectedTaskId}
            onChange={(id) => setSelectedTaskId(id)}
            placeholder="Cari tugas yang ditautkan..."
          />
        </div>
      </div>

      {/* Main Dual-Panel Editor */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Input Panel */}
        <div className="flex flex-col rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Raw JSON Input
            </label>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleMinify}
                disabled={!input.trim()}
                className="h-7 gap-1 text-[11px] text-gray-600 hover:text-indigo-600 dark:text-gray-400"
              >
                <Minimize2 className="h-3 w-3" />
                Minify
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setInput("")}
                className="h-7 text-[11px] text-gray-400 hover:text-rose-500"
              >
                Bersihkan
              </Button>
            </div>
          </div>
          <textarea
            rows={18}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full flex-1 rounded-xl border border-gray-200 bg-gray-50/50 p-3 font-mono text-xs text-gray-900 leading-relaxed focus:border-indigo-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
            placeholder="Tempelkan raw JSON di sini..."
          />
        </div>

        {/* Right: Output Panel */}
        <div className="flex flex-col rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Formatted Output
              </label>
              {boundTask && (
                <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  <Tag className="h-2.5 w-2.5" />
                  {boundTask.title}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {output && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDownload}
                    className="h-7 gap-1 text-xs"
                    title="Unduh berkas JSON"
                  >
                    <Download className="h-3.5 w-3.5 text-gray-500" />
                    Unduh
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopy}
                    className="h-7 gap-1 text-xs text-indigo-600 dark:text-indigo-400"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copied ? "Tersalin" : "Salin"}
                  </Button>
                </>
              )}
            </div>
          </div>
          <textarea
            readOnly
            rows={18}
            value={output}
            className="w-full flex-1 rounded-xl border border-gray-200 bg-gray-50/50 p-3 font-mono text-xs text-indigo-700 leading-relaxed focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-indigo-300"
            placeholder="Hasil JSON yang diformat akan muncul di sini..."
          />
        </div>
      </div>

      {/* Dialog: Simpan Snippet */}
      <Dialog isOpen={saveModalOpen} onOpenChange={setSaveModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5 text-indigo-600" />
              Simpan Snippet JSON
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                Nama / Label Snippet *
              </label>
              <Input
                value={snippetName}
                onChange={(e) => setSnippetName(e.target.value)}
                placeholder="misal: Response Payload API Auth"
                autoFocus
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                Tautkan ke Tugas (Task Binding)
              </label>
              <SearchableTaskPicker
                value={selectedTaskId}
                onChange={(id) => setSelectedTaskId(id)}
                placeholder="Cari tugas (judul atau kode TK-xxxx)..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSaveModalOpen(false)}>
                Batal
              </Button>
              <Button
                size="sm"
                onClick={() => saveSnippetMutation.mutate()}
                disabled={saveSnippetMutation.isPending || !snippetName.trim()}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {saveSnippetMutation.isPending ? "Menyimpan..." : "Simpan Snippet"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Riwayat Snippet JSON */}
      <Dialog isOpen={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-600" />
              Riwayat Snippet JSON Tersimpan
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-3 py-2">
            {histories.map((item: JsonHistoryItem) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3.5 transition hover:border-indigo-200 dark:border-gray-800 dark:bg-gray-800/40"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-gray-900 dark:text-white">
                      {item.name}
                    </span>
                    {item.taskTitle && (
                      <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        <Tag className="h-2.5 w-2.5" />
                        {item.taskTitle}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Disimpan pada {new Date(item.createdAt).toLocaleString("id-ID")}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleLoadHistory(item)}
                    className="h-7 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400"
                  >
                    Muat ke Editor
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteHistoryMutation.mutate(item.id)}
                    className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}

            {histories.length === 0 && (
              <div className="py-8 text-center text-xs text-gray-400">
                Belum ada snippet JSON yang disimpan.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
