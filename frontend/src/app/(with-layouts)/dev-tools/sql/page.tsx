"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  Database,
  Copy,
  Check,
  Sparkles,
  Minimize2,
  CheckCircle2,
  AlertTriangle,
  Download,
  Trash2,
  History,
  FileCode,
  Layers,
  Settings2,
  ChevronDown,
  RefreshCw,
  FolderOpen,
  Save,
  Info,
  Tag,
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

interface DialectInfo {
  code: string;
  name: string;
  family: string;
  description: string;
  iconBadge: string;
}

interface DiagnosticError {
  line: number;
  column: number;
  message: string;
}

interface ValidationData {
  isValid: boolean;
  statementType: string;
  errors: DiagnosticError[];
  detectedKeywords: string[];
}

interface HistoryItem {
  id: number;
  name: string;
  dialect: string;
  content: string;
  taskId?: number | null;
  taskTitle?: string | null;
  createdAt: string;
}

export default function SqlStudioPage() {
  const queryClient = useQueryClient();

  // State
  const [inputSql, setInputSql] = useState(
    "WITH regional_sales AS (\n  SELECT region, SUM(amount) AS total_sales\n  FROM orders\n  WHERE order_date >= '2026-01-01'\n  GROUP BY region\n)\nSELECT r.region, SUM(o.amount) AS product_sales\nFROM orders o\nJOIN regional_sales r ON o.region = r.region\nGROUP BY r.region\nORDER BY product_sales DESC;"
  );
  const [outputSql, setOutputSql] = useState("");
  const [selectedDialect, setSelectedDialect] = useState("postgresql");
  const [casing, setCasing] = useState<"Upper" | "Lower" | "Preserve">("Upper");
  const [commaPosition, setCommaPosition] = useState<"EndOfLine" | "StartOfLine">("EndOfLine");
  const [indentSpaces, setIndentSpaces] = useState(2);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"formatted" | "minified">("formatted");

  // Metrics
  const [metrics, setMetrics] = useState<{
    lineCount: number;
    charCount: number;
    elapsedMs: number;
    compressionRatio?: number;
  }>({
    lineCount: 12,
    charCount: 295,
    elapsedMs: 0,
  });

  // Validation State
  const [validationResult, setValidationResult] = useState<ValidationData | null>(null);

  // Modals
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveQueryName, setSaveQueryName] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  // Fetch Tasks for Task Binding
  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["tasksForSqlBinding"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/tasks");
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
  });

  // 1. Fetch Dialects
  const { data: dialects = [] } = useQuery<DialectInfo[]>({
    queryKey: ["sqlDialects"],
    queryFn: async () => {
      const res = await apiClient.get("/sqltools/dialects");
      return res.data.data;
    },
  });

  // 2. Fetch History
  const { data: histories = [] } = useQuery<HistoryItem[]>({
    queryKey: ["sqlHistories"],
    queryFn: async () => {
      const res = await apiClient.get("/sqltools/history");
      return res.data.data;
    },
  });

  // Mutations
  const formatMutation = useMutation({
    mutationFn: async (vars?: { name?: string; taskId?: number | null } | void) => {
      const res = await apiClient.post("/sqltools/format", {
        sql: inputSql,
        dialect: selectedDialect,
        casing,
        comma: commaPosition,
        indentSpaces,
        name: vars?.name,
        taskId: vars?.taskId !== undefined ? vars.taskId : selectedTaskId,
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      setOutputSql(data.formattedSql);
      setMetrics({
        lineCount: data.lineCount,
        charCount: data.characterCount,
        elapsedMs: data.elapsedMilliseconds,
      });
      setActiveTab("formatted");
      toast.success("Query SQL berhasil diformat rapi!");
      queryClient.invalidateQueries({ queryKey: ["sqlHistories"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal memformat SQL.");
    },
  });

  const minifyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/sqltools/minify", {
        sql: inputSql,
        preserveComments: false,
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      setOutputSql(data.minifiedSql);
      setMetrics({
        lineCount: 1,
        charCount: data.minifiedLength,
        elapsedMs: 0,
        compressionRatio: data.compressionRatio,
      });
      setActiveTab("minified");
      toast.success(`SQL berhasil dipadatkan! Kompresi: ${data.compressionRatio}%`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal memadatkan SQL.");
    },
  });

  const validateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/sqltools/validate", {
        sql: inputSql,
        dialect: selectedDialect,
      });
      return res.data.data;
    },
    onSuccess: (data: ValidationData) => {
      setValidationResult(data);
      if (data.isValid) {
        toast.success(`Sintaksis Valid! Tipe Statement: ${data.statementType}`);
      } else {
        toast.error(`Ditemukan ${data.errors.length} masalah sintaksis pada kueri.`);
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal memvalidasi sintaks.");
    },
  });

  const deleteHistoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/sqltools/history/${id}`);
    },
    onSuccess: () => {
      toast.success("Riwayat SQL berhasil dihapus.");
      queryClient.invalidateQueries({ queryKey: ["sqlHistories"] });
    },
  });

  // Load Sample Query
  const handleLoadSample = async (sampleType: string) => {
    try {
      const res = await apiClient.get(`/sqltools/samples/${selectedDialect}?type=${sampleType}`);
      const query = res.data.data.query;
      setInputSql(query);
      setOutputSql("");
      setValidationResult(null);
      toast.success(`Sampel kueri (${sampleType.toUpperCase()}) dialek ${selectedDialect} dimuat!`);
    } catch {
      toast.error("Gagal memuat sampel kueri.");
    }
  };

  // Copy to Clipboard
  const handleCopy = () => {
    const textToCopy = outputSql || inputSql;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success("Kueri disalin ke clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Download SQL
  const handleDownload = () => {
    const text = outputSql || inputSql;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `query_${selectedDialect}_${Date.now()}.sql`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("File .sql berhasil diunduh.");
  };

  // Save Query with Name
  const handleSaveQuery = () => {
    if (!saveQueryName.trim()) {
      toast.error("Silakan masukkan nama kueri.");
      return;
    }
    formatMutation.mutate({ name: saveQueryName, taskId: selectedTaskId });
    setShowSaveModal(false);
    setSaveQueryName("");
  };

  // Run format on mount once
  useEffect(() => {
    if (inputSql && !outputSql) {
      formatMutation.mutate();
    }
  }, []);

  return (
    <div className="space-y-6 px-2 py-4 lg:px-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white shadow-md shadow-indigo-500/20">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                SQL Beautifier & Dialect Query Studio
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                FSD 5.15 — Format, minify, validasi sintaksis, dan pelajari 15+ dialek database dengan editor kueri visual.
              </p>
            </div>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowHistoryModal(true)}
            className="gap-1.5 text-xs font-semibold"
          >
            <History className="h-3.5 w-3.5 text-gray-500" />
            Riwayat ({histories.length})
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowSaveModal(true)}
            disabled={!inputSql.trim()}
            className="gap-1.5 text-xs font-semibold border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-900/40 dark:text-indigo-400"
          >
            <Save className="h-3.5 w-3.5" />
            Simpan Kueri
          </Button>

          <Button
            variant="outline"
            onClick={() => validateMutation.mutate()}
            disabled={validateMutation.isPending || !inputSql.trim()}
            className="gap-1.5 text-xs font-semibold"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Validasi
          </Button>

          <Button
            variant="outline"
            onClick={() => minifyMutation.mutate()}
            disabled={minifyMutation.isPending || !inputSql.trim()}
            className="gap-1.5 text-xs font-semibold"
          >
            <Minimize2 className="h-3.5 w-3.5 text-amber-500" />
            Minify 1-Line
          </Button>

          <Button
            onClick={() => formatMutation.mutate()}
            disabled={formatMutation.isPending || !inputSql.trim()}
            className="gap-1.5 bg-indigo-600 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Beautify SQL
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
              Setiap kueri SQL yang disimpan akan otomatis terasosiasi dengan tugas ini dalam riwayat.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 min-w-[260px] sm:min-w-[320px]">
          <select
            value={selectedTaskId ?? ""}
            onChange={(e) => setSelectedTaskId(e.target.value ? Number(e.target.value) : null)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-800 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
          >
            <option value="">— Tidak Ditautkan ke Tugas —</option>
            {tasks.map((t: any) => (
              <option key={t.id} value={t.id}>
                [TK-{String(t.id).padStart(4, "0")}] {t.title} {t.projectName ? `(${t.projectName})` : ""}
              </option>
            ))}
          </select>
          {selectedTaskId && (
            <span className="inline-flex items-center gap-1 shrink-0 rounded-lg bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <Check className="h-3 w-3" /> Terpilih
            </span>
          )}
        </div>
      </div>

      {/* Control Panel: Dialect, Samples, Formatting Options */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Dialect Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Dialek Database (15+ Didukung)
            </label>
            <div className="relative">
              <select
                value={selectedDialect}
                onChange={(e) => setSelectedDialect(e.target.value)}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs font-semibold text-gray-800 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
              >
                {dialects.length > 0 ? (
                  dialects.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.name} ({d.family})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="postgresql">PostgreSQL (Relational)</option>
                    <option value="mysql">MySQL (Relational)</option>
                    <option value="tsql">SQL Server T-SQL (Relational)</option>
                    <option value="oracle">Oracle PL/SQL (Relational)</option>
                    <option value="sqlite">SQLite (Embedded)</option>
                    <option value="bigquery">Google BigQuery (Cloud DW)</option>
                    <option value="snowflake">Snowflake (Cloud DW)</option>
                    <option value="redshift">Amazon Redshift (Cloud DW)</option>
                  </>
                )}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Sample Query Loader */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Muat Template Sampel Kueri
            </label>
            <div className="relative">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleLoadSample(e.target.value);
                    e.target.value = "";
                  }
                }}
                defaultValue=""
                className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs font-semibold text-gray-800 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
              >
                <option value="" disabled>
                  Pilih tipe sampel kueri...
                </option>
                <option value="cte">Common Table Expressions (CTE)</option>
                <option value="window">Window Functions & Ranking</option>
                <option value="basic">Standard SELECT & Aggregation</option>
                <option value="ddl">DDL Create Table & Indexes</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Keyword Casing */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Keyword Casing
            </label>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
              <button
                type="button"
                onClick={() => setCasing("Upper")}
                className={`rounded-lg py-1 text-center text-xs font-bold transition ${
                  casing === "Upper"
                    ? "bg-white text-indigo-700 shadow-xs dark:bg-gray-900 dark:text-indigo-400"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
                }`}
              >
                UPPER
              </button>
              <button
                type="button"
                onClick={() => setCasing("Lower")}
                className={`rounded-lg py-1 text-center text-xs font-bold transition ${
                  casing === "Lower"
                    ? "bg-white text-indigo-700 shadow-xs dark:bg-gray-900 dark:text-indigo-400"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
                }`}
              >
                lower
              </button>
              <button
                type="button"
                onClick={() => setCasing("Preserve")}
                className={`rounded-lg py-1 text-center text-xs font-bold transition ${
                  casing === "Preserve"
                    ? "bg-white text-indigo-700 shadow-xs dark:bg-gray-900 dark:text-indigo-400"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
                }`}
              >
                As-Is
              </button>
            </div>
          </div>

          {/* Comma & Indent Options */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Posisi Koma & Indent
            </label>
            <div className="flex gap-2">
              <select
                value={commaPosition}
                onChange={(e) => setCommaPosition(e.target.value as any)}
                className="w-1/2 rounded-xl border border-gray-200 bg-gray-50/50 px-2 py-1.5 text-xs font-semibold text-gray-800 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
              >
                <option value="EndOfLine">Koma di Akhir (Col,)</option>
                <option value="StartOfLine">Koma di Awal (, Col)</option>
              </select>

              <select
                value={indentSpaces}
                onChange={(e) => setIndentSpaces(Number(e.target.value))}
                className="w-1/2 rounded-xl border border-gray-200 bg-gray-50/50 px-2 py-1.5 text-xs font-semibold text-gray-800 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
              >
                <option value={2}>2 Spasi</option>
                <option value={4}>4 Spasi</option>
                <option value={0}>Tab Indent</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Syntax Diagnostic Banner */}
      {validationResult && (
        <div
          className={`rounded-2xl border p-4 transition ${
            validationResult.isValid
              ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/20"
              : "border-rose-200 bg-rose-50/60 dark:border-rose-900/60 dark:bg-rose-950/20"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {validationResult.isValid ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 mt-0.5" />
              )}
              <div>
                <h4
                  className={`text-xs font-bold ${
                    validationResult.isValid
                      ? "text-emerald-900 dark:text-emerald-300"
                      : "text-rose-900 dark:text-rose-300"
                  }`}
                >
                  {validationResult.isValid
                    ? `Sintaksis Kueri Valid — Terdeteksi Statement [${validationResult.statementType}]`
                    : `Ditemukan ${validationResult.errors.length} Kesalahan Sintaksis`}
                </h4>

                {validationResult.isValid ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                      Kata Kunci Terdeteksi:
                    </span>
                    {validationResult.detectedKeywords.slice(0, 10).map((kw) => (
                      <span
                        key={kw}
                        className="rounded bg-emerald-100 px-1.5 py-0.2 font-mono text-[10px] font-bold text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                ) : (
                  <ul className="mt-1.5 space-y-1">
                    {validationResult.errors.map((err, idx) => (
                      <li
                        key={idx}
                        className="font-mono text-[11px] text-rose-700 dark:text-rose-300"
                      >
                        • Baris {err.line}, Kolom {err.column}: {err.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setValidationResult(null)}
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
            >
              ×
            </Button>
          </div>
        </div>
      )}

      {/* Editor Grid: Raw Input vs Output */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Panel: Raw Input */}
        <div className="flex flex-col rounded-2xl border border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <FileCode className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Input SQL (Raw Script)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400 font-mono">
                {inputSql.length} karakter | {inputSql.split("\n").length} baris
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setInputSql("");
                  setOutputSql("");
                  setValidationResult(null);
                }}
                className="h-7 px-2 text-[11px] text-gray-500 hover:text-rose-600"
              >
                Bersihkan
              </Button>
            </div>
          </div>

          <div className="p-4 flex-1">
            <textarea
              rows={18}
              value={inputSql}
              onChange={(e) => setInputSql(e.target.value)}
              placeholder="Tempelkan atau ketik skrip SQL kueri Anda di sini..."
              className="w-full h-full resize-none rounded-xl border border-gray-200/60 bg-gray-50/50 p-4 font-mono text-xs leading-relaxed text-gray-900 outline-none focus:border-indigo-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
            />
          </div>
        </div>

        {/* Right Panel: Formatted Output */}
        <div className="flex flex-col rounded-2xl border border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                  activeTab === "formatted"
                    ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                }`}
              >
                {activeTab === "formatted" ? "Beautified SQL" : "Minified SQL"}
              </span>

              {metrics.elapsedMs > 0 && (
                <span className="text-[11px] font-mono text-gray-400">
                  ({metrics.elapsedMs} ms)
                </span>
              )}
            </div>

            {/* Actions for Output */}
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowSaveModal(true)}
                disabled={!outputSql}
                className="h-7 gap-1 px-2 text-[11px]"
              >
                <Save className="h-3 w-3 text-indigo-500" />
                Simpan
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleDownload}
                disabled={!outputSql}
                className="h-7 gap-1 px-2 text-[11px]"
              >
                <Download className="h-3 w-3 text-gray-500" />
                Unduh .sql
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                disabled={!outputSql}
                className="h-7 gap-1 px-2 text-[11px]"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : (
                  <Copy className="h-3 w-3 text-gray-500" />
                )}
                {copied ? "Tersalin" : "Salin"}
              </Button>
            </div>
          </div>

          <div className="p-4 flex-1">
            <textarea
              readOnly
              rows={18}
              value={outputSql}
              placeholder="Hasil pemformatan atau minifikasi query SQL yang rapi akan tampil di sini..."
              className="w-full h-full resize-none rounded-xl border border-gray-200/60 bg-gray-50/50 p-4 font-mono text-xs leading-relaxed text-indigo-700 outline-none dark:border-gray-800 dark:bg-gray-950 dark:text-indigo-300"
            />
          </div>

          {/* Footer Metrics */}
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-2.5 text-[11px] font-mono text-gray-400 dark:border-gray-800">
            <span>
              Total Baris: <strong className="text-gray-700 dark:text-gray-300">{metrics.lineCount}</strong> | Karakter:{" "}
              <strong className="text-gray-700 dark:text-gray-300">{metrics.charCount}</strong>
            </span>
            {metrics.compressionRatio !== undefined && (
              <span className="text-amber-600 dark:text-amber-400 font-bold">
                Rasio Kompresi: {metrics.compressionRatio}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Modal Riwayat Kueri (History Modal) */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <History className="h-5 w-5 text-indigo-600" />
              Riwayat Kueri SQL Tersimpan
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 max-h-96 space-y-3 overflow-y-auto">
            {histories.map((h) => (
              <div
                key={h.id}
                className="flex items-start justify-between rounded-xl border border-gray-200 p-3.5 transition hover:border-indigo-300 dark:border-gray-800"
              >
                <div className="flex-1 mr-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-gray-900 dark:text-white">
                      {h.name}
                    </span>
                    <span className="rounded bg-indigo-50 px-1.5 py-0.2 font-mono text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
                      {h.dialect}
                    </span>
                    {h.taskTitle && (
                      <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        <Tag className="h-2.5 w-2.5" />
                        {h.taskTitle}
                      </span>
                    )}
                  </div>
                  <pre className="mt-1.5 max-h-16 overflow-hidden text-ellipsis font-mono text-[11px] text-gray-500">
                    {h.content}
                  </pre>
                  <span className="mt-1 block text-[10px] text-gray-400 font-mono">
                    {new Date(h.createdAt).toLocaleString("id-ID")}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setInputSql(h.content);
                      setSelectedDialect(h.dialect.toLowerCase());
                      setShowHistoryModal(false);
                      toast.success(`Kueri "${h.name}" dimuat ke editor.`);
                    }}
                    className="h-8 gap-1 text-xs"
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    Muat
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteHistoryMutation.mutate(h.id)}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {histories.length === 0 && (
              <div className="py-8 text-center text-xs text-gray-400">
                Belum ada kueri SQL yang tersimpan dalam riwayat.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Simpan Kueri */}
      <Dialog open={showSaveModal} onOpenChange={setShowSaveModal}>
        <DialogContent className="max-w-md bg-white p-6 shadow-2xl dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-white">
              Simpan Kueri SQL ke Riwayat
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Nama Kueri / Deskripsi Singkat
              </label>
              <Input
                placeholder="Contoh: Query Rekapitulasi Finansial Bulanan"
                value={saveQueryName}
                onChange={(e) => setSaveQueryName(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Tautkan ke Tugas (Opsional)
              </label>
              <select
                value={selectedTaskId ?? ""}
                onChange={(e) => setSelectedTaskId(e.target.value ? Number(e.target.value) : null)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-800 shadow-2xs dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
              >
                <option value="">— Tidak Ditautkan ke Tugas —</option>
                {tasks.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    [TK-{String(t.id).padStart(4, "0")}] {t.title} {t.projectName ? `(${t.projectName})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowSaveModal(false)}>
                Batal
              </Button>
              <Button
                onClick={handleSaveQuery}
                disabled={!saveQueryName.trim()}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
