"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  FileSpreadsheet,
  Download,
  Building2,
  Calendar,
  Users,
  Archive,
  Info,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/tailgrids/core/dialog";
import { toast } from "sonner";

interface CompanyTimesheetExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompanyTimesheetExportModal({
  open,
  onOpenChange,
}: CompanyTimesheetExportModalProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);

  // 1. Query Companies
  const { data: companies = [], isLoading: loadingCompanies } = useQuery<any[]>({
    queryKey: ["exportCompanies"],
    queryFn: async () => {
      const res = await apiClient.get("/companies");
      return res.data?.data || [];
    },
    enabled: open,
  });

  const activeCompanyId = selectedCompanyId ?? companies[0]?.id ?? 1;
  const currentCompany = companies.find((c) => c.id === activeCompanyId) || companies[0];

  // 2. Query Periods for active company
  const { data: periods = [], isLoading: loadingPeriods } = useQuery<any[]>({
    queryKey: ["exportPeriods", activeCompanyId],
    queryFn: async () => {
      const res = await apiClient.get(`/companies/${activeCompanyId}/timesheet-periods`);
      return res.data?.data || [];
    },
    enabled: open && !!activeCompanyId,
  });

  // Auto-select latest active period if not selected
  const activePeriodId = selectedPeriodId ?? periods[0]?.id ?? null;
  const currentPeriod = periods.find((p) => p.id === activePeriodId);

  // 3. Query Members / Users in the company
  const { data: members = [], isLoading: loadingMembers } = useQuery<any[]>({
    queryKey: ["exportMembers", activeCompanyId],
    queryFn: async () => {
      const res = await apiClient.get(`/members?companyId=${activeCompanyId}`);
      return res.data?.data || [];
    },
    enabled: open && !!activeCompanyId,
  });

  // Handle Export File
  const handleExport = async () => {
    if (!activePeriodId) {
      toast.error("Silakan pilih periode cut-off timesheet terlebih dahulu.");
      return;
    }

    try {
      setIsExporting(true);
      const isBulk = selectedUserId === "all";
      const toastId = "exportCompanyTimesheet";

      toast.loading(
        isBulk
          ? "Menghasilkan paket arsip ZIP untuk semua personel..."
          : "Menyusun file Excel format standar perusahaan...",
        { id: toastId }
      );

      const response = await apiClient.get("/timesheets/export/company-template", {
        params: {
          periodId: activePeriodId,
          companyId: activeCompanyId,
          userId: selectedUserId,
        },
        responseType: "blob",
      });

      // Determine filename from content-disposition header if available
      let fileName = "";
      const contentDisposition = response.headers["content-disposition"];
      if (contentDisposition) {
        const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
        if (match && match[1]) {
          fileName = decodeURIComponent(match[1]);
        }
      }

      if (!fileName) {
        const companyCode = currentCompany?.code || "ELISTEC";
        const periodCode = currentPeriod?.periodCode?.replace("/", "-") || "PERIOD";
        if (isBulk) {
          fileName = `Timesheets_${companyCode}_${periodCode}_${new Date().toISOString().slice(0, 10)}.zip`;
        } else {
          const userObj = members.find((m: any) => m.id === selectedUserId);
          const userName = userObj?.fullName || userObj?.userName || "User";
          fileName = `Timesheet_${companyCode}_${periodCode}_${userName}.xlsx`;
        }
      }

      const mimeType = isBulk
        ? "application/zip"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success(
        isBulk
          ? "File arsip ZIP berhasil diunduh!"
          : "File Excel timesheet standar berhasil diunduh!",
        { id: toastId }
      );

      onOpenChange(false);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Gagal melakukan ekspor berkas timesheet standar.",
        { id: "exportCompanyTimesheet" }
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white p-6 shadow-2xl dark:bg-gray-900 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-gray-900 dark:text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <span>Ekspor Timesheet Standar Perusahaan</span>
              <p className="text-xs font-normal text-gray-500 dark:text-gray-400 mt-0.5">
                Format resmi ClosedXML sesuai template &amp; cut-off bulanan (ELISTEC)
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-5 space-y-4">
          {/* Perusahaan Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-indigo-500" />
              Perusahaan / Tenant
            </label>
            <select
              value={activeCompanyId}
              onChange={(e) => {
                setSelectedCompanyId(Number(e.target.value));
                setSelectedPeriodId(null);
              }}
              disabled={loadingCompanies || isExporting}
              className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
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
              <Calendar className="h-3.5 w-3.5 text-indigo-500" />
              Periode Cut-Off Timesheet *
            </label>
            {periods.length === 0 && !loadingPeriods ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                Belum ada kalender periode cut-off yang dibuat untuk perusahaan ini. Silakan buat
                periode terlebih dahulu di menu <strong>Pengaturan &gt; Master Data &gt; Template Timesheet</strong>.
              </div>
            ) : (
              <select
                value={activePeriodId || ""}
                onChange={(e) => setSelectedPeriodId(Number(e.target.value))}
                disabled={loadingPeriods || isExporting}
                className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} [{p.periodCode}] &bull; {p.startDate} s/d {p.endDate} ({p.workingDaysCount} Hari Kerja)
                    {p.isClosed ? " (Terkunci)" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Active Period Details Card */}
          {currentPeriod && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 dark:border-indigo-950 dark:bg-indigo-950/30">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-indigo-900 dark:text-indigo-200">
                  {currentPeriod.name} ({currentPeriod.periodCode})
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-200/60 px-2.5 py-0.5 text-[11px] font-bold text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300">
                  <Clock className="h-3 w-3" />
                  {currentPeriod.workingDaysCount} Hari Kerja
                </span>
              </div>
              <p className="mt-1 text-[11px] text-indigo-700 dark:text-indigo-300">
                Rentang: <strong>{currentPeriod.startDate}</strong> s/d{" "}
                <strong>{currentPeriod.endDate}</strong>
              </p>
              {currentPeriod.notes && (
                <p className="mt-1 text-[11px] italic text-indigo-600 dark:text-indigo-400">
                  &ldquo;{currentPeriod.notes}&rdquo;
                </p>
              )}
            </div>
          )}

          {/* Pengguna / Mode Ekspor */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-indigo-500" />
              Target Ekspor Personel
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={loadingMembers || isExporting}
              className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-900 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
            >
              <option value="all">
                📦 Semua Anggota Tim (Bulk ZIP Archive - Berisi .xlsx Setiap Personel)
              </option>
              <optgroup label="Pilih Individu (Single .xlsx)">
                {members.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName || m.userName} ({m.email})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Info Banner */}
          <div className="flex items-start gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 text-[11px] text-gray-600 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-400">
            <Info className="h-4 w-4 shrink-0 text-indigo-500 mt-0.5" />
            <span>
              Berkas diekspor menggunakan engine injeksi template ClosedXML. Baris akhir pekan (Sabtu/Minggu)
              akan ditambahkan secara otomatis dengan 0 jam, formula Man-Days <code>=Hours/8</code>, dan total
              jam <code>=SUM(...)</code> terformat rapi.
            </span>
          </div>

          {/* Modal Actions */}
          <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-gray-100 pt-4 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              disabled={isExporting}
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleExport}
              disabled={!activePeriodId || isExporting}
              className="gap-2 bg-indigo-600 font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700"
            >
              {selectedUserId === "all" ? (
                <>
                  <Archive className="h-4 w-4" />
                  {isExporting ? "Membuat Berkas ZIP..." : "Unduh Bulk ZIP (.zip)"}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  {isExporting ? "Mengunduh Excel..." : "Unduh Timesheet (.xlsx)"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
