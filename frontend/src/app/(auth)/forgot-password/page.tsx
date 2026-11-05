"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/services/api/client";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import {
  Lock,
  Mail,
  ArrowRight,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  Eye,
  EyeOff,
  ArrowLeft,
  ClockAlert,
} from "lucide-react";
import { toast } from "sonner";

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialEmail = searchParams.get("email") || "";
  const initialToken = searchParams.get("token") || "";

  const [step, setStep] = useState<"request" | "reset" | "success">(
    initialToken ? "reset" : "request"
  );

  const [email, setEmail] = useState(initialEmail);
  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requiresApproval, setRequiresApproval] = useState(true);

  // Sync params if URL changes
  useEffect(() => {
    if (initialToken) {
      setToken(initialToken);
      setStep("reset");
    }
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialToken, initialEmail]);

  // Handle Step 1: Request Reset
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage("Silakan masukkan alamat email yang terdaftar.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post("/auth/forgot-password", { email: cleanEmail });
      const data = res.data;

      if (data?.claimToken) {
        setToken(data.claimToken);
        toast.success("Verifikasi akun berhasil! Silakan tentukan kata sandi baru.");
        setStep("reset");
      } else {
        toast.info(data?.message || "Instruksi reset telah dipersiapkan.");
        setStep("reset");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Gagal memproses permintaan reset kata sandi.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2: Set New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage("Token reset tidak ditemukan atau telah kedaluwarsa. Silakan ajukan ulang.");
      setStep("request");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("Kata sandi baru minimal 6 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post("/auth/reset-password", {
        email: email.trim().toLowerCase(),
        token,
        newPassword,
      });

      const data = res.data;
      setRequiresApproval(data?.requiresApproval ?? true);
      setStep("success");
      toast.success("Kata sandi berhasil diperbarui!");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Gagal memperbarui kata sandi.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white/90 p-6 shadow-xl backdrop-blur-md sm:p-8 dark:border-gray-800/80 dark:bg-gray-900/90">
        
        {/* ================= STEP 1: REQUEST EMAIL ================= */}
        {step === "request" && (
          <div>
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-inner dark:bg-indigo-950/60 dark:text-indigo-400">
                <KeyRound className="h-7 w-7" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl dark:text-white">
                Lupa Kata Sandi?
              </h1>
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                Masukkan email akun Anda untuk melakukan pembaruan kata sandi.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                <ShieldAlert className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Alamat Email Terdaftar
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
                    autoFocus
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full gap-2 rounded-xl bg-indigo-600 py-3 font-bold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-700 hover:shadow-indigo-500/35 dark:bg-indigo-600 dark:hover:bg-indigo-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Memeriksa Email...
                  </>
                ) : (
                  <>
                    Lanjutkan ke Pembaruan Sandi
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 border-t border-gray-100 pt-5 text-center dark:border-gray-800">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Kembali ke Halaman Masuk
              </Link>
            </div>
          </div>
        )}

        {/* ================= STEP 2: SET NEW PASSWORD ================= */}
        {step === "reset" && (
          <div>
            <div className="mb-5 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-inner dark:bg-amber-950/60 dark:text-amber-400">
                <Lock className="h-7 w-7" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl dark:text-white">
                Buat Kata Sandi Baru
              </h1>
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                Akun: <span className="font-semibold text-gray-800 dark:text-gray-200">{email}</span>
              </p>
            </div>

            {/* Warning Persyaratan Approval Administrator */}
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
              <ClockAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold">Ketentuan Keamanan:</span> Kata sandi yang sudah diperbarui akan <strong>membutuhkan approval Administrator Aplikasi</strong> sebelum dapat digunakan pada login berikutnya.
              </div>
            </div>

            {errorMessage && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                <ShieldAlert className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Kata Sandi Baru
                </label>
                <div className="relative mt-1.5">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Minimal 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Konfirmasi Kata Sandi Baru
                </label>
                <div className="relative mt-1.5">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="Ulangi kata sandi baru"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full gap-2 rounded-xl bg-amber-600 py-3 font-bold text-white shadow-lg shadow-amber-500/25 transition-all hover:bg-amber-700 hover:shadow-amber-500/35 dark:bg-amber-600 dark:hover:bg-amber-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Memperbarui Kata Sandi...
                  </>
                ) : (
                  <>
                    Simpan Kata Sandi Baru
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 text-xs dark:border-gray-800">
              <button
                type="button"
                onClick={() => setStep("request")}
                className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <ArrowLeft className="h-3 w-3" />
                Ganti Email
              </button>
              <Link
                href="/login"
                className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Kembali ke Masuk
              </Link>
            </div>
          </div>
        )}

        {/* ================= STEP 3: SUCCESS & APPROVAL REQUIRED ================= */}
        {step === "success" && (
          <div className="text-center py-2">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white shadow-lg shadow-amber-500/25">
              <ShieldCheck className="h-9 w-9" />
            </div>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Kata Sandi Berhasil Diperbarui!
            </h2>

            {requiresApproval ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-left dark:border-amber-900/60 dark:bg-amber-950/40">
                  <div className="flex items-start gap-2.5">
                    <ClockAlert className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                      <h3 className="text-xs font-bold text-amber-900 dark:text-amber-300">
                        Menunggu Persetujuan Administrator Aplikasi
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-400">
                        Sesuai kebijakan keamanan, akun Anda membutuhkan <strong>approval administrator aplikasi</strong> sebelum dapat digunakan pada login selanjutnya.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Permintaan persetujuan telah otomatis masuk ke modul <em>Manajemen Anggota</em> administrator. Silakan hubungi Administrator sistem atau tunggu hingga akun Anda disetujui kembali.
                </p>
              </div>
            ) : (
              <p className="mt-3 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                Kata sandi Anda telah berhasil diubah. Anda sekarang dapat langsung masuk dengan kredensial baru.
              </p>
            )}

            <div className="mt-6">
              <Link href="/login">
                <Button className="w-full bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-700">
                  Kembali ke Halaman Masuk
                </Button>
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}

