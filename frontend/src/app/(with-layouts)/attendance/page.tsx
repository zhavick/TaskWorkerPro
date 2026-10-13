"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/tailgrids/core/dialog";
import { toast } from "sonner";

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

  // Tab & Filter states
  const [activeTab, setActiveTab] = useState<"personal" | "reconciliation">("personal");
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [reconcileDate, setReconcileDate] = useState(
    currentDate.toISOString().split("T")[0]
  );

  // Clock In / Out states
  const [workLocation, setWorkLocation] = useState(1);
  const [clockNotes, setClockNotes] = useState("");

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

  // Manual Entry Modal state (Admin)
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualUserId, setManualUserId] = useState("");
  const [manualDate, setManualDate] = useState(
    currentDate.toISOString().split("T")[0]
  );
  const [manualType, setManualType] = useState(1);
  const [manualLoc, setManualLoc] = useState(1);
  const [manualClockIn, setManualClockIn] = useState("");
  const [manualClockOut, setManualClockOut] = useState("");
  const [manualLeaveReason, setManualLeaveReason] = useState("");
  const [manualNotes, setManualNotes] = useState("");

  // 1. Status Today
  const { data: todayStatus } = useQuery<any>({
    queryKey: ["attendanceTodayStatus"],
    queryFn: async () => {
      const res = await apiClient.get("/attendances/today");
      return res.data.data;
    },
  });

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

  // 4. Team Reconciliation (Admin)
  const { data: reconciliation = [] } = useQuery<any[]>({
    queryKey: ["attendanceReconciliation", reconcileDate],
    queryFn: async () => {
      const res = await apiClient.get(
        `/attendances/reconciliation?date=${reconcileDate}`
      );
      return res.data.data;
    },
    enabled: activeTab === "reconciliation",
  });

  // 5. Team Members (for manual entry)
  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["membersListForAttendance"],
    queryFn: async () => {
      const res = await apiClient.get("/members");
      return res.data.data;
    },
    enabled: manualModalOpen,
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

  // Reconcile Mutation (Admin)
  const reconcileMutation = useMutation({
    mutationFn: async () => {
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
      toast.success("Presensi anggota berhasil direkonsiliasi!");
      setReconcileModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["attendanceReconciliation"] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Gagal menyimpan rekonsiliasi"),
  });

  // Manual Entry Mutation (Admin)
  const manualEntryMutation = useMutation({
    mutationFn: async () => {
      if (!manualUserId) throw new Error("Pilih anggota tim terlebih dahulu.");
      const res = await apiClient.post("/attendances/reconciliation/manual-entry", {
        userId: manualUserId,
        date: manualDate,
        type: manualType,
        workLocation: manualLoc,
        clockIn: manualClockIn ? new Date(manualClockIn).toISOString() : null,
        clockOut: manualClockOut ? new Date(manualClockOut).toISOString() : null,
        leaveReason: manualLeaveReason || null,
        notes: manualNotes || null,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Presensi manual anggota berhasil disimpan!");
      setManualModalOpen(false);
      setManualUserId("");
      setManualClockIn("");
      setManualClockOut("");
      setManualLeaveReason("");
      setManualNotes("");
      queryClient.invalidateQueries({ queryKey: ["attendanceReconciliation"] });
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
                ? "bg-white text-indigo-700 shadow-xs dark:bg-gray-900 dark:text-indigo-400"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
            }`}
          >
            Presensi Mandiri
          </button>
          <button
            onClick={() => setActiveTab("reconciliation")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              activeTab === "reconciliation"
                ? "bg-white text-indigo-700 shadow-xs dark:bg-gray-900 dark:text-indigo-400"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400"
            }`}
          >
            Rekonsiliasi Tim (Admin)
          </button>
        </div>
      </div>

      {activeTab === "personal" ? (
        <div className="space-y-6">
          {/* Quick Clock In/Out Hero Card */}
          <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-white p-6 shadow-xs dark:border-indigo-900/60 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-gray-900">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Status Presensi Hari Ini
                </span>
                <h3 className="mt-1 text-xl font-extrabold text-gray-900 dark:text-white">
                  {todayStatus?.type && todayStatus.type !== 1
                    ? `Status: ${attendanceTypeLabels[todayStatus.type]?.label || "Non-Hadir"}`
                    : todayStatus?.hasClockedOut
                    ? `Presensi Selesai (${todayStatus.totalHours} Jam Kerja)`
                    : todayStatus?.hasClockedIn
                    ? "Sedang Bekerja (Clock In Aktif)"
                    : "Belum Melakukan Presensi Hari Ini"}
                </h3>
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
                  </>
                ) : !todayStatus?.hasClockedOut && todayStatus?.type === 1 ? (
                  <div className="flex items-center gap-2">
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
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
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
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Monthly Statistics Summary Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
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

            <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between text-gray-500">
                <span className="text-xs font-semibold">Rata-rata Jam/Hari</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
                {mySummary?.averageDailyHours ?? 0}{" "}
                <span className="text-xs font-normal text-gray-500">Jam</span>
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">Total {mySummary?.totalWorkingHours ?? 0} Jam</p>
            </div>

            <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
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

            <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
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
          <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                  Riwayat Kehadiran Pribadi
                </h4>
                <p className="text-[11px] text-gray-500">
                  Periode {monthNames[selectedMonth - 1]} {selectedYear}
                </p>
              </div>

              {/* Month/Year Picker */}
              <div className="flex items-center gap-2">
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
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                Audit & Rekonsiliasi Presensi Anggota Tim
              </h4>
              <p className="text-[11px] text-gray-500">
                Verifikasi kehadiran seluruh anggota tim pada tanggal terpilih, lakukan koreksi, atau buat entri manual.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                <input
                  type="date"
                  value={reconcileDate}
                  onChange={(e) => setReconcileDate(e.target.value)}
                  className="bg-transparent text-xs text-gray-700 outline-none dark:text-gray-200"
                />
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

      {/* Modal 3: Tambah Presensi Manual (Admin) */}
      <Dialog open={manualModalOpen} onOpenChange={setManualModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 shadow-2xl dark:bg-gray-900 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-600" />
              <span>Tambah Presensi Manual Anggota</span>
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              manualEntryMutation.mutate();
            }}
            className="mt-4 space-y-3.5"
          >
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
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Lokasi Kerja
                  </label>
                  <select
                    value={manualLoc}
                    onChange={(e) => setManualLoc(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-transparent p-2 text-xs text-gray-900 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  >
                    <option value={1}>WFO (Kantor)</option>
                    <option value={2}>WFH (Rumah)</option>
                    <option value={3}>Dinas Lapangan</option>
                    <option value={4}>Remote</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Waktu Masuk
                    </label>
                    <Input
                      type="datetime-local"
                      value={manualClockIn}
                      onChange={(e) => setManualClockIn(e.target.value)}
                      className="mt-1 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Waktu Pulang
                    </label>
                    <Input
                      type="datetime-local"
                      value={manualClockOut}
                      onChange={(e) => setManualClockOut(e.target.value)}
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Alasan / Keperluan (Jika Non-Hadir)
              </label>
              <Input
                value={manualLeaveReason}
                onChange={(e) => setManualLeaveReason(e.target.value)}
                placeholder="Contoh: Izin urusan keluarga / sakit..."
                className="mt-1 text-xs"
              />
            </div>

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
