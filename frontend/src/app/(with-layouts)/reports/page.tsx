"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileSpreadsheet,
  Flag,
  ListChecks,
  RotateCcw,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { toast } from "sonner";

type ReportTab = "timesheet" | "tasks" | "members";

const TABS: { id: ReportTab; label: string; icon: React.ReactNode }[] = [
  { id: "timesheet", label: "Laporan Timesheet", icon: <Clock className="h-4 w-4" /> },
  { id: "tasks", label: "Laporan Tugas", icon: <ListChecks className="h-4 w-4" /> },
  { id: "members", label: "Achievement Anggota", icon: <Trophy className="h-4 w-4" /> },
];

const STATUS_STYLE: Record<string, string> = {
  Todo: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  InProgress: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  Review: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  Done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  Overdue: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

const fmtH = (h: number) => `${(h ?? 0).toLocaleString("id-ID", { maximumFractionDigits: 2 })} Jam`;

function ProgressBar({ value, tone = "indigo" }: { value: number; tone?: "indigo" | "emerald" }) {
  const bar = tone === "emerald" ? "bg-emerald-500" : "bg-indigo-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full min-w-16 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div className={`h-full rounded-full ${bar} transition-all`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
      <span className="w-10 text-right font-mono text-[10px] font-bold text-gray-600 dark:text-gray-300">
        {Math.round(value)}%
      </span>
    </div>
  );
}

function KpiCard({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</span>
      <div className={`mt-2 text-2xl font-black ${tone ?? "text-gray-900 dark:text-white"}`}>{value}</div>
      {hint && <span className="text-[11px] text-gray-400">{hint}</span>}
    </div>
  );
}

function ProjectHeader({
  open,
  onToggle,
  color,
  name,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  color: string;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-3 border-b border-gray-100 bg-gray-50/75 px-5 py-3.5 text-left hover:bg-gray-100/70 dark:border-gray-800 dark:bg-gray-800/50 dark:hover:bg-gray-800"
    >
      {open ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      <span className="flex-1 text-sm font-extrabold text-gray-900 dark:text-white">{name}</span>
      <span className="flex items-center gap-4 text-[11px] font-semibold text-gray-600 dark:text-gray-300">{children}</span>
    </button>
  );
}

function MilestoneBar({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b border-gray-100 bg-indigo-50/50 px-5 py-2 pl-12 dark:border-gray-800 dark:bg-indigo-950/20">
      <Flag className="h-3.5 w-3.5 text-indigo-500" />
      <span className="flex-1 text-xs font-bold text-indigo-700 dark:text-indigo-300">{name}</span>
      <span className="flex items-center gap-4 text-[11px] font-semibold text-gray-500 dark:text-gray-400">{children}</span>
    </div>
  );
}

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>("timesheet");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [projectId, setProjectId] = useState("");
  const [milestone, setMilestone] = useState("");
  const [userId, setUserId] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (startDate) p.startDate = new Date(`${startDate}T00:00:00`).toISOString();
    if (endDate) p.endDate = new Date(`${endDate}T23:59:59`).toISOString();
    if (projectId) p.projectId = projectId;
    if (milestone) p.milestone = milestone;
    if (userId) p.userId = userId;
    return p;
  }, [startDate, endDate, projectId, milestone, userId]);

  const { data: filterRes } = useQuery<any>({
    queryKey: ["reportFilters"],
    queryFn: async () => (await apiClient.get("/reports/filters")).data,
  });
  const options = filterRes?.data;
  const isAdmin = !!filterRes?.isAdmin;

  const { data: report, isLoading } = useQuery<any>({
    queryKey: ["report", tab, params],
    queryFn: async () => (await apiClient.get(`/reports/${tab}`, { params })).data.data,
  });

  const toggle = (key: string) => setCollapsed((c) => ({ ...c, [key]: !c[key] }));
  const resetFilters = () => {
    setStartDate("");
    setEndDate("");
    setProjectId("");
    setMilestone("");
    setUserId("");
  };

  const handleExport = async () => {
    try {
      toast.loading("Menyiapkan laporan Excel...", { id: "reportExport" });
      const res = await apiClient.get("/reports/export/excel", {
        params: { type: tab, ...params },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `Laporan_${tab}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Laporan berhasil diunduh!", { id: "reportExport" });
    } catch {
      toast.error("Gagal mengunduh laporan", { id: "reportExport" });
    }
  };

  const inputCls =
    "h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-800 outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";

  const projects: any[] = report?.projects ?? [];
  const empty = !isLoading && tab !== "members" && projects.length === 0;

  return (
    <div className="space-y-6 px-2 py-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            <BarChart3 className="h-6 w-6 text-indigo-600" /> Pusat Pelaporan
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Laporan timesheet &amp; tugas per proyek dan milestone, serta achievement anggota tim.
          </p>
        </div>
        <Button
          onClick={handleExport}
          variant="outline"
          className="gap-2 border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
        >
          <FileSpreadsheet className="h-4 w-4" /> Ekspor Excel (.xlsx)
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`report-tab-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-colors ${
              tab === t.id
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <label className="flex flex-col gap-1 text-[11px] font-semibold text-gray-500">
          Dari Tanggal
          <input id="report-start" type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-semibold text-gray-500">
          Sampai Tanggal
          <input id="report-end" type="date" className={inputCls} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-semibold text-gray-500">
          Proyek
          <select id="report-project" className={inputCls} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Semua Proyek</option>
            {options?.projects?.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-semibold text-gray-500">
          Milestone
          <select id="report-milestone" className={inputCls} value={milestone} onChange={(e) => setMilestone(e.target.value)}>
            <option value="">Semua Milestone</option>
            {options?.milestones?.map((m: string) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        {isAdmin && (
          <label className="flex flex-col gap-1 text-[11px] font-semibold text-gray-500">
            Anggota
            <select id="report-member" className={inputCls} value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">Semua Anggota</option>
              {options?.members?.map((m: any) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>
        )}
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={resetFilters}>
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Button>
      </div>

      {isLoading && <div className="py-16 text-center text-xs text-gray-400">Memuat laporan...</div>}
      {empty && (
        <div className="rounded-2xl border border-dashed border-gray-300 py-16 text-center text-xs text-gray-400 dark:border-gray-700">
          Tidak ada data untuk filter yang dipilih.
        </div>
      )}

      {/* ===================== TIMESHEET ===================== */}
      {tab === "timesheet" && report && projects.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Total Jam Kerja" value={fmtH(report.totalHours)} tone="text-indigo-600 dark:text-indigo-400" />
            <KpiCard label="Man-Days" value={report.totalManDays} hint="8 jam / hari" tone="text-emerald-600 dark:text-emerald-400" />
            <KpiCard label="Total Sesi" value={report.totalSessions} />
            <KpiCard label="Tugas Dikerjakan" value={report.totalTasks} />
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
            {projects.map((p) => {
              const pk = `ts-${p.projectId ?? "none"}`;
              const open = !collapsed[pk];
              return (
                <div key={pk}>
                  <ProjectHeader open={open} onToggle={() => toggle(pk)} color={p.color} name={p.projectName}>
                    <span>{p.sessionCount} sesi</span>
                    <span>{p.manDays} MD</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">{fmtH(p.hours)}</span>
                  </ProjectHeader>
                  {open &&
                    p.milestones.map((m: any) => (
                      <div key={`${pk}-${m.milestone}`}>
                        <MilestoneBar name={m.milestone}>
                          <span>{m.taskCount} tugas</span>
                          <span className="font-mono text-indigo-600 dark:text-indigo-400">{fmtH(m.hours)}</span>
                        </MilestoneBar>
                        <table className="w-full border-collapse text-left text-xs">
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {m.tasks.map((t: any) => (
                              <tr key={t.taskId} className="align-top hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                                <td className="py-3 pl-16 pr-3">
                                  <div className="font-semibold text-gray-900 dark:text-white">{t.title}</div>
                                  <div className="mt-1 flex flex-wrap gap-1.5">
                                    {t.members.map((mem: any) => (
                                      <span
                                        key={mem.userId}
                                        className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                                      >
                                        {mem.userName}: <b>{fmtH(mem.hours)}</b>
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[t.status] ?? STATUS_STYLE.Todo}`}>
                                    {t.status}
                                  </span>
                                </td>
                                <td className="w-40 px-3 py-3"><ProgressBar value={t.progress} /></td>
                                <td className="px-3 py-3 text-gray-500">{t.sessionCount} sesi</td>
                                <td className="px-5 py-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                  {fmtH(t.hours)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ===================== TUGAS ===================== */}
      {tab === "tasks" && report && projects.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <KpiCard label="Total Tugas" value={report.totalTasks} />
            <KpiCard label="Selesai" value={report.doneTasks} tone="text-emerald-600 dark:text-emerald-400" hint={`${report.completionRate}% tingkat penyelesaian`} />
            <KpiCard label="Berjalan" value={report.inProgressTasks} tone="text-blue-600 dark:text-blue-400" />
            <KpiCard label="Overdue" value={report.overdueTasks} tone="text-red-600 dark:text-red-400" />
            <KpiCard label="Rata-rata Progres" value={`${report.avgProgress}%`} tone="text-indigo-600 dark:text-indigo-400" />
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
            {projects.map((p) => {
              const pk = `tk-${p.projectId ?? "none"}`;
              const open = !collapsed[pk];
              return (
                <div key={pk}>
                  <ProjectHeader open={open} onToggle={() => toggle(pk)} color={p.color} name={p.projectName}>
                    <span>{p.doneTasks}/{p.totalTasks} selesai</span>
                    {p.overdueTasks > 0 && <span className="text-red-500">{p.overdueTasks} overdue</span>}
                    <span className="w-28"><ProgressBar value={p.avgProgress} tone="emerald" /></span>
                  </ProjectHeader>
                  {open &&
                    p.milestones.map((m: any) => (
                      <div key={`${pk}-${m.milestone}`}>
                        <MilestoneBar name={m.milestone}>
                          <span>{m.doneTasks}/{m.totalTasks} selesai</span>
                          <span className="w-28"><ProgressBar value={m.avgProgress} tone="emerald" /></span>
                          <span className="font-mono">{fmtH(m.loggedHours)}</span>
                        </MilestoneBar>
                        <table className="w-full border-collapse text-left text-xs">
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {m.tasks.map((t: any) => (
                              <tr key={t.taskId} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                                <td className="py-3 pl-16 pr-3 font-semibold text-gray-900 dark:text-white">{t.title}</td>
                                <td className="px-3 py-3 text-gray-500">{t.assigneeName}</td>
                                <td className="px-3 py-3">
                                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[t.isOverdue ? "Overdue" : t.status] ?? STATUS_STYLE.Todo}`}>
                                    {t.isOverdue ? "Overdue" : t.status}
                                  </span>
                                </td>
                                <td className="w-40 px-3 py-3"><ProgressBar value={t.progress} /></td>
                                <td className="px-3 py-3 font-mono text-gray-500">
                                  {t.dueDate ? new Date(t.dueDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                                </td>
                                <td className="px-5 py-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                  {fmtH(t.loggedHours)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ===================== ACHIEVEMENT ANGGOTA ===================== */}
      {tab === "members" && report && (report.members?.length ?? 0) > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Anggota Aktif" value={report.totalMembers} />
            <KpiCard label="Total Tugas" value={report.totalTasks} />
            <KpiCard label="Tugas Selesai" value={report.doneTasks} tone="text-emerald-600 dark:text-emerald-400" />
            <KpiCard label="Total Jam Kerja" value={fmtH(report.totalHours)} tone="text-indigo-600 dark:text-indigo-400" />
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/75 dark:border-gray-800 dark:bg-gray-800/50">
                    {["#", "Anggota", "Tugas Selesai", "Pencapaian", "Tepat Waktu", "Berjalan", "Overdue", "Sesi", "Jam Kerja", "MD"].map((h) => (
                      <th key={h} className="px-4 py-3.5 font-bold text-gray-600 dark:text-gray-300">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {report.members.map((m: any, i: number) => (
                    <tr key={m.userId} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3.5 font-mono text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white"
                            style={{ backgroundColor: m.color }}
                          >
                            {m.userName.slice(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white">{m.userName}</div>
                            <div className="text-[10px] text-gray-400">{m.jobTitle ?? "Anggota Tim"} · {m.projectCount} proyek</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold">
                        <CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-emerald-500" />
                        {m.doneTasks}/{m.totalTasks}
                      </td>
                      <td className="w-44 px-4 py-3.5"><ProgressBar value={m.completionRate} tone="emerald" /></td>
                      <td className="px-4 py-3.5 font-mono text-gray-600 dark:text-gray-300">{m.doneOnTime}</td>
                      <td className="px-4 py-3.5 font-mono text-blue-600 dark:text-blue-400">{m.inProgressTasks}</td>
                      <td className={`px-4 py-3.5 font-mono ${m.overdueTasks > 0 ? "font-bold text-red-500" : "text-gray-400"}`}>{m.overdueTasks}</td>
                      <td className="px-4 py-3.5 font-mono text-gray-500">{m.sessionCount}</td>
                      <td className="px-4 py-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">{fmtH(m.hours)}</td>
                      <td className="px-4 py-3.5 font-mono text-gray-500">{m.manDays}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {tab === "members" && !isLoading && (report?.members?.length ?? 0) === 0 && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 py-16 text-xs text-gray-400 dark:border-gray-700">
          <Users className="h-4 w-4" /> Tidak ada data anggota untuk filter yang dipilih.
        </div>
      )}
    </div>
  );
}
