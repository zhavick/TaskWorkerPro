"use client";

import React, { useState } from "react";
import { Toggle } from "@/components/tailgrids/core/toggle";
import { Bell, Mail, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface NotificationOption {
  id: string;
  label: string;
  description: string;
  icon: typeof Bell;
  defaultChecked: boolean;
}

const NOTIFICATION_OPTIONS: NotificationOption[] = [
  {
    id: "task-assignment",
    label: "Penugasan & Perubahan Tugas",
    description: "Dapatkan notifikasi saat ada tugas baru yang ditugaskan ke Anda",
    icon: Bell,
    defaultChecked: true,
  },
  {
    id: "deadline-reminder",
    label: "Pengingat Batas Waktu (Due Date)",
    description: "Pengingat 24 jam sebelum tenggat waktu tugas berakhir",
    icon: Mail,
    defaultChecked: true,
  },
  {
    id: "announcement-modal",
    label: "Pengumuman Resmi Manajemen",
    description: "Tampilkan popup pengumuman resmi perusahaan saat login",
    icon: Sparkles,
    defaultChecked: true,
  },
  {
    id: "security-alerts",
    label: "Peringatan Keamanan & Sesi",
    description: "Notifikasi saat ada aktivitas login baru atau percobaan gagal",
    icon: ShieldAlert,
    defaultChecked: true,
  },
];

export default function NotificationPage() {
  const [settings, setSettings] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NOTIFICATION_OPTIONS.forEach((item) => {
      initial[item.id] = item.defaultChecked;
    });
    return initial;
  });

  const handleToggle = (id: string, checked: boolean) => {
    setSettings((prev) => ({ ...prev, [id]: checked }));
    toast.success("Preferensi notifikasi disimpan");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Main Options Column (8 Kolom) */}
      <div className="lg:col-span-8 space-y-6">
        <div className="rounded-2xl border border-card-border bg-card-surface-area p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-card-border">
            <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Preferensi Notifikasi & Saluran Komunikasi
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Atur bagaimana TrackerKerja memberi tahu Anda tentang agenda dan tugas
              </p>
            </div>
          </div>

          <div className="divide-y divide-card-border/80">
            {NOTIFICATION_OPTIONS.map((item) => {
              const IconComp = item.icon;
              const isChecked = settings[item.id] ?? item.defaultChecked;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 py-4 first:pt-1 last:pb-1"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 mt-0.5">
                      <IconComp className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                        {item.label}
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <Toggle
                    defaultChecked={isChecked}
                    onChange={(e) => handleToggle(item.id, e.target.checked)}
                    size="md"
                    className="shrink-0"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Info Column (4 Kolom) */}
      <div className="lg:col-span-4 space-y-5">
        <div className="rounded-2xl border border-card-border bg-card-surface-area p-5 shadow-sm space-y-3">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Pengiriman Otomatis
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Notifikasi dikirimkan secara cerdas melalui email SMTP internal dan banner in-app untuk memastikan Anda tidak melewatkan pembaruan penting tanpa mengganggu fokus kerja.
          </p>
        </div>
      </div>
    </div>
  );
}
