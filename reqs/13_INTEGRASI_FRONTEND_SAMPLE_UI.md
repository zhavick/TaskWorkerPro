# 🎨 FASE 13: PANDUAN INTEGRASI FRONTEND (SAMPLE-WEB-UI)
## TRACKERKERJA MODERN (WORK TRACKER PRO)

> **Panduan Teknis Adopsi & Integrasi Template Next.js Admin Dashboard (TailGrids + Tailwind CSS v4) ke Frontend TrackerKerja**  
> **Source Foundation**: `sample-web-ui/nextjs-admin-dashboard-main`  
> **Target Framework**: Next.js 16 (App Router), React 19, TypeScript, TanStack Query v5, Tailwind CSS v4  
> **Status**: Ready for Implementation  

---

## 1. Pemetaan Struktur Folder & Navigasi Sidebar

File konfigurasi navigasi sidebar berada pada `src/components/common/sidebar/data.tsx`. Ubah data navigasi dari contoh e-commerce bawaan template menjadi struktur modul bisnis TrackerKerja:

```tsx
import {
  HomeIcon,
  BriefcaseIcon,
  CheckSquareIcon,
  ClockIcon,
  CalendarIcon,
  BookOpenIcon,
  UsersIcon,
  AwardIcon,
  BellIcon,
  CodeIcon,
  SettingsIcon,
  UserIcon
} from "./icons";

export const NAV_DATA = [
  {
    label: "OPERASIONAL KERJA",
    items: [
      {
        title: "Dashboard",
        icon: <HomeIcon />,
        url: "/dashboard",
      },
      {
        title: "Manajemen Proyek",
        icon: <BriefcaseIcon />,
        url: "/projects",
      },
      {
        title: "Tugas & Kanban",
        icon: <CheckSquareIcon />,
        items: [
          { title: "Daftar Grid Tugas", url: "/tasks" },
          { title: "Papan Kanban", url: "/tasks/kanban" },
        ],
      },
      {
        title: "Timesheet & Timer",
        icon: <ClockIcon />,
        url: "/timesheets",
      },
      {
        title: "Presensi Kehadiran",
        icon: <CalendarIcon />,
        url: "/attendance",
      },
      {
        title: "Kalender Jadwal",
        icon: <CalendarIcon />,
        url: "/calendar",
      },
      {
        title: "Catatan & Dokumen",
        icon: <BookOpenIcon />,
        url: "/notes",
      },
    ],
  },
  {
    label: "TIM & ENTERPRISE",
    items: [
      {
        title: "Anggota Tim",
        icon: <UsersIcon />,
        url: "/members",
      },
      {
        title: "Gamifikasi & Hadiah",
        icon: <AwardIcon />,
        items: [
          { title: "Status & Streak", url: "/gamification" },
          { title: "Lencana Prestasi", url: "/gamification/badges" },
          { title: "Reward Store", url: "/gamification/rewards" },
        ],
      },
      {
        title: "Pengumuman",
        icon: <BellIcon />,
        url: "/announcements",
      },
      {
        title: "Developer Tools",
        icon: <CodeIcon />,
        items: [
          { title: "JSON Formatter", url: "/dev-tools/json" },
          { title: "SQL Beautifier", url: "/dev-tools/sql" },
        ],
      },
      {
        title: "Konfigurasi Sistem",
        icon: <SettingsIcon />,
        url: "/configuration",
      },
    ],
  },
];
```

---

## 2. Kustomisasi Topbar Header (`src/components/common/header/index.tsx`)

Header aplikasi diselaraskan dengan kebutuhan enterprise:
1. **Tenant Badge**: Menampilkan lencana perusahaan di sebelah kiri:
   ```tsx
   <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
     <BuildingIcon className="size-4" />
     <span>[{currentTenant.code}] {currentTenant.name}</span>
   </div>
   ```
2. **Command Search Palette (`cmdk`)**: Tombol pintas `Ctrl+K` untuk pencarian global cepat tugas, proyek, atau catatan kerja.
3. **Pemberitahuan Lonceng (`notifications.tsx`)**: Menampilkan notifikasi persetujuan akun, penugasan tugas, dan pengumuman baru.
4. **Theme Toggle (`theme-toggle.tsx`)**: Beralih instan antara mode Gelap dan Terang (*Dark/Light Mode*).
5. **Menu Profil Pengguna (`user-profile.tsx`)**: Tautan ke halaman profil, kustomisasi cover banner, dan tombol logout aman.

---

## 3. Layer Klien API & Interceptor Autentikasi (`src/services/api/client.ts`)

Menggunakan Axios dengan penanganan token otomatis:

```typescript
import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api",
  withCredentials: true, // Untuk menyertakan cookie Refresh Token
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Sisipkan Access Token JWT
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response Interceptor: Tangani 401 Unauthorized via Silent Refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshResponse = await axios.post(
          `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api"}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );
        const newToken = refreshResponse.data.data.accessToken;
        localStorage.setItem("access_token", newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("access_token");
        window.location.href = "/login?reason=session_expired";
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
```

---

## 4. Pembungkus Provider Global (`src/app/providers.tsx`)

Mendaftarkan seluruh provider inti sistem dalam satu file bersih:

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState, ReactNode } from "react";
import { Toaster } from "sonner";
import { SessionInactivityGuard } from "@/components/guards/SessionInactivityGuard";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 30, // Data valid selama 30 detik
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <SessionInactivityGuard timeoutMinutes={60} warningMinutes={5}>
          {children}
        </SessionInactivityGuard>
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
```

---

## 5. Ringkasan Pemanfaatan Komponen TailGrids Bawaan

| Modul TrackerKerja | Komponen TailGrids yang Digunakan | File Komponen Sumber |
| :--- | :--- | :--- |
| **Grid Tabel & List** | `Table`, `Pagination`, `Badge`, `Checkbox` | `core/table.tsx`, `core/pagination.tsx` |
| **Kanban Board** | `Card`, `Badge`, `Avatar`, `Button` | `core/card.tsx`, `core/badge.tsx` |
| **Form Studio 2-Kolom** | `TextField`, `Select`, `Progress`, `Button` | `core/text-field.tsx`, `core/select.tsx` |
| **Modal Bulk Assign** | `Dialog`, `DialogHeader`, `Checkbox`, `Button` | `core/dialog.tsx`, `core/checkbox.tsx` |
| **Peringatan 5 Menit** | `Dialog`, `Alert`, `Button` | `core/dialog.tsx`, `core/alert.tsx` |
| **Pengaturan 4-Tab** | `Tabs`, `TabsList`, `TabsContent` | `core/tabs.tsx` |
| **Audit Log Detail** | `Sheet` (Slide-over drawer samping) | `core/sheet.tsx` |
| **Time & Date Inputs** | `DateField`, `TimeField`, `DatePicker` | `core/date-field.tsx`, `core/time-field.tsx` |
