"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/services/api/client";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { Checkbox } from "@/components/tailgrids/core/checkbox";
import LottiePlayer from "@/components/common/lottie-player";
import {
  Lock,
  Mail,
  ArrowRight,
  Loader2,
  ShieldAlert,
  Building2,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
  AlertTriangle,
  LogOut,
  ChevronDown,
  Search,
} from "lucide-react";
import { toast } from "sonner";

interface CompanyItem {
  id: number;
  name: string;
  code: string;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Company selection dropdown state
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyItem | null>(null);
  const [companySearch, setCompanySearch] = useState("");
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // Banner status from query params
  const [sessionBanner, setSessionBanner] = useState<{
    type: "info" | "warning" | "error" | "success";
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    // 1. Check query parameter reason
    const reason = searchParams.get("reason");
    if (reason === "timeout") {
      setSessionBanner({
        type: "warning",
        title: "Sesi Berakhir (Timeout)",
        message: "Sesi kerja Anda telah kedaluwarsa demi keamanan akun. Silakan masuk kembali.",
      });
    } else if (reason === "inactivity") {
      setSessionBanner({
        type: "warning",
        title: "Sesi Tidak Aktif",
        message: "Tidak ada aktivitas terdeteksi selama 60 menit terakhir. Silakan login kembali.",
      });
    } else if (reason === "pending") {
      setSessionBanner({
        type: "info",
        title: "Pendaftaran Menunggu Persetujuan",
        message: "Akun Anda berhasil didaftarkan dan sedang menunggu persetujuan Administrator.",
      });
    } else if (reason === "rejected") {
      setSessionBanner({
        type: "error",
        title: "Akses Ditolak",
        message: "Pendaftaran akun Anda tidak disetujui. Hubungi Administrator perusahaan Anda.",
      });
    } else if (reason === "logged_out") {
      setSessionBanner({
        type: "success",
        title: "Berhasil Keluar",
        message: "Sesi kerja Anda telah ditutup dengan aman.",
      });
    }

    // 2. Fetch companies list for company select dropdown
    const fetchCompanies = async () => {
      try {
        setLoadingCompanies(true);
        const res = await apiClient.get("/auth/companies");
        if (Array.isArray(res.data)) {
          setCompanies(res.data);
        }
      } catch (err) {
        console.warn("Could not load companies list", err);
      } finally {
        setLoadingCompanies(false);
      }
    };
    fetchCompanies();
  }, [searchParams]);

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(companySearch.toLowerCase()) ||
    c.code.toLowerCase().includes(companySearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const response = await apiClient.post("/auth/login", {
        email: email.trim(),
        password,
      });

      const { accessToken, user } = response.data;

      // Save token & user profile
      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("user_profile", JSON.stringify(user));

      // Reset session-level announcement dismissals on new login
      if (typeof window !== "undefined") {
        try {
          Object.keys(sessionStorage).forEach((key) => {
            if (key.startsWith("wtp_session_dismissed_")) {
              sessionStorage.removeItem(key);
            }
          });
        } catch {}
      }

      toast.success(`Selamat datang kembali, ${user.fullName}!`);
      router.push("/dashboard");
    } catch (err: any) {
      const status = err.response?.status;
      const data = err.response?.data;

      if (status === 403) {
        setErrorMessage(data?.message || "Akun Anda sedang menunggu persetujuan Administrator.");
      } else if (status === 423) {
        setErrorMessage(data?.message || "Akun Anda terkunci sementara karena salah password 3 kali berturut-turut.");
      } else {
        setErrorMessage(data?.message || "Email atau kata sandi yang Anda masukkan salah.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid w-full grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12">
      {/* Left Column: Modern Hero with Lottie Animation & Features (FSD 5.19) */}
      <div className="hidden flex-col justify-center lg:col-span-6 lg:flex">
        <div className="relative mx-auto max-w-md text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50/80 px-3.5 py-1 text-xs font-semibold text-indigo-700 shadow-xs dark:border-indigo-900/60 dark:bg-indigo-950/60 dark:text-indigo-300">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            <span>Work Tracker Pro Enterprise v3.8</span>
          </div>

          <h2 className="mt-4 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl dark:text-white">
            Kelola Waktu & Proyek Tanpa Hambatan
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            Platform all-in-one untuk pelacakan multi-timer, manajemen kanban interaktif, presensi kerja mandiri, dan gamifikasi reward.
          </p>

          {/* Interactive Lottie Animation */}
          <div className="relative my-6 flex justify-center">
            <div className="relative h-64 w-64 overflow-hidden rounded-3xl border border-indigo-100/60 bg-gradient-to-tr from-white/90 via-indigo-50/40 to-purple-50/30 p-2 shadow-xl shadow-indigo-500/10 backdrop-blur-xs dark:border-indigo-900/40 dark:bg-gray-900/80 dark:shadow-none">
              <LottiePlayer className="h-full w-full" />
            </div>
          </div>

          {/* 3 Value Pillars */}
          <div className="grid grid-cols-3 gap-3 pt-2 text-center">
            <div className="rounded-xl border border-gray-200/70 bg-white/70 p-3 shadow-2xs dark:border-gray-800 dark:bg-gray-900/60">
              <Clock className="mx-auto h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <div className="mt-1 text-xs font-bold text-gray-900 dark:text-white">Multi-Timer</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">Live Mengambang</div>
            </div>
            <div className="rounded-xl border border-gray-200/70 bg-white/70 p-3 shadow-2xs dark:border-gray-800 dark:bg-gray-900/60">
              <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div className="mt-1 text-xs font-bold text-gray-900 dark:text-white">Presensi GPS</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">WFO & WFH</div>
            </div>
            <div className="rounded-xl border border-gray-200/70 bg-white/70 p-3 shadow-2xs dark:border-gray-800 dark:bg-gray-900/60">
              <Sparkles className="mx-auto h-5 w-5 text-amber-500" />
              <div className="mt-1 text-xs font-bold text-gray-900 dark:text-white">Gamifikasi</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">40+ Lencana</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Modern Login Card & Form (FSD 5.19) */}
      <div className="w-full lg:col-span-6">
        <div className="mx-auto max-w-md rounded-3xl border border-gray-200/80 bg-white/95 p-6 shadow-2xl shadow-indigo-950/5 backdrop-blur-md sm:p-9 dark:border-gray-800 dark:bg-gray-900/90 dark:shadow-none">
          <div className="mb-6 text-left">
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
              Masuk ke Akun Anda
            </h1>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Masukkan kredensial korporat untuk mengakses workspace.
            </p>
          </div>

          {/* Session Banner Alerts (FSD 5.19) */}
          {sessionBanner && (
            <div
              className={`mb-5 flex items-start gap-3 rounded-2xl border p-3.5 text-xs transition-all ${
                sessionBanner.type === "warning"
                  ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
                  : sessionBanner.type === "info"
                  ? "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200"
                  : sessionBanner.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
                  : "border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
              }`}
            >
              {sessionBanner.type === "warning" && (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              )}
              {sessionBanner.type === "info" && (
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              )}
              {sessionBanner.type === "success" && (
                <LogOut className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              )}
              {sessionBanner.type === "error" && (
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
              )}
              <div className="flex-1">
                <div className="font-bold">{sessionBanner.title}</div>
                <div className="mt-0.5 leading-relaxed opacity-90">{sessionBanner.message}</div>
              </div>
            </div>
          )}

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-3.5 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
              <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Searchable Company Selector (FSD 5.19) */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Pilihan Perusahaan / Instansi
              </label>
              <div className="relative mt-1.5">
                <button
                  type="button"
                  onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
                  className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50/60 px-3.5 py-2.5 text-left text-xs transition-colors hover:bg-gray-100/70 focus:border-indigo-500 focus:outline-none dark:border-gray-800 dark:bg-gray-800/60 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    {selectedCompany ? (
                      <span className="font-semibold text-gray-900 dark:text-white truncate">
                        {selectedCompany.name} ({selectedCompany.code})
                      </span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">
                        Pilih Perusahaan (Opsional)
                      </span>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                </button>

                {/* Combobox Dropdown */}
                {isCompanyDropdownOpen && (
                  <div className="absolute z-20 mt-1 w-full rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
                    <div className="relative mb-2">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Cari nama atau kode..."
                        value={companySearch}
                        onChange={(e) => setCompanySearch(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-3 text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-indigo-500 dark:border-gray-800 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
                      />
                    </div>

                    <div className="max-h-44 overflow-y-auto space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCompany(null);
                          setIsCompanyDropdownOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <span className="text-gray-500">Semua Perusahaan</span>
                      </button>

                      {filteredCompanies.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedCompany(c);
                            setIsCompanyDropdownOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                            selectedCompany?.id === c.id
                              ? "bg-indigo-50 text-indigo-700 font-bold dark:bg-indigo-950/60 dark:text-indigo-300"
                              : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
                          }`}
                        >
                          <span className="truncate">{c.name}</span>
                          <span className="ml-2 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                            {c.code}
                          </span>
                        </button>
                      ))}

                      {filteredCompanies.length === 0 && (
                        <div className="py-3 text-center text-xs text-gray-400">
                          Perusahaan tidak ditemukan.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Alamat Email Korporat
              </label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="email"
                  required
                  placeholder="nama@perusahaan.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Kata Sandi
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Lupa kata sandi?
                </Link>
              </div>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                <Checkbox
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(!!checked)}
                />
                <span>Ingat saya di perangkat ini</span>
              </label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full gap-2 rounded-xl bg-indigo-600 py-3 font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-700 hover:shadow-indigo-500/35 dark:bg-indigo-600 dark:hover:bg-indigo-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memverifikasi Akun...
                </>
              ) : (
                <>
                  Masuk Sekarang
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Registration Link */}
          <div className="mt-6 border-t border-gray-100 pt-5 text-center dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Belum terdaftar dalam sistem?{" "}
              <Link
                href="/register"
                className="font-bold text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Daftar Anggota Baru
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}
