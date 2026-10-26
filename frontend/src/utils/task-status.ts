export const TASK_PRIORITY_LABELS: Record<number, { label: string; badge: string; dot: string }> = {
  0: { label: "Rendah", badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800", dot: "bg-emerald-500" },
  1: { label: "Sedang", badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800", dot: "bg-blue-500" },
  2: { label: "Tinggi", badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800", dot: "bg-amber-500" },
  3: { label: "Kritis", badge: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800", dot: "bg-rose-500" },
};

export const TASK_STATUS_LABELS: Record<number, { label: string; badge: string }> = {
  0: { label: "To Do", badge: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" },
  1: { label: "In Progress", badge: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-800" },
  2: { label: "Done", badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800" },
  3: { label: "Overdue", badge: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800" },
  4: { label: "Review", badge: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-400 dark:border-purple-800" },
};

/**
 * Normalizes task status from string or number into a standard enum index:
 * 0: Todo
 * 1: InProgress
 * 2: Done
 * 3: Overdue
 * 4: Review
 */
export function parseTaskStatus(val: any): number {
  if (typeof val === "number" && !isNaN(val)) return Math.max(0, Math.min(4, Math.floor(val)));
  if (!val && val !== 0) return 0;
  const s = String(val).trim().toLowerCase();
  if (s === "0" || s === "todo" || s === "to do" || s.includes("siap")) return 0;
  if (s === "1" || s === "inprogress" || s === "in progress" || s.includes("kerja") || s.includes("jalan")) return 1;
  if (s === "2" || s === "done" || s.includes("selesai")) return 2;
  if (s === "3" || s === "overdue" || s.includes("lewat") || s.includes("terlambat")) return 3;
  if (s === "4" || s === "review" || s.includes("tinjau")) return 4;
  const num = Number(val);
  return isNaN(num) ? 0 : Math.max(0, Math.min(4, Math.floor(num)));
}

/**
 * Normalizes task priority from string or number into a standard enum index:
 * 0: Low
 * 1: Medium
 * 2: High
 * 3: Critical
 */
export function parseTaskPriority(val: any): number {
  if (typeof val === "number" && !isNaN(val)) return Math.max(0, Math.min(3, Math.floor(val)));
  if (!val && val !== 0) return 1;
  const s = String(val).trim().toLowerCase();
  if (s === "0" || s === "low" || s.includes("rendah")) return 0;
  if (s === "1" || s === "medium" || s.includes("sedang") || s === "med") return 1;
  if (s === "2" || s === "high" || s.includes("tinggi")) return 2;
  if (s === "3" || s === "critical" || s.includes("kritis") || s === "crit" || s.includes("urgent")) return 3;
  const num = Number(val);
  return isNaN(num) ? 1 : Math.max(0, Math.min(3, Math.floor(num)));
}

export function isTaskDone(val: any): boolean {
  return parseTaskStatus(val) === 2;
}
