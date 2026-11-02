"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  AlertCircle,
  Plus,
  Search,
  Filter,
  MessageSquare,
  CheckCircle2,
  Clock,
  Briefcase,
  Building2,
  User,
  Trash2,
  Edit,
  Send,
  Flame,
  AlertTriangle,
  Layers,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/tailgrids/core/dialog";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";

export default function IssuesPage() {
  const queryClient = useQueryClient();
  const { user, isAdmin, isProjectManager } = useCurrentUser();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  // Create Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("Bug");
  const [newPriority, setNewPriority] = useState<number>(1); // 1 = Medium
  const [newCompanyId, setNewCompanyId] = useState<string>("");
  const [newProjectId, setNewProjectId] = useState<string>("");
  const [newAssignedToUserId, setNewAssignedToUserId] = useState<string>("");

  // Discussion / Detail Modal State
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");

  // 1. Fetch Issues
  const { data: issues = [], isLoading } = useQuery<any[]>({
    queryKey: ["issuesList", search, statusFilter, priorityFilter, companyFilter, projectFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (priorityFilter !== "all") params.append("priority", priorityFilter);
      if (companyFilter !== "all") params.append("companyId", companyFilter);
      if (projectFilter !== "all") params.append("projectId", projectFilter);

      const res = await apiClient.get(`/issues?${params.toString()}`);
      return res.data.data;
    },
  });

  // 2. Fetch Companies
  const { data: companies = [] } = useQuery<any[]>({
    queryKey: ["companiesList"],
    queryFn: async () => {
      const res = await apiClient.get("/companies");
      return res.data.data;
    },
  });

  // 3. Fetch Projects
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projectsList"],
    queryFn: async () => {
      const res = await apiClient.get("/projects");
      return res.data.data;
    },
  });

  // 4. Fetch Members
  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["membersList"],
    queryFn: async () => {
      const res = await apiClient.get("/members");
      return res.data.data;
    },
  });

  // 5. Fetch Single Issue Detail for Comments
  const { data: activeIssue, refetch: refetchActiveIssue } = useQuery<any>({
    queryKey: ["issueDetail", selectedIssueId],
    queryFn: async () => {
      if (!selectedIssueId) return null;
      const res = await apiClient.get(`/issues/${selectedIssueId}`);
      return res.data.data;
    },
    enabled: !!selectedIssueId,
  });

  // Filtered Projects for Create Modal
  const availableProjectsForCreate = useMemo(() => {
    if (!newCompanyId) return [];
    return projects.filter((p) => String(p.companyId) === String(newCompanyId));
  }, [projects, newCompanyId]);

  // Filtered Members for Create Modal
  const availableMembersForCreate = useMemo(() => {
    if (!newCompanyId) return [];
    return members.filter((m) => String(m.companyId) === String(newCompanyId));
  }, [members, newCompanyId]);

  // Handle open create modal with company default
  const handleOpenCreateModal = () => {
    const defaultCompId = user?.companyId ? String(user.companyId) : companies.length > 0 ? String(companies[0].id) : "";
    setNewTitle("");
    setNewDescription("");
    setNewCategory("Bug");
    setNewPriority(1);
    setNewCompanyId(defaultCompId);
    setNewProjectId("");
    setNewAssignedToUserId("");
    setCreateModalOpen(true);
  };

  // 6. Create Issue Mutation
  const createIssueMutation = useMutation({
    mutationFn: async () => {
      if (!newTitle.trim()) throw new Error("Judul tiket wajib diisi.");
      if (!newCompanyId) throw new Error("Perusahaan wajib dipilih.");

      const payload = {
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        category: newCategory,
        priority: newPriority,
        companyId: Number(newCompanyId),
        projectId: newProjectId ? Number(newProjectId) : null,
        assignedToUserId: newAssignedToUserId || null,
      };

      const res = await apiClient.post("/issues", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Tiket issue berhasil dibuat!");
      setCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["issuesList"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || err.message || "Gagal membuat tiket"),
  });

  // 7. Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: number; newStatus: number }) => {
      const issue = issues.find((i) => i.id === id);
      if (!issue) return;

      const payload = {
        title: issue.title,
        description: issue.description,
        status: newStatus,
        priority: issue.priority,
        category: issue.category,
        projectId: issue.projectId,
        assignedToUserId: issue.assignedToUserId,
      };

      const res = await apiClient.put(`/issues/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Status tiket berhasil diperbarui!");
      queryClient.invalidateQueries({ queryKey: ["issuesList"] });
      if (selectedIssueId) refetchActiveIssue();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal memperbarui status"),
  });

  // 8. Delete Issue Mutation
  const deleteIssueMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete(`/issues/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Tiket berhasil dihapus.");
      if (selectedIssueId) setSelectedIssueId(null);
      queryClient.invalidateQueries({ queryKey: ["issuesList"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal menghapus tiket"),
  });

  // 9. Add Comment Mutation
  const addCommentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedIssueId || !commentText.trim()) return;
      const res = await apiClient.post(`/issues/${selectedIssueId}/comments`, {
        message: commentText.trim(),
      });
      return res.data;
    },
    onSuccess: () => {
      setCommentText("");
      refetchActiveIssue();
      queryClient.invalidateQueries({ queryKey: ["issuesList"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal mengirim komentar"),
  });

  // Summary Metrics
  const summary = useMemo(() => {
    const total = issues.length;
    const openCount = issues.filter((i) => i.status === 0).length;
    const inProgressCount = issues.filter((i) => i.status === 1).length;
    const resolvedCount = issues.filter((i) => i.status === 2 || i.status === 3).length;
    const criticalCount = issues.filter((i) => i.priority === 3 && i.status < 2).length;
    return { total, openCount, inProgressCount, resolvedCount, criticalCount };
  }, [issues]);

  const getPriorityBadge = (p: number) => {
    switch (p) {
      case 3:
        return (
          <span className="flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
            <Flame className="h-3 w-3" /> Critical
          </span>
        );
      case 2:
        return (
          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
            High
          </span>
        );
      case 1:
        return (
          <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
            Medium
          </span>
        );
      default:
        return (
          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            Low
          </span>
        );
    }
  };

  const getStatusBadge = (s: number) => {
    switch (s) {
      case 0:
        return (
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-extrabold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
            Open
          </span>
        );
      case 1:
        return (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
            In Progress
          </span>
        );
      case 2:
        return (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
            Resolved
          </span>
        );
      case 3:
        return (
          <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-[10px] font-extrabold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            Closed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 px-2 py-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5">
            <AlertCircle className="h-7 w-7 text-rose-600" />
            Issues & Ticketing System
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Pelaporan bug, insiden teknis, dan permintaan perbaikan terintegrasi dengan proyek korporat.
          </p>
        </div>

        <Button
          onClick={handleOpenCreateModal}
          className="gap-2 bg-indigo-600 font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Buat Tiket Baru
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-gray-400">Total Tiket</p>
          <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">{summary.total}</p>
        </div>
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-blue-500">Tiket Terbuka (Open)</p>
          <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">{summary.openCount}</p>
        </div>
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-amber-500">Dalam Pengerjaan</p>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">{summary.inProgressCount}</p>
        </div>
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-emerald-500">Selesai / Ditutup</p>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{summary.resolvedCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Cari kode tiket, judul masalah, atau deskripsi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="all">Semua Status</option>
              <option value="0">Open</option>
              <option value="1">In Progress</option>
              <option value="2">Resolved</option>
              <option value="3">Closed</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="all">Semua Prioritas</option>
              <option value="3">Critical</option>
              <option value="2">High</option>
              <option value="1">Medium</option>
              <option value="0">Low</option>
            </select>

            {/* Company Filter */}
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="all">Semua Perusahaan</option>
              {companies.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Project Filter */}
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="all">Semua Proyek</option>
              {projects.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {issues.map((ticket) => (
          <div
            key={ticket.id}
            className="flex flex-col justify-between gap-4 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs transition hover:border-indigo-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-900 sm:flex-row sm:items-center"
          >
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {ticket.ticketCode}
                </span>
                {getStatusBadge(ticket.status)}
                {getPriorityBadge(ticket.priority)}
                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {ticket.category || "Umum"}
                </span>
              </div>

              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                {ticket.title}
              </h3>

              {ticket.description && (
                <p className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                  {ticket.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-[11px] text-gray-400">
                {ticket.companyName && (
                  <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                    <Building2 className="h-3 w-3 text-gray-400" />
                    {ticket.companyName}
                  </span>
                )}
                {ticket.projectName && (
                  <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                    <Briefcase className="h-3 w-3" />
                    {ticket.projectName}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Pelapor: <strong>{ticket.reportedByUserName || "User"}</strong>
                </span>
                {ticket.assignedToUserName && (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    PIC: <strong>{ticket.assignedToUserName}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100 dark:border-gray-800">
              {/* Quick Status Change */}
              <select
                value={ticket.status}
                onChange={(e) =>
                  updateStatusMutation.mutate({ id: ticket.id, newStatus: Number(e.target.value) })
                }
                className="rounded-xl border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value={0}>Set: Open</option>
                <option value={1}>Set: In Progress</option>
                <option value={2}>Set: Resolved</option>
                <option value={3}>Set: Closed</option>
              </select>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedIssueId(ticket.id)}
                className="gap-1.5 text-xs text-gray-700 hover:text-indigo-600 dark:text-gray-300"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Diskusi ({ticket.commentsCount})
              </Button>

              {(isAdmin || isProjectManager || ticket.reportedByUserId === user?.id) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (confirm(`Yakin ingin menghapus tiket ${ticket.ticketCode}?`)) {
                      deleteIssueMutation.mutate(ticket.id);
                    }
                  }}
                  className="text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}

        {issues.length === 0 && !isLoading && (
          <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-400 dark:border-gray-800 dark:bg-gray-900">
            Tidak ada tiket masalah yang sesuai dengan filter.
          </div>
        )}
      </div>

      {/* Modal Buat Tiket Baru */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 shadow-2xl dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-indigo-600" />
              Buat Tiket Masalah Baru
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createIssueMutation.mutate();
            }}
            className="mt-4 space-y-3.5"
          >
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Perusahaan *
              </label>
              <select
                required
                value={newCompanyId}
                onChange={(e) => {
                  setNewCompanyId(e.target.value);
                  setNewProjectId("");
                  setNewAssignedToUserId("");
                }}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-transparent p-2.5 text-xs text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              >
                <option value="">-- Pilih Perusahaan --</option>
                {companies.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Terkait Proyek (Opsional)
              </label>
              <select
                value={newProjectId}
                disabled={!newCompanyId}
                onChange={(e) => setNewProjectId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-transparent p-2.5 text-xs text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white disabled:opacity-50"
              >
                <option value="">-- Tanpa Asosiasi Proyek --</option>
                {availableProjectsForCreate.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Judul Kendala / Masalah *
              </label>
              <Input
                required
                placeholder="cth. Error 500 saat upload dokumen PDF"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Kategori
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-transparent p-2 text-xs text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                >
                  <option value="Bug">Bug Software</option>
                  <option value="Incident">Incident / Crash</option>
                  <option value="Feature Request">Feature Request</option>
                  <option value="Technical Debt">Technical Debt</option>
                  <option value="User Support">User Support</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Prioritas Severity
                </label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-transparent p-2 text-xs text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                >
                  <option value={0}>Low</option>
                  <option value={1}>Medium</option>
                  <option value={2}>High</option>
                  <option value={3}>Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Assign ke Member (PIC)
              </label>
              <select
                value={newAssignedToUserId}
                disabled={!newCompanyId}
                onChange={(e) => setNewAssignedToUserId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-transparent p-2.5 text-xs text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white disabled:opacity-50"
              >
                <option value="">-- Belum Ditugaskan --</option>
                {availableMembersForCreate.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.jobTitle || "Member"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Deskripsi & Langkah Reproduksi
              </label>
              <textarea
                rows={3}
                placeholder="Jelaskan detail kendala, URL error, atau perilaku yang diharapkan..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-transparent p-2 text-xs text-gray-900 dark:border-gray-800 dark:text-white"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={createIssueMutation.isPending || !newTitle.trim()}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Kirim Tiket
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Diskusi / Detail Tiket */}
      <Dialog open={!!selectedIssueId} onOpenChange={(open) => !open && setSelectedIssueId(null)}>
        <DialogContent className="max-w-lg bg-white p-6 shadow-2xl dark:bg-gray-900 max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {activeIssue?.ticketCode}
              </span>
              {activeIssue && getStatusBadge(activeIssue.status)}
            </div>
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-white mt-1">
              {activeIssue?.title}
            </DialogTitle>
          </DialogHeader>

          {activeIssue?.description && (
            <div className="mt-2 rounded-xl bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {activeIssue.description}
            </div>
          )}

          {/* Comments Thread */}
          <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1 max-h-64">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Thread Diskusi & Riwayat Resolusi ({activeIssue?.comments?.length || 0})
            </h4>

            {activeIssue?.comments?.map((c: any) => (
              <div
                key={c.id}
                className="flex flex-col gap-1 rounded-xl border border-gray-100 bg-white p-3 shadow-xs dark:border-gray-800 dark:bg-gray-800/60"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <strong className="text-gray-900 dark:text-white font-semibold">
                    {c.userName || "User"}
                  </strong>
                  <span className="text-gray-400">
                    {new Date(c.createdAt).toLocaleString("id-ID")}
                  </span>
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">{c.message}</p>
              </div>
            ))}

            {activeIssue?.comments?.length === 0 && (
              <p className="py-6 text-center text-xs text-gray-400">
                Belum ada komentar pada tiket ini.
              </p>
            )}
          </div>

          {/* Comment Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addCommentMutation.mutate();
            }}
            className="mt-4 flex gap-2 border-t border-gray-100 pt-3 dark:border-gray-800"
          >
            <Input
              placeholder="Tulis balasan atau status resolusi..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="text-xs"
            />
            <Button
              type="submit"
              disabled={!commentText.trim() || addCommentMutation.isPending}
              className="bg-indigo-600 text-white hover:bg-indigo-700 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
