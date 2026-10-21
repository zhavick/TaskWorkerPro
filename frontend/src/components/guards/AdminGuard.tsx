"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, Home, Lock } from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { useCurrentUser } from "@/hooks/use-current-user";

interface AdminGuardProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

export function AdminGuard({
  children,
  fallbackTitle = "Akses Ditolak (403 Forbidden)",
  fallbackMessage = "Modul ini dibatasi hanya untuk Administrator. Akun Anda saat ini tidak memiliki wewenang untuk membuka konfigurasi sistem atau log audit korporat.",
}: AdminGuardProps) {
  const { isAdmin, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-xs text-gray-500 dark:text-gray-400">Memverifikasi wewenang hak akses...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
        <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-rose-200/80 bg-gradient-to-b from-rose-50/70 via-white to-white p-8 text-center shadow-xl dark:border-rose-900/60 dark:from-rose-950/30 dark:via-gray-900 dark:to-gray-900">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shadow-inner dark:bg-rose-950/60 dark:text-rose-400">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-[11px] font-bold text-rose-700 dark:bg-rose-950/80 dark:text-rose-300">
            <Lock className="h-3 w-3" />
            Wewenang Terbatas
          </span>

          <h2 className="mt-3 text-xl font-extrabold text-gray-900 dark:text-white">
            {fallbackTitle}
          </h2>

          <p className="mt-2 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
            {fallbackMessage}
          </p>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button className="w-full gap-2 bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 shadow-md">
                <Home className="h-4 w-4" />
                Kembali ke Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
