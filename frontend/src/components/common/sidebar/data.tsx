import React from "react";
import {
  Home,
  Briefcase,
  CheckSquare,
  Clock,
  Calendar,
  CalendarDays,
  CalendarCheck,
  BookOpen,
  Users,
  Award,
  Bell,
  Code,
  Settings,
  User,
  ShieldCheck,
  BarChart3,
  HelpCircle,
} from "lucide-react";

export const NAV_DATA = [
  {
    label: "OPERASIONAL KERJA",
    items: [
      {
        title: "Dashboard",
        icon: <Home className="h-5 w-5" />,
        url: "/dashboard",
        items: [],
      },
      {
        title: "Manajemen Proyek",
        icon: <Briefcase className="h-5 w-5" />,
        url: "/projects",
        items: [],
      },
      {
        id: "tour-tasks",
        title: "Tugas & Kanban",
        icon: <CheckSquare className="h-5 w-5" />,
        items: [
          { title: "Daftar Tugas", url: "/tasks" },
          { title: "Papan Kanban", url: "/tasks/kanban" },
        ],
      },
      {
        title: "Timesheet & Timer",
        icon: <Clock className="h-5 w-5" />,
        url: "/timesheets",
        items: [],
      },
      {
        title: "Pusat Pelaporan",
        icon: <BarChart3 className="h-5 w-5" />,
        url: "/reports",
        items: [],
      },
      {
        id: "tour-attendance",
        title: "Presensi Kehadiran",
        icon: <CalendarCheck className="h-5 w-5" />,
        url: "/attendance",
        items: [],
      },
      {
        id: "tour-calendar",
        title: "Kalender Jadwal",
        icon: <CalendarDays className="h-5 w-5" />,
        url: "/calendar",
        items: [],
      },
      {
        title: "Catatan & SOP",
        icon: <BookOpen className="h-5 w-5" />,
        url: "/notes",
        items: [],
      },
      {
        title: "Pusat Notifikasi",
        icon: <Bell className="h-5 w-5" />,
        url: "/notifications",
        items: [],
      },
      {
        title: "Panduan Pengguna",
        icon: <HelpCircle className="h-5 w-5" />,
        url: "/guide",
        items: [],
      },
    ],
  },
  {
    label: "TIM & ENTERPRISE",
    items: [
      {
        title: "Anggota Tim",
        icon: <Users className="h-5 w-5" />,
        url: "/members",
        items: [],
      },
      {
        title: "Gamifikasi & Hadiah",
        icon: <Award className="h-5 w-5" />,
        items: [
          { title: "Status & Streak", url: "/gamification" },
          { title: "Lencana Prestasi", url: "/gamification/badges" },
          { title: "Reward Store", url: "/gamification/rewards" },
        ],
      },
      {
        title: "Pengumuman",
        icon: <Bell className="h-5 w-5" />,
        url: "/announcements",
        items: [],
      },
      {
        id: "tour-sql",
        title: "Developer Tools",
        icon: <Code className="h-5 w-5" />,
        items: [
          { title: "JSON Formatter", url: "/dev-tools/json" },
          { title: "SQL Beautifier", url: "/dev-tools/sql" },
        ],
      },
      {
        title: "Audit Trail & Log",
        icon: <ShieldCheck className="h-5 w-5" />,
        url: "/audit-trail",
        companyAdminOnly: true,
        items: [],
      },
      {
        title: "Konfigurasi Sistem",
        icon: <Settings className="h-5 w-5" />,
        url: "/configuration",
        adminOnly: true,
        items: [],
      },
      {
        title: "Profil Saya",
        icon: <User className="h-5 w-5" />,
        url: "/profile",
        items: [],
      },
    ],
  },
];
