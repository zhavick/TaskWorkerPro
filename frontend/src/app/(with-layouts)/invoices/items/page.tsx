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
  Package,
  Layers,
  Sparkles,
  Building2,
  Trash2,
  Pencil,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Tag,
  Briefcase,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { Input } from "@/components/tailgrids/core/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/tailgrids/core/dialog";
import { toast } from "sonner";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/use-current-user";

export interface MasterInvoiceItem {
  id: number;
  companyId: number;
  companyName?: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  unitPrice: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const CATEGORY_PRESETS = [
  "Jasa Pengembangan",
  "Desain & Kreatif",
  "Quality Assurance",
  "Pemeliharaan & SLA",
  "Produk & Lisensi",
  "Konsultasi IT",
  "Cloud & Infrastruktur",
  "Lainnya",
];

const UNIT_PRESETS = [
  "Fitur",
  "Jam",
  "Hari",
  "Bulan",
  "Paket",
  "Lisensi",
  "User / Bulan",
  "Project",
  "Sesi",
];

export default function MasterInvoiceItemsPage() {
  const queryClient = useQueryClient();
  const { user, isAdmin, isProjectManager, enableInvoicing } = useCurrentUser();

  // Search & Filter States
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [companyFilter, setCompanyFilter] = useState("all");

  // Dialog State (Create / Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterInvoiceItem | null>(null);

  // Form State
  const [formCompanyId, setFormCompanyId] = useState<string>("");
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("Jasa Pengembangan");
  const [formUnit, setFormUnit] = useState("Fitur");
  const [formUnitPrice, setFormUnitPrice] = useState<number>(0);
  const [formDescription, setFormDescription] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  // Delete Confirmation State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MasterInvoiceItem | null>(null);

  // 1. Fetch Master Items
  const { data: items = [], isLoading } = useQuery<MasterInvoiceItem[]>({
    queryKey: ["masterInvoiceItems", companyFilter, search, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (companyFilter !== "all") params.append("companyId", companyFilter);
      if (search) params.append("search", search);
      if (categoryFilter !== "all") params.append("category", categoryFilter);

      const url = `/invoices/items${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await apiClient.get(url);
      return res.data.data || [];
    },
    enabled: enableInvoicing,
  });

  // 2. Fetch Companies (for SuperAdmin selector)
  const { data: companies = [] } = useQuery<any[]>({
    queryKey: ["companiesList"],
    queryFn: async () => {
      const res = await apiClient.get("/companies");
      return res.data.data || [];
    },
    enabled: isAdmin,
  });

  // Computed Filtered Items for Client-Side Status Filter
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (statusFilter === "active") return it.isActive;
      if (statusFilter === "inactive") return !it.isActive;
      return true;
    });
  }, [items, statusFilter]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalItems = items.length;
    const activeItems = items.filter((it) => it.isActive).length;
    const categoriesCount = new Set(items.map((it) => it.category)).size;
    const avgPrice =
      totalItems > 0
        ? Math.round(items.reduce((sum, it) => sum + (it.unitPrice || 0), 0) / totalItems)
        : 0;

    return { totalItems, activeItems, categoriesCount, avgPrice };
  }, [items]);

  // Handle Open Create Modal
  const handleOpenCreate = () => {
    setEditingItem(null);
    const defaultComp = user?.companyId
      ? String(user.companyId)
      : companies.length > 0
      ? String(companies[0].id)
      : "";
    setFormCompanyId(defaultComp);
    setFormCode("");
    setFormName("");
    setFormCategory("Jasa Pengembangan");
    setFormUnit("Fitur");
    setFormUnitPrice(5000000);
    setFormDescription("");
    setFormIsActive(true);
    setModalOpen(true);
  };

  // Handle Open Edit Modal
  const handleOpenEdit = (it: MasterInvoiceItem) => {
    setEditingItem(it);
    setFormCompanyId(String(it.companyId));
    setFormCode(it.code);
    setFormName(it.name);
    setFormCategory(it.category || "Jasa Pengembangan");
    setFormUnit(it.unit || "Fitur");
    setFormUnitPrice(it.unitPrice || 0);
    setFormDescription(it.description || "");
    setFormIsActive(it.isActive);
    setModalOpen(true);
  };

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post("/invoices/items", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Item jasa / produk berhasil ditambahkan ke katalog");
      queryClient.invalidateQueries({ queryKey: ["masterInvoiceItems"] });
      queryClient.invalidateQueries({ queryKey: ["invoiceItemOptions"] });
      setModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Gagal menambahkan item katalog");
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const res = await apiClient.put(`/invoices/items/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Item jasa / produk berhasil diperbarui");
      queryClient.invalidateQueries({ queryKey: ["masterInvoiceItems"] });
      queryClient.invalidateQueries({ queryKey: ["invoiceItemOptions"] });
      setModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Gagal memperbarui item katalog");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete(`/invoices/items/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Item katalog berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["masterInvoiceItems"] });
      queryClient.invalidateQueries({ queryKey: ["invoiceItemOptions"] });
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Gagal menghapus item katalog");
    },
  });

  // Save handler
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Nama item jasa / produk wajib diisi");
      return;
    }

    const payload = {
      companyId: formCompanyId ? Number(formCompanyId) : null,
      code: formCode.trim() || undefined,
      name: formName.trim(),
      description: formDescription.trim() || undefined,
      category: formCategory.trim() || "Jasa",
      unit: formUnit.trim() || "Satuan",
      unitPrice: Number(formUnitPrice) || 0,
      isActive: formIsActive,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const canManage = isAdmin || isProjectManager;

  if (!enableInvoicing && !isAdmin) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 rounded-full bg-rose-50 p-4 text-rose-500 dark:bg-rose-950/40">
          <AlertTriangle className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Akses Modul Dinonaktifkan</h2>
        <p className="mt-2 max-w-md text-sm text-gray-600 dark:text-gray-400">
          Modul Invoice & Tagihan saat ini tidak aktif untuk perusahaan Anda. Hubungi Administrator sistem.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/invoices"
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Kembali ke Daftar Invoice
            </Link>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            Katalog Item Jasa & Produk
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Kelola daftar master item layanan dan produk standar untuk pengisian cepat Rincian Item Tagihan invoice.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/invoices">
            <Button variant="outline" size="sm" className="gap-2">
              <Receipt className="h-4 w-4" />
              Daftar Tagihan
            </Button>
          </Link>
          {canManage && (
            <Button
              onClick={handleOpenCreate}
              size="sm"
              className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
            >
              <Plus className="h-4 w-4" />
              Tambah Item Baru
            </Button>
          )}
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total Item</span>
            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-gray-900 dark:text-white">{metrics.totalItems}</p>
          <span className="text-[11px] text-gray-500 dark:text-gray-400">Tersimpan dalam database</span>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Item Aktif</span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {metrics.activeItems}
          </p>
          <span className="text-[11px] text-gray-500 dark:text-gray-400">Siap digunakan di invoice</span>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Kategori Layanan</span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-amber-600 dark:text-amber-400">
            {metrics.categoriesCount}
          </p>
          <span className="text-[11px] text-gray-500 dark:text-gray-400">Klasifikasi deliverable</span>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Rata-rata Rate Jasa</span>
            <div className="rounded-xl bg-purple-50 p-2 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-xl font-black text-purple-600 dark:text-purple-400">
            Rp {metrics.avgPrice.toLocaleString("id-ID")}
          </p>
          <span className="text-[11px] text-gray-500 dark:text-gray-400">Nilai standar per unit</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari kode item, nama deliverable, atau spesifikasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 pl-10 pr-4 text-xs font-medium text-gray-900 transition focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="h-3.5 w-3.5 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-2xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="all">Semua Kategori</option>
              {CATEGORY_PRESETS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-2xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif Saja</option>
            <option value="inactive">Nonaktif</option>
          </select>

          {/* Company Filter (SuperAdmin Only) */}
          {isAdmin && companies.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <Building2 className="h-3.5 w-3.5 text-gray-400" />
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-2xs dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="all">Semua Perusahaan</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-100 bg-gray-50/75 font-semibold text-gray-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-300">
              <tr>
                <th className="px-5 py-3.5">Kode Item</th>
                <th className="px-5 py-3.5">Nama Deliverable / Layanan</th>
                <th className="px-5 py-3.5">Kategori</th>
                <th className="px-4 py-3.5 text-center">Satuan</th>
                <th className="px-5 py-3.5 text-right">Harga Satuan Standar</th>
                {isAdmin && <th className="px-5 py-3.5">Perusahaan</th>}
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 8 : 7}
                    className="px-5 py-12 text-center text-gray-400 dark:text-gray-500"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                      <span>Memuat katalog item jasa...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 8 : 7}
                    className="px-5 py-12 text-center text-gray-400 dark:text-gray-500"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Package className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                      <p className="font-medium text-gray-700 dark:text-gray-300">
                        Belum ada item jasa atau produk yang cocok
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {search || categoryFilter !== "all" || statusFilter !== "all"
                          ? "Coba ubah kata kunci atau bersihkan filter pencarian."
                          : "Tambahkan item pertama untuk mempermudah pembuatan rincian invoice."}
                      </p>
                      {canManage && (
                        <Button
                          onClick={handleOpenCreate}
                          size="sm"
                          variant="outline"
                          className="mt-2 gap-1.5 text-indigo-600"
                        >
                          <Plus className="h-3.5 w-3.5" /> Tambah Item Sekarang
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((it) => (
                  <tr
                    key={it.id}
                    className="transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/40"
                  >
                    {/* Code */}
                    <td className="px-5 py-4">
                      <span className="inline-block rounded-md bg-gray-100 px-2.5 py-1 font-mono text-[11px] font-bold text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                        {it.code}
                      </span>
                    </td>

                    {/* Name & Description */}
                    <td className="px-5 py-4">
                      <div className="font-bold text-gray-900 dark:text-white">{it.name}</div>
                      {it.description && (
                        <p className="mt-0.5 line-clamp-2 max-w-sm text-[11px] text-gray-500 dark:text-gray-400">
                          {it.description}
                        </p>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        <Tag className="h-3 w-3" />
                        {it.category}
                      </span>
                    </td>

                    {/* Unit */}
                    <td className="px-4 py-4 text-center">
                      <span className="inline-block rounded-md border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:border-gray-700 dark:text-gray-300">
                        {it.unit}
                      </span>
                    </td>

                    {/* Unit Price */}
                    <td className="px-5 py-4 text-right font-mono font-bold text-gray-900 dark:text-white">
                      Rp {Number(it.unitPrice).toLocaleString("id-ID")}
                    </td>

                    {/* Company (if SuperAdmin) */}
                    {isAdmin && (
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-600 dark:text-gray-400">
                          <Building2 className="h-3 w-3 text-gray-400" />
                          {it.companyName || "Perusahaan #" + it.companyId}
                        </span>
                      </td>
                    )}

                    {/* Status */}
                    <td className="px-4 py-4 text-center">
                      {it.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                          <XCircle className="h-3 w-3" /> Nonaktif
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {canManage && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(it)}
                              title="Edit Item"
                              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-indigo-400 transition"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setItemToDelete(it);
                                setDeleteConfirmOpen(true);
                              }}
                              title="Hapus Item"
                              className="rounded-lg p-1.5 text-gray-500 hover:bg-rose-50 hover:text-rose-600 dark:text-gray-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Tambah / Edit Item Katalog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl bg-white p-6 dark:bg-gray-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <Package className="h-5 w-5 text-indigo-600" />
              {editingItem ? "Edit Item Jasa / Produk" : "Tambah Item Jasa / Produk Baru"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="mt-4 space-y-4">
            {/* Perusahaan (Jika SuperAdmin) */}
            {isAdmin && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Perusahaan Pemilik Item <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formCompanyId}
                  onChange={(e) => setFormCompanyId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  required
                >
                  <option value="">Pilih Perusahaan...</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Kode Item */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Kode Item
                </label>
                <Input
                  placeholder="Contoh: SRV-DEV-01"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  className="font-mono text-xs uppercase"
                />
                <span className="mt-1 block text-[10px] text-gray-400">
                  Kosongkan untuk auto-generate
                </span>
              </div>

              {/* Kategori */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Kategori <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  required
                >
                  {CATEGORY_PRESETS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Satuan Unit */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Satuan Standar <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  required
                >
                  {UNIT_PRESETS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Nama Item Jasa */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Nama Layanan / Produk Tagihan <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="Misal: Jasa Pengembangan Modul Backend & API"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            {/* Harga Satuan */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Harga Satuan Standar (IDR) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-gray-500">
                  Rp
                </span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={formUnitPrice}
                  onChange={(e) => setFormUnitPrice(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-11 pr-4 font-mono text-xs font-bold text-gray-900 transition focus:border-indigo-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>
              <span className="mt-1 block text-[11px] text-gray-400">
                Terbaca: Rp {Number(formUnitPrice || 0).toLocaleString("id-ID")} per {formUnit}
              </span>
            </div>

            {/* Deskripsi Standar */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Deskripsi Deliverable / Rincian Pekerjaan Standar
              </label>
              <textarea
                rows={3}
                placeholder="Rincian cakupan deliverables yang akan otomatis masuk ke invoice saat item ini dipilih..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-900 transition focus:border-indigo-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            {/* Status Aktif Toggle */}
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="formIsActive"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="h-4 w-4 rounded-sm border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800"
              />
              <label
                htmlFor="formIsActive"
                className="cursor-pointer text-xs font-semibold text-gray-700 dark:text-gray-300"
              >
                Item Aktif (Dapat dipilih langsung saat membuat invoice baru)
              </label>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Menyimpan..."
                  : editingItem
                  ? "Simpan Perubahan"
                  : "Tambahkan Item"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Konfirmasi Hapus */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md bg-white p-6 dark:bg-gray-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              Konfirmasi Hapus Item Katalog
            </DialogTitle>
          </DialogHeader>

          <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
            Apakah Anda yakin ingin menghapus item{" "}
            <span className="font-bold text-gray-900 dark:text-white">
              "{itemToDelete?.name}" ({itemToDelete?.code})
            </span>
            ? Tindakan ini tidak akan menghapus invoice lama yang telah menggunakan rincian ini.
          </p>

          <div className="mt-5 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => itemToDelete && deleteMutation.mutate(itemToDelete.id)}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {deleteMutation.isPending ? "Menghapus..." : "Ya, Hapus Item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

