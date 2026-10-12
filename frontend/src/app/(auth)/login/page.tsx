"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/services/api/client";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { Checkbox } from "@/components/tailgrids/core/checkbox";
import { AlertCircle, Lock, Mail, ArrowRight, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const reason = searchParams.get("reason");
    if (reason === "inactivity") {
      toast.warning("Sesi Anda berakhir karena tidak ada aktivitas selama 60 menit. Silakan login kembali.");
    } else if (reason === "session_expired") {
      toast.info("Sesi telah kedaluwarsa. Silakan masuk kembali.");
    }
  }, [searchParams]);

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

      // Simpan access token & user info
      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("user_profile", JSON.stringify(user));

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
        setErrorMessage(data?.message || "Email atau password yang Anda masukkan salah.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Masuk ke Akun Anda
        </h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Kelola tugas, rekam timesheet kerja, dan pantau proyek tim.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Kata Sandi
            </label>
            <Link
              href="/forgot-password"
              className="text-[11px] font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Lupa sandi?
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

        <div className="flex items-center">
          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
            <Checkbox
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(!!checked)}
            />
            <span>Ingat saya di perangkat ini</span>
          </label>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full gap-2 bg-indigo-600 py-2.5 font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Memverifikasi...
            </>
          ) : (
            <>
              Masuk Sekarang
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <div className="mt-6 border-t border-gray-100 pt-5 text-center dark:border-gray-800">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Belum memiliki akun?{" "}
          <Link
            href="/register"
            className="font-bold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Daftar Anggota Baru
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}
