"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/services/api/client";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { Building, Building2, CheckCircle2, Lock, Mail, User, Briefcase, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();

  const [companyOption, setCompanyOption] = useState<"existing" | "new">("existing");
  const [companyCode, setCompanyCode] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyCode, setNewCompanyCode] = useState("");

  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRegisteredSuccess, setIsRegisteredSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage("Konfirmasi kata sandi tidak cocok dengan kata sandi.");
      return;
    }

    if (companyOption === "existing" && !companyCode.trim()) {
      setErrorMessage("Silakan masukkan Kode Perusahaan / Holding.");
      return;
    }

    if (companyOption === "new" && (!newCompanyName.trim() || !newCompanyCode.trim())) {
      setErrorMessage("Nama dan kode perusahaan baru wajib diisi.");
      return;
    }

    setLoading(true);

    try {
      await apiClient.post("/auth/register", {
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        jobTitle: jobTitle.trim(),
        companyOption,
        companyCode: companyOption === "existing" ? companyCode.trim().toUpperCase() : null,
        newCompanyName: companyOption === "new" ? newCompanyName.trim() : null,
        newCompanyCode: companyOption === "new" ? newCompanyCode.trim().toUpperCase() : null,
      });

      setIsRegisteredSuccess(true);
      toast.success("Pendaftaran berhasil! Akun Anda siap menunggu verifikasi.");
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || "Gagal melakukan registrasi akun.");
    } finally {
      setLoading(false);
    }
  };

  if (isRegisteredSuccess) {
    return (
      <div className="text-center py-4">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
          <CheckCircle2 className="h-10 w-10 animate-bounce" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Registrasi Berhasil!
        </h2>
        <p className="mt-3 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
          Akun Anda telah dibuat. Demi keamanan korporat, akun Anda saat ini berstatus{" "}
          <span className="font-semibold text-amber-600 dark:text-amber-400">Menunggu Persetujuan Administrator</span>.
        </p>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Administrator perusahaan Anda akan memverifikasi dan menyetujui akun Anda sebelum Anda dapat masuk ke dasbor.
        </p>
        <div className="mt-6">
          <Link href="/login">
            <Button className="w-full bg-indigo-600 font-semibold text-white hover:bg-indigo-700">
              Kembali ke Halaman Masuk
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Daftar Akun TrackerKerja
        </h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Pilih perusahaan Anda atau buat workspace korporat baru.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50/80 p-3 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      {/* Toggle Opsi Perusahaan */}
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1 dark:bg-gray-800/60">
        <button
          type="button"
          onClick={() => setCompanyOption("existing")}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
            companyOption === "existing"
              ? "bg-white text-indigo-700 shadow-xs dark:bg-gray-900 dark:text-indigo-400"
              : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          }`}
        >
          <Building className="h-3.5 w-3.5" />
          Gabung Perusahaan
        </button>
        <button
          type="button"
          onClick={() => setCompanyOption("new")}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
            companyOption === "new"
              ? "bg-white text-indigo-700 shadow-xs dark:bg-gray-900 dark:text-indigo-400"
              : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          }`}
        >
          <Building2 className="h-3.5 w-3.5" />
          Perusahaan Baru
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {companyOption === "existing" ? (
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Kode Perusahaan / Holding
            </label>
            <div className="relative mt-1">
              <Input
                type="text"
                required
                placeholder="Contoh: WCH"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                className="font-mono uppercase font-bold tracking-wider"
              />
            </div>
            <p className="mt-1 text-[11px] text-gray-400">
              Zero-Knowledge: Masukkan kode eksak yang diberikan oleh HR/Admin Anda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Nama Perusahaan
              </label>
              <Input
                type="text"
                required
                placeholder="PT Maju Bersama"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Kode Singkatan
              </label>
              <Input
                type="text"
                required
                placeholder="PMB"
                value={newCompanyCode}
                onChange={(e) => setNewCompanyCode(e.target.value.toUpperCase())}
                className="mt-1 font-mono uppercase font-bold text-xs"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Nama Lengkap
            </label>
            <div className="relative mt-1">
              <User className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                required
                placeholder="Budi Santoso"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Jabatan / Posisi
            </label>
            <div className="relative mt-1">
              <Briefcase className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                required
                placeholder="Senior Engineer"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
            Email Korporat
          </label>
          <div className="relative mt-1">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <Input
              type="email"
              required
              placeholder="budi@wahana.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Kata Sandi
            </label>
            <div className="relative mt-1">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Konfirmasi Sandi
            </label>
            <div className="relative mt-1">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="mt-2 w-full gap-2 bg-indigo-600 py-2.5 font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Memproses Pendaftaran...
            </>
          ) : (
            <>
              Daftar Sekarang
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <div className="mt-5 border-t border-gray-100 pt-4 text-center dark:border-gray-800">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Sudah memiliki akun?{" "}
          <Link
            href="/login"
            className="font-bold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Masuk ke Akun
          </Link>
        </p>
      </div>
    </div>
  );
}
