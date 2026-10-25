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
  ShieldAlert,
  Users,
  Briefcase,
  ListTodo,
  Flame,
  Megaphone,
  ExternalLink,
  Shuffle,
  Building2,
  Search,
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
import { AdminGuard } from "@/components/guards/AdminGuard";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  SyncProgressModal,
  SyncOperationType,
  SyncResultData,
} from "@/components/sync/sync-progress-modal";

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
  const { isAdmin, isPurgeAdmin } = useCurrentUser();
  const isPurgeOnly = isPurgeAdmin && !isAdmin;

  const [activeTab, setActiveTab] = useState<
    "general" | "security" | "smtp" | "audit" | "master" | "sync" | "maintenance"
  >("general");

  useEffect(() => {
    if (isPurgeOnly) {
      setActiveTab("maintenance");
    }
  }, [isPurgeOnly]);

  // Data Maintenance & Purge States
  const [purgeConfirmationOpen, setPurgeConfirmationOpen] = useState(false);
  const [purgeMode, setPurgeMode] = useState<"all" | "selective">("all");
  const [confirmationInput, setConfirmationInput] = useState("");
  const [selectiveOptions, setSelectiveOptions] = useState({
    purgeTasks: true,
    purgeProjects: true,
    purgeAttendances: true,
    purgeNotes: true,
    purgeNonAdminUsers: false,
    purgeAuditAndHistories: false,
  });

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
  const [allowUntrustedSsl, setAllowUntrustedSsl] = useState(false);
  const [pingResult, setPingResult] = useState<{
    ready: boolean;
    latencyMs: number;
    message?: string;
  } | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  
  // Modal Popup Sinkronisasi Progress State (Mencegah Idle Situation)
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncModalType, setSyncModalType] = useState<SyncOperationType>("pull");
  const [syncModalStatus, setSyncModalStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [syncResultData, setSyncResultData] = useState<SyncResultData | null>(null);
  const [syncModalError, setSyncModalError] = useState<string | null>(null);

  // Subtab for Master Data
  const [masterSubTab, setMasterSubTab] = useState<
    "companies" | "priorities" | "statuses" | "milestones" | "categories"
  >("companies");

  // ==========================================
  // MASTER DATA MODAL STATES
  // ==========================================
  // Company Modal
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [companyFormMode, setCompanyFormMode] = useState<"create" | "edit">("create");
  const [editingCompanyId, setEditingCompanyId] = useState<number | null>(null);
  const [companySearch, setCompanySearch] = useState("");
  const [companyForm, setCompanyForm] = useState({
    name: "",
    code: "",
    description: "",
    address: "",
    contactEmail: "",
  });

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
    type: "priority" | "status" | "milestone" | "category" | "company";
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

  // Query Maintenance Stats
  const {
    data: maintenanceStats,
    isLoading: loadingMaintenanceStats,
    refetch: refetchMaintenanceStats,
  } = useQuery<any>({
    queryKey: ["maintenanceStats"],
    queryFn: async () => {
      const res = await apiClient.get("/settings/maintenance/stats");
      return res.data.data;
    },
    enabled: activeTab === "maintenance",
  });

  // Master Data Queries
  const { data: companies = [], isLoading: loadingCompanies, refetch: refetchCompanies } = useQuery<any[]>({
    queryKey: ["masterCompanies"],
    queryFn: async () => {
      const res = await apiClient.get("/companies");
      return res.data?.data || [];
    },
    enabled: activeTab === "master",
  });

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
    if (typeof window !== "undefined") {
      const savedHost = localStorage.getItem("wtp_sync_host_url");
      const savedKey = localStorage.getItem("wtp_sync_api_key");
      if (savedHost) {
        setHostUrl(savedHost);
      } else {
        setHostUrl("https://tracker.saidilmuna.space");
      }
      if (savedKey) {
        setSyncApiKey(savedKey);
      } else {
        setSyncApiKey("TK-SYNC-VUBKJ5PNX3PHI1WX");
      }
    }
  }, []);

  const handleHostUrlChange = (val: string) => {
    setHostUrl(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("wtp_sync_host_url", val);
    }
  };

  const handleSyncApiKeyChange = (val: string) => {
    setSyncApiKey(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("wtp_sync_api_key", val);
    }
  };

  const setLiveServerPreset = () => {
    handleHostUrlChange("https://tracker.saidilmuna.space");
    handleSyncApiKeyChange("TK-SYNC-VUBKJ5PNX3PHI1WX");
    toast.success("Konfigurasi live tracker.saidilmuna.space diterapkan!");
  };

  const generateRandomSyncKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let randomPart = "";
    for (let i = 0; i < 16; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const newKey = `TK-SYNC-${randomPart}`;
    handleSyncApiKeyChange(newKey);
    toast.info(`Kunci sinkronisasi baru dihasilkan: ${newKey}`);
  };

  useEffect(() => {
    if (serverSettings && Array.isArray(serverSettings)) {
      const map: Record<string, string> = { ...settings };
      serverSettings.forEach((item) => {
        map[item.key] = item.value;
      });
      setSettings(map);

      // Auto-populate sync credentials from server settings if local state is still empty
      if (!syncApiKey) {
        const foundKey = map["Sync_ApiKey"] || map["HostSync_ApiKey"] || map["Sync_HostSecret"] || map["SyncApiKey"] || map["SyncSettings:ApiKey"];
        if (foundKey && foundKey !== "••••••••") {
          setSyncApiKey(foundKey);
        }
      }
      if ((!hostUrl || hostUrl === "http://localhost:5000") && (map["Sync_HostUrl"] || map["HostSync_TargetUrl"] || map["GlobalBaseUrl"])) {
        setHostUrl(map["HostSync_TargetUrl"] || map["GlobalBaseUrl"] || map["Sync_HostUrl"] || "https://tracker.saidilmuna.space");
      }
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
      const res = await apiClient.post("/sync/ping-host", { hostUrl, apiKey: syncApiKey, allowUntrustedSsl });
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

  const handleSyncSuccess = async (data: any) => {
    // 1. Invalidate ALL queries across the entire TanStack React Query cache
    await queryClient.invalidateQueries();

    // 2. Refresh current user profile in localStorage and React Query cache
    try {
      const profileRes = await apiClient.get("/profile");
      if (profileRes.data?.data) {
        localStorage.setItem("user_profile", JSON.stringify(profileRes.data.data));
        queryClient.setQueryData(["currentUserProfile"], profileRes.data.data);
      }
    } catch {
      // Fallback
    }

    // 3. Specifically trigger refetch of essential app queries
    queryClient.refetchQueries({ queryKey: ["tasksList"] });
    queryClient.refetchQueries({ queryKey: ["kanbanTasks"] });
    queryClient.refetchQueries({ queryKey: ["calendarTasks"] });
    queryClient.refetchQueries({ queryKey: ["projectsList"] });
    queryClient.refetchQueries({ queryKey: ["projectsSelect"] });
    queryClient.refetchQueries({ queryKey: ["notesList"] });
    queryClient.refetchQueries({ queryKey: ["members"] });
    queryClient.refetchQueries({ queryKey: ["dashboardOverview"] });
    queryClient.refetchQueries({ queryKey: ["dashboardStats"] });
    queryClient.refetchQueries({ queryKey: ["gamificationSummary"] });
    queryClient.refetchQueries({ queryKey: ["userBadges"] });
    queryClient.refetchQueries({ queryKey: ["attendances"] });
    queryClient.refetchQueries({ queryKey: ["timesheetSessions"] });
    queryClient.refetchQueries({ queryKey: ["systemSettings"] });
    refetchHistory();
    refetchPing();
  };

  const pushMutation = useMutation({
    mutationFn: async () => {
      setSyncModalType("push");
      setSyncModalStatus("running");
      setSyncModalError(null);
      setSyncResultData(null);
      setSyncModalOpen(true);

      const res = await apiClient.post("/sync/push", { hostUrl, apiKey: syncApiKey, includeFiles, allowUntrustedSsl });
      return res.data;
    },
    onSuccess: (data: any) => {
      setSyncModalStatus("success");
      setSyncResultData({
        recordsProcessed: data?.recordsProcessed,
        fileSizeBytes: data?.fileSizeBytes,
        details: data?.details,
        message: data?.message || "Data berhasil di-push ke host induk!",
      });
      toast.success(data.message || "Data berhasil di-push ke host induk!");
      handleSyncSuccess(data);
    },
    onError: (err: any) => {
      setSyncModalStatus("error");
      const errMsg = err.response?.data?.message || err.message || "Gagal melakukan push ke host induk";
      setSyncModalError(errMsg);
      toast.error(errMsg);
    },
  });

  const pullMutation = useMutation({
    mutationFn: async () => {
      setSyncModalType("pull");
      setSyncModalStatus("running");
      setSyncModalError(null);
      setSyncResultData(null);
      setSyncModalOpen(true);

      const res = await apiClient.post("/sync/pull", { hostUrl, apiKey: syncApiKey, includeFiles, allowUntrustedSsl });
      return res.data;
    },
    onSuccess: (data: any) => {
      setSyncModalStatus("success");
      setSyncResultData({
        recordsProcessed: data?.recordsProcessed,
        filesExtracted: data?.details?.length,
        fileSizeBytes: data?.fileSizeBytes,
        details: data?.details,
        message: data?.message || "Data dan berkas fisik berhasil ditarik dari host induk!",
      });
      toast.success(data.message || "Data berhasil ditarik dari host induk!");
      handleSyncSuccess(data);
    },
    onError: (err: any) => {
      setSyncModalStatus("error");
      const errMsg = err.response?.data?.message || err.message || "Gagal melakukan pull dari host induk";
      setSyncModalError(errMsg);
      toast.error(errMsg);
    },
  });

  const exportZipMutation = useMutation({
    mutationFn: async () => {
      setSyncModalType("export-zip");
      setSyncModalStatus("running");
      setSyncModalError(null);
      setSyncResultData(null);
      setSyncModalOpen(true);

      const response = await apiClient.get(`/sync/export-package?includeFiles=${includeFiles}`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `trackerkerja_sync_package_${Date.now()}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return { size: blob.size };
    },
    onSuccess: (res: any) => {
      setSyncModalStatus("success");
      setSyncResultData({
        fileSizeBytes: res?.size,
        message: "Paket .ZIP mandiri berhasil dikemas dan diunduh!",
      });
      toast.success("Paket .ZIP berhasil diunduh!");
      refetchHistory();
      refetchPing();
    },
    onError: (err: any) => {
      setSyncModalStatus("error");
      const errMsg = err.response?.data?.message || err.message || "Gagal mengekspor paket .ZIP";
      setSyncModalError(errMsg);
      toast.error(errMsg);
    },
  });

  const exportSqlMutation = useMutation({
    mutationFn: async () => {
      setSyncModalType("export-sql");
      setSyncModalStatus("running");
      setSyncModalError(null);
      setSyncResultData(null);
      setSyncModalOpen(true);

      const response = await apiClient.get("/sync/export-sql", {
        responseType: "blob",
      });
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `trackerkerja_sync_dump_${Date.now()}.sql`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return { size: blob.size };
    },
    onSuccess: (res: any) => {
      setSyncModalStatus("success");
      setSyncResultData({
        fileSizeBytes: res?.size,
        message: "Skrip DML .SQL dump berhasil dihasilkan dan diunduh!",
      });
      toast.success("Skrip DML .SQL berhasil diunduh!");
      refetchHistory();
      refetchPing();
    },
    onError: (err: any) => {
      setSyncModalStatus("error");
      const errMsg = err.response?.data?.message || err.message || "Gagal mengekspor skrip .SQL";
      setSyncModalError(errMsg);
      toast.error(errMsg);
    },
  });

  const importPackageMutation = useMutation({
    mutationFn: async (file: File) => {
      setSyncModalType("import-package");
      setSyncModalStatus("running");
      setSyncModalError(null);
      setSyncResultData(null);
      setSyncModalOpen(true);

      const formData = new FormData();
      formData.append("file", file);
      const res = await apiClient.post("/sync/import-package", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: (data: any) => {
      setSyncModalStatus("success");
      setSyncResultData({
        recordsProcessed: data?.recordsProcessed,
        filesExtracted: data?.details?.length,
        fileSizeBytes: data?.fileSizeBytes,
        details: data?.details,
        message: data?.message || "Paket sinkronisasi berhasil diterapkan!",
      });
      toast.success(data.message || "Paket sinkronisasi berhasil diterapkan!");
      setImportFile(null);
      handleSyncSuccess(data);
    },
    onError: (err: any) => {
      setSyncModalStatus("error");
      const errMsg = err.response?.data?.message || err.message || "Gagal mengimpor berkas paket";
      setSyncModalError(errMsg);
      toast.error(errMsg);
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
  // Company
  const saveCompanyMutation = useMutation({
    mutationFn: async () => {
      if (companyFormMode === "create") {
        const res = await apiClient.post("/companies", companyForm);
        return res.data;
      } else {
        const res = await apiClient.put(`/companies/${editingCompanyId}`, companyForm);
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success(
        companyFormMode === "create"
          ? "Perusahaan baru berhasil ditambahkan!"
          : "Data perusahaan berhasil diperbarui!"
      );
      queryClient.invalidateQueries({ queryKey: ["masterCompanies"] });
      setCompanyModalOpen(false);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Gagal memproses data perusahaan"),
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete(`/companies/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Perusahaan berhasil dihapus!");
      queryClient.invalidateQueries({ queryKey: ["masterCompanies"] });
      setDeleteModalOpen(false);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Gagal menghapus perusahaan"),
  });

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

  // Purge Operational Data Mutation
  const purgeMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post("/settings/maintenance/purge", payload);
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success(data.message || "Pembersihan data berhasil!");
      setPurgeConfirmationOpen(false);
      setConfirmationInput("");
      refetchMaintenanceStats();
      queryClient.invalidateQueries();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal melakukan pembersihan data");
    },
  });

  // Shrink / VACUUM Database Mutation (FSD 6.2.3)
  const [shrinkResult, setShrinkResult] = useState<{
    databaseProvider: string;
    sizeBefore: string;
    sizeAfter: string;
    reclaimedFormatted: string;
    executedAt: string;
  } | null>(null);

  const shrinkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/settings/maintenance/shrink");
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success(data.message || "Kompaksi basis data (VACUUM) berhasil!");
      if (data.data) {
        setShrinkResult(data.data);
      }
      refetchMaintenanceStats();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Gagal melakukan kompaksi basis data");
    },
  });

  const handleFieldChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // Open Edit Modals Helpers
  const handleOpenEditCompany = (item: any) => {
    setCompanyFormMode("edit");
    setEditingCompanyId(item.id);
    setCompanyForm({
      name: item.name || "",
      code: item.code || "",
      description: item.description || "",
      address: item.address || "",
      contactEmail: item.contactEmail || "",
    });
    setCompanyModalOpen(true);
  };

  const handleOpenCreateCompany = () => {
    setCompanyFormMode("create");
    setEditingCompanyId(null);
    setCompanyForm({
      name: "",
      code: "",
      description: "",
      address: "",
      contactEmail: "",
    });
    setCompanyModalOpen(true);
  };

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
    if (itemToDelete.type === "company") deleteCompanyMutation.mutate(itemToDelete.id);
    if (itemToDelete.type === "priority") deletePriorityMutation.mutate(itemToDelete.id);
    if (itemToDelete.type === "status") deleteStatusMutation.mutate(itemToDelete.id);
    if (itemToDelete.type === "milestone") deleteMilestoneMutation.mutate(itemToDelete.id);
    if (itemToDelete.type === "category") deleteCategoryMutation.mutate(itemToDelete.id);
  };

  return (
    <AdminGuard allowPurgeAdmin={true}>
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

        {!isPurgeOnly && activeTab !== "master" && activeTab !== "sync" && activeTab !== "maintenance" && (
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

      {/* Restricted Mode Notice for DataPurgeAdmin */}
      {isPurgeOnly && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50/80 p-4 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 shadow-2xs">
          <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <span className="font-extrabold block text-sm">
              Mode Akses Terbatas: Administrator Pembersihan Data (Data Purge Administrator)
            </span>
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              Anda diberikan hak akses setingkat administrator yang <strong>dibatasi khusus untuk urusan cleaning, purging data operasional, dan pemeliharaan basis data (VACUUM)</strong>. Modul konfigurasi umum, keamanan sistem, SMTP, dan master data tidak tersedia untuk peran ini demi menjaga stabilitas sistem.
            </p>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200/80 pb-2 dark:border-gray-800">
        {!isPurgeOnly ? (
          <>
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
          </>
        ) : null}

        <button
          onClick={() => setActiveTab("maintenance")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
            activeTab === "maintenance"
              ? "bg-rose-600 text-white shadow-xs"
              : "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/70"
          }`}
        >
          <Trash2 className="h-4 w-4" />
          Pembersihan Data (Purge)
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <button
              type="button"
              onClick={() => setMasterSubTab("companies")}
              className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                masterSubTab === "companies"
                  ? "border-indigo-600 bg-indigo-50/70 shadow-xs dark:border-indigo-500 dark:bg-indigo-950/30"
                  : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900"
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  masterSubTab === "companies"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900 dark:text-white">
                  Perusahaan
                </h3>
                <p className="text-[11px] text-gray-500">{companies.length} Entitas Bisnis</p>
              </div>
            </button>

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
          {/* SUBTAB 0: PERUSAHAAN / TENANT */}
          {/* ======================================================== */}
          {masterSubTab === "companies" && (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    Master Data Perusahaan &amp; Tenant
                  </h2>
                  <p className="text-xs text-gray-500">
                    Entitas bisnis korporat yang digunakan untuk binding akun staf, isolasi data operasional, dan otomatisasi impor berkas.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <Input
                      value={companySearch}
                      onChange={(e) => setCompanySearch(e.target.value)}
                      placeholder="Cari perusahaan / kode..."
                      className="h-8 pl-8 text-xs"
                    />
                  </div>
                  <Button
                    onClick={handleOpenCreateCompany}
                    size="sm"
                    className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Perusahaan
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/30">
                    <tr>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Nama Perusahaan</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Kode</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Kontak &amp; Alamat</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Total Staf</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Total Proyek</th>
                      <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Terdaftar</th>
                      <th className="px-4 py-3 text-right font-bold text-gray-600 dark:text-gray-300">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {companies
                      .filter((c: any) => {
                        if (!companySearch.trim()) return true;
                        const s = companySearch.toLowerCase();
                        return (
                          c.name?.toLowerCase().includes(s) ||
                          c.code?.toLowerCase().includes(s) ||
                          c.contactEmail?.toLowerCase().includes(s)
                        );
                      })
                      .map((item: any) => (
                        <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                          <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                                <Building2 className="h-4 w-4" />
                              </div>
                              <div>
                                <span>{item.name}</span>
                                {item.description && (
                                  <p className="text-[11px] font-normal text-gray-400">{item.description}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                              {item.code || "-"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            <div>{item.contactEmail || "-"}</div>
                            {item.address && (
                              <div className="text-[11px] text-gray-400 truncate max-w-xs">{item.address}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                              <Users className="h-3 w-3" />
                              {item.userCount ?? 0} Staf
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 rounded bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                              <Briefcase className="h-3 w-3" />
                              {item.projectCount ?? 0} Proyek
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400">
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString("id-ID") : "-"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEditCompany(item)}
                                className="h-7 w-7 p-0"
                              >
                                <Pencil className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setItemToDelete({
                                    type: "company",
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
                    {companies.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-400">
                          {loadingCompanies ? "Memuat data perusahaan..." : "Belum ada master data perusahaan."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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

                <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
                  <button
                    type="button"
                    onClick={setLiveServerPreset}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 transition-colors dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Preset tracker.saidilmuna.space
                  </button>
                  <button
                    type="button"
                    onClick={generateRandomSyncKey}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-bold text-gray-700 hover:bg-gray-100 transition-colors dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300"
                  >
                    <Shuffle className="h-3 w-3" />
                    Acak Kunci
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      URL Server Host Induk *
                    </label>
                    <Input
                      value={hostUrl}
                      onChange={(e) => handleHostUrlChange(e.target.value)}
                      placeholder="https://tracker.saidilmuna.space"
                      className="font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Kunci Rahasia Sinkronisasi (X-Sync-ApiKey / X-Sync-Key) *
                    </label>
                    <div className="relative">
                      <Input
                        type="password"
                        value={syncApiKey}
                        onChange={(e) => handleSyncApiKeyChange(e.target.value)}
                        placeholder="Masukkan token otorisasi host induk (misal: TK-SYNC-VUBKJ5PNX3PHI1WX)"
                        className="font-mono text-xs pr-8"
                      />
                      <Key className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    </div>
                    <p className="mt-1 text-[11px] text-gray-500">
                      Header otorisasi <code>X-Sync-ApiKey</code> otomatis disertakan dengan sistem multi-key fallback cerdas.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex items-center gap-2">
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

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="syncUntrustedSsl"
                        checked={allowUntrustedSsl}
                        onChange={(e) => setAllowUntrustedSsl(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label
                        htmlFor="syncUntrustedSsl"
                        className="text-xs font-medium text-gray-700 dark:text-gray-300"
                      >
                        Izinkan sertifikat SSL self-signed / internal (Bypass SSL error)
                      </label>
                    </div>
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
                      <span
                        className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-bold ${
                          pingResult.latencyMs < 300
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                            : pingResult.latencyMs < 1000
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300"
                        }`}
                      >
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
                  className="gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-xs font-bold text-white shadow-xs hover:from-purple-700 hover:to-indigo-700"
                >
                  <ArrowDownLeft className={`h-3.5 w-3.5 ${pullMutation.isPending ? "animate-bounce" : ""}`} />
                  {pullMutation.isPending ? "Menarik & Mengimpor Data..." : "Tarik / Impor Seluruh Data Host"}
                </Button>
              </div>
            </div>

            {/* Panel 2: Offline Air-Gapped Package (.ZIP & .SQL) */}
            <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                      <FileArchive className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                        Paket Offline & SQL Dump (.ZIP / .SQL)
                      </h2>
                      <p className="text-[11px] text-gray-500">
                        Ekspor & Impor arsip data mandiri untuk pemindahan via flashdisk
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Ekspor Box */}
                  <div className="rounded-xl border border-gray-200/80 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                    <div className="flex items-center gap-2 mb-2">
                      <Download className="h-4 w-4 text-indigo-600" />
                      <h3 className="text-xs font-bold text-gray-900 dark:text-white">Ekspor Data</h3>
                    </div>
                    <p className="text-[11px] text-gray-500 mb-3">
                      Kemas manifest.json, skrip SQL DML, dan uploads/ menjadi satu berkas paket.
                    </p>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportZipMutation.mutate()}
                        disabled={exportZipMutation.isPending}
                        className="w-full gap-1.5 text-xs font-medium"
                      >
                        <FileArchive className="h-3.5 w-3.5 text-indigo-600" />
                        {exportZipMutation.isPending ? "Mengemas..." : "Unduh Paket .ZIP"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportSqlMutation.mutate()}
                        disabled={exportSqlMutation.isPending}
                        className="w-full gap-1.5 text-xs font-medium border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900/50 dark:text-indigo-300"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {exportSqlMutation.isPending ? "Mengunduh..." : "Ekspor Skrip .SQL"}
                      </Button>
                    </div>
                  </div>

                  {/* Impor Box */}
                  <div className="rounded-xl border border-gray-200/80 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                    <div className="flex items-center gap-2 mb-2">
                      <Upload className="h-4 w-4 text-emerald-600" />
                      <h3 className="text-xs font-bold text-gray-900 dark:text-white">Impor Paket (.ZIP / .SQL)</h3>
                    </div>
                    <p className="text-[11px] text-gray-500 mb-2">
                      Pilih berkas paket .zip atau skrip .sql dari server lain.
                    </p>
                    <input
                      type="file"
                      accept=".zip,.sql"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      className="mb-2 block w-full text-[11px] text-gray-500 file:mr-2 file:rounded-md file:border-0 file:bg-gray-200 file:px-2 file:py-1 file:text-[11px] file:font-semibold hover:file:bg-gray-300 dark:file:bg-gray-700 dark:file:text-gray-200"
                    />
                    {importFile && (
                      <div className="mb-2 flex items-center justify-between rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        <span className="truncate max-w-[180px] font-mono">{importFile.name}</span>
                        <span className="text-gray-400 font-mono">{formatBytes(importFile.size)}</span>
                      </div>
                    )}
                    <Button
                      size="sm"
                      onClick={() => importFile && importPackageMutation.mutate(importFile)}
                      disabled={importPackageMutation.isPending || !importFile}
                      className="w-full gap-1.5 bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {importPackageMutation.isPending ? "Menerapkan..." : "Terapkan Paket"}
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
                  {syncHistories.map((h: any) => {
                    const getDirectionBadge = (dir: string) => {
                      switch (dir) {
                        case "Push":
                          return "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300";
                        case "Pull":
                          return "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300";
                        case "ExportZip":
                          return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
                        case "ImportZip":
                          return "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300";
                        case "ExportSql":
                          return "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";
                        case "ImportSql":
                          return "bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300";
                        case "Receive":
                          return "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300";
                        default:
                          return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
                      }
                    };

                    return (
                      <tr key={h.id} className="transition hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                        <td className="py-3 pr-4 font-mono text-[11px] text-gray-500">
                          {new Date(h.createdAt).toLocaleString("id-ID")}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${getDirectionBadge(
                              h.direction
                            )}`}
                          >
                            {h.direction}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                              h.status === "Success"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                                : "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                            }`}
                          >
                            {h.status === "Success" ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <AlertCircle className="h-3 w-3" />
                            )}
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
                            <span className="text-red-600 dark:text-red-400 font-medium">{h.errorMessage}</span>
                          ) : (
                            <span className="text-gray-400">Sukses</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

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
      {/* TAB 7: PEMBERSIHAN & RESET DATA OPERASIONAL */}
      {/* ======================================================== */}
      {activeTab === "maintenance" && (
        <div className="space-y-6">
          {/* Banner Peringatan Keamanan Utama */}
          <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5 dark:border-rose-900/60 dark:bg-rose-950/30">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-sm shadow-rose-600/30">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-rose-950 dark:text-rose-100">
                      Pembersihan &amp; Reset Data Operasional
                    </h3>
                    <span className="rounded-full bg-rose-600/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:bg-rose-400/20 dark:text-rose-300">
                      Tindakan Berbahaya
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-rose-800/80 dark:text-rose-300/80">
                    Halaman ini digunakan untuk membersihkan data operasional (tugas, proyek, catatan, absensi, dsb).
                    Sistem <strong>hanya akan mempertahankan</strong> akun Administrator, Master Data SDLC/konfigurasi,
                    dan Pengumuman resmi. Seluruh data yang dihapus tidak dapat dipulihkan kembali.
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchMaintenanceStats()}
                disabled={loadingMaintenanceStats}
                className="self-start gap-1.5 border-rose-300 bg-white text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-gray-900 dark:text-rose-300"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingMaintenanceStats ? "animate-spin" : ""}`} />
                Segarkan Statistik
              </Button>
            </div>
          </div>

          {/* Bagian 1: Data Yang Dilindungi (Whitelist - Tidak Dihapus) */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <div className="flex items-center justify-between border-b border-emerald-200/70 pb-3 dark:border-emerald-900/60">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-100">
                  Data Yang Dilindungi &amp; Tetap Dipertahankan (Whitelist Permanen)
                </h4>
              </div>
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                Aman / Tidak Pernah Dihapus
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-emerald-200/80 bg-white p-4 shadow-xs dark:border-emerald-900/40 dark:bg-gray-900">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Akun Administrator</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <Shield className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-300">
                  {loadingMaintenanceStats ? "..." : (maintenanceStats?.protectedAdminUsers ?? 0)}
                </div>
                <p className="mt-1 text-[11px] text-gray-400">
                  Akun Superadmin &amp; Admin sistem tetap dipertahankan
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200/80 bg-white p-4 shadow-xs dark:border-emerald-900/40 dark:bg-gray-900">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Master Data &amp; Referensi</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <Database className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-300">
                  {loadingMaintenanceStats ? "..." : (maintenanceStats?.protectedMasterDataItems ?? 0)}
                </div>
                <p className="mt-1 text-[11px] text-gray-400">
                  Prioritas, Status SDLC, Milestone, Kategori, Perusahaan &amp; Template
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200/80 bg-white p-4 shadow-xs dark:border-emerald-900/40 dark:bg-gray-900">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Pengumuman Resmi</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <Megaphone className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-300">
                  {loadingMaintenanceStats ? "..." : (maintenanceStats?.protectedAnnouncements ?? 0)}
                </div>
                <p className="mt-1 text-[11px] text-gray-400">
                  Seluruh broadcast pengumuman perusahaan tetap utuh
                </p>
              </div>
            </div>
          </div>

          {/* Bagian 2: Inventori Data Operasional Saat Ini */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-100 pb-3 dark:border-gray-800">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                Inventori Rekod Operasional Saat Ini (Dapat Dibersihkan)
              </h4>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Berikut adalah ringkasan jumlah rekod operasional aktif yang tersimpan dalam basis data:
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  <ListTodo className="h-4 w-4 text-indigo-500" />
                  Tugas &amp; Subtugas
                </div>
                <div className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
                  {maintenanceStats ? `${maintenanceStats.totalTasks} / ${maintenanceStats.totalSubtasks}` : "0 / 0"}
                </div>
                <span className="text-[10px] text-gray-400">Tugas utama / sub-item</span>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Sesi Kerja
                </div>
                <div className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
                  {maintenanceStats?.totalWorkSessions ?? 0}
                </div>
                <span className="text-[10px] text-gray-400">Log waktu &amp; timer kerja</span>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  <Briefcase className="h-4 w-4 text-sky-500" />
                  Proyek
                </div>
                <div className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
                  {maintenanceStats?.totalProjects ?? 0}
                </div>
                <span className="text-[10px] text-gray-400">Daftar proyek &amp; repositori</span>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  <CheckSquare className="h-4 w-4 text-emerald-500" />
                  Presensi / Absensi
                </div>
                <div className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
                  {maintenanceStats?.totalAttendances ?? 0}
                </div>
                <span className="text-[10px] text-gray-400">Check-in harian &amp; lokasi</span>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  <FileText className="h-4 w-4 text-blue-500" />
                  Catatan Kerja
                </div>
                <div className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
                  {maintenanceStats?.totalNotes ?? 0}
                </div>
                <span className="text-[10px] text-gray-400">WorkNotes &amp; lampiran</span>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  <Users className="h-4 w-4 text-purple-500" />
                  User Non-Admin
                </div>
                <div className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
                  {maintenanceStats?.totalNonAdminUsers ?? 0}
                </div>
                <span className="text-[10px] text-gray-400">Staf / karyawan biasa</span>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  <Sparkles className="h-4 w-4 text-pink-500" />
                  Gamifikasi
                </div>
                <div className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
                  {maintenanceStats?.totalGamificationRecords ?? 0}
                </div>
                <span className="text-[10px] text-gray-400">Poin, lencana, check-in</span>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  <Layers className="h-4 w-4 text-gray-500" />
                  Riwayat &amp; Audit Log
                </div>
                <div className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
                  {(maintenanceStats?.totalToolHistories ?? 0) + (maintenanceStats?.totalAuditLogs ?? 0)}
                </div>
                <span className="text-[10px] text-gray-400">Riwayat tool &amp; aktivitas sistem</span>
              </div>
            </div>
          </div>

          {/* Bagian 3: Dua Mode Eksekusi Pembersihan */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Opsi A: Reset Total (Factory Reset) */}
            <div className="flex flex-col justify-between rounded-2xl border-2 border-rose-200 bg-white p-6 shadow-xs dark:border-rose-950 dark:bg-gray-900">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                    <Flame className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                      Opsi 1: Reset Total Data Operasional
                    </h4>
                    <span className="text-xs text-rose-600 dark:text-rose-400">
                      Factory Reset Data Operasional
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-2 rounded-xl bg-rose-50/60 p-4 text-xs text-rose-900 dark:bg-rose-950/20 dark:text-rose-200">
                  <p className="font-semibold">Menghapus secara permanen:</p>
                  <ul className="list-disc space-y-1 pl-4 text-[11px] text-rose-800 dark:text-rose-300">
                    <li>Semua tugas, subtugas, dan sesi kerja</li>
                    <li>Semua proyek dan repositori</li>
                    <li>Semua data presensi dan absensi karyawan</li>
                    <li>Semua catatan kerja (WorkNotes) dan lampirannya</li>
                    <li>Semua akun karyawan / pengguna non-admin</li>
                    <li>Seluruh riwayat tool dan log audit</li>
                  </ul>
                  <p className="mt-2 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                    ✓ Tetap aman: Administrator, Master Data, &amp; Pengumuman.
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                <Button
                  onClick={() => {
                    setPurgeMode("all");
                    setConfirmationInput("");
                    setPurgeConfirmationOpen(true);
                  }}
                  className="w-full gap-2 bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-600/20"
                >
                  <Flame className="h-4 w-4" />
                  Reset Seluruh Data Operasional
                </Button>
              </div>
            </div>

            {/* Opsi B: Pembersihan Selektif / Modular */}
            <div className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                    <CheckSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                      Opsi 2: Pembersihan Modular / Selektif
                    </h4>
                    <span className="text-xs text-gray-500">
                      Pilih kategori data yang ingin dibersihkan
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-2.5">
                  <label className="flex items-center gap-3 rounded-xl border border-gray-100 p-2.5 text-xs text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800/40 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectiveOptions.purgeTasks}
                      onChange={(e) =>
                        setSelectiveOptions({ ...selectiveOptions, purgeTasks: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <span className="font-semibold">Hapus Seluruh Tugas &amp; Sesi Kerja</span>
                      <p className="text-[11px] text-gray-400">
                        {maintenanceStats?.totalTasks ?? 0} tugas dan {maintenanceStats?.totalWorkSessions ?? 0} sesi
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-gray-100 p-2.5 text-xs text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800/40 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectiveOptions.purgeProjects}
                      onChange={(e) =>
                        setSelectiveOptions({ ...selectiveOptions, purgeProjects: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <span className="font-semibold">Hapus Seluruh Proyek</span>
                      <p className="text-[11px] text-gray-400">
                        {maintenanceStats?.totalProjects ?? 0} proyek (tugas di dalamnya juga terhapus)
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-gray-100 p-2.5 text-xs text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800/40 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectiveOptions.purgeAttendances}
                      onChange={(e) =>
                        setSelectiveOptions({ ...selectiveOptions, purgeAttendances: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <span className="font-semibold">Hapus Rekod Presensi / Absensi</span>
                      <p className="text-[11px] text-gray-400">
                        {maintenanceStats?.totalAttendances ?? 0} catatan absensi karyawan
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-gray-100 p-2.5 text-xs text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800/40 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectiveOptions.purgeNotes}
                      onChange={(e) =>
                        setSelectiveOptions({ ...selectiveOptions, purgeNotes: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <span className="font-semibold">Hapus Catatan Kerja (WorkNotes)</span>
                      <p className="text-[11px] text-gray-400">
                        {maintenanceStats?.totalNotes ?? 0} catatan kerja &amp; lampiran
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-gray-100 p-2.5 text-xs text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800/40 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectiveOptions.purgeNonAdminUsers}
                      onChange={(e) =>
                        setSelectiveOptions({ ...selectiveOptions, purgeNonAdminUsers: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <span className="font-semibold">Hapus Pengguna Non-Admin</span>
                      <p className="text-[11px] text-gray-400">
                        {maintenanceStats?.totalNonAdminUsers ?? 0} akun pengguna biasa (Admin tetap aman)
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-gray-100 p-2.5 text-xs text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800/40 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectiveOptions.purgeAuditAndHistories}
                      onChange={(e) =>
                        setSelectiveOptions({ ...selectiveOptions, purgeAuditAndHistories: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <span className="font-semibold">Bersihkan Riwayat Tool &amp; Audit Log</span>
                      <p className="text-[11px] text-gray-400">
                        {(maintenanceStats?.totalToolHistories ?? 0) + (maintenanceStats?.totalAuditLogs ?? 0)} rekod log
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                <Button
                  onClick={() => {
                    setPurgeMode("selective");
                    setConfirmationInput("");
                    setPurgeConfirmationOpen(true);
                  }}
                  disabled={
                    !selectiveOptions.purgeTasks &&
                    !selectiveOptions.purgeProjects &&
                    !selectiveOptions.purgeAttendances &&
                    !selectiveOptions.purgeNotes &&
                    !selectiveOptions.purgeNonAdminUsers &&
                    !selectiveOptions.purgeAuditAndHistories
                  }
                  className="w-full gap-2 bg-amber-600 text-white hover:bg-amber-700 shadow-md shadow-amber-600/20"
                >
                  <Trash2 className="h-4 w-4" />
                  Bersihkan Kategori Terpilih
                </Button>
              </div>
            </div>
          </div>

          {/* Bagian 4: Optimasi & Kompaksi Basis Data (SQLite / PostgreSQL Database Shrink & VACUUM - FSD 6.2.3) */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    Bagian 4: Kompaksi &amp; Defragmentasi Basis Data (VACUUM Engine)
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Kompak penyimpanan SQLite / PostgreSQL dengan mereklamasi ruang kosong pasca pembersihan data
                  </p>
                </div>
              </div>

              <Button
                onClick={() => shrinkMutation.mutate()}
                disabled={shrinkMutation.isPending}
                className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
              >
                {shrinkMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Menjalankan VACUUM...
                  </>
                ) : (
                  <>
                    <HardDrive className="h-4 w-4" />
                    Jalankan Kompaksi (VACUUM)
                  </>
                )}
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Database Engine</span>
                <div className="mt-1 flex items-center gap-1.5 font-mono text-sm font-bold text-gray-900 dark:text-white">
                  <Server className="h-4 w-4 text-indigo-500" />
                  {shrinkResult?.databaseProvider ?? "PostgreSQL / SQLite"}
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Ukuran Sebelum</span>
                <div className="mt-1 font-mono text-sm font-bold text-gray-700 dark:text-gray-300">
                  {shrinkResult?.sizeBefore ?? "—"}
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Ukuran Sesudah</span>
                <div className="mt-1 font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {shrinkResult?.sizeAfter ?? "—"}
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Ruang Terpulihkan</span>
                <div className="mt-1 font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {shrinkResult?.reclaimedFormatted ?? "—"}
                </div>
              </div>
            </div>

            {shrinkResult && (
              <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-400">
                <Clock className="h-3.5 w-3.5" />
                <span>Terakhir dieksekusi: {new Date(shrinkResult.executedAt).toLocaleString("id-ID")}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DIALOG 0: MODAL TAMBAH / EDIT PERUSAHAAN */}
      {/* ======================================================== */}
      <Dialog isOpen={companyModalOpen} onOpenChange={setCompanyModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {companyFormMode === "create" ? "Tambah Perusahaan Baru" : "Edit Data Perusahaan"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                Nama Perusahaan *
              </label>
              <Input
                value={companyForm.name}
                onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                placeholder="misal: PT Wahana Digital Pratama"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                Kode Singkat / Identifier
              </label>
              <Input
                value={companyForm.code}
                onChange={(e) => setCompanyForm({ ...companyForm, code: e.target.value.toUpperCase() })}
                placeholder="misal: WDP"
                className="font-mono text-xs uppercase"
              />
              <p className="mt-1 text-[11px] text-gray-400">
                Digunakan untuk kode registrasi staf, subdomain, dan identifikasi berkas.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                Email Kontak Perusahaan
              </label>
              <Input
                type="email"
                value={companyForm.contactEmail}
                onChange={(e) => setCompanyForm({ ...companyForm, contactEmail: e.target.value })}
                placeholder="info@perusahaan.co.id"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                Alamat Kantor
              </label>
              <Input
                value={companyForm.address}
                onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                placeholder="misal: Jl. Gatot Subroto Kav. 18, Jakarta"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">
                Deskripsi / Catatan Perusahaan
              </label>
              <Input
                value={companyForm.description}
                onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
                placeholder="Profil singkat atau divisi induk"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setCompanyModalOpen(false)}>
                Batal
              </Button>
              <Button
                size="sm"
                onClick={() => saveCompanyMutation.mutate()}
                disabled={saveCompanyMutation.isPending || !companyForm.name.trim()}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {saveCompanyMutation.isPending ? "Menyimpan..." : "Simpan Perusahaan"}
              </Button>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

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

      {/* ======================================================== */}
      {/* DIALOG 6: KONFIRMASI PEMBERSIHAN DATA (PURGE) */}
      {/* ======================================================== */}
      <Dialog isOpen={purgeConfirmationOpen} onOpenChange={setPurgeConfirmationOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <ShieldAlert className="h-5 w-5" />
              {purgeMode === "all"
                ? "Konfirmasi Reset Total Operasional"
                : "Konfirmasi Pembersihan Data Terpilih"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="rounded-xl bg-rose-50 p-3.5 text-xs text-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
              <p className="font-bold">PERINGATAN: Tindakan ini permanen!</p>
              <p className="mt-1 leading-relaxed">
                {purgeMode === "all"
                  ? "Seluruh data tugas, sesi kerja, proyek, absensi, catatan, dan akun non-admin akan dihapus permanen. Administrator, master data, dan pengumuman akan tetap aman."
                  : "Kategori data yang dipilih akan dihapus secara permanen dari basis data. Master data dan akun admin tetap aman."}
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3 text-xs dark:border-gray-800 dark:bg-gray-800/40">
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                Ketik kata kunci konfirmasi berikut untuk melanjutkan:
              </span>
              <div className="mt-1 font-mono text-sm font-bold tracking-wider text-rose-600 dark:text-rose-400">
                {purgeMode === "all" ? "RESET-TOTAL" : "KONFIRMASI"}
              </div>
            </div>

            <div>
              <Input
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder={purgeMode === "all" ? "Ketik RESET-TOTAL" : "Ketik KONFIRMASI"}
                className="font-mono text-center tracking-widest text-sm"
                autoFocus
              />
            </div>

            <div className="mt-4 flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPurgeConfirmationOpen(false)}
                disabled={purgeMutation.isPending}
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  purgeMutation.mutate({
                    purgeAll: purgeMode === "all",
                    purgeAllOperational: purgeMode === "all",
                    confirmationKeyword: confirmationInput,
                    purgeTasks: purgeMode === "all" ? true : selectiveOptions.purgeTasks,
                    purgeProjects: purgeMode === "all" ? true : selectiveOptions.purgeProjects,
                    purgeAttendances: purgeMode === "all" ? true : selectiveOptions.purgeAttendances,
                    purgeNotes: purgeMode === "all" ? true : selectiveOptions.purgeNotes,
                    purgeNonAdminUsers: purgeMode === "all" ? true : selectiveOptions.purgeNonAdminUsers,
                    purgeAuditAndHistories: purgeMode === "all" ? true : selectiveOptions.purgeAuditAndHistories,
                  });
                }}
                disabled={
                  purgeMutation.isPending ||
                  (purgeMode === "all"
                    ? confirmationInput !== "RESET-TOTAL"
                    : confirmationInput !== "KONFIRMASI")
                }
                className="gap-1.5 bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {purgeMutation.isPending ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Memproses Pembersihan...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    {purgeMode === "all" ? "Eksekusi Reset Total" : "Eksekusi Pembersihan"}
                  </>
                )}
              </Button>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Modal Popup Progress Sinkronisasi (Mencegah Idle Situation) */}
      <SyncProgressModal
        isOpen={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        operationType={syncModalType}
        status={syncModalStatus}
        targetHost={hostUrl}
        resultData={syncResultData}
        errorMessage={syncModalError}
        onRetry={() => {
          if (syncModalType === "pull") pullMutation.mutate();
          else if (syncModalType === "push") pushMutation.mutate();
          else if (syncModalType === "import-package" && importFile) importPackageMutation.mutate(importFile);
          else if (syncModalType === "export-zip") exportZipMutation.mutate();
          else if (syncModalType === "export-sql") exportSqlMutation.mutate();
        }}
      />
      </div>
    </AdminGuard>
  );
}
