"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  Settings,
  Shield,
  Mail,
  FileText,
  Save,
  Send,
  CheckCircle2,
  AlertCircle,
  Database,
  Lock,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { toast } from "sonner";

export default function ConfigurationPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"general" | "security" | "smtp" | "audit">("general");

  // Setting values mapping
  const [settings, setSettings] = useState<Record<string, string>>({
    AppName: "TrackerKerja Modern",
    CompanyDisplayName: "Wahana Central Holding",
    DefaultCurrency: "IDR",
    MaxFailedLoginAttempts: "3",
    LockoutDurationMinutes: "30",
    InactivityTimeoutMinutes: "60",
    SmtpHost: "smtp.mailtrap.io",
    SmtpPort: "587",
    SmtpUser: "tracker_admin",
    SmtpPass: "••••••••",
  });

  const [testEmail, setTestEmail] = useState("");

  // Query Settings
  const { data: serverSettings } = useQuery<any[]>({
    queryKey: ["systemSettings"],
    queryFn: async () => {
      const res = await apiClient.get("/settings");
      return res.data.data;
    },
  });

  // Query Audit Logs
  const { data: auditLogs = [] } = useQuery<any[]>({
    queryKey: ["auditLogsList"],
    queryFn: async () => {
      const res = await apiClient.get("/audit-logs?page=1&pageSize=15");
      return res.data.data;
    },
    enabled: activeTab === "audit",
  });

  useEffect(() => {
    if (serverSettings && Array.isArray(serverSettings)) {
      const map: Record<string, string> = { ...settings };
      serverSettings.forEach((item) => {
        map[item.key] = item.value;
      });
      setSettings(map);
    }
  }, [serverSettings]);

  // Batch Save Settings Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.put("/settings/batch", { settings });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Konfigurasi sistem berhasil disimpan!");
      queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal menyimpan konfigurasi"),
  });

  // Test SMTP Mutation
  const testSmtpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/settings/test-smtp", { recipientEmail: testEmail });
      return res.data;
    },
    onSuccess: (data) => toast.success(data.message || "Email pengujian SMTP terkirim!"),
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal mengirim email pengujian"),
  });

  const handleFieldChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6 px-2 py-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Konfigurasi Sistem & Audit Trail
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Pengaturan umum aplikasi, kebijakan keamanan sesi, integrasi SMTP email, dan riwayat audit.
          </p>
        </div>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gap-2 bg-indigo-600 font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700"
        >
          <Save className="h-4 w-4" />
          Simpan Seluruh Pengaturan
        </Button>
      </div>

      {/* 4 Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200/80 pb-2 dark:border-gray-800">
        <button
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === "general"
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          <Settings className="h-4 w-4" />
          Umum (General)
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === "security"
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          <Shield className="h-4 w-4" />
          Keamanan & Sesi
        </button>

        <button
          onClick={() => setActiveTab("smtp")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === "smtp"
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          <Mail className="h-4 w-4" />
          Notifikasi Email (SMTP)
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === "audit"
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          <FileText className="h-4 w-4" />
          Audit Trail Log
        </button>
      </div>

      {/* Tab 1: General */}
      {activeTab === "general" && (
        <div className="max-w-2xl rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Nama Aplikasi
            </label>
            <Input
              value={settings.AppName || ""}
              onChange={(e) => handleFieldChange("AppName", e.target.value)}
              className="mt-1 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Nama Tampilan Perusahaan / Holding
            </label>
            <Input
              value={settings.CompanyDisplayName || ""}
              onChange={(e) => handleFieldChange("CompanyDisplayName", e.target.value)}
              className="mt-1 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Mata Uang Standar
            </label>
            <Input
              value={settings.DefaultCurrency || "IDR"}
              onChange={(e) => handleFieldChange("DefaultCurrency", e.target.value)}
              className="mt-1 text-xs"
            />
          </div>
        </div>
      )}

      {/* Tab 2: Security */}
      {activeTab === "security" && (
        <div className="max-w-2xl rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Batas Maksimal Percobaan Login Salah
            </label>
            <Input
              type="number"
              value={settings.MaxFailedLoginAttempts || "3"}
              onChange={(e) => handleFieldChange("MaxFailedLoginAttempts", e.target.value)}
              className="mt-1 text-xs font-mono"
            />
            <p className="mt-1 text-[11px] text-gray-400">
              Akun akan dikunci otomatis jika gagal melebihi batas ini.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Durasi Penguncian Akun (Menit)
            </label>
            <Input
              type="number"
              value={settings.LockoutDurationMinutes || "30"}
              onChange={(e) => handleFieldChange("LockoutDurationMinutes", e.target.value)}
              className="mt-1 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Batas Inaktivitas Auto-Logout (Menit)
            </label>
            <Input
              type="number"
              value={settings.InactivityTimeoutMinutes || "60"}
              onChange={(e) => handleFieldChange("InactivityTimeoutMinutes", e.target.value)}
              className="mt-1 text-xs font-mono"
            />
            <p className="mt-1 text-[11px] text-gray-400">
              Peringatan countdown akan muncul 5 menit sebelum auto-logout dieksekusi.
            </p>
          </div>
        </div>
      )}

      {/* Tab 3: SMTP */}
      {activeTab === "smtp" && (
        <div className="max-w-2xl rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                SMTP Host Server
              </label>
              <Input
                value={settings.SmtpHost || ""}
                onChange={(e) => handleFieldChange("SmtpHost", e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Port
              </label>
              <Input
                type="number"
                value={settings.SmtpPort || "587"}
                onChange={(e) => handleFieldChange("SmtpPort", e.target.value)}
                className="mt-1 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Username SMTP
              </label>
              <Input
                value={settings.SmtpUser || ""}
                onChange={(e) => handleFieldChange("SmtpUser", e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Password SMTP
              </label>
              <Input
                type="password"
                value={settings.SmtpPass || ""}
                onChange={(e) => handleFieldChange("SmtpPass", e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          {/* Test SMTP connection section */}
          <div className="mt-6 border-t border-gray-100 pt-4 dark:border-gray-800">
            <h5 className="font-bold text-xs text-gray-700 dark:text-gray-300 mb-2">
              Uji Koneksi Pengiriman Email
            </h5>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="masukkan@email-penerima.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="text-xs flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => testSmtpMutation.mutate()}
                disabled={!testEmail || testSmtpMutation.isPending}
                className="gap-1.5 text-xs shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
                Kirim Email Uji
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeTab === "audit" && (
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-3">
            Audit Trail Aktivitas Sistem
          </h4>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/75 dark:border-gray-800 dark:bg-gray-800/50">
                  <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Waktu</th>
                  <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">User</th>
                  <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Method</th>
                  <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Endpoint Path</th>
                  <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Status</th>
                  <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Durasi</th>
                  <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {auditLogs.map((log: any) => (
                  <tr key={log.id}>
                    <td className="px-4 py-2.5 font-mono text-gray-400">
                      {new Date(log.timestamp).toLocaleTimeString("id-ID")}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-gray-900 dark:text-white">
                      {log.userName || log.userEmail || "System"}
                    </td>
                    <td className="px-4 py-2.5 font-mono font-bold">{log.httpMethod}</td>
                    <td className="px-4 py-2.5 font-mono text-gray-600 dark:text-gray-300">
                      {log.path}
                    </td>
                    <td className="px-4 py-2.5 font-mono">
                      <span
                        className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${
                          log.statusCode < 400
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {log.statusCode}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-gray-400">{log.durationMs}ms</td>
                    <td className="px-4 py-2.5 font-mono text-gray-400">{log.ipAddress || "-"}</td>
                  </tr>
                ))}

                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      Belum ada catatan log aktivitas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
