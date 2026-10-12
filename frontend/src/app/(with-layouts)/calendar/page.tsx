"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import Link from "next/link";

export default function CalendarSchedulePage() {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["calendarTasks"],
    queryFn: async () => {
      const res = await apiClient.get("/tasks");
      return res.data.data;
    },
  });

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  return (
    <div className="space-y-6 px-2 py-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Kalender Jadwal & Tenggat Tugas
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Jadwal milestone, batas waktu tugas (*due date*), dan timeline proyek operasional.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-bold text-sm text-gray-900 dark:text-white px-2">
            {monthNames[currentMonth]} {currentYear}
          </span>
          <Button variant="outline" size="sm" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Upcoming Deadlines List */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
          Agenda Tugas & Tenggat Terjadwal ({tasks.length})
        </h3>

        <div className="space-y-3">
          {tasks.map((t: any) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-xl border border-gray-100 p-3.5 hover:bg-gray-50/60 dark:border-gray-800 dark:hover:bg-gray-800/40"
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: t.projectColor || "#4680FF" }}
                />
                <div>
                  <Link
                    href={`/tasks/${t.id}`}
                    className="font-bold text-xs text-gray-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
                  >
                    {t.title}
                  </Link>
                  <p className="text-[11px] text-gray-400">
                    Proyek: {t.projectName || "Umum"} {t.milestone && `• Milestone: ${t.milestone}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="text-gray-500">
                  {t.dueDate ? `Deadline: ${new Date(t.dueDate).toLocaleDateString("id-ID")}` : "Tanpa Deadline"}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold text-white ${
                    t.status === 2 ? "bg-emerald-600" : "bg-indigo-600"
                  }`}
                >
                  {t.status === 2 ? "Selesai" : `${t.progress}%`}
                </span>
              </div>
            </div>
          ))}

          {tasks.length === 0 && (
            <p className="py-8 text-center text-xs text-gray-400">
              Belum ada jadwal tugas terdaftar untuk periode ini.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
