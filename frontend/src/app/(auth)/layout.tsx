import React from "react";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import ThemeToggle from "@/components/common/header/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col justify-between bg-slate-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Background Decorative Ambient Gradients */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[35rem] w-[35rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-500/15 to-purple-500/15 blur-3xl dark:from-indigo-900/25 dark:to-purple-900/20" />
        <div className="absolute -bottom-40 right-10 h-[30rem] w-[30rem] rounded-full bg-gradient-to-br from-blue-500/10 to-emerald-500/10 blur-3xl dark:from-blue-900/20 dark:to-emerald-950/20" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-lg shadow-indigo-500/25 transition-transform group-hover:scale-105">
            <Zap className="h-5 w-5 fill-current" />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-gray-900 dark:text-white">
              TrackerKerja <span className="text-indigo-600 dark:text-indigo-400">Pro</span>
            </span>
            <span className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400">
              Modern Enterprise Suite
            </span>
          </div>
        </Link>

        {/* Instant Theme Toggle (FSD 5.19) */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-block text-xs font-medium text-gray-500 dark:text-gray-400">
            Tampilan:
          </span>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-4 sm:px-6 sm:py-8">
        {children}
      </main>

      {/* Footer Security Badges */}
      <footer className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 border-t border-gray-200/60 py-5 text-center text-xs text-gray-500 sm:flex-row sm:px-6 dark:border-gray-800/60 dark:text-gray-400">
        <div>
          &copy; {new Date().getFullYear()} TrackerKerja Pro. Solusi Pelacak Waktu & Manajemen Tugas Enterprise.
        </div>
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> PostgreSQL 16 Multi-Tenant
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="h-4 w-4 text-indigo-500" /> AES-256 Auth Shield
          </span>
        </div>
      </footer>
    </div>
  );
}
