"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Award, Flame, Gift, Sparkles } from "lucide-react";

interface GamificationNavProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function GamificationNav({
  title = "Gamifikasi, Prestasi & Hadiah",
  subtitle = "Pusat gamifikasi terpadu: kumpulkan poin check-in harian, pertahankan streak api, raih lencana prestasi, dan tukarkan reward resmi.",
  action,
}: GamificationNavProps) {
  const pathname = usePathname();

  const tabs = [
    {
      id: "status",
      label: "Status & Streak",
      href: "/gamification",
      icon: <Flame className="h-4 w-4 text-amber-500" />,
      active: pathname === "/gamification",
    },
    {
      id: "badges",
      label: "Lencana Prestasi",
      href: "/gamification/badges",
      icon: <Award className="h-4 w-4 text-indigo-500" />,
      active: pathname.startsWith("/gamification/badges"),
    },
    {
      id: "rewards",
      label: "Reward Store",
      href: "/gamification/rewards",
      icon: <Gift className="h-4 w-4 text-emerald-500" />,
      active: pathname.startsWith("/gamification/rewards"),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Module Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="flex items-center gap-2.5 text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400">
                <Award className="h-6 w-6" />
              </div>
              <span>{title}</span>
            </h1>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Gamifikasi
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {subtitle}
          </p>
        </div>

        {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
      </div>

      {/* Module Navigation Tabs Bar */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-colors ${
              tab.active
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
