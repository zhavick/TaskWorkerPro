"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import {
  Briefcase,
  Building2,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  Mail,
  Phone,
  UserCheck,
  MapPin,
  FileText,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
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

export interface ClientItem {
  id: number;
  name: string;
  code: string;
  email?: string | null;
  phone?: string | null;
  contactPerson?: string | null;
  address?: string | null;
  taxId?: string | null;
  notes?: string | null;
  isActive: boolean;
  companyId?: number | null;
  companyName?: string | null;
  sourceCompanyId?: number | null;
  sourceCompanyName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface CompanyItem {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  address?: string | null;
  contactEmail?: string | null;
}

export function MasterClientsManager() {
  const queryClient = useQueryClient();

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formSourceCompanyId, setFormSourceCompanyId] = useState<string>("");
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formContactPerson, setFormContactPerson] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formTaxId, setFormTaxId] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formCompanyId, setFormCompanyId] = useState<string>("");

  // Delete Confirmation State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ClientItem | null>(null);

  // Fetch Companies
  const { data: companies = [] } = useQuery<CompanyItem[]>({
    queryKey: ["masterCompanies"],
    queryFn: async () => {
      const res = await apiClient.get("/companies");
      return res.data?.data || [];
    },
  });

  // Fetch Clients
  const {
    data: clients = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<ClientItem[]>({
    queryKey: ["masterClients", selectedCompanyId],
    queryFn: async () => {
      let url = "/master/clients";
      if (selectedCompanyId !== "all") {
        url += `?companyId=${selectedCompanyId}`;
      }
      const res = await apiClient.get(url);
      return res.data?.data || [];
    },
  });

  // Save Client Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formName.trim()) {
        throw new Error("Nama Klien wajib diisi.");
      }

      const payload = {
        name: formName.trim(),
        code: formCode.trim() || null,
        email: formEmail.trim() || null,
        phone: formPhone.trim() || null,
        contactPerson: formContactPerson.trim() || null,
        address: formAddress.trim() || null,
        taxId: formTaxId.trim() || null,
        notes: formNotes.trim() || null,
        isActive: formIsActive,
        companyId: formCompanyId ? Number(formCompanyId) : null,
        sourceCompanyId: formSourceCompanyId ? Number(formSourceCompanyId) : null,
      };

      if (modalMode === "create") {
        const res = await apiClient.post("/master/clients", payload);
        return res.data;
      } else {
        const res = await apiClient.put(`/master/clients/${editingId}`, payload);
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success(
        modalMode === "create"
          ? "Data klien berhasil ditambahkan!"
          : "Data klien berhasil diperbarui!"
      );
      queryClient.invalidateQueries({ queryKey: ["masterClients"] });
      queryClient.invalidateQueries({ queryKey: ["invoiceClientOptions"] });
      setModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || err.message || "Gagal menyimpan data klien."
      );
    },
  });

  // Delete Client Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete(`/master/clients/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Data klien berhasil dihapus!");
      queryClient.invalidateQueries({ queryKey: ["masterClients"] });
      queryClient.invalidateQueries({ queryKey: ["invoiceClientOptions"] });
      setDeleteModalOpen(false);
      setItemToDelete(null);
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || "Gagal menghapus data klien."
      );
    },
  });

  // Sync From Companies Mutation
  const syncFromCompaniesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/master/clients/sync-from-companies");
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success(
        data.message || "Berhasil menyinkronkan data klien dari tabel Perusahaan!"
      );
      queryClient.invalidateQueries({ queryKey: ["masterClients"] });
      queryClient.invalidateQueries({ queryKey: ["invoiceClientOptions"] });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || "Gagal menyinkronkan data dari tabel Perusahaan."
      );
    },
  });

  const handleOpenCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setFormSourceCompanyId("");
    setFormName("");
    setFormCode("");
    setFormEmail("");
    setFormPhone("");
    setFormContactPerson("");
    setFormAddress("");
    setFormTaxId("");
    setFormNotes("");
    setFormIsActive(true);
    setFormCompanyId(companies[0]?.id ? String(companies[0].id) : "");
    setModalOpen(true);
  };

  const handleOpenEdit = (item: ClientItem) => {
    setModalMode("edit");
    setEditingId(item.id);
    setFormSourceCompanyId(item.sourceCompanyId ? String(item.sourceCompanyId) : "");
    setFormName(item.name || "");
    setFormCode(item.code || "");
    setFormEmail(item.email || "");
    setFormPhone(item.phone || "");
    setFormContactPerson(item.contactPerson || "");
    setFormAddress(item.address || "");
    setFormTaxId(item.taxId || "");
    setFormNotes(item.notes || "");
    setFormIsActive(item.isActive ?? true);
    setFormCompanyId(item.companyId ? String(item.companyId) : "");
    setModalOpen(true);
  };

  const handleSelectCompanyTemplate = (compIdStr: string) => {
    setFormSourceCompanyId(compIdStr);
    if (!compIdStr) return;
    const comp = companies.find((c) => String(c.id) === compIdStr);
    if (comp) {
      setFormName(comp.name || "");
      setFormCode(`CL-${comp.code || "COMP"}`);
      setFormEmail(comp.contactEmail || "");
      setFormAddress(comp.address || "");
      setFormNotes(comp.description || "Diambil dari tabel Master Perusahaan (companies)");
      setFormCompanyId(String(comp.id));
    }
  };

  const handleConfirmDelete = (item: ClientItem) => {
    setItemToDelete(item);
    setDeleteModalOpen(true);
  };

  const filteredClients = clients.filter((c) => {
    if (statusFilter === "active" && !c.isActive) return false;
    if (statusFilter === "inactive" && c.isActive) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.code && c.code.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.taxId && c.taxId.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q))
    );
  });

  const activeCount = clients.filter((c) => c.isActive).length;
  const fromCompanyCount = clients.filter((c) => c.sourceCompanyId != null).length;

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">
              Total Master Klien
            </p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {clients.length} Klien
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">
              Klien Aktif Penagihan
            </p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {activeCount} Aktif
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">
              Tersinkron Tabel Companies
            </p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {fromCompanyCount} / {companies.length} Perusahaan
            </h3>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Master Data Klien (Client) &amp; Mitra Penagihan Invoice
            </h2>
            <p className="text-xs text-gray-500">
              Kelola daftar klien korporat untuk penerbitan invoice. Data klien dapat diambil dari tabel{" "}
              <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px] dark:bg-gray-800">
                companies
              </code>{" "}
              dan/atau tabel{" "}
              <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[11px] dark:bg-gray-800">
                clients
              </code>
              .
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => syncFromCompaniesMutation.mutate()}
              disabled={syncFromCompaniesMutation.isPending}
              className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
            >
              <Sparkles className="h-4 w-4" />
              {syncFromCompaniesMutation.isPending
                ? "Menyinkronkan..."
                : "Ambil dari Tabel Perusahaan"}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading || isRefetching}
              className="gap-1.5"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
              />
              Segarkan
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleOpenCreate}
              className="gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Tambah Klien Baru
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
              Cakupan Perusahaan
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="all">Semua Perusahaan &amp; Global</option>
              {companies.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
              Status Klien
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
              Pencarian Klien
            </label>
            <div className="relative">
              <Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Cari nama klien, kode, email, PIC, telepon, atau NPWP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Clients Table */}
        <div className="mt-5 overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/75 text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3 font-semibold">Nama Klien &amp; Kode</th>
                <th className="px-4 py-3 font-semibold">Kontak &amp; PIC</th>
                <th className="px-4 py-3 font-semibold">Alamat &amp; NPWP</th>
                <th className="px-4 py-3 font-semibold">Sumber / Entitas</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    Memuat data master klien...
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center">
                    <div className="mx-auto flex max-w-xs flex-col items-center">
                      <Briefcase className="mb-2 h-10 w-10 text-gray-300 dark:text-gray-600" />
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Belum ada data klien yang sesuai
                      </p>
                      <p className="mt-1 text-[11px] text-gray-400">
                        Klik &quot;Tambah Klien Baru&quot; atau &quot;Ambil dari Tabel Perusahaan&quot; untuk menambahkan klien penagihan.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredClients.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 font-bold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                          <Briefcase className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {item.name}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span className="inline-flex rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                              {item.code || `CL-${item.id}`}
                            </span>
                            {item.notes && (
                              <span className="max-w-[180px] truncate text-[11px] text-gray-400">
                                {item.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 space-y-0.5 text-gray-600 dark:text-gray-300">
                      {item.contactPerson && (
                        <div className="flex items-center gap-1.5 font-medium text-gray-800 dark:text-gray-200">
                          <UserCheck className="h-3 w-3 text-indigo-500" />
                          <span>{item.contactPerson}</span>
                        </div>
                      )}
                      {item.email && (
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                          <Mail className="h-3 w-3 text-gray-400" />
                          <span>{item.email}</span>
                        </div>
                      )}
                      {item.phone && (
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                          <Phone className="h-3 w-3 text-gray-400" />
                          <span>{item.phone}</span>
                        </div>
                      )}
                      {!item.contactPerson && !item.email && !item.phone && (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    <td className="px-4 py-3 max-w-xs">
                      {item.address ? (
                        <div className="flex items-start gap-1.5 text-gray-600 dark:text-gray-300">
                          <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-gray-400" />
                          <span className="line-clamp-2 text-[11px]">{item.address}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-[11px]">-</span>
                      )}
                      {item.taxId && (
                        <div className="mt-1 inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          <FileText className="h-2.5 w-2.5" />
                          NPWP: {item.taxId}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 space-y-1">
                      {item.sourceCompanyId ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                          <Building2 className="h-3 w-3" />
                          Tabel Companies ({item.sourceCompanyName || `#${item.sourceCompanyId}`})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                          <Briefcase className="h-3 w-3" />
                          Master Client Mandiri
                        </span>
                      )}
                      <div className="text-[11px] text-gray-400">
                        Cakupan: {item.companyName || "Global (Semua Perusahaan)"}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {item.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                          <XCircle className="h-3 w-3" />
                          Nonaktif
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(item)}
                          className="h-7 w-7 p-0"
                          title="Edit Data Klien"
                        >
                          <Pencil className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConfirmDelete(item)}
                          className="h-7 w-7 border-red-200 p-0 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
                          title="Hapus Data Klien"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Client Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-indigo-600" />
              {modalMode === "create"
                ? "Tambah Master Data Klien Baru"
                : "Ubah Master Data Klien"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="mt-4 space-y-4"
          >
            {/* Quick Fill from Companies Table */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 dark:border-indigo-900/50 dark:bg-indigo-950/20">
              <label className="mb-1 block text-xs font-bold text-indigo-900 dark:text-indigo-300">
                Salin / Tautkan dari Tabel Perusahaan (Opsional)
              </label>
              <select
                value={formSourceCompanyId}
                onChange={(e) => handleSelectCompanyTemplate(e.target.value)}
                className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs text-gray-800 focus:border-indigo-500 focus:outline-hidden dark:border-indigo-800 dark:bg-gray-900 dark:text-gray-200"
              >
                <option value="">-- Input Klien Mandiri (Tidak Terikat Tabel Companies) --</option>
                {companies.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name} ({c.code}) {c.contactEmail ? `- ${c.contactEmail}` : ""}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-indigo-700/80 dark:text-indigo-300/70">
                Memilih perusahaan di atas akan mengisi otomatis nama, kode, email, dan alamat klien dari tabel <code>companies</code>.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Nama Klien / Perusahaan Klien <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  required
                  placeholder="cth. PT Tugu Pratama Indonesia Tbk"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Kode Klien (Otomatis jika kosong)
                </label>
                <Input
                  type="text"
                  placeholder="cth. TUGU / CL-01"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Nama PIC / Contact Person
                </label>
                <Input
                  type="text"
                  placeholder="cth. Budi Hartono"
                  value={formContactPerson}
                  onChange={(e) => setFormContactPerson(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Email Penagihan (Billing Email)
                </label>
                <Input
                  type="email"
                  placeholder="finance@perusahaan.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Nomor Telepon
                </label>
                <Input
                  type="text"
                  placeholder="021-52961777"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  NPWP / Nomor Pajak Klien
                </label>
                <Input
                  type="text"
                  placeholder="01.308.524.6-093.000"
                  value={formTaxId}
                  onChange={(e) => setFormTaxId(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Cakupan Entitas Perusahaan Penerbit
                </label>
                <select
                  value={formCompanyId}
                  onChange={(e) => setFormCompanyId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                >
                  <option value="">Global (Dapat Digunakan Semua Perusahaan)</option>
                  {companies.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Alamat Lengkap Penagihan (Tercetak di Invoice)
              </label>
              <textarea
                rows={2}
                placeholder="Jl. H.R. Rasuna Said Kav. C8-9, Kuningan, Jakarta Selatan"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs text-gray-800 shadow-2xs focus:border-indigo-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-center">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Catatan Klien / Keterangan Kontrak
                </label>
                <Input
                  type="text"
                  placeholder="cth. Mitra proyek TCES & TICS Settlement"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="pt-4">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Status Klien Aktif</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
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
                disabled={saveMutation.isPending || !formName.trim()}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {saveMutation.isPending ? "Menyimpan..." : "Simpan Data Klien"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-sm p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Konfirmasi Hapus Klien
            </DialogTitle>
          </DialogHeader>

          <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
            Apakah Anda yakin ingin menghapus data klien{" "}
            <span className="font-bold text-gray-900 dark:text-white">
              &quot;{itemToDelete?.name}&quot;
            </span>{" "}
            ({itemToDelete?.code})? Invoice yang sudah diterbitkan sebelumnya tetap aman dan tidak akan terhapus.
          </p>

          <div className="mt-5 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (itemToDelete) {
                  deleteMutation.mutate(itemToDelete.id);
                }
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

