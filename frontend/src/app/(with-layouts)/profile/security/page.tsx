"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldAlert,
  Clock,
  Layers,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { toast } from "sonner";

export default function SecurityPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.put("/profile/change-password", {
        currentPassword,
        newPassword,
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Kata sandi berhasil diubah!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ||
          "Gagal mengubah kata sandi. Pastikan kata sandi saat ini benar."
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error("Silakan masukkan kata sandi Anda saat ini.");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      toast.error("Kata sandi baru minimal harus 6 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }

    if (currentPassword === newPassword) {
      toast.error("Kata sandi baru tidak boleh sama dengan kata sandi saat ini.");
      return;
    }

    changePasswordMutation.mutate();
  };

  const isPasswordMatch =
    Boolean(newPassword && confirmPassword && newPassword === confirmPassword);
  const isPasswordMismatch =
    Boolean(newPassword && confirmPassword && newPassword !== confirmPassword);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column (8 Kolom): Change Password Form */}
      <div className="lg:col-span-8 space-y-6">
        <div className="rounded-2xl border border-card-border bg-card-surface-area p-5 sm:p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-card-border">
            <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Perbarui Kata Sandi Akun
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Gunakan kombinasi kata sandi yang kuat untuk melindungi akun kerja Anda
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                <span>Kata Sandi Saat Ini <span className="text-rose-500">*</span></span>
              </label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Masukkan kata sandi lama Anda"
                  required
                  className="pr-10 w-full text-sm font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Kata Sandi Baru <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    required
                    className="pr-10 w-full text-sm font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Konfirmasi Kata Sandi Baru <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru"
                    required
                    className="pr-10 w-full text-sm font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Validation State Feedback */}
            {isPasswordMatch && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Kata sandi baru cocok dan siap diperbarui.
              </div>
            )}
            {isPasswordMismatch && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                <AlertCircle className="h-3.5 w-3.5" />
                Konfirmasi kata sandi baru belum sama.
              </div>
            )}

            <div className="pt-3">
              <Button
                type="submit"
                disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword || isPasswordMismatch}
                className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20"
              >
                {changePasswordMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Menyimpan Kata Sandi...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Perbarui Kata Sandi
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Right Column (4 Kolom): Security Guidelines & Features */}
      <div className="lg:col-span-4 space-y-5">
        {/* Security Summary Card */}
        <div className="rounded-2xl border border-card-border bg-card-surface-area p-5 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Keamanan Akun Terproteksi
          </h4>

          <div className="space-y-3 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-start gap-2.5">
              <Clock className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200">
                  Auto-Logout 1 Jam (Session Guard)
                </p>
                <p className="text-[11px] text-gray-500">
                  Sesi login Anda otomatis berakhir setelah 60 menit inaktivitas untuk mencegah akses tanpa izin.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <KeyRound className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200">
                  Enkripsi Hash SHA-256 + Salt
                </p>
                <p className="text-[11px] text-gray-500">
                  Kata sandi tidak pernah disimpan dalam format teks biasa dan dienkripsi dengan standar industri.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Layers className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200">
                  Isolasi Multi-Tenancy Ketat
                </p>
                <p className="text-[11px] text-gray-500">
                  Data Anda diisolasi per kode perusahaan dan tidak dapat diakses oleh instansi lain.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tip Box */}
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20 text-xs space-y-1.5">
          <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            Tips Kata Sandi Kuat:
          </span>
          <ul className="list-disc list-inside space-y-0.5 text-amber-700 dark:text-amber-400 text-[11px]">
            <li>Minimal 6 karakter dengan kombinasi angka dan huruf</li>
            <li>Hindari menggunakan tanggal lahir atau nama depan</li>
            <li>Ubah kata sandi secara berkala setiap 90 hari</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
