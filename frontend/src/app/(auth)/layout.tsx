import React from "react";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, Zap } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8 dark:bg-gray-950">
      {/* Background Decorative Gradients */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[35rem] w-[35rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-40 right-10 h-[30rem] w-[30rem] rounded-full bg-gradient-to-br from-blue-500/15 to-emerald-500/15 blur-3xl" />
      </div>

      <div className="relative sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-lg shadow-indigo-500/30">
            <Zap className="h-6 w-6 fill-current" />
          </div>
          <div className="text-left">
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              TrackerKerja <span className="text-indigo-600 dark:text-indigo-400">Pro</span>
            </h1>
            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
              Modern Enterprise Work & Multi-Timer Suite
            </p>
          </div>
        </Link>
      </div>

      <div className="relative mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-gray-200/80 bg-white/95 px-6 py-8 shadow-xl shadow-gray-200/50 backdrop-blur-sm sm:px-10 dark:border-gray-800 dark:bg-gray-900/90 dark:shadow-none">
          {children}
        </div>

        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> PostgreSQL 16 Isolated
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-indigo-500" /> Multi-Tenant Secured
          </span>
        </div>
      </div>
    </div>
  );
}
