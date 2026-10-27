"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  Sparkles,
  Building2,
  Calendar,
  Users,
  Clock,
  RefreshCw,
  Info,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/tailgrids/core/dialog";
import { toast } from "sonner";

interface AutomatedTimesheetGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AutomatedTimesheetGeneratorModal({
  open,
  onOpenChange,
  onSuccess,
}: AutomatedTimesheetGeneratorModalProps) {
  const queryClient = useQueryClient();

  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [mode, setMode] = useState<"Overwrite" | "FillEmptyOnly">("Overwrite");

  // 1. Query Companies
  const { data: companies = [], isLoading: loadingCompanies } = useQuery<any[]>({
    queryKey: ["autoGenCompanies"],
    queryFn: async () => {
      const res = await apiClient.get("/companies");
      return res.data?.data || [];
    },
    enabled: open,
  });

  const activeCompanyId = selectedCompanyId ?? companies[0]?.id ?? 1;

  // 2. Query Periods
  const { data: periods = [], isLoading: loadingPeriods } = useQuery<any[]>({
    queryKey: ["autoGenPeriods", activeCompanyId],
    queryFn: async () => {
      const res = await apiClient.get(`/companies/${activeCompanyId}/timesheet-periods`);
      return res.data?.data || [];
    },
    enabled: open && !!activeCompanyId,
  });

  const activePeriodId = selectedPeriodId ?? periods[0]?.id ?? null;
  const currentPeriod = periods.find((p) => p.id === activePeriodId);

  // 3. Query Members
  const { data: members = [], isLoading: loadingMembers } = useQuery<any[]>({
    queryKey: ["autoGenMembers", activeCompanyId],
    queryFn: async () => {
      const res = await apiClient.get(`/members?companyId=${activeCompanyId}`);
      return res.data?.data || [];
    },
    enabled: open && !!activeCompanyId,
  });

  // Mutation to execute auto-generate
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!activePeriodId) {
        throw new Error("Silakan pilih periode cut-off timesheet terlebih dahulu.");
      }

      const res = await apiClient.post("/timesheets/auto-generate", {
        companyId: activeCompanyId,
        periodId: activePeriodId,
        userId: selectedUserId,
        mode,
      });
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success(
        data?.message || "Timesheet dan absensi berhasil digenerate otomatis!",
        { duration: 5000 }
      );
      queryClient.invalidateQueries({ queryKey: ["timesheetSessions"] });
      queryClient.invalidateQueries({ queryKey: ["timesheetSummary"] });
      queryClient.invalidateQueries({ queryKey: ["activeTimers"] });
      queryClient.invalidateQueries({ queryKey: ["tasksList"] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Gagal meng-generate timesheet otomatis."
      );
    },
  });

  const workingDays = currentPeriod?.workingDaysCount ?? 0;
  const totalExpectedHours = workingDays * 8;
  const targetPersonnelCount =
    selectedUserId === "all" ? members.length : 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-white p-6 shadow-2xl dark:bg-gray-900 rounded-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-gray-900 dark:text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span>Generate Timesheet Otomatis Administrator</span>
              <p className="text-xs font-normal text-gray-500 dark:text-gray-400 mt-0.5">
                Konversi data tugas ke log timesheet 8 jam/hari (1 tugas = 1 hari penuh, 1 totalan per tugas)
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-5 space-y-4">
          {/* Perusahaan Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-emerald-600" />
              Perusahaan / Tenant
            </label>
            <select
              value={activeCompanyId}
              onChange={(e) => {
                setSelectedCompanyId(Number(e.target.value));
                setSelectedPeriodId(null);
              }}
              disabled={loadingCompanies || generateMutation.isPending}
              className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 shadow-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Periode Cut-Off Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-emerald-600" />
              Periode Cut-Off Timesheet *
            </label>
            {periods.length === 0 && !loadingPeriods ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                Belum ada kalender periode cut-off. Buat periode di{" "}
                <strong>Pengaturan &gt; Master Data &gt; Template Timesheet</strong>.
              </div>
            ) : (
              <select
                value={activePeriodId || ""}
                onChange={(e) => setSelectedPeriodId(Number(e.target.value))}
                disabled={loadingPeriods || generateMutation.isPending}
                className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 shadow-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} [{p.periodCode}] &bull; {p.startDate} s/d {p.endDate} ({p.workingDaysCount} Hari Kerja)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Target Personel */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-emerald-600" />
              Target Personel
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={loadingMembers || generateMutation.isPending}
              className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 shadow-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
            >
              <option value="all">
                👥 Semua Anggota Tim ({members.length} Personel Aktif)
              </option>
              <optgroup label="Pilih Individu Spesifik">
                {members.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName || m.userName} ({m.email})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Mode Penanganan Data */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-emerald-600" />
              Mode Pemrosesan Data Timesheet
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label
                className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                  mode === "Overwrite"
                    ? "border-emerald-500 bg-emerald-50/70 dark:border-emerald-500 dark:bg-emerald-950/30"
                    : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-800"
                }`}
              >
                <input
                  type="radio"
                  name="genMode"
                  value="Overwrite"
                  checked={mode === "Overwrite"}
                  onChange={() => setMode("Overwrite")}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="text-xs font-bold text-gray-900 dark:text-white block">
                    Timpa Ulang (Overwrite)
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    Menghapus log sesi lama pada periode ini dan membuat ulang dari daftar tugas personel (8 jam per hari).
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                  mode === "FillEmptyOnly"
                    ? "border-emerald-500 bg-emerald-50/70 dark:border-emerald-500 dark:bg-emerald-950/30"
                    : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-800"
                }`}
              >
                <input
                  type="radio"
                  name="genMode"
                  value="FillEmptyOnly"
                  checked={mode === "FillEmptyOnly"}
                  onChange={() => setMode("FillEmptyOnly")}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="text-xs font-bold text-gray-900 dark:text-white block">
                    Lengkapi Hari Kosong
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    Hanya mengisi hari kerja yang belum memiliki total pengerjaan minimal 8 jam.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Metric & Calculation Summary Card */}
          {currentPeriod && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-950 dark:bg-emerald-950/30 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-200">
                <span>Ringkasan Rencana Eksekusi:</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-200/70 px-2.5 py-0.5 text-[11px] text-emerald-900 dark:bg-emerald-900 dark:text-emerald-300">
                  <Clock className="h-3 w-3" />
                  Maks. {workingDays} Hari Kerja Periode
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                <div className="bg-white/80 dark:bg-gray-800/80 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-gray-500 dark:text-gray-400 block text-[10px]">Basis Alokasi</span>
                  <span className="font-bold text-gray-900 dark:text-white text-xs">1 Tugas = 1 Hari (8 Jam)</span>
                </div>
                <div className="bg-white/80 dark:bg-gray-800/80 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-gray-500 dark:text-gray-400 block text-[10px]">Target Personel</span>
                  <span className="font-bold text-gray-900 dark:text-white text-xs">{targetPersonnelCount} Orang</span>
                </div>
                <div className="bg-white/80 dark:bg-gray-800/80 p-2 rounded-lg border border-emerald-100 dark:border-emerald-900/40 col-span-2 sm:col-span-1">
                  <span className="text-gray-500 dark:text-gray-400 block text-[10px]">Batas Maks. Periode</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                    {totalExpectedHours} Jam/Orang
                  </span>
                </div>
              </div>

              <div className="pt-1 text-[11px] text-emerald-800 dark:text-emerald-300 space-y-1">
                <p className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Penentuan Hari: <strong>Sesuai jumlah data tugas</strong> unik yang dimiliki tiap personel (tidak dipaksakan rotasi berulang).
                  </span>
                </p>
                <p className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Totalan Harian: Tugas dalam sehari <strong>langsung menjadi 1 totalan</strong> (misal 1 baris Tugas A = 8 jam).
                  </span>
                </p>
                <p className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Jadwal & Absensi: <strong>08:00 - 17:00 WIB</strong> &bull; Absensi WFO otomatis tercatat pada hari kerja yang ada tugasnya.
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-gray-100 pt-4 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              disabled={generateMutation.isPending}
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => generateMutation.mutate()}
              disabled={!activePeriodId || generateMutation.isPending}
              className="gap-2 bg-emerald-600 font-semibold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-700"
            >
              {generateMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Meng-generate Timesheet...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Timesheet Sekarang
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
