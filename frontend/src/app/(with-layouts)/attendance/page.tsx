"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building,
  Home,
  MapPin,
  Globe,
  Edit2,
  Plus,
  Palmtree,
  HeartPulse,
  FileText,
  Briefcase,
  User,
  Filter,
  Check,
  Users,
  LayoutGrid,
  ListFilter,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/tailgrids/core/dialog";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";

const locationLabels: Record<number, string> = {
  1: "WFO (Kantor)",
  2: "WFH (Rumah)",
  3: "Dinas Lapangan",
  4: "Remote",
};

const attendanceTypeLabels: Record<number, { label: string; color: string }> = {
  1: { label: "Hadir", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" },
  2: { label: "Cuti (Leave)", color: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800" },
  3: { label: "Sakit (Sick)", color: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800" },
  4: { label: "Izin (Permit)", color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
  5: { label: "Dinas Luar", color: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800" },
  6: { label: "Libur (Holiday)", color: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-800" },
};

const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const currentDate = new Date();
  const { isAdmin, userId: currentUserId, user: currentUser } = useCurrentUser();

  // Tab & Filter states
  const [activeTab, setActiveTab] = useState<"personal" | "reconciliation">("personal");

  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [reconcileDate, setReconcileDate] = useState(
    currentDate.toISOString().split("T")[0]
  );
  const [reconciliationView, setReconciliationView] = useState<"monthly" | "daily">("monthly");
  const [reconcileMonth, setReconcileMonth] = useState(currentDate.getMonth() + 1);
  const [reconcileYear, setReconcileYear] = useState(currentDate.getFullYear());

  // Live Timer State (Clock In Berjalan)
  const [liveTimer, setLiveTimer] = useState<string>("00:00:00");

  // Clock In / Out states
  const [workLocation, setWorkLocation] = useState(1);
  const [clockNotes, setClockNotes] = useState("");

  // Helper to open manual entry modal
  const openManualModal = (targetUser?: string) => {
    setManualUserId(isAdmin ? (targetUser || "") : (currentUserId || ""));
    setManualDate(currentDate.toISOString().split("T")[0]);
    setManualType(1);
    setManualLoc(1);
    setManualTimeIn("08:30");
    setManualTimeOut("17:30");
    setManualLeaveReason("");
    setManualNotes("");
    setManualModalOpen(true);
  };

  // Leave Modal State
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveDate, setLeaveDate] = useState(
    currentDate.toISOString().split("T")[0]
  );
  const [leaveType, setLeaveType] = useState(2); // Default Cuti
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveNotes, setLeaveNotes] = useState("");

  // Reconcile Edit Modal state
  const [reconcileModalOpen, setReconcileModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [reconcileType, setReconcileType] = useState(1);
  const [reconcileLoc, setReconcileLoc] = useState(1);
  const [reconcileClockIn, setReconcileClockIn] = useState("");
  const [reconcileClockOut, setReconcileClockOut] = useState("");
  const [reconcileLeaveReason, setReconcileLeaveReason] = useState("");
  const [reconcileNotes, setReconcileNotes] = useState("");

  // Manual Entry Modal state (Admin / Personal)
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualUserId, setManualUserId] = useState("");
  const [manualDate, setManualDate] = useState(
    currentDate.toISOString().split("T")[0]
  );
  const [manualType, setManualType] = useState(1);
  const [manualLoc, setManualLoc] = useState(1);
  const [manualTimeIn, setManualTimeIn] = useState("08:30");
  const [manualTimeOut, setManualTimeOut] = useState("17:30");
  const [manualLeaveReason, setManualLeaveReason] = useState("");
  const [manualNotes, setManualNotes] = useState("");

  // Durasi jam kerja untuk entri presensi manual (selisih waktu masuk & pulang)
  const manualDuration = useMemo(() => {
    if (!manualTimeIn || !manualTimeOut) return null;
    const [inH, inM] = manualTimeIn.split(":").map(Number);
    const [outH, outM] = manualTimeOut.split(":").map(Number);
    if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) return null;

    let diffMinutes = (outH * 60 + outM) - (inH * 60 + inM);
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60; // Dukungan shift malam / lintas hari
    }
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    const decimalHours = (diffMinutes / 60).toFixed(2);

    return {
      diffMinutes,
      hours,
      mins,
      decimalHours,
      formatted: `${hours} Jam ${mins} Menit (${decimalHours} Jam)`,
    };
  }, [manualTimeIn, manualTimeOut]);

  // 1. Status Today
  const { data: todayStatus } = useQuery<any>({
    queryKey: ["attendanceTodayStatus"],
    queryFn: async () => {
      const res = await apiClient.get("/attendances/today");
      return res.data.data;
    },
  });

  // Live ticking timer effect for clocked in session
  useEffect(() => {
    if (
      todayStatus?.hasClockedIn &&
      !todayStatus?.hasClockedOut &&
      todayStatus?.type === 1 &&
      todayStatus?.clockInTime
    ) {
      const clockInDate = new Date(todayStatus.clockInTime).getTime();
      const updateTimer = () => {
        const now = Date.now();
        const diffSeconds = Math.max(0, Math.floor((now - clockInDate) / 1000));
        const hours = Math.floor(diffSeconds / 3600);
        const minutes = Math.floor((diffSeconds % 3600) / 60);
        const seconds = diffSeconds % 60;
        setLiveTimer(
          `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
        );
      };
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setLiveTimer("00:00:00");
    }
  }, [todayStatus]);

  // 2. Personal History
  const { data: myHistory = [] } = useQuery<any[]>({
    queryKey: ["attendanceMyHistory", selectedMonth, selectedYear],
    queryFn: async () => {
      const res = await apiClient.get(
        `/attendances/my-history?month=${selectedMonth}&year=${selectedYear}`
      );
      return res.data.data;
    },
  });

  // 3. Personal Monthly Summary
  const { data: mySummary } = useQuery<any>({
    queryKey: ["attendanceMySummary", selectedMonth, selectedYear],
    queryFn: async () => {
      const res = await apiClient.get(
        `/attendances/my-summary?month=${selectedMonth}&year=${selectedYear}`
      );
      return res.data.data;
    },
  });

  // 4. Team Daily Reconciliation (Admin)
  const { data: reconciliation = [] } = useQuery<any[]>({
    queryKey: ["attendanceReconciliation", reconcileDate],
    queryFn: async () => {
      const res = await apiClient.get(
        `/attendances/reconciliation?date=${reconcileDate}`
      );
      return res.data.data;
    },
    enabled: activeTab === "reconciliation" && reconciliationView === "daily",
  });

  // 5. Team Monthly Reconciliation Report (Admin)
  const { data: teamMonthlyReport, isLoading: loadingMonthly } = useQuery<any>({
    queryKey: ["teamMonthlyAttendance", reconcileMonth, reconcileYear],
    queryFn: async () => {
      const res = await apiClient.get(
        `/attendances/monthly?month=${reconcileMonth}&year=${reconcileYear}`
      );
      return res.data.data;
    },
    enabled: activeTab === "reconciliation" && reconciliationView === "monthly",
  });

  // 6. Team Members (for manual entry - admin only)
  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["membersListForAttendance"],
    queryFn: async () => {
      const res = await apiClient.get("/members");
      return res.data.data;
    },
    enabled: manualModalOpen && isAdmin,
  });

  // Clock In Mutation
  const clockInMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/attendances/clock-in", {
        workLocation,
        notes: clockNotes,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Clock In berhasil! Selamat bekerja.");
      setClockNotes("");
      queryClient.invalidateQueries({ queryKey: ["attendanceTodayStatus"] });
      queryClient.invalidateQueries({ queryKey: ["attendanceMyHistory"] });
      queryClient.invalidateQueries({ queryKey: ["attendanceMySummary"] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Gagal melakukan Clock In"),
  });

  // Clock Out Mutation
  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/attendances/clock-out", {
        notes: clockNotes,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Clock Out berhasil! Total jam kerja: ${data.totalHours} Jam.`);
      setClockNotes("");
      queryClient.invalidateQueries({ queryKey: ["attendanceTodayStatus"] });
      queryClient.invalidateQueries({ queryKey: ["attendanceMyHistory"] });
      queryClient.invalidateQueries({ queryKey: ["attendanceMySummary"] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Gagal melakukan Clock Out"),
  });

  // Submit Leave (Izin/Sakit/Cuti/Dinas) Mutation
  const submitLeaveMutation = useMutation({
    mutationFn: async () => {
      if (!leaveReason.trim()) {
        throw new Error("Alasan pengajuan wajib diisi.");
      }
      const res = await apiClient.post("/attendances/leave", {
        date: leaveDate,
        type: leaveType,
        leaveReason: leaveReason.trim(),
        notes: leaveNotes.trim() || null,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Pengajuan presensi berhasil dicatat!");
      setLeaveModalOpen(false);
      setLeaveReason("");
      setLeaveNotes("");
      queryClient.invalidateQueries({ queryKey: ["attendanceTodayStatus"] });
      queryClient.invalidateQueries({ queryKey: ["attendanceMyHistory"] });
      queryClient.invalidateQueries({ queryKey: ["attendanceMySummary"] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || err.message || "Gagal mengajukan izin"),
  });

  // Reconcile Mutation (Admin or Self)
  const reconcileMutation = useMutation({
    mutationFn: async () => {
      if (!isAdmin && selectedRecord?.userId !== currentUserId) {
        throw new Error("Anda hanya dapat mengoreksi data presensi Anda sendiri.");
      }
      const res = await apiClient.put(
        `/attendances/reconciliation/${selectedRecord.id}`,
        {
          id: selectedRecord.id,
          type: reconcileType,
          workLocation: reconcileLoc,
          clockIn: reconcileClockIn ? new Date(reconcileClockIn).toISOString() : null,
          clockOut: reconcileClockOut ? new Date(reconcileClockOut).toISOString() : null,
          leaveReason: reconcileLeaveReason || null,
          notes: reconcileNotes || null,
        }
      );
      return res.data;
    },
    onSuccess: () => {
      toast.success("Presensi berhasil direkonsiliasi!");
      setReconcileModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["attendanceTodayStatus"] });
      queryClient.invalidateQueries({ queryKey: ["attendanceMyHistory"] });
      queryClient.invalidateQueries({ queryKey: ["attendanceMySummary"] });
      queryClient.invalidateQueries({ queryKey: ["attendanceReconciliation"] });
      queryClient.invalidateQueries({ queryKey: ["teamMonthlyAttendance"] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || err.message || "Gagal menyimpan rekonsiliasi"),
  });

  // Manual Entry Mutation (Admin can record for all, Non-Admin records for self)
  const manualEntryMutation = useMutation({
    mutationFn: async () => {
      const targetUserId = isAdmin ? manualUserId : (currentUserId || manualUserId);
      if (!targetUserId) {
        throw new Error(isAdmin ? "Pilih anggota tim terlebih dahulu." : "Sesi pengguna tidak valid.");
      }

      let clockInIso: string | null = null;
      let clockOutIso: string | null = null;

      if (manualType === 1) {
        if (manualTimeIn) {
          const inDate = new Date(`${manualDate}T${manualTimeIn}:00`);
          if (!isNaN(inDate.getTime())) {
            clockInIso = inDate.toISOString();
          }
        }
        if (manualTimeOut) {
          const outDate = new Date(`${manualDate}T${manualTimeOut}:00`);
          if (!isNaN(outDate.getTime())) {
            if (manualTimeIn && manualTimeOut < manualTimeIn) {
              outDate.setDate(outDate.getDate() + 1);
            }
            clockOutIso = outDate.toISOString();
          }
        }
      }

      const isWfo = manualType === 1 && manualLoc === 1;

      const res = await apiClient.post("/attendances/reconciliation/manual-entry", {
        userId: targetUserId,
        date: manualDate,
        type: manualType,
        workLocation: manualLoc,
        clockIn: clockInIso,
        clockOut: clockOutIso,
        leaveReason: isWfo ? null : (manualLeaveReason.trim() || null),
        notes: manualNotes.trim() || null,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success(isAdmin ? "Presensi manual anggota berhasil disimpan!" : "Presensi manual Anda berhasil dicatat!");
      setManualModalOpen(false);
      if (isAdmin) setManualUserId("");
      setManualTimeIn("08:30");
      setManualTimeOut("17:30");
      setManualLeaveReason("");
      setManualNotes("");
      queryClient.invalidateQueries({ queryKey: ["attendanceTodayStatus"] });
      queryClient.invalidateQueries({ queryKey: ["attendanceMyHistory"] });
      queryClient.invalidateQueries({ queryKey: ["attendanceMySummary"] });
      queryClient.invalidateQueries({ queryKey: ["attendanceReconciliation"] });
      queryClient.invalidateQueries({ queryKey: ["teamMonthlyAttendance"] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || err.message || "Gagal menyimpan presensi manual"),
  });

  return (
    <div className="space-y-6 px-2 py-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Presensi Terpadu & Rekonsiliasi Tim
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Pencatatan 1-click Clock In / Out, pengajuan izin/sakit/cuti, lokasi kerja, dan rekonsiliasi tim.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          <button
            onClick={() => setActiveTab("personal")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              activeTab === "personal"
                ? "bg-card-background text-primary-500 shadow-xs"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
            }`}
          >
            Presensi Mandiri
          </button>
          <button
            onClick={() => setActiveTab("reconciliation")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              activeTab === "reconciliation"
                ? "bg-card-background text-primary-500 shadow-xs"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
            }`}
          >
            Presensi & Rekonsiliasi Tim
          </button>
        </div>
      </div>

      {activeTab === "personal" ? (
        <div className="space-y-6">
          {/* Quick Clock In/Out Hero Card */}
          <div className="rounded-2xl border border-card-border bg-gradient-to-br from-primary-500/10 via-card-background to-card-background p-6 shadow-xs text-text-primary">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary-500 dark:text-primary-400">
                  Status Presensi Hari Ini
                </span>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">
                    {todayStatus?.type && todayStatus.type !== 1
                      ? `Status: ${attendanceTypeLabels[todayStatus.type]?.label || "Non-Hadir"}`
                      : todayStatus?.hasClockedOut
                      ? `Presensi Selesai (${todayStatus.totalHours} Jam Kerja)`
                      : todayStatus?.hasClockedIn
                      ? "Sedang Bekerja (Clock In Aktif)"
                      : "Belum Melakukan Presensi Hari Ini"}
                  </h3>

                  {todayStatus?.hasClockedIn && !todayStatus?.hasClockedOut && todayStatus?.type === 1 && (
                    <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs shadow-xs dark:bg-emerald-950/40">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <span className="font-mono text-sm font-black tracking-wider text-emerald-800 dark:text-emerald-200">
                        {liveTimer}
                      </span>
                      <span className="rounded bg-emerald-600 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                        LIVE
                      </span>
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {todayStatus?.clockInTime ? (
                    <>
                      Masuk:{" "}
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {new Date(todayStatus.clockInTime).toLocaleTimeString("id-ID")}
                      </span>{" "}
                      | Lokasi:{" "}
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {locationLabels[todayStatus.workLocation]}
                      </span>
                    </>
                  ) : todayStatus?.notes ? (
                    `Keterangan: ${todayStatus.notes}`
                  ) : (
                    "Silakan lakukan Clock In saat mulai bekerja atau ajukan izin/cuti jika berhalangan hadir."
                  )}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                {!todayStatus?.hasClockedIn && (!todayStatus?.type || todayStatus.type === 1) ? (
                  <>
                    <select
                      value={workLocation}
                      onChange={(e) => setWorkLocation(Number(e.target.value))}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-xs dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
                    >
                      <option value={1}>🏢 WFO (Kantor)</option>
                      <option value={2}>🏠 WFH (Rumah)</option>
                      <option value={3}>🚗 Dinas Lapangan</option>
                      <option value={4}>🌐 Remote</option>
                    </select>

                    <Button
                      onClick={() => clockInMutation.mutate()}
                      disabled={clockInMutation.isPending}
                      className="gap-2 bg-emerald-600 font-bold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-700 text-xs"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Clock In (Masuk)
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setLeaveModalOpen(true)}
                      className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/40 text-xs"
                    >
                      <Palmtree className="h-4 w-4 text-amber-600" />
                      Ajukan Izin / Cuti
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => openManualModal()}
                      className="gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950/40 text-xs"
                      title="Catat manual jam masuk dan pulang jika berhalangan clock in/out di sistem secara langsung"
                    >
                      <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      Presensi Manual
                    </Button>
                  </>
                ) : !todayStatus?.hasClockedOut && todayStatus?.type === 1 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      placeholder="Catatan/rangkuman pekerjaan hari ini..."
                      value={clockNotes}
                      onChange={(e) => setClockNotes(e.target.value)}
                      className="w-64 text-xs"
                    />
                    <Button
                      onClick={() => clockOutMutation.mutate()}
                      disabled={clockOutMutation.isPending}
                      className="gap-2 bg-amber-600 font-bold text-white shadow-md shadow-amber-500/20 hover:bg-amber-700 text-xs"
                    >
                      <Clock className="h-4 w-4" />
                      Clock Out (Pulang)
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openManualModal()}
                      className="gap-1 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-400"
                    >
                      Presensi Manual
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-xl bg-emerald-100 px-3.5 py-1.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      Presensi Tercatat
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLeaveModalOpen(true)}
                      className="gap-1 text-xs"
                    >
                      Ubah Status Hari Ini
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openManualModal()}
                      className="gap-1 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-400"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      Catat Presensi Manual
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Monthly Statistics Summary Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-card-border bg-card-background p-4 shadow-xs text-text-primary">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-xs font-semibold">Total Hadir</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400">
                  <Building className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
                {mySummary?.totalDaysPresent ?? 0}{" "}
                <span className="text-xs font-normal text-gray-500">Hari</span>
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">Bulan {monthNames[selectedMonth - 1]}</p>
            </div>

            <div className="rounded-2xl border border-card-border bg-card-background p-4 shadow-xs text-text-primary">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-xs font-semibold">Rata-rata Jam/Hari</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-950/80 dark:text-primary-300">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
                {mySummary?.averageDailyHours ?? 0}{" "}
                <span className="text-xs font-normal text-gray-500">Jam</span>
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">Total {mySummary?.totalWorkingHours ?? 0} Jam</p>
            </div>

            <div className="rounded-2xl border border-card-border bg-card-background p-4 shadow-xs text-text-primary">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-xs font-semibold">Izin & Dinas</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400">
                  <Briefcase className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
                {(mySummary?.totalDaysPermission ?? 0) + (mySummary?.totalDaysBusinessTrip ?? 0)}{" "}
                <span className="text-xs font-normal text-gray-500">Hari</span>
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {mySummary?.totalDaysPermission ?? 0} Izin, {mySummary?.totalDaysBusinessTrip ?? 0} Dinas
              </p>
            </div>

            <div className="rounded-2xl border border-card-border bg-card-background p-4 shadow-xs text-text-primary">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-xs font-semibold">Cuti & Sakit</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/80 dark:text-sky-400">
                  <Palmtree className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
                {(mySummary?.totalDaysLeave ?? 0) + (mySummary?.totalDaysSick ?? 0)}{" "}
                <span className="text-xs font-normal text-gray-500">Hari</span>
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {mySummary?.totalDaysLeave ?? 0} Cuti, {mySummary?.totalDaysSick ?? 0} Sakit
              </p>
            </div>
          </div>

          {/* Personal History Table with Month/Year Filter */}
          <div className="rounded-2xl border border-card-border bg-card-background p-5 shadow-xs text-text-primary">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                  Riwayat Kehadiran Pribadi
                </h4>
                <p className="text-[11px] text-gray-500">
                  Periode {monthNames[selectedMonth - 1]} {selectedYear}
                </p>
              </div>

              {/* Month/Year Picker and Manual Entry Action */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => openManualModal()}
                  className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Presensi Manual
                </Button>

                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 shadow-xs dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
                >
                  {monthNames.map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 shadow-xs dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
                >
                  {[2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/75 dark:border-gray-800 dark:bg-gray-800/50">
                    <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Tanggal</th>
                    <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Status</th>
                    <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Lokasi</th>
                    <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Masuk</th>
                    <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Pulang</th>
                    <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Durasi Kerja</th>
                    <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Catatan / Alasan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {myHistory.map((h: any) => {
                    const typeConfig = attendanceTypeLabels[h.type] || attendanceTypeLabels[1];
                    return (
                      <tr key={h.id} className="transition hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                          {h.date}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold ${typeConfig.color}`}
                          >
                            {typeConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                          {h.type === 1 ? locationLabels[h.workLocation] : "-"}
                        </td>
                        <td className="px-4 py-3 font-mono text-emerald-600 dark:text-emerald-400">
                          {h.clockIn ? new Date(h.clockIn).toLocaleTimeString("id-ID") : "-"}
                        </td>
                        <td className="px-4 py-3 font-mono text-amber-600 dark:text-amber-400">
                          {h.clockOut ? new Date(h.clockOut).toLocaleTimeString("id-ID") : "-"}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-gray-900 dark:text-white">
                          {h.totalHours > 0 ? `${h.totalHours} Jam` : "-"}
                        </td>
                        <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                          {h.leaveReason || h.notes || "-"}
                        </td>
                      </tr>
                    );
                  })}

                  {myHistory.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400">
                        Belum ada riwayat kehadiran untuk periode ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Team Reconciliation Tab (Admin Only) */
        <div className="space-y-5">
          {/* Sub-view Switcher & Action Bar */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                    <Users className="h-3.5 w-3.5" />
                  </span>
                  <h4 className="font-bold text-base text-gray-900 dark:text-white">
                    Rekonsiliasi & Audit Kehadiran Tim
                  </h4>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Pantau rekapitulasi kehadiran bulanan seluruh staf, audit log presensi per tanggal, dan lakukan koreksi data.
                </p>
              </div>

              {/* View Switcher Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
                  <button
                    onClick={() => setReconciliationView("monthly")}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      reconciliationView === "monthly"
                        ? "bg-white text-indigo-700 shadow-xs dark:bg-gray-900 dark:text-indigo-400"
                        : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Rekapitulasi Bulanan
                  </button>
                  <button
                    onClick={() => setReconciliationView("daily")}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      reconciliationView === "daily"
                        ? "bg-white text-indigo-700 shadow-xs dark:bg-gray-900 dark:text-indigo-400"
                        : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
                    }`}
                  >
                    <ListFilter className="h-3.5 w-3.5" />
                    Audit Harian
                  </button>
                </div>

                <Button
                  onClick={() => setManualModalOpen(true)}
                  className="gap-1.5 bg-indigo-600 font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tambah Presensi Manual
                </Button>
              </div>
            </div>

            {/* Filter Bar based on view */}
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3 dark:border-gray-800">
              {reconciliationView === "monthly" ? (
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                    Periode Rekap:
                  </span>
                  <select
                    value={reconcileMonth}
                    onChange={(e) => setReconcileMonth(Number(e.target.value))}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-xs dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
                  >
                    {monthNames.map((name, idx) => (
                      <option key={idx} value={idx + 1}>
                        {name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={reconcileYear}
                    onChange={(e) => setReconcileYear(Number(e.target.value))}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-xs dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
                  >
                    {[selectedYear - 1, selectedYear, selectedYear + 1].map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>

                  <span className="text-[11px] text-gray-400">
                    Menampilkan matriks presensi {monthNames[reconcileMonth - 1]} {reconcileYear}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                    Pilih Tanggal Audit:
                  </span>
                  <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="date"
                      value={reconcileDate}
                      onChange={(e) => setReconcileDate(e.target.value)}
                      className="bg-transparent text-xs text-gray-700 outline-none dark:text-gray-200"
                    />
                  </div>
                  <span className="text-[11px] text-gray-400">
                    Audit log kehadiran staf pada {reconcileDate}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* View Content: Monthly Matrix */}
          {reconciliationView === "monthly" ? (
            <div className="space-y-4">
              {/* Monthly KPI Summary Cards */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-2xl border border-card-border bg-card-background p-4 shadow-xs">
                  <div className="flex items-center justify-between text-text-secondary">
                    <span className="text-xs font-semibold">Total Jam Kerja Tim</span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-950/80 dark:text-primary-400">
                      <Clock className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-2 text-2xl font-black text-text-primary">
                    {teamMonthlyReport?.teamTotalHours ?? 0}{" "}
                    <span className="text-xs font-normal text-text-secondary">Jam</span>
                  </p>
                  <p className="text-[11px] text-text-secondary/70 mt-0.5">
                    Periode {monthNames[reconcileMonth - 1]} {reconcileYear}
                  </p>
                </div>

                <div className="rounded-2xl border border-card-border bg-card-background p-4 shadow-xs">
                  <div className="flex items-center justify-between text-text-secondary">
                    <span className="text-xs font-semibold">Anggota Terdaftar</span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400">
                      <Users className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-2 text-2xl font-black text-text-primary">
                    {teamMonthlyReport?.totalTeamMembers ?? 0}{" "}
                    <span className="text-xs font-normal text-text-secondary">Personel</span>
                  </p>
                  <p className="text-[11px] text-text-secondary/70 mt-0.5">Staf aktif perusahaan</p>
                </div>

                <div className="rounded-2xl border border-card-border bg-card-background p-4 shadow-xs">
                  <div className="flex items-center justify-between text-text-secondary">
                    <span className="text-xs font-semibold">Total Kehadiran Tim</span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/80 dark:text-teal-400">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {teamMonthlyReport?.members?.reduce(
                      (acc: number, m: any) => acc + (m.totalPresent || 0),
                      0
                    ) ?? 0}{" "}
                    <span className="text-xs font-normal text-text-secondary">Hari</span>
                  </p>
                  <p className="text-[11px] text-text-secondary/70 mt-0.5">Kumulatif seluruh staf</p>
                </div>

                <div className="rounded-2xl border border-card-border bg-card-background p-4 shadow-xs">
                  <div className="flex items-center justify-between text-text-secondary">
                    <span className="text-xs font-semibold">Izin / Sakit / Cuti</span>
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400">
                      <Palmtree className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
                    {teamMonthlyReport?.members?.reduce(
                      (acc: number, m: any) =>
                        acc +
                        (m.totalLeave || 0) +
                        (m.totalSick || 0) +
                        (m.totalPermission || 0) +
                        (m.totalBusinessTrip || 0),
                      0
                    ) ?? 0}{" "}
                    <span className="text-xs font-normal text-text-secondary">Hari</span>
                  </p>
                  <p className="text-[11px] text-text-secondary/70 mt-0.5">Total non-hadir terdata</p>
                </div>
              </div>

              {/* Monthly Matrix Grid Table */}
              <div className="rounded-2xl border border-card-border bg-card-background p-5 shadow-xs">
                <div className="mb-3 flex items-center justify-between">
                  <h5 className="font-bold text-sm text-text-primary flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4 text-primary-600" />
                    <span>Matriks Kehadiran Tim ({monthNames[reconcileMonth - 1]} {reconcileYear})</span>
                  </h5>
                  <div className="flex items-center gap-2 text-[11px] text-text-secondary">
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Hadir
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-rose-500"></span> Sakit
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-amber-500"></span> Izin
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-sky-500"></span> Cuti
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-purple-500"></span> Dinas
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-card-border bg-card-surface-area">
                        <th className="px-3 py-2.5 font-bold text-text-primary min-w-[200px]">
                          Anggota Tim
                        </th>
                        <th className="px-2.5 py-2.5 text-center font-bold text-text-primary">
                          Total Jam
                        </th>
                        <th className="px-2 py-2.5 text-center font-bold text-emerald-700 dark:text-emerald-400">
                          Hadir
                        </th>
                        <th className="px-2 py-2.5 text-center font-bold text-rose-700 dark:text-rose-400">
                          Sakit
                        </th>
                        <th className="px-2 py-2.5 text-center font-bold text-amber-700 dark:text-amber-400">
                          Izin
                        </th>
                        <th className="px-2 py-2.5 text-center font-bold text-sky-700 dark:text-sky-400">
                          Cuti
                        </th>
                        <th className="px-2 py-2.5 text-center font-bold text-purple-700 dark:text-purple-400">
                          Dinas
                        </th>
                        {/* Days of Month columns */}
                        {Array.from(
                          { length: teamMonthlyReport?.daysInMonth || 31 },
                          (_, i) => i + 1
                        ).map((day) => (
                          <th
                            key={day}
                            className="px-1.5 py-2.5 text-center font-mono text-[11px] text-text-secondary min-w-[26px]"
                          >
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border">
                      {teamMonthlyReport?.members?.map((m: any) => {
                        const dailyMap = new Map(
                          m.dailyRecords?.map((d: any) => [d.day, d])
                        );
                        return (
                          <tr
                            key={m.userId}
                            className="transition hover:bg-card-surface-area"
                          >
                            {/* Member Profile */}
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2.5">
                                {m.avatarUrl ? (
                                  <img
                                    src={m.avatarUrl}
                                    alt={m.fullName}
                                    className="h-7 w-7 rounded-full object-cover border border-card-border"
                                  />
                                ) : (
                                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-bold text-[11px] dark:bg-primary-950 dark:text-primary-300">
                                    {m.fullName?.slice(0, 2).toUpperCase() || "US"}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-text-primary text-xs">
                                    {m.fullName}
                                  </p>
                                  <p className="truncate text-[10px] text-text-secondary">
                                    {m.jobTitle || "Anggota Tim"}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Counters */}
                            <td className="px-2.5 py-2.5 text-center font-mono font-bold text-primary-600 dark:text-primary-400">
                              {m.totalHours > 0 ? `${m.totalHours}h` : "-"}
                            </td>
                            <td className="px-2 py-2.5 text-center font-bold text-emerald-600 dark:text-emerald-400">
                              {m.totalPresent || 0}
                            </td>
                            <td className="px-2 py-2.5 text-center font-bold text-rose-600 dark:text-rose-400">
                              {m.totalSick || 0}
                            </td>
                            <td className="px-2 py-2.5 text-center font-bold text-amber-600 dark:text-amber-400">
                              {m.totalPermission || 0}
                            </td>
                            <td className="px-2 py-2.5 text-center font-bold text-sky-600 dark:text-sky-400">
                              {m.totalLeave || 0}
                            </td>
                            <td className="px-2 py-2.5 text-center font-bold text-purple-600 dark:text-purple-400">
                              {m.totalBusinessTrip || 0}
                            </td>

                            {/* Days Matrix Cells */}
                            {Array.from(
                              { length: teamMonthlyReport?.daysInMonth || 31 },
                              (_, i) => i + 1
                            ).map((day) => {
                              const rec = dailyMap.get(day) as any;
                              if (!rec) {
                                return (
                                  <td
                                    key={day}
                                    className="px-1 py-2 text-center text-gray-200 dark:text-gray-700 font-mono text-[10px]"
                                  >
                                    ·
                                  </td>
                                );
                              }

                              let badgeClass = "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
                              let char = "·";
                              let title = "";

                              if (rec.type === 1) {
                                badgeClass = "bg-emerald-500 text-white shadow-xs shadow-emerald-500/30";
                                char = "H";
                                title = `Hadir: ${rec.totalHours} Jam (${locationLabels[rec.workLocation] || "WFO"})`;
                              } else if (rec.type === 2) {
                                badgeClass = "bg-sky-500 text-white";
                                char = "C";
                                title = "Cuti";
                              } else if (rec.type === 3) {
                                badgeClass = "bg-rose-500 text-white";
                                char = "S";
                                title = "Sakit";
                              } else if (rec.type === 4) {
                                badgeClass = "bg-amber-500 text-white";
                                char = "I";
                                title = "Izin";
                              } else if (rec.type === 5) {
                                badgeClass = "bg-purple-500 text-white";
                                char = "D";
                                title = "Dinas Luar";
                              }

                              return (
                                <td key={day} className="px-0.5 py-1 text-center">
                                  <span
                                    title={title}
                                    className={`inline-flex h-5 w-5 items-center justify-center rounded-md font-bold text-[10px] ${badgeClass}`}
                                  >
                                    {char}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}

                      {(!teamMonthlyReport?.members || teamMonthlyReport.members.length === 0) && (
                        <tr>
                          <td
                            colSpan={7 + (teamMonthlyReport?.daysInMonth || 31)}
                            className="py-10 text-center text-gray-400"
                          >
                            Tidak ada data presensi tim untuk periode ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* View Content: Daily Audit */
            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h5 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                    <ListFilter className="h-4 w-4 text-indigo-600" />
                    <span>Audit Presensi Harian ({reconcileDate})</span>
                  </h5>
                  <p className="text-[11px] text-gray-500">
                    Daftar log kehadiran seluruh anggota tim pada tanggal terpilih beserta opsi koreksi jam kerja.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/75 dark:border-gray-800 dark:bg-gray-800/50">
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Nama Anggota</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Tanggal</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Status</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Lokasi</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Masuk</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Pulang</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Total Jam</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Alasan/Catatan</th>
                      <th className="px-4 py-3 text-right font-bold text-gray-600 dark:text-gray-300">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {reconciliation.map((r: any) => {
                      const typeConfig = attendanceTypeLabels[r.type] || attendanceTypeLabels[1];
                      return (
                        <tr key={r.id} className="transition hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                          <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                            {r.userName}
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-500">{r.date}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold ${typeConfig.color}`}
                            >
                              {typeConfig.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                            {r.type === 1 ? locationLabels[r.workLocation] : "-"}
                          </td>
                          <td className="px-4 py-3 font-mono text-emerald-600 dark:text-emerald-400">
                            {r.clockIn ? new Date(r.clockIn).toLocaleTimeString("id-ID") : "-"}
                          </td>
                          <td className="px-4 py-3 font-mono text-amber-600 dark:text-amber-400">
                            {r.clockOut ? new Date(r.clockOut).toLocaleTimeString("id-ID") : "-"}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-gray-900 dark:text-white">
                            {r.totalHours > 0 ? `${r.totalHours} Jam` : "-"}
                          </td>
                          <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                            {r.leaveReason || r.notes || "-"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isAdmin || r.userId === currentUserId ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 px-2 text-[11px]"
                                onClick={() => {
                                  setSelectedRecord(r);
                                  setReconcileType(r.type);
                                  setReconcileLoc(r.workLocation);
                                  setReconcileClockIn(
                                    r.clockIn ? new Date(r.clockIn).toISOString().slice(0, 16) : ""
                                  );
                                  setReconcileClockOut(
                                    r.clockOut ? new Date(r.clockOut).toISOString().slice(0, 16) : ""
                                  );
                                  setReconcileLeaveReason(r.leaveReason || "");
                                  setReconcileNotes(r.notes || "");
                                  setReconcileModalOpen(true);
                                }}
                              >
                                <Edit2 className="h-3 w-3" />
                                Koreksi
                              </Button>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic">Hanya Lihat</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {reconciliation.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-gray-400">
                          Tidak ada catatan presensi pada tanggal {reconcileDate}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal 1: Pengajuan Izin / Sakit / Cuti (LeaveModal) */}
      <Dialog open={leaveModalOpen} onOpenChange={setLeaveModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 shadow-2xl dark:bg-gray-900 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Palmtree className="h-5 w-5 text-amber-600" />
              <span>Pengajuan Izin / Cuti / Sakit</span>
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitLeaveMutation.mutate();
            }}
            className="mt-4 space-y-3.5"
          >
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Tanggal Berhalangan *
              </label>
              <Input
                type="date"
                value={leaveDate}
                onChange={(e) => setLeaveDate(e.target.value)}
                required
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Jenis Status Non-Hadir *
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-transparent p-2 text-xs text-gray-900 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              >
                <option value={2}>🌴 Cuti Tahunan / Khusus (Leave)</option>
                <option value={3}>🩺 Sakit (Sick / Surat Dokter)</option>
                <option value={4}>📝 Izin Keperluan Pribadi (Permit)</option>
                <option value={5}>✈️ Dinas Luar Kota (Business Trip)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Alasan / Keperluan *
              </label>
              <Input
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder="Contoh: Sakit demam tinggi / Keperluan keluarga..."
                required
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Catatan Tambahan (Opsional)
              </label>
              <textarea
                rows={2}
                value={leaveNotes}
                onChange={(e) => setLeaveNotes(e.target.value)}
                placeholder="Rincian informasi delegasi tugas atau catatan..."
                className="mt-1 w-full rounded-xl border border-gray-200 bg-transparent p-2.5 text-xs text-gray-900 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLeaveModalOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={submitLeaveMutation.isPending}
                className="bg-amber-600 text-white hover:bg-amber-700 text-xs font-semibold"
              >
                {submitLeaveMutation.isPending ? "Menyimpan..." : "Kirim Pengajuan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Koreksi Rekonsiliasi (Admin) */}
      <Dialog open={reconcileModalOpen} onOpenChange={setReconcileModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 shadow-2xl dark:bg-gray-900 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
              Koreksi Presensi: {selectedRecord?.userName}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              reconcileMutation.mutate();
            }}
            className="mt-4 space-y-3.5"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Status Presensi
                </label>
                <select
                  value={reconcileType}
                  onChange={(e) => setReconcileType(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-transparent p-2 text-xs text-gray-900 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                >
                  <option value={1}>Hadir (Present)</option>
                  <option value={2}>Cuti (Leave)</option>
                  <option value={3}>Sakit (Sick)</option>
                  <option value={4}>Izin (Permission)</option>
                  <option value={5}>Dinas Luar</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Lokasi Kerja
                </label>
                <select
                  value={reconcileLoc}
                  onChange={(e) => setReconcileLoc(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-transparent p-2 text-xs text-gray-900 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                >
                  <option value={1}>WFO (Kantor)</option>
                  <option value={2}>WFH (Rumah)</option>
                  <option value={3}>Dinas Lapangan</option>
                  <option value={4}>Remote</option>
                </select>
              </div>
            </div>

            {reconcileType === 1 && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Waktu Masuk
                  </label>
                  <Input
                    type="datetime-local"
                    value={reconcileClockIn}
                    onChange={(e) => setReconcileClockIn(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Waktu Pulang
                  </label>
                  <Input
                    type="datetime-local"
                    value={reconcileClockOut}
                    onChange={(e) => setReconcileClockOut(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Alasan Izin / Keterangan
              </label>
              <Input
                value={reconcileLeaveReason}
                onChange={(e) => setReconcileLeaveReason(e.target.value)}
                placeholder="Alasan izin atau surat sakit jika ada..."
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Catatan Alasan Koreksi
              </label>
              <Input
                value={reconcileNotes}
                onChange={(e) => setReconcileNotes(e.target.value)}
                placeholder="Contoh: Koreksi lupa clock in karena rapat klien..."
                className="mt-1 text-xs"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setReconcileModalOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={reconcileMutation.isPending}
                className="bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold"
              >
                Simpan Koreksi
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Tambah Presensi Manual (Admin / Non-Admin) */}
      <Dialog open={manualModalOpen} onOpenChange={setManualModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 shadow-2xl dark:bg-gray-900 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-600" />
              <span>{isAdmin ? "Tambah Presensi Manual Anggota" : "Catat Presensi Manual Mandiri"}</span>
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              manualEntryMutation.mutate();
            }}
            className="mt-4 space-y-3.5"
          >
            {isAdmin ? (
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Pilih Anggota Tim *
                </label>
                <select
                  value={manualUserId}
                  onChange={(e) => setManualUserId(e.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-transparent p-2 text-xs text-gray-900 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">-- Pilih Anggota Tim --</option>
                  {members.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.email})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 dark:border-indigo-900/40 dark:bg-indigo-950/30">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white shadow-xs">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[11px] font-medium text-gray-500 dark:text-gray-400">
                      Presensi Mandiri untuk:
                    </span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white truncate block">
                      {currentUser?.fullName || "Pengguna"} ({currentUser?.email || ""})
                    </span>
                  </div>
                </div>
                <p className="mt-1.5 text-[10px] text-gray-400">
                  * Kebijakan RBAC: Anda mengisi jam masuk dan pulang untuk diri Anda sendiri.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Tanggal Presensi *
                </label>
                <Input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  required
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Status Presensi
                </label>
                <select
                  value={manualType}
                  onChange={(e) => setManualType(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-transparent p-2 text-xs text-gray-900 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                >
                  <option value={1}>Hadir (Present)</option>
                  <option value={2}>Cuti (Leave)</option>
                  <option value={3}>Sakit (Sick)</option>
                  <option value={4}>Izin (Permission)</option>
                  <option value={5}>Dinas Luar</option>
                </select>
              </div>
            </div>

            {manualType === 1 && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Lokasi Kerja
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setManualTimeIn("08:30");
                        setManualTimeOut("17:30");
                      }}
                      className="text-[10px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      ⚡ Isi Jam Standar (08:30 - 17:30)
                    </button>
                  </div>
                  <select
                    value={manualLoc}
                    onChange={(e) => setManualLoc(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-200 bg-transparent p-2 text-xs text-gray-900 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  >
                    <option value={1}>🏢 WFO (Kantor)</option>
                    <option value={2}>🏠 WFH (Rumah)</option>
                    <option value={3}>🚗 Dinas Lapangan</option>
                    <option value={4}>🌐 Remote</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Waktu Masuk (Time Picker) *
                    </label>
                    <Input
                      type="time"
                      value={manualTimeIn}
                      onChange={(e) => setManualTimeIn(e.target.value)}
                      required
                      className="mt-1 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Waktu Pulang (Time Picker) *
                    </label>
                    <Input
                      type="time"
                      value={manualTimeOut}
                      onChange={(e) => setManualTimeOut(e.target.value)}
                      required
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>

                {/* Info Selisih Durasi Kerja */}
                {manualDuration && (
                  <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/80 p-2.5 text-xs text-indigo-800 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      Selisih Durasi Kerja:
                    </span>
                    <span className="font-bold text-indigo-950 dark:text-indigo-200">
                      {manualDuration.formatted}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Alasan tidak perlu muncul jika user hanya mengisi dalam bentuk WFO, kecuali lainnya */}
            {!(manualType === 1 && manualLoc === 1) && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Alasan / Keperluan {manualType !== 1 ? "*" : "(Opsional)"}
                </label>
                <Input
                  value={manualLeaveReason}
                  onChange={(e) => setManualLeaveReason(e.target.value)}
                  placeholder={
                    manualType === 2
                      ? "Contoh: Cuti tahunan / urusan keluarga..."
                      : manualType === 3
                      ? "Contoh: Sakit demam / surat dokter terlampir..."
                      : manualType === 4
                      ? "Contoh: Keperluan perpanjangan SIM..."
                      : manualType === 5
                      ? "Contoh: Kunjungan klien / dinas luar kota..."
                      : manualLoc === 2
                      ? "Alasan WFH (Rumah)..."
                      : manualLoc === 3
                      ? "Alasan Dinas Lapangan..."
                      : "Alasan Remote..."
                  }
                  required={manualType !== 1}
                  className="mt-1 text-xs"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Catatan
              </label>
              <Input
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="Catatan tambahan entri manual..."
                className="mt-1 text-xs"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setManualModalOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={manualEntryMutation.isPending}
                className="bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold"
              >
                Simpan Entri
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
