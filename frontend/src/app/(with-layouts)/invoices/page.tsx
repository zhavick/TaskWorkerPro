"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  DollarSign,
  Printer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Briefcase,
  Trash2,
  Eye,
  Pencil,
  Send,
  FileSpreadsheet,
  Download,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/tailgrids/core/dialog";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";

interface InvoiceItemRow {
  description: string;
  quantity: number;
  unitPrice: number;
}

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const { user, isAdmin, isProjectManager } = useCurrentUser();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  // Create/Edit Invoice Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [taxRatePercent, setTaxRatePercent] = useState<number>(11);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [companyId, setCompanyId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [items, setItems] = useState<InvoiceItemRow[]>([
    { description: "Jasa Konsultasi & Pengembangan Sistem", quantity: 1, unitPrice: 15000000 },
  ]);

  // Preview Print Modal State
  const [previewInvoice, setPreviewInvoice] = useState<any | null>(null);

  // 1. Fetch Invoices
  const { data: invoices = [], isLoading } = useQuery<any[]>({
    queryKey: ["invoicesList", search, statusFilter, companyFilter, projectFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (companyFilter !== "all") params.append("companyId", companyFilter);
      if (projectFilter !== "all") params.append("projectId", projectFilter);

      const res = await apiClient.get(`/invoices?${params.toString()}`);
      return res.data.data;
    },
  });

  // 2. Fetch Summary
  const { data: summary } = useQuery<any>({
    queryKey: ["invoicesSummary", companyFilter],
    queryFn: async () => {
      const url = companyFilter !== "all" ? `/invoices/summary?companyId=${companyFilter}` : "/invoices/summary";
      const res = await apiClient.get(url);
      return res.data.data;
    },
  });

  // 3. Fetch Companies
  const { data: companies = [] } = useQuery<any[]>({
    queryKey: ["companiesList"],
    queryFn: async () => {
      const res = await apiClient.get("/companies");
      return res.data.data;
    },
  });

  // 4. Fetch Projects
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projectsList"],
    queryFn: async () => {
      const res = await apiClient.get("/projects");
      return res.data.data;
    },
  });

  // Filtered Projects for Create Modal
  const availableProjectsForModal = useMemo(() => {
    if (!companyId) return [];
    return projects.filter((p) => String(p.companyId) === String(companyId));
  }, [projects, companyId]);

  // Dynamic Item Calculations
  const calculatedSubTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
  }, [items]);

  const calculatedTaxAmount = useMemo(() => {
    return Math.round(calculatedSubTotal * ((Number(taxRatePercent) || 0) / 100));
  }, [calculatedSubTotal, taxRatePercent]);

  const calculatedTotalAmount = useMemo(() => {
    return Math.max(0, calculatedSubTotal + calculatedTaxAmount - (Number(discountAmount) || 0));
  }, [calculatedSubTotal, calculatedTaxAmount, discountAmount]);

  const handleOpenCreateModal = () => {
    setEditingInvoiceId(null);
    setInvoiceNumber("");
    setClientName("");
    setClientEmail("");
    setClientAddress("");
    const today = new Date().toISOString().split("T")[0];
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    setIssueDate(today);
    setDueDate(in30Days);
    setTaxRatePercent(11);
    setDiscountAmount(0);
    setNotes("Pembayaran dilakukan transfer ke rekening korporat dalam 30 hari.");
    const defaultComp = user?.companyId ? String(user.companyId) : companies.length > 0 ? String(companies[0].id) : "";
    setCompanyId(defaultComp);
    setProjectId("");
    setItems([{ description: "Paket Implementasi Solusi", quantity: 1, unitPrice: 20000000 }]);
    setModalOpen(true);
  };

  const handleOpenEditModal = (inv: any) => {
    setEditingInvoiceId(inv.id);
    setInvoiceNumber(inv.invoiceNumber || "");
    setClientName(inv.clientName || "");
    setClientEmail(inv.clientEmail || "");
    setClientAddress(inv.clientAddress || "");
    setIssueDate(inv.issueDate ? inv.issueDate.split("T")[0] : "");
    setDueDate(inv.dueDate ? inv.dueDate.split("T")[0] : "");
    setTaxRatePercent(inv.taxRatePercent ?? 11);
    setDiscountAmount(inv.discountAmount ?? 0);
    setNotes(inv.notes || "");
    setCompanyId(String(inv.companyId || ""));
    setProjectId(inv.projectId ? String(inv.projectId) : "");
    if (inv.items && inv.items.length > 0) {
      setItems(inv.items.map((it: any) => ({
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
      })));
    } else {
      setItems([{ description: "Jasa", quantity: 1, unitPrice: 0 }]);
    }
    setModalOpen(true);
  };

  const addItemRow = () => {
    setItems((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItemRow = (index: number, field: keyof InvoiceItemRow, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // 5. Save Invoice Mutation (Create or Update)
  const saveInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!clientName.trim()) throw new Error("Nama Klien wajib diisi.");
      if (!companyId) throw new Error("Perusahaan wajib dipilih.");
      if (items.length === 0 || items.some((it) => !it.description.trim())) {
        throw new Error("Deskripsi item tagihan wajib diisi.");
      }

      const payload = {
        invoiceNumber: invoiceNumber.trim() || null,
        companyId: Number(companyId),
        projectId: projectId ? Number(projectId) : null,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim() || null,
        clientAddress: clientAddress.trim() || null,
        issueDate: issueDate ? new Date(issueDate).toISOString() : new Date().toISOString(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : new Date().toISOString(),
        taxRatePercent: Number(taxRatePercent) || 0,
        discountAmount: Number(discountAmount) || 0,
        notes: notes.trim() || null,
        items: items.map((it) => ({
          description: it.description.trim(),
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice) || 0,
        })),
      };

      if (editingInvoiceId) {
        const res = await apiClient.put(`/invoices/${editingInvoiceId}`, {
          ...payload,
          status: 0, // Keep or update status
        });
        return res.data;
      } else {
        const res = await apiClient.post("/invoices", payload);
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success(editingInvoiceId ? "Invoice berhasil diperbarui!" : "Invoice berhasil dibuat!");
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["invoicesList"] });
      queryClient.invalidateQueries({ queryKey: ["invoicesSummary"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || err.message || "Gagal menyimpan invoice"),
  });

  // 6. Update Invoice Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: number; newStatus: number }) => {
      const res = await apiClient.patch(`/invoices/${id}/status`, {
        status: newStatus,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Status invoice berhasil diperbarui!");
      queryClient.invalidateQueries({ queryKey: ["invoicesList"] });
      queryClient.invalidateQueries({ queryKey: ["invoicesSummary"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal memperbarui status invoice"),
  });

  // 7. Delete Invoice Mutation
  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete(`/invoices/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Invoice berhasil dihapus.");
      queryClient.invalidateQueries({ queryKey: ["invoicesList"] });
      queryClient.invalidateQueries({ queryKey: ["invoicesSummary"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Gagal menghapus invoice"),
  });

  const getStatusBadge = (s: number) => {
    switch (s) {
      case 2:
        return (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            Lunas (Paid)
          </span>
        );
      case 1:
        return (
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-extrabold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
            Terkirim (Sent)
          </span>
        );
      case 3:
        return (
          <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-extrabold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
            Jatuh Tempo (Overdue)
          </span>
        );
      case 4:
        return (
          <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-[10px] font-extrabold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            Dibatalkan
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-extrabold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 px-2 py-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5">
            <Receipt className="h-7 w-7 text-indigo-600" />
            Manajemen Invoice & Penagihan Klien
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Penerbitan nota tagihan proyek resmi, pemantauan piutang korporat, dan bukti pembayaran klien.
          </p>
        </div>

        {(isProjectManager || isAdmin) && (
          <Button
            onClick={handleOpenCreateModal}
            className="gap-2 bg-indigo-600 font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Terbitkan Invoice Baru
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-gray-400">Total Nilai Tagihan</p>
          <p className="text-xl font-mono font-extrabold text-gray-900 dark:text-white mt-1">
            Rp {(summary?.totalAmount || 0).toLocaleString("id-ID")}
          </p>
          <span className="text-[11px] text-gray-400">{summary?.totalCount || 0} Invoice Terdaftar</span>
        </div>
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-emerald-500">Sudah Terbayar (Lunas)</p>
          <p className="text-xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            Rp {(summary?.paidAmount || 0).toLocaleString("id-ID")}
          </p>
          <span className="text-[11px] text-emerald-600/80">Arus Kas Diterima</span>
        </div>
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-blue-500">Menunggu Pembayaran</p>
          <p className="text-xl font-mono font-extrabold text-blue-600 dark:text-blue-400 mt-1">
            Rp {(summary?.pendingAmount || 0).toLocaleString("id-ID")}
          </p>
          <span className="text-[11px] text-blue-600/80">Piutang Berjalan</span>
        </div>
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-rose-500">Jatuh Tempo (Overdue)</p>
          <p className="text-xl font-mono font-extrabold text-rose-600 dark:text-rose-400 mt-1">
            Rp {(summary?.overdueAmount || 0).toLocaleString("id-ID")}
          </p>
          <span className="text-[11px] text-rose-600/80">Perlu Penagihan Lanjutan</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Cari nomor invoice, klien, atau email..."
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
            <option value="0">Draft</option>
            <option value="1">Sent (Terkirim)</option>
            <option value="2">Paid (Lunas)</option>
            <option value="3">Overdue</option>
            <option value="4">Cancelled</option>
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

      {/* Invoices List Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-100 bg-gray-50/70 font-semibold text-gray-600 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-300">
              <tr>
                <th className="px-5 py-3.5">Nomor & Klien</th>
                <th className="px-4 py-3.5">Perusahaan & Proyek</th>
                <th className="px-4 py-3.5">Tanggal Terbit / Tempo</th>
                <th className="px-4 py-3.5">Total Tagihan</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition">
                  <td className="px-5 py-4">
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {inv.invoiceNumber}
                    </span>
                    <div className="mt-0.5 font-semibold text-gray-900 dark:text-white">
                      {inv.clientName}
                    </div>
                    {inv.clientEmail && (
                      <span className="text-[11px] text-gray-400">{inv.clientEmail}</span>
                    )}
                  </td>
                  <td className="px-4 py-4 space-y-1">
                    {inv.companyName && (
                      <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                        <Building2 className="h-3 w-3 text-gray-400" />
                        <span>{inv.companyName}</span>
                      </div>
                    )}
                    {inv.projectName ? (
                      <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-medium">
                        <Briefcase className="h-3 w-3" />
                        <span>{inv.projectName}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-[11px]">- Tagihan Umum -</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div>Terbit: {new Date(inv.issueDate).toLocaleDateString("id-ID")}</div>
                    <div className="text-[11px] text-rose-500 font-medium mt-0.5">
                      Tempo: {new Date(inv.dueDate).toLocaleDateString("id-ID")}
                    </div>
                  </td>
                  <td className="px-4 py-4 font-mono font-bold text-gray-900 dark:text-white text-sm">
                    Rp {Number(inv.totalAmount).toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-4">
                    {getStatusBadge(inv.status)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Status Selector */}
                      <select
                        value={inv.status}
                        onChange={(e) =>
                          updateStatusMutation.mutate({ id: inv.id, newStatus: Number(e.target.value) })
                        }
                        className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      >
                        <option value={0}>Draft</option>
                        <option value={1}>Sent</option>
                        <option value={2}>Paid</option>
                        <option value={3}>Overdue</option>
                        <option value={4}>Cancelled</option>
                      </select>

                      {/* Print / View Modal */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPreviewInvoice(inv)}
                        title="Pratinjau / Cetak Nota"
                        className="text-xs"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </Button>

                      {/* Edit */}
                      {(isProjectManager || isAdmin) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEditModal(inv)}
                          title="Edit Invoice"
                          className="text-xs"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {/* Delete */}
                      {(isProjectManager || isAdmin) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm(`Yakin ingin menghapus invoice ${inv.invoiceNumber}?`)) {
                              deleteInvoiceMutation.mutate(inv.id);
                            }
                          }}
                          className="text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {invoices.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-sm text-gray-400">
                    Tidak ada invoice yang sesuai dengan kriteria pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Terbitkan / Edit Invoice */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl bg-white p-6 shadow-2xl dark:bg-gray-900 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Receipt className="h-5 w-5 text-indigo-600" />
              {editingInvoiceId ? "Edit Data Invoice" : "Terbitkan Invoice Baru"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveInvoiceMutation.mutate();
            }}
            className="mt-4 space-y-4"
          >
            {/* Row 1: Company & Project */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Perusahaan Penerbit *
                </label>
                <select
                  required
                  value={companyId}
                  onChange={(e) => {
                    setCompanyId(e.target.value);
                    setProjectId("");
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
                  Proyek Terkait (Opsional)
                </label>
                <select
                  value={projectId}
                  disabled={!companyId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-transparent p-2.5 text-xs text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white disabled:opacity-50"
                >
                  <option value="">-- Tanpa Asosiasi Proyek --</option>
                  {availableProjectsForModal.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Client Info */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Nama Klien / Perusahaan Klien *
                </label>
                <Input
                  required
                  placeholder="cth. PT Sinar Mandiri"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Email Klien
                </label>
                <Input
                  type="email"
                  placeholder="finance@sinarmandiri.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Nomor Invoice (Otomatis jika kosong)
                </label>
                <Input
                  placeholder="cth. INV-2026-0012"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="mt-1 text-xs font-mono"
                />
              </div>
            </div>

            {/* Row 3: Dates */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Tanggal Terbit
                </label>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Tanggal Batas Pembayaran (Due Date)
                </label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            {/* Dynamic Items Section */}
            <div className="space-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Rincian Item Jasa / Produk Tagihan
                </h4>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addItemRow}
                  className="gap-1 text-xs text-indigo-600"
                >
                  <Plus className="h-3 w-3" /> Tambah Baris
                </Button>
              </div>

              <div className="space-y-2">
                {items.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      placeholder="Deskripsi item jasa..."
                      value={it.description}
                      onChange={(e) => updateItemRow(idx, "description", e.target.value)}
                      className="flex-3 text-xs"
                      required
                    />
                    <Input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={it.quantity}
                      onChange={(e) => updateItemRow(idx, "quantity", e.target.value)}
                      className="w-20 text-xs"
                      required
                    />
                    <Input
                      type="number"
                      placeholder="Harga Satuan (Rp)"
                      value={it.unitPrice}
                      onChange={(e) => updateItemRow(idx, "unitPrice", e.target.value)}
                      className="flex-2 text-xs font-mono"
                      required
                    />
                    <div className="w-28 text-right font-mono font-bold text-xs text-gray-900 dark:text-white">
                      Rp {((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)).toLocaleString("id-ID")}
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Calculation Summary Footer */}
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/60 space-y-2">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>Subtotal Rincian Item:</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">
                  Rp {calculatedSubTotal.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-2">
                  PPN / Pajak (%):
                  <input
                    type="number"
                    value={taxRatePercent}
                    onChange={(e) => setTaxRatePercent(Number(e.target.value))}
                    className="w-16 rounded border border-gray-200 px-2 py-0.5 text-xs font-mono dark:bg-gray-900 dark:border-gray-700"
                  />
                </span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">
                  + Rp {calculatedTaxAmount.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-2">
                  Potongan Diskon (Rp):
                  <input
                    type="number"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    className="w-28 rounded border border-gray-200 px-2 py-0.5 text-xs font-mono dark:bg-gray-900 dark:border-gray-700"
                  />
                </span>
                <span className="font-mono font-bold text-rose-500">
                  - Rp {Number(discountAmount || 0).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold text-gray-900 dark:text-white dark:border-gray-700">
                <span>Total Akhir Tagihan:</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 text-base">
                  Rp {calculatedTotalAmount.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Catatan & Ketentuan Pembayaran
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="cth. Rekening BCA 8830192837 a.n PT Wahana Digital"
                className="mt-1 w-full rounded-xl border border-gray-200 bg-transparent p-2 text-xs text-gray-900 dark:border-gray-800 dark:text-white"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={saveInvoiceMutation.isPending || !clientName.trim()}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {editingInvoiceId ? "Simpan Perubahan" : "Terbitkan Invoice"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Pratinjau Cetak Invoice Resmi */}
      <Dialog open={!!previewInvoice} onOpenChange={(open) => !open && setPreviewInvoice(null)}>
        <DialogContent className="max-w-2xl bg-white p-8 shadow-2xl dark:bg-gray-900 print:shadow-none print:p-0">
          <div className="flex items-start justify-between border-b border-gray-200 pb-6 dark:border-gray-800">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-extrabold text-base">
                  TK
                </div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white">
                  {previewInvoice?.companyName || "TrackerKerja Korporat"}
                </h2>
              </div>
              <p className="mt-1 text-xs text-gray-500">Official Billing Statement & Commercial Invoice</p>
            </div>

            <div className="text-right">
              <span className="font-mono text-sm font-black text-indigo-600 dark:text-indigo-400">
                {previewInvoice?.invoiceNumber}
              </span>
              <div className="mt-1.5">{previewInvoice && getStatusBadge(previewInvoice.status)}</div>
            </div>
          </div>

          {/* Invoice Meta */}
          <div className="mt-6 grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-bold uppercase tracking-wider text-gray-400 text-[10px]">Ditagihkan Kepada:</p>
              <h4 className="mt-1 font-bold text-sm text-gray-900 dark:text-white">
                {previewInvoice?.clientName}
              </h4>
              {previewInvoice?.clientEmail && (
                <p className="text-gray-500">{previewInvoice.clientEmail}</p>
              )}
              {previewInvoice?.clientAddress && (
                <p className="text-gray-500 mt-1 whitespace-pre-line">{previewInvoice.clientAddress}</p>
              )}
            </div>

            <div className="text-right space-y-1">
              <div>
                <span className="text-gray-400">Tanggal Terbit: </span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {previewInvoice && new Date(previewInvoice.issueDate).toLocaleDateString("id-ID")}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Jatuh Tempo: </span>
                <span className="font-semibold text-rose-600">
                  {previewInvoice && new Date(previewInvoice.dueDate).toLocaleDateString("id-ID")}
                </span>
              </div>
              {previewInvoice?.projectName && (
                <div>
                  <span className="text-gray-400">Proyek: </span>
                  <span className="font-semibold text-indigo-600">{previewInvoice.projectName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-2.5">Deskripsi Deliverable</th>
                  <th className="px-3 py-2.5 text-center">Qty</th>
                  <th className="px-3 py-2.5 text-right">Harga Satuan</th>
                  <th className="px-4 py-2.5 text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {previewInvoice?.items?.map((it: any) => (
                  <tr key={it.id}>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {it.description}
                    </td>
                    <td className="px-3 py-3 text-center">{it.quantity}</td>
                    <td className="px-3 py-3 text-right font-mono">
                      Rp {Number(it.unitPrice).toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      Rp {Number(it.amount).toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Total */}
          <div className="mt-4 flex justify-end text-xs">
            <div className="w-64 space-y-1.5">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal:</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">
                  Rp {Number(previewInvoice?.subTotal || 0).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>PPN ({previewInvoice?.taxRatePercent}%):</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">
                  Rp {Number(previewInvoice?.taxAmount || 0).toLocaleString("id-ID")}
                </span>
              </div>
              {Number(previewInvoice?.discountAmount) > 0 && (
                <div className="flex justify-between text-rose-500">
                  <span>Diskon:</span>
                  <span className="font-mono font-bold">
                    - Rp {Number(previewInvoice.discountAmount).toLocaleString("id-ID")}
                  </span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-sm text-gray-900 dark:text-white dark:border-gray-700">
                <span>Total Tagihan:</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 text-base">
                  Rp {Number(previewInvoice?.totalAmount || 0).toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>

          {previewInvoice?.notes && (
            <div className="mt-6 rounded-xl bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
              <p className="font-bold text-[10px] uppercase text-gray-400">Catatan Tambahan:</p>
              <p className="mt-0.5">{previewInvoice.notes}</p>
            </div>
          )}

          {/* Modal Actions */}
          <div className="mt-8 flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800 print:hidden">
            <Button variant="outline" onClick={() => setPreviewInvoice(null)}>
              Tutup
            </Button>
            <Button
              onClick={() => window.print()}
              className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700 font-semibold"
            >
              <Printer className="h-4 w-4" />
              Cetak Invoice Resmi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

