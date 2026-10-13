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
  Layers,
  Flag,
  CheckSquare,
  Milestone as MilestoneIcon,
  Tag,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Palette,
  Sparkles,
  RefreshCw,
  Download,
  Upload,
  ArrowUpRight,
  ArrowDownLeft,
  Cloud,
  HardDrive,
  Server,
  Clock,
  Key,
  FileArchive,
  Check,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/tailgrids/core/dialog";
import { toast } from "sonner";

const COLOR_PRESETS = [
  "#6366F1", // Indigo
  "#3B82F6", // Blue
  "#06B6D4", // Cyan
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EF4444", // Rose
  "#EC4899", // Pink
  "#8B5CF6", // Purple
  "#64748B", // Slate
];

export default function ConfigurationPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    "general" | "security" | "smtp" | "audit" | "master" | "sync"
  >("general");

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

  // ==========================================
  // SYNC / HOST INDUK STATES
  // ==========================================
  const [hostUrl, setHostUrl] = useState("http://localhost:5000");
  const [syncApiKey, setSyncApiKey] = useState("");
  const [includeFiles, setIncludeFiles] = useState(true);
  const [pingResult, setPingResult] = useState<{
    ready: boolean;
    latencyMs: number;
    message?: string;
  } | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);

  // Subtab for Master Data
  const [masterSubTab, setMasterSubTab] = useState<
    "priorities" | "statuses" | "milestones" | "categories"
  >("priorities");

  // ==========================================
  // MASTER DATA MODAL STATES
  // ==========================================
  // Priority Modal
  const [priorityModalOpen, setPriorityModalOpen] = useState(false);
  const [priorityFormMode, setPriorityFormMode] = useState<"create" | "edit">("create");
  const [editingPriorityId, setEditingPriorityId] = useState<number | null>(null);
  const [priorityForm, setPriorityForm] = useState({
    name: "",
    color: "#6366F1",
    icon: "flag",
    orderIndex: 1,
    description: "",
    isDefault: false,
  });

  // Status Modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusFormMode, setStatusFormMode] = useState<"create" | "edit">("create");
  const [editingStatusId, setEditingStatusId] = useState<number | null>(null);
  const [statusForm, setStatusForm] = useState({
    name: "",
    color: "#6366F1",
    isDoneState: false,
    orderIndex: 1,
    description: "",
    isDefault: false,
  });

  // Milestone Modal
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [milestoneFormMode, setMilestoneFormMode] = useState<"create" | "edit">("create");
  const [editingMilestoneId, setEditingMilestoneId] = useState<number | null>(null);
  const [milestoneForm, setMilestoneForm] = useState({
    name: "",
    phase: "Implementation",
    color: "#6366F1",
    icon: "milestone",
    orderIndex: 1,
    description: "",
    isDefault: false,
  });

  // Category Modal
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryFormMode, setCategoryFormMode] = useState<"create" | "edit">("create");
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    color: "#6366F1",
    description: "",
  });

  // Delete Confirm Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    type: "priority" | "status" | "milestone" | "category";
    id: number;
    name: string;
    isDefault?: boolean;
  } | null>(null);

  // ==========================================
  // QUERIES
  // ==========================================
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

  // Master Data Queries
  const { data: priorities = [], isLoading: loadingPriorities } = useQuery<any[]>({
    queryKey: ["masterPriorities"],
    queryFn: async () => {
      const res = await apiClient.get("/master/priorities");
      return res.data.data;
    },
    enabled: activeTab === "master",
  });

  const { data: statuses = [], isLoading: loadingStatuses } = useQuery<any[]>({
    queryKey: ["masterStatuses"],
    queryFn: async () => {
      const res = await apiClient.get("/master/statuses");
      return res.data.data;
    },
    enabled: activeTab === "master",
  });

  const { data: milestones = [], isLoading: loadingMilestones } = useQuery<any[]>({
    queryKey: ["masterMilestones"],
    queryFn: async () => {
      const res = await apiClient.get("/master/milestones");
      return res.data.data;
    },
    enabled: activeTab === "master",
  });

  const { data: categories = [], isLoading: loadingCategories } = useQuery<any[]>({
    queryKey: ["masterCategories"],
    queryFn: async () => {
      const res = await apiClient.get("/master/categories");
      return res.data.data;
    },
    enabled: activeTab === "master",
  });

  // ==========================================
  // QUERIES - SYNC / HOST INDUK
  // ==========================================
  const {
    data: localPing,
    isLoading: loadingPing,
    refetch: refetchPing,
  } = useQuery({
    queryKey: ["syncLocalPing"],
    queryFn: async () => {
      const res = await apiClient.get("/sync/ping");
      return res.data;
    },
    enabled: activeTab === "sync",
  });

  const {
    data: syncHistories = [],
    isLoading: loadingHistory,
    refetch: refetchHistory,
  } = useQuery<any[]>({
    queryKey: ["syncHistory"],
    queryFn: async () => {
      const res = await apiClient.get("/sync/history?limit=30");
      return res.data;
    },
    enabled: activeTab === "sync",
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

  // ==========================================
  // MUTATIONS - SETTINGS
  // ==========================================
  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.put("/settings/batch", { settings });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Konfigurasi sistem berhasil disimpan!");
      queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Gagal menyimpan konfigurasi"),
  });

  const testSmtpMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/settings/test-smtp", { recipientEmail: testEmail });
      return res.data;
    },
    onSuccess: (data) => toast.success(data.message || "Email pengujian SMTP terkirim!"),
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Gagal mengirim email pengujian"),
  });

  // ==========================================
  // MUTATIONS - SYNC / HOST INDUK
  // ==========================================
  const pingHostMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/sync/ping-host", { hostUrl, apiKey: syncApiKey });
      return res.data;
    },
    onSuccess: (data: any) => {
      setPingResult({
        ready: data.ready,
        latencyMs: data.responseLatencyMs || 0,
        message: `Terhubung ke ${data.instanceName} (v${data.version})`,
      });
      toast.success(`Host merespons dalam ${data.responseLatencyMs || 0} ms!`);
    },
    onError: (err: any) => {
      setPingResult(null);
      toast.error(err.response?.data?.message || "Gagal menghubungi host induk");
    },
  });

  const pushMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/sync/push", { hostUrl, apiKey: syncApiKey, includeFiles });
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success(data.message || "Data berhasil di-push ke host induk!");
      refetchHistory();
      refetchPing();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal melakukan push ke host induk");
    },
  });

  const pullMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/sync/pull", { hostUrl, apiKey: syncApiKey, includeFiles });
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success(data.message || "Data berhasil ditarik dari host induk!");
      refetchHistory();
      refetchPing();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal melakukan pull dari host induk");
    },
  });

  const exportZipMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.get(`/sync/export-package?includeFiles=${includeFiles}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `trackerkerja_sync_package_${Date.now()}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return true;
    },
    onSuccess: () => {
      toast.success("Paket .ZIP berhasil diunduh!");
      refetchHistory();
      refetchPing();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal mengekspor paket .ZIP");
    },
  });

  const importZipMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiClient.post("/sync/import-package", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success(data.message || "Paket .ZIP berhasil diimpor!");
      setImportFile(null);
      refetchHistory();
      refetchPing();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal mengimpor paket .ZIP");
    },
  });

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes <= 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  // ==========================================
  // MUTATIONS - MASTER DATA
  // ==========================================
  // Priority
  const savePriorityMutation = useMutation({
    mutationFn: async () => {
      if (priorityFormMode === "create") {
        const res = await apiClient.post("/master/priorities", priorityForm);
        return res.data;
      } else {
        const res = await apiClient.put(`/master/priorities/${editingPriorityId}`, priorityForm);
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success(
        priorityFormMode === "create"
          ? "Prioritas berhasil ditambahkan!"
          : "Prioritas berhasil diperbarui!"
      );
      queryClient.invalidateQueries({ queryKey: ["masterPriorities"] });
      setPriorityModalOpen(false);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Gagal memproses data prioritas"),
  });

  const deletePriorityMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete(`/master/priorities/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Prioritas berhasil dihapus!");
      queryClient.invalidateQueries({ queryKey: ["masterPriorities"] });
      setDeleteModalOpen(false);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Gagal menghapus prioritas"),
  });

  // Status
  const saveStatusMutation = useMutation({
    mutationFn: async () => {
      if (statusFormMode === "create") {
        const res = await apiClient.post("/master/statuses", statusForm);
        return res.data;
      } else {
        const res = await apiClient.put(`/master/statuses/${editingStatusId}`, statusForm);
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success(
        statusFormMode === "create"
          ? "Status tugas berhasil ditambahkan!"
          : "Status tugas berhasil diperbarui!"
      );
      queryClient.invalidateQueries({ queryKey: ["masterStatuses"] });
      setStatusModalOpen(false);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Gagal memproses data status"),
  });

  const deleteStatusMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete(`/master/statuses/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Status berhasil dihapus!");
      queryClient.invalidateQueries({ queryKey: ["masterStatuses"] });
      setDeleteModalOpen(false);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Gagal menghapus status"),
  });

  // Milestone
  const saveMilestoneMutation = useMutation({
    mutationFn: async () => {
      if (milestoneFormMode === "create") {
        const res = await apiClient.post("/master/milestones", milestoneForm);
        return res.data;
      } else {
        const res = await apiClient.put(`/master/milestones/${editingMilestoneId}`, milestoneForm);
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success(
        milestoneFormMode === "create"
          ? "Milestone SDLC berhasil ditambahkan!"
          : "Milestone SDLC berhasil diperbarui!"
      );
      queryClient.invalidateQueries({ queryKey: ["masterMilestones"] });
      setMilestoneModalOpen(false);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Gagal memproses data milestone"),
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete(`/master/milestones/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Milestone berhasil dihapus!");
      queryClient.invalidateQueries({ queryKey: ["masterMilestones"] });
      setDeleteModalOpen(false);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Gagal menghapus milestone"),
  });

  // Category
  const saveCategoryMutation = useMutation({
    mutationFn: async () => {
      if (categoryFormMode === "create") {
        const res = await apiClient.post("/master/categories", categoryForm);
        return res.data;
      } else {
        const res = await apiClient.put(`/master/categories/${editingCategoryId}`, categoryForm);
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success(
        categoryFormMode === "create"
          ? "Kategori pekerjaan berhasil ditambahkan!"
          : "Kategori pekerjaan berhasil diperbarui!"
      );
      queryClient.invalidateQueries({ queryKey: ["masterCategories"] });
      setCategoryModalOpen(false);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Gagal memproses data kategori"),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete(`/master/categories/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Kategori berhasil dihapus!");
      queryClient.invalidateQueries({ queryKey: ["masterCategories"] });
      setDeleteModalOpen(false);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Gagal menghapus kategori"),
  });

  const handleFieldChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // Open Edit Modals Helpers
  const handleOpenEditPriority = (item: any) => {
    setPriorityFormMode("edit");
    setEditingPriorityId(item.id);
    setPriorityForm({
      name: item.name || "",
      color: item.color || "#6366F1",
      icon: item.icon || "flag",
      orderIndex: item.orderIndex || 1,
      description: item.description || "",
      isDefault: item.isDefault || false,
    });
    setPriorityModalOpen(true);
  };

  const handleOpenCreatePriority = () => {
    setPriorityFormMode("create");
    setEditingPriorityId(null);
    setPriorityForm({
      name: "",
      color: "#6366F1",
      icon: "flag",
      orderIndex: (priorities.length || 0) + 1,
      description: "",
      isDefault: false,
    });
    setPriorityModalOpen(true);
  };

  const handleOpenEditStatus = (item: any) => {
    setStatusFormMode("edit");
    setEditingStatusId(item.id);
    setStatusForm({
      name: item.name || "",
      color: item.color || "#6366F1",
      isDoneState: item.isDoneState || false,
      orderIndex: item.orderIndex || 1,
      description: item.description || "",
      isDefault: item.isDefault || false,
    });
    setStatusModalOpen(true);
  };

  const handleOpenCreateStatus = () => {
    setStatusFormMode("create");
    setEditingStatusId(null);
    setStatusForm({
      name: "",
      color: "#6366F1",
      isDoneState: false,
      orderIndex: (statuses.length || 0) + 1,
      description: "",
      isDefault: false,
    });
    setStatusModalOpen(true);
  };

  const handleOpenEditMilestone = (item: any) => {
    setMilestoneFormMode("edit");
    setEditingMilestoneId(item.id);
    setMilestoneForm({
      name: item.name || "",
      phase: item.phase || "Implementation",
      color: item.color || "#6366F1",
      icon: item.icon || "milestone",
      orderIndex: item.orderIndex || 1,
      description: item.description || "",
      isDefault: item.isDefault || false,
    });
    setMilestoneModalOpen(true);
  };

  const handleOpenCreateMilestone = () => {
    setMilestoneFormMode("create");
    setEditingMilestoneId(null);
    setMilestoneForm({
      name: "",
      phase: "Implementation",
      color: "#6366F1",
      icon: "milestone",
      orderIndex: (milestones.length || 0) + 1,
      description: "",
      isDefault: false,
    });
    setMilestoneModalOpen(true);
  };

  const handleOpenEditCategory = (item: any) => {
    setCategoryFormMode("edit");
    setEditingCategoryId(item.id);
    setCategoryForm({
      name: item.name || "",
      color: item.color || "#6366F1",
      description: item.description || "",
    });
    setCategoryModalOpen(true);
  };

  const handleOpenCreateCategory = () => {
    setCategoryFormMode("create");
    setEditingCategoryId(null);
    setCategoryForm({
      name: "",
      color: "#6366F1",
      description: "",
    });
    setCategoryModalOpen(true);
  };

  const executeDelete = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === "priority") deletePriorityMutation.mutate(itemToDelete.id);
    if (itemToDelete.type === "status") deleteStatusMutation.mutate(itemToDelete.id);
    if (itemToDelete.type === "milestone") deleteMilestoneMutation.mutate(itemToDelete.id);
    if (itemToDelete.type === "category") deleteCategoryMutation.mutate(itemToDelete.id);
  };

  return (
    <div className="space-y-6 px-2 py-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Konfigurasi Sistem & Master Data
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Pengaturan umum aplikasi, keamanan sesi, SMTP email, jejak audit, dan Master Data SDLC.
          </p>
        </div>

        {activeTab !== "master" && activeTab !== "sync" && (
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="gap-2 bg-indigo-600 font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700"
          >
            <Save className="h-4 w-4" />
            Simpan Seluruh Pengaturan
          </Button>
        )}
      </div>

      {/* 6 Tabs Navigation */}
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
          Jejak Audit (Audit Trail)
        </button>

        <button
          onClick={() => setActiveTab("master")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === "master"
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          <Layers className="h-4 w-4" />
          Master Data & SDLC
        </button>

        <button
          onClick={() => setActiveTab("sync")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === "sync"
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          <RefreshCw className="h-4 w-4" />
          Sinkronisasi Host Induk
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: UMUM */}
      {/* ======================================================== */}
      {activeTab === "general" && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-base font-bold text-gray-900 dark:text-white">
            Pengaturan Profil Aplikasi & Entitas Perusahaan
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold text-gray-700 dark:text-gray-300">
                Nama Aplikasi
              </label>
              <Input
                value={settings.AppName || ""}
                onChange={(e) => handleFieldChange("AppName", e.target.value)}
                placeholder="TrackerKerja Modern"
              />
              <span className="mt-1 text-[11px] text-gray-400">
                Ditampilkan pada judul tab browser dan top bar aplikasi.
              </span>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-gray-700 dark:text-gray-300">
                Nama Tampilan Perusahaan
              </label>
              <Input
                value={settings.CompanyDisplayName || ""}
                onChange={(e) => handleFieldChange("CompanyDisplayName", e.target.value)}
                placeholder="Wahana Central Holding"
              />
              <span className="mt-1 text-[11px] text-gray-400">
                Nama entitas holding/organisasi standar pada header.
              </span>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-gray-700 dark:text-gray-300">
                Mata Uang Finansial Default
              </label>
              <Input
                value={settings.DefaultCurrency || ""}
                onChange={(e) => handleFieldChange("DefaultCurrency", e.target.value)}
                placeholder="IDR"
              />
              <span className="mt-1 text-[11px] text-gray-400">
                Digunakan pada perhitungan burn rate dan anggaran proyek (misal: IDR, USD).
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: KEAMANAN & SESI */}
      {/* ======================================================== */}
      {activeTab === "security" && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-base font-bold text-gray-900 dark:text-white">
            Kebijakan Keamanan Akun & Inaktivitas Sesi
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold text-gray-700 dark:text-gray-300">
                Batas Percobaan Login Gagal (Maksimal)
              </label>
              <Input
                type="number"
                value={settings.MaxFailedLoginAttempts || "3"}
                onChange={(e) => handleFieldChange("MaxFailedLoginAttempts", e.target.value)}
              />
              <span className="mt-1 text-[11px] text-gray-400">
                Akun akan terkunci otomatis jika gagal login sebanyak nilai ini.
              </span>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-gray-700 dark:text-gray-300">
                Durasi Penguncian Akun (Menit)
              </label>
              <Input
                type="number"
                value={settings.LockoutDurationMinutes || "30"}
                onChange={(e) => handleFieldChange("LockoutDurationMinutes", e.target.value)}
              />
              <span className="mt-1 text-[11px] text-gray-400">
                Waktu tunggu sebelum akun terkunci dapat mencoba login kembali.
              </span>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold text-gray-700 dark:text-gray-300">
                Batas Waktu Inaktivitas Sesi (Menit)
              </label>
              <Input
                type="number"
                value={settings.InactivityTimeoutMinutes || "60"}
                onChange={(e) => handleFieldChange("InactivityTimeoutMinutes", e.target.value)}
              />
              <span className="mt-1 text-[11px] text-gray-400">
                Pengguna akan di-logout otomatis jika tidak ada interaksi selama periode ini.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: SMTP EMAIL */}
      {/* ======================================================== */}
      {activeTab === "smtp" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-base font-bold text-gray-900 dark:text-white">
              Konfigurasi Server SMTP Email
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold text-gray-700 dark:text-gray-300">
                  SMTP Host Server
                </label>
                <Input
                  value={settings.SmtpHost || ""}
                  onChange={(e) => handleFieldChange("SmtpHost", e.target.value)}
                  placeholder="smtp.mailtrap.io"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-gray-700 dark:text-gray-300">
                  SMTP Port
                </label>
                <Input
                  value={settings.SmtpPort || ""}
                  onChange={(e) => handleFieldChange("SmtpPort", e.target.value)}
                  placeholder="587"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-gray-700 dark:text-gray-300">
                  SMTP Username / Email
                </label>
                <Input
                  value={settings.SmtpUser || ""}
                  onChange={(e) => handleFieldChange("SmtpUser", e.target.value)}
                  placeholder="admin@perusahaan.com"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-gray-700 dark:text-gray-300">
                  SMTP Password
                </label>
                <Input
                  type="password"
                  value={settings.SmtpPass || ""}
                  onChange={(e) => handleFieldChange("SmtpPass", e.target.value)}
                  placeholder="••••••••••••"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-2 text-base font-bold text-gray-900 dark:text-white">
              Uji Konektivitas Pengiriman Email
            </h2>
            <p className="mb-4 text-xs text-gray-500">
              Kirim email percobaan untuk memastikan kredensial SMTP server valid dan aktif.
            </p>
            <div className="flex max-w-md gap-3">
              <Input
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="nama@email.com"
              />
              <Button
                onClick={() => testSmtpMutation.mutate()}
                disabled={testSmtpMutation.isPending || !testEmail}
                className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Send className="h-4 w-4" />
                Uji Kirim
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: AUDIT TRAIL */}
      {/* ======================================================== */}
      {activeTab === "audit" && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Riwayat Jejak Audit Sistem
            </h2>
            <span className="text-xs text-gray-400">15 Catatan Aktivitas Terakhir</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 uppercase tracking-wider text-gray-500 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Waktu</th>
                  <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Pengguna</th>
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
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          log.statusCode < 400
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
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

      {/* ======================================================== */}
      {/* TAB 5: MASTER DATA & SDLC (FSD 5.13) */}
      {/* ======================================================== */}
      {activeTab === "master" && (
        <div className="space-y-6">
          {/* Sub Navigation Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => setMasterSubTab("priorities")}
              className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                masterSubTab === "priorities"
                  ? "border-indigo-600 bg-indigo-50/70 shadow-xs dark:border-indigo-500 dark:bg-indigo-950/30"
                  : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900"
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  masterSubTab === "priorities"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                <Flag className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                  Prioritas Tugas
                </h3>
                <p className="text-[11px] text-gray-500">{priorities.length} Tingkat</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMasterSubTab("statuses")}
              className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                masterSubTab === "statuses"
                  ? "border-indigo-600 bg-indigo-50/70 shadow-xs dark:border-indigo-500 dark:bg-indigo-950/30"
                  : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900"
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  masterSubTab === "statuses"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                <CheckSquare className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900 dark:text-white">Status Tugas</h3>
                <p className="text-[11px] text-gray-500">{statuses.length} Status Alur</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMasterSubTab("milestones")}
              className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                masterSubTab === "milestones"
                  ? "border-indigo-600 bg-indigo-50/70 shadow-xs dark:border-indigo-500 dark:bg-indigo-950/30"
                  : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900"
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  masterSubTab === "milestones"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                <MilestoneIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900 dark:text-white">Milestone SDLC</h3>
                <p className="text-[11px] text-gray-500">{milestones.length} Fase Waterfall</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMasterSubTab("categories")}
              className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                masterSubTab === "categories"
                  ? "border-indigo-600 bg-indigo-50/70 shadow-xs dark:border-indigo-500 dark:bg-indigo-950/30"
                  : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900"
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  masterSubTab === "categories"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                <Tag className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                  Kategori Tugas
                </h3>
                <p className="text-[11px] text-gray-500">{categories.length} Spesialisasi</p>
              </div>
            </button>
          </div>

          {/* ======================================================== */}
          {/* SUBTAB 1: PRIORITAS */}
          {/* ======================================================== */}
          {masterSubTab === "priorities" && (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    Master Prioritas Pekerjaan
                  </h2>
                  <p className="text-xs text-gray-500">
                    Tingkat urgensi penanganan tugas yang digunakan pada tabel tugas, form, dan analitik.
                  </p>
                </div>
                <Button
                  onClick={handleOpenCreatePriority}
                  size="sm"
                  className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Prioritas
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 uppercase tracking-wider text-gray-500 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Urutan</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Nama Prioritas</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Warna Badge</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Ikon</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Deskripsi</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Status</th>
                      <th className="px-4 py-3 text-right font-bold text-gray-600 dark:text-gray-300">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {priorities.map((item: any) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <td className="px-4 py-3 font-mono font-bold text-gray-400">
                          #{item.orderIndex}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block h-3 w-3 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            {item.name}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold text-white shadow-2xs"
                            style={{ backgroundColor: item.color }}
                          >
                            {item.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-500">{item.icon || "flag"}</td>
                        <td className="px-4 py-3 text-gray-500">{item.description || "-"}</td>
                        <td className="px-4 py-3">
                          {item.isDefault ? (
                            <span className="inline-flex rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Default Sistem
                            </span>
                          ) : (
                            <span className="inline-flex rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                              Kustom
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditPriority(item)}
                              className="h-7 w-7 p-0"
                            >
                              <Pencil className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                            </Button>
                            {!item.isDefault && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setItemToDelete({
                                    type: "priority",
                                    id: item.id,
                                    name: item.name,
                                    isDefault: item.isDefault,
                                  });
                                  setDeleteModalOpen(true);
                                }}
                                className="h-7 w-7 border-red-200 p-0 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SUBTAB 2: STATUS TUGAS */}
          {/* ======================================================== */}
          {masterSubTab === "statuses" && (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    Master Status Alur Kerja Tugas
                  </h2>
                  <p className="text-xs text-gray-500">
                    Status lifecycle pekerjaan yang menggerakkan kartu pada Papan Kanban dan perhitungan progres otomatis.
                  </p>
                </div>
                <Button
                  onClick={handleOpenCreateStatus}
                  size="sm"
                  className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Status
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 uppercase tracking-wider text-gray-500 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Urutan</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Nama Status</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Warna Badge</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">State Selesai</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Deskripsi</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Status</th>
                      <th className="px-4 py-3 text-right font-bold text-gray-600 dark:text-gray-300">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {statuses.map((item: any) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <td className="px-4 py-3 font-mono font-bold text-gray-400">
                          #{item.orderIndex}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block h-3 w-3 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            {item.name}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold text-white shadow-2xs"
                            style={{ backgroundColor: item.color }}
                          >
                            {item.name}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {item.isDoneState ? (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <CheckCircle2 className="h-3 w-3" />
                              Done State (100%)
                            </span>
                          ) : (
                            <span className="inline-flex rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                              Proses Berjalan
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{item.description || "-"}</td>
                        <td className="px-4 py-3">
                          {item.isDefault ? (
                            <span className="inline-flex rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Default Sistem
                            </span>
                          ) : (
                            <span className="inline-flex rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                              Kustom
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditStatus(item)}
                              className="h-7 w-7 p-0"
                            >
                              <Pencil className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                            </Button>
                            {!item.isDefault && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setItemToDelete({
                                    type: "status",
                                    id: item.id,
                                    name: item.name,
                                    isDefault: item.isDefault,
                                  });
                                  setDeleteModalOpen(true);
                                }}
                                className="h-7 w-7 border-red-200 p-0 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SUBTAB 3: MILESTONE SDLC WATERFALL */}
          {/* ======================================================== */}
          {masterSubTab === "milestones" && (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    Master Milestone SDLC Waterfall
                  </h2>
                  <p className="text-xs text-gray-500">
                    Tahapan siklus hidup rekayasa software enterprise (Requirement, Design, Implementation, QA, Deployment, Maintenance) sesuai format ARMS.
                  </p>
                </div>
                <Button
                  onClick={handleOpenCreateMilestone}
                  size="sm"
                  className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Milestone
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 uppercase tracking-wider text-gray-500 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Urutan</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Fase SDLC</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Nama Milestone</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Badge & Warna</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Deskripsi</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Status</th>
                      <th className="px-4 py-3 text-right font-bold text-gray-600 dark:text-gray-300">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {milestones.map((item: any) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <td className="px-4 py-3 font-mono font-bold text-gray-400">
                          #{item.orderIndex}
                        </td>
                        <td className="px-4 py-3 font-semibold text-indigo-600 dark:text-indigo-400">
                          {item.phase}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                          {item.name}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold text-white shadow-2xs"
                            style={{ backgroundColor: item.color }}
                          >
                            {item.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{item.description || "-"}</td>
                        <td className="px-4 py-3">
                          {item.isDefault ? (
                            <span className="inline-flex rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Default Sistem
                            </span>
                          ) : (
                            <span className="inline-flex rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                              Kustom
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditMilestone(item)}
                              className="h-7 w-7 p-0"
                            >
                              <Pencil className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                            </Button>
                            {!item.isDefault && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setItemToDelete({
                                    type: "milestone",
                                    id: item.id,
                                    name: item.name,
                                    isDefault: item.isDefault,
                                  });
                                  setDeleteModalOpen(true);
                                }}
                                className="h-7 w-7 border-red-200 p-0 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SUBTAB 4: KATEGORI PEKERJAAN */}
          {/* ======================================================== */}
          {masterSubTab === "categories" && (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    Master Kategori & Domain Pekerjaan
                  </h2>
                  <p className="text-xs text-gray-500">
                    Spesialisasi teknis tugas (misal: Frontend, Backend, Database, QA, DevOps, UI/UX, dsb.)
                  </p>
                </div>
                <Button
                  onClick={handleOpenCreateCategory}
                  size="sm"
                  className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Kategori
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 uppercase tracking-wider text-gray-500 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">ID</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Nama Kategori</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Warna Tag</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Deskripsi</th>
                      <th className="px-4 py-3 text-right font-bold text-gray-600 dark:text-gray-300">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {categories.map((item: any) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <td className="px-4 py-3 font-mono font-bold text-gray-400">
                          #{item.id}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block h-3 w-3 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            {item.name}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold text-white shadow-2xs"
                            style={{ backgroundColor: item.color }}
                          >
                            {item.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{item.description || "-"}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditCategory(item)}
                              className="h-7 w-7 p-0"
                            >
                              <Pencil className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setItemToDelete({
                                  type: "category",
                                  id: item.id,
                                  name: item.name,
                                });
                                setDeleteModalOpen(true);
                              }}
                              className="h-7 w-7 border-red-200 p-0 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {categories.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">
                          Belum ada kategori yang ditambahkan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: SINKRONISASI HOST INDUK */}
      {/* ======================================================== */}
      {activeTab === "sync" && (
        <div className="space-y-6">
          {/* Status & Stat Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Card 1: Node Lokal */}
            <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                <Server className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                    Node Lokal
                  </span>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {localPing?.instanceName || "TrackerKerja-Node"}
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Versi {localPing?.version || "1.0.0"} • {localPing?.ready ? "Siap Sinkron" : "Inisialisasi"}
                </p>
              </div>
            </div>

            {/* Card 2: Basis Data */}
            <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <Database className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  Entitas Basis Data
                </span>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {(localPing?.totalCompanies || 0) + (localPing?.totalUsers || 0) + (localPing?.totalTasks || 0)} Rekod
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {localPing?.totalTasks || 0} Tugas • {localPing?.totalProjects || 0} Proyek • {localPing?.totalUsers || 0} User
                </p>
              </div>
            </div>

            {/* Card 3: Berkas Fisik */}
            <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                <HardDrive className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  Lampiran Berkas (uploads/)
                </span>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {formatBytes(localPing?.totalUploadsSizeBytes || 0)}
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {localPing?.totalAttachments || 0} Berkas • {localPing?.totalNotes || 0} Catatan
                </p>
              </div>
            </div>
          </div>

          {/* Dual Panel: Online Host Induk & Offline ZIP Package */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Panel 1: Konfigurasi Host Induk (Online Push & Pull) */}
            <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                      <Cloud className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                        Koneksi Host Induk (REST API)
                      </h2>
                      <p className="text-[11px] text-gray-500">
                        Sinkronisasi dua arah real-time via RESTful API
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      URL Server Host Induk *
                    </label>
                    <Input
                      value={hostUrl}
                      onChange={(e) => setHostUrl(e.target.value)}
                      placeholder="https://tracker-induk.perusahaan.co.id"
                      className="font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Kunci Rahasia Sinkronisasi (X-Sync-Key)
                    </label>
                    <div className="relative">
                      <Input
                        type="password"
                        value={syncApiKey}
                        onChange={(e) => setSyncApiKey(e.target.value)}
                        placeholder="Masukkan token otorisasi host induk"
                        className="font-mono text-xs pr-8"
                      />
                      <Key className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="syncIncludeFiles"
                      checked={includeFiles}
                      onChange={(e) => setIncludeFiles(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label
                      htmlFor="syncIncludeFiles"
                      className="text-xs font-medium text-gray-700 dark:text-gray-300"
                    >
                      Sertakan seluruh berkas lampiran fisik (uploads/)
                    </label>
                  </div>

                  {/* Ping Result Banner */}
                  {pingResult && (
                    <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                          {pingResult.message}
                        </span>
                      </div>
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                        {pingResult.latencyMs} ms
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap items-center gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => pingHostMutation.mutate()}
                  disabled={pingHostMutation.isPending || !hostUrl.trim()}
                  className="gap-1.5 text-xs"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${pingHostMutation.isPending ? "animate-spin" : ""}`} />
                  {pingHostMutation.isPending ? "Menguji..." : "Uji Koneksi"}
                </Button>

                <Button
                  size="sm"
                  onClick={() => pushMutation.mutate()}
                  disabled={pushMutation.isPending || !hostUrl.trim()}
                  className="gap-1.5 bg-indigo-600 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  {pushMutation.isPending ? "Mengirim Push..." : "Push ke Host Induk"}
                </Button>

                <Button
                  size="sm"
                  onClick={() => pullMutation.mutate()}
                  disabled={pullMutation.isPending || !hostUrl.trim()}
                  className="gap-1.5 bg-purple-600 text-xs font-semibold text-white shadow-xs hover:bg-purple-700"
                >
                  <ArrowDownLeft className="h-3.5 w-3.5" />
                  {pullMutation.isPending ? "Menarik Pull..." : "Pull dari Host Induk"}
                </Button>
              </div>
            </div>

            {/* Panel 2: Offline Air-Gapped Package (.ZIP) */}
            <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                      <FileArchive className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                        Paket Offline Mandiri (.ZIP)
                      </h2>
                      <p className="text-[11px] text-gray-500">
                        Ekspor & Impor arsip zip untuk pemindahan data via flashdisk
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Ekspor Box */}
                  <div className="rounded-xl border border-gray-200/80 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                    <div className="flex items-center gap-2 mb-2">
                      <Download className="h-4 w-4 text-indigo-600" />
                      <h3 className="text-xs font-bold text-gray-900 dark:text-white">Ekspor Paket .ZIP</h3>
                    </div>
                    <p className="text-[11px] text-gray-500 mb-3">
                      Kemas manifest.json, basis data terenkripsi, dan folder uploads/ menjadi satu file zip.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportZipMutation.mutate()}
                      disabled={exportZipMutation.isPending}
                      className="w-full gap-1.5 text-xs font-medium"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {exportZipMutation.isPending ? "Mengemas..." : "Unduh Paket .ZIP"}
                    </Button>
                  </div>

                  {/* Impor Box */}
                  <div className="rounded-xl border border-gray-200/80 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                    <div className="flex items-center gap-2 mb-2">
                      <Upload className="h-4 w-4 text-emerald-600" />
                      <h3 className="text-xs font-bold text-gray-900 dark:text-white">Impor Paket .ZIP</h3>
                    </div>
                    <p className="text-[11px] text-gray-500 mb-2">
                      Pilih berkas zip paket yang diekspor dari server lain.
                    </p>
                    <input
                      type="file"
                      accept=".zip"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      className="mb-2 block w-full text-[11px] text-gray-500 file:mr-2 file:rounded-md file:border-0 file:bg-gray-200 file:px-2 file:py-1 file:text-[11px] file:font-semibold hover:file:bg-gray-300 dark:file:bg-gray-700 dark:file:text-gray-200"
                    />
                    <Button
                      size="sm"
                      onClick={() => importFile && importZipMutation.mutate(importFile)}
                      disabled={importZipMutation.isPending || !importFile}
                      className="w-full gap-1.5 bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {importZipMutation.isPending ? "Mengimpor..." : "Terapkan Paket"}
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-amber-800 dark:text-amber-300">
                      <strong>Proteksi Keamanan:</strong> Seluruh entitas diekstrak dengan penjaga <em>Zip Slip Traversal</em> dan diterapkan melalui transaksi basis data atomik.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel 3: Tabel Riwayat Sinkronisasi */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                    Riwayat Sinkronisasi & Jejak Audit Sync
                  </h2>
                  <p className="text-[11px] text-gray-500">
                    Catatan seluruh aktivitas push, pull, ekspor, dan impor paket data
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchHistory()}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className={`h-3 w-3 ${loadingHistory ? "animate-spin" : ""}`} />
                Segarkan
              </Button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:border-gray-800">
                  <tr>
                    <th className="py-2.5 pr-4">Waktu</th>
                    <th className="py-2.5 pr-4">Arah Operasi</th>
                    <th className="py-2.5 pr-4">Status</th>
                    <th className="py-2.5 pr-4">Target / Asal</th>
                    <th className="py-2.5 pr-4">Rekod</th>
                    <th className="py-2.5 pr-4">Ukuran File</th>
                    <th className="py-2.5">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {syncHistories.map((h: any) => (
                    <tr key={h.id} className="transition hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                      <td className="py-3 pr-4 font-mono text-[11px] text-gray-500">
                        {new Date(h.createdAt).toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                          {h.direction}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                            h.status === "Success"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                              : "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                          }`}
                        >
                          {h.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-mono text-[11px] text-gray-600 dark:text-gray-300">
                        {h.targetHost || "-"}
                      </td>
                      <td className="py-3 pr-4 font-semibold text-gray-900 dark:text-white">
                        {h.totalRecordsSynced} rekod
                      </td>
                      <td className="py-3 pr-4 text-gray-500 font-mono text-[11px]">
                        {formatBytes(h.fileSizeBytes)}
                      </td>
                      <td className="py-3 text-gray-500">
                        {h.errorMessage ? (
                          <span className="text-red-600 dark:text-red-400">{h.errorMessage}</span>
                        ) : (
                          <span className="text-gray-400">Sukses</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {syncHistories.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400">
                        Belum ada riwayat aktivitas sinkronisasi yang tercatat.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DIALOG 1: MODAL TAMBAH / EDIT PRIORITAS */}
      {/* ======================================================== */}
      <Dialog isOpen={priorityModalOpen} onOpenChange={setPriorityModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {priorityFormMode === "create" ? "Tambah Prioritas Baru" : "Edit Prioritas Pekerjaan"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                Nama Prioritas *
              </label>
              <Input
                value={priorityForm.name}
                onChange={(e) => setPriorityForm({ ...priorityForm, name: e.target.value })}
                placeholder="misal: Critical / P0"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                Warna Badge
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={priorityForm.color}
                  onChange={(e) => setPriorityForm({ ...priorityForm, color: e.target.value })}
                  className="h-9 w-12 cursor-pointer rounded border border-gray-300 p-0 dark:border-gray-700"
                />
                <Input
                  value={priorityForm.color}
                  onChange={(e) => setPriorityForm({ ...priorityForm, color: e.target.value })}
                  placeholder="#6366F1"
                  className="font-mono text-xs"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setPriorityForm({ ...priorityForm, color })}
                    className="h-5 w-5 rounded-full border border-white/40 shadow-xs transition hover:scale-110"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                  Urutan Display
                </label>
                <Input
                  type="number"
                  value={priorityForm.orderIndex}
                  onChange={(e) =>
                    setPriorityForm({ ...priorityForm, orderIndex: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                  Nama Ikon
                </label>
                <Input
                  value={priorityForm.icon}
                  onChange={(e) => setPriorityForm({ ...priorityForm, icon: e.target.value })}
                  placeholder="flag"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                Deskripsi
              </label>
              <Input
                value={priorityForm.description}
                onChange={(e) => setPriorityForm({ ...priorityForm, description: e.target.value })}
                placeholder="Catatan penanganan prioritas ini"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="priorityDefault"
                checked={priorityForm.isDefault}
                onChange={(e) =>
                  setPriorityForm({ ...priorityForm, isDefault: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label
                htmlFor="priorityDefault"
                className="text-xs font-medium text-gray-700 dark:text-gray-300"
              >
                Setel sebagai Prioritas Default Sistem
              </label>
            </div>

            <div className="mt-4 flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPriorityModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={() => savePriorityMutation.mutate()}
                disabled={savePriorityMutation.isPending || !priorityForm.name.trim()}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {savePriorityMutation.isPending ? "Menyimpan..." : "Simpan Prioritas"}
              </Button>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* DIALOG 2: MODAL TAMBAH / EDIT STATUS */}
      {/* ======================================================== */}
      <Dialog isOpen={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {statusFormMode === "create" ? "Tambah Status Baru" : "Edit Status Tugas"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                Nama Status *
              </label>
              <Input
                value={statusForm.name}
                onChange={(e) => setStatusForm({ ...statusForm, name: e.target.value })}
                placeholder="misal: In Review / QA Testing"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                Warna Badge
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={statusForm.color}
                  onChange={(e) => setStatusForm({ ...statusForm, color: e.target.value })}
                  className="h-9 w-12 cursor-pointer rounded border border-gray-300 p-0 dark:border-gray-700"
                />
                <Input
                  value={statusForm.color}
                  onChange={(e) => setStatusForm({ ...statusForm, color: e.target.value })}
                  placeholder="#6366F1"
                  className="font-mono text-xs"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setStatusForm({ ...statusForm, color })}
                    className="h-5 w-5 rounded-full border border-white/40 shadow-xs transition hover:scale-110"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                Urutan Display
              </label>
              <Input
                type="number"
                value={statusForm.orderIndex}
                onChange={(e) =>
                  setStatusForm({ ...statusForm, orderIndex: parseInt(e.target.value) || 1 })
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                Deskripsi
              </label>
              <Input
                value={statusForm.description}
                onChange={(e) => setStatusForm({ ...statusForm, description: e.target.value })}
                placeholder="Penjelasan tahapan status ini"
              />
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="statusDoneState"
                  checked={statusForm.isDoneState}
                  onChange={(e) =>
                    setStatusForm({ ...statusForm, isDoneState: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label
                  htmlFor="statusDoneState"
                  className="text-xs font-medium text-gray-700 dark:text-gray-300"
                >
                  Merupakan State Selesai (Otomatis progres 100%)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="statusDefault"
                  checked={statusForm.isDefault}
                  onChange={(e) =>
                    setStatusForm({ ...statusForm, isDefault: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label
                  htmlFor="statusDefault"
                  className="text-xs font-medium text-gray-700 dark:text-gray-300"
                >
                  Setel sebagai Status Default Sistem
                </label>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setStatusModalOpen(false)}>
                Batal
              </Button>
              <Button
                size="sm"
                onClick={() => saveStatusMutation.mutate()}
                disabled={saveStatusMutation.isPending || !statusForm.name.trim()}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {saveStatusMutation.isPending ? "Menyimpan..." : "Simpan Status"}
              </Button>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* DIALOG 3: MODAL TAMBAH / EDIT MILESTONE SDLC */}
      {/* ======================================================== */}
      <Dialog isOpen={milestoneModalOpen} onOpenChange={setMilestoneModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {milestoneFormMode === "create"
                ? "Tambah Milestone SDLC"
                : "Edit Milestone SDLC Waterfall"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                Nama Milestone *
              </label>
              <Input
                value={milestoneForm.name}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, name: e.target.value })}
                placeholder="misal: System Design & ERD"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                Fase Waterfall SDLC
              </label>
              <select
                value={milestoneForm.phase}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, phase: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="Requirement Analysis">Requirement Analysis</option>
                <option value="System Design">System Design</option>
                <option value="Implementation">Implementation</option>
                <option value="Testing & QA">Testing & QA</option>
                <option value="Deployment">Deployment</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                Warna Badge
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={milestoneForm.color}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, color: e.target.value })}
                  className="h-9 w-12 cursor-pointer rounded border border-gray-300 p-0 dark:border-gray-700"
                />
                <Input
                  value={milestoneForm.color}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, color: e.target.value })}
                  placeholder="#6366F1"
                  className="font-mono text-xs"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setMilestoneForm({ ...milestoneForm, color })}
                    className="h-5 w-5 rounded-full border border-white/40 shadow-xs transition hover:scale-110"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                  Urutan Fase
                </label>
                <Input
                  type="number"
                  value={milestoneForm.orderIndex}
                  onChange={(e) =>
                    setMilestoneForm({
                      ...milestoneForm,
                      orderIndex: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                  Ikon
                </label>
                <Input
                  value={milestoneForm.icon}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, icon: e.target.value })}
                  placeholder="milestone"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                Deskripsi
              </label>
              <Input
                value={milestoneForm.description}
                onChange={(e) =>
                  setMilestoneForm({ ...milestoneForm, description: e.target.value })
                }
                placeholder="Ruang lingkup milestone SDLC"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="milestoneDefault"
                checked={milestoneForm.isDefault}
                onChange={(e) =>
                  setMilestoneForm({ ...milestoneForm, isDefault: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label
                htmlFor="milestoneDefault"
                className="text-xs font-medium text-gray-700 dark:text-gray-300"
              >
                Setel sebagai Milestone Default Sistem
              </label>
            </div>

            <div className="mt-4 flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setMilestoneModalOpen(false)}>
                Batal
              </Button>
              <Button
                size="sm"
                onClick={() => saveMilestoneMutation.mutate()}
                disabled={saveMilestoneMutation.isPending || !milestoneForm.name.trim()}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {saveMilestoneMutation.isPending ? "Menyimpan..." : "Simpan Milestone"}
              </Button>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* DIALOG 4: MODAL TAMBAH / EDIT KATEGORI */}
      {/* ======================================================== */}
      <Dialog isOpen={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {categoryFormMode === "create"
                ? "Tambah Kategori Pekerjaan"
                : "Edit Kategori Tugas"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                Nama Kategori *
              </label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="misal: Backend Development / Database"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                Warna Tag
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={categoryForm.color}
                  onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                  className="h-9 w-12 cursor-pointer rounded border border-gray-300 p-0 dark:border-gray-700"
                />
                <Input
                  value={categoryForm.color}
                  onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                  placeholder="#6366F1"
                  className="font-mono text-xs"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setCategoryForm({ ...categoryForm, color })}
                    className="h-5 w-5 rounded-full border border-white/40 shadow-xs transition hover:scale-110"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                Deskripsi
              </label>
              <Input
                value={categoryForm.description}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, description: e.target.value })
                }
                placeholder="Cakupan spesialisasi domain tugas ini"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setCategoryModalOpen(false)}>
                Batal
              </Button>
              <Button
                size="sm"
                onClick={() => saveCategoryMutation.mutate()}
                disabled={saveCategoryMutation.isPending || !categoryForm.name.trim()}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {saveCategoryMutation.isPending ? "Menyimpan..." : "Simpan Kategori"}
              </Button>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* DIALOG 5: KONFIRMASI HAPUS */}
      {/* ======================================================== */}
      <Dialog isOpen={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Hapus Item Master Data
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Apakah Anda yakin ingin menghapus{" "}
              <strong className="text-gray-900 dark:text-white">
                {itemToDelete?.name}
              </strong>
              ? Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteModalOpen(false)}>
                Batal
              </Button>
              <Button
                size="sm"
                onClick={executeDelete}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Ya, Hapus
              </Button>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
