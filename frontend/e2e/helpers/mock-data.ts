export const mockAdminUser = {
  id: "user-admin-1",
  fullName: "Admin Modern",
  email: "admin@trackerkerja.local",
  role: "Admin",
  companyId: "comp-1",
  companyName: "PT Modern Solusi Teknologi",
  position: "Engineering Director",
  avatarUrl: null,
};

export const mockMemberUser = {
  id: "user-member-1",
  fullName: "Budi Santoso",
  email: "budi@trackerkerja.local",
  role: "Member",
  companyId: "comp-1",
  companyName: "PT Modern Solusi Teknologi",
  position: "Senior Fullstack Developer",
  avatarUrl: null,
};

export const mockCompany = {
  id: "comp-1",
  name: "PT Modern Solusi Teknologi",
  corporateCode: "MODERN2026",
  tier: "Enterprise",
  memberCount: 12,
  createdAt: "2026-01-01T00:00:00Z",
};

export const mockProjects = [
  {
    id: "proj-1",
    name: "Migrasi Core Banking Cloud",
    description: "Modernisasi arsitektur monolith ke microservices k8s",
    status: "In Progress",
    budget: 150000000,
    actualCost: 112000000,
    color: "#6366f1",
    taskCount: 8,
    completedTaskCount: 5,
    dueDate: "2026-12-31T00:00:00Z",
  },
  {
    id: "proj-2",
    name: "Sistem Presensi Geofencing AI",
    description: "Pengenalan wajah dan validasi radius GPS kantor",
    status: "Planning",
    budget: 80000000,
    actualCost: 24000000,
    color: "#10b981",
    taskCount: 4,
    completedTaskCount: 1,
    dueDate: "2026-11-15T00:00:00Z",
  },
];

export const mockTasks = [
  {
    id: "task-101",
    title: "Implementasi JWT Dual Auth & Session Inactivity",
    description: "Menerapkan interceptor silent refresh token dan auto logout",
    status: "In Progress",
    priority: "High",
    projectId: "proj-1",
    projectName: "Migrasi Core Banking Cloud",
    assignedToUserId: "user-admin-1",
    assignedToUserName: "Admin Modern",
    assignedToUserEmail: "admin@trackerkerja.local",
    progress: 75,
    dueDate: "2026-10-25T00:00:00Z",
    hasObstacle: false,
    subTaskCount: 3,
    completedSubTaskCount: 2,
  },
  {
    id: "task-102",
    title: "Optimasi ClosedXML ARMS 21-Kolom & Standar 9-Kolom",
    description: "Ekspor dan impor massal tugas ribuan baris tanpa memory leak",
    status: "Completed",
    priority: "Medium",
    projectId: "proj-1",
    projectName: "Migrasi Core Banking Cloud",
    assignedToUserId: "user-member-1",
    assignedToUserName: "Budi Santoso",
    assignedToUserEmail: "budi@trackerkerja.local",
    progress: 100,
    dueDate: "2026-10-20T00:00:00Z",
    hasObstacle: false,
    subTaskCount: 2,
    completedSubTaskCount: 2,
  },
  {
    id: "task-103",
    title: "Setup Multi-Instance Host Induk Data Sync",
    description: "Sinkronisasi offline via SQL dump dan online via REST API Secret",
    status: "To Do",
    priority: "High",
    projectId: "proj-2",
    projectName: "Sistem Presensi Geofencing AI",
    assignedToUserId: "user-member-1",
    assignedToUserName: "Budi Santoso",
    assignedToUserEmail: "budi@trackerkerja.local",
    progress: 0,
    dueDate: "2026-11-01T00:00:00Z",
    hasObstacle: true,
    subTaskCount: 1,
    completedSubTaskCount: 0,
  },
];

export const mockTimesheets = [
  {
    id: "ts-1",
    taskId: "task-101",
    taskTitle: "Implementasi JWT Dual Auth & Session Inactivity",
    projectId: "proj-1",
    projectName: "Migrasi Core Banking Cloud",
    userId: "user-admin-1",
    userName: "Admin Modern",
    startTime: "2026-10-19T08:00:00Z",
    endTime: "2026-10-19T10:30:00Z",
    durationMinutes: 150,
    notes: "Pengujian unit refresh token",
    isRunning: false,
  },
];

export const mockActiveTimer = {
  id: "timer-live-1",
  taskId: "task-101",
  taskTitle: "Implementasi JWT Dual Auth & Session Inactivity",
  startTime: new Date(Date.now() - 3600000).toISOString(),
  isRunning: true,
};

export const mockAttendances = {
  today: {
    id: "att-today",
    date: new Date().toISOString().split("T")[0],
    clockIn: "08:05:00",
    clockOut: null,
    workMode: "WFO",
    status: "Hadir Tepat Waktu",
    notes: "Bekerja dari kantor pusat",
  },
  monthlyReconciliation: [
    {
      userId: "user-admin-1",
      userName: "Admin Modern",
      userEmail: "admin@trackerkerja.local",
      presentDays: 19,
      lateDays: 1,
      absentDays: 0,
      totalHours: 160.5,
      records: [],
    },
    {
      userId: "user-member-1",
      userName: "Budi Santoso",
      userEmail: "budi@trackerkerja.local",
      presentDays: 20,
      lateDays: 0,
      absentDays: 0,
      totalHours: 168.0,
      records: [],
    },
  ],
};

export const mockNotes = [
  {
    id: "note-1",
    title: "Arsitektur Multi-Tenancy & Corporate Code",
    content: "<p>Setiap registrasi wajib menyertakan kode perusahaan yang valid.</p>",
    category: "Architecture",
    color: "#6366f1",
    isPinned: true,
    createdAt: "2026-10-15T09:00:00Z",
    attachments: [
      { id: "att-1", fileName: "schema_erd.pdf", fileSize: 1048576, fileType: "application/pdf" },
    ],
  },
];

export const mockGamification = {
  totalCurrentPoints: 1250,
  points: 1250,
  currentStreakDays: 18,
  streakDays: 18,
  monthlyCheckInPoints: 250,
  badgePoints: 100,
  hasCheckedInToday: false,
  rankTitle: "Lead Code Ninja",
  level: 4,
  monthlyResetDate: "2026-11-01T00:00:00Z",
  badges: [
    {
      id: "badge-1",
      code: "STREAK_15",
      name: "Konsistensi Baja",
      description: "Menjaga streak absensi 15 hari berturut-turut",
      icon: "zap",
      isUnlocked: true,
      unlockedAt: "2026-10-15T08:00:00Z",
    },
    {
      id: "badge-2",
      code: "STREAK_30",
      name: "Sultan Presensi 30 Hari",
      description: "Menembus 30 hari aktif tanpa putus streak",
      icon: "crown",
      isUnlocked: false,
      unlockedAt: null,
    },
  ],
  rewards: [
    {
      id: "rew-1",
      title: "Voucher Kopi Spesial 50K",
      costPoints: 300,
      stock: 10,
      isAvailable: true,
    },
  ],
};

export const mockSqlDialects = [
  { code: "postgresql", name: "PostgreSQL", family: "Postgres", description: "Standard Postgres syntax", iconBadge: "PG" },
  { code: "mysql", name: "MySQL", family: "MySQL", description: "Standard MySQL syntax", iconBadge: "MY" },
  { code: "sqlserver", name: "SQL Server (T-SQL)", family: "Transact-SQL", description: "Microsoft SQL Server", iconBadge: "MS" },
];

export const mockMasterPriorities = [
  { id: 1, name: "Tinggi (High)", color: "#ef4444", icon: "flag", orderIndex: 1, description: "Prioritas utama operasional", isDefault: true },
  { id: 2, name: "Sedang (Medium)", color: "#f59e0b", icon: "flag", orderIndex: 2, description: "Prioritas menengah", isDefault: false },
];

export const mockMasterStatuses = [
  { id: 1, name: "To Do", color: "#64748b", isDoneState: false, orderIndex: 1, description: "Tugas belum dikerjakan", isDefault: true },
  { id: 2, name: "In Progress", color: "#6366f1", isDoneState: false, orderIndex: 2, description: "Sedang berlangsung", isDefault: false },
  { id: 3, name: "Done", color: "#10b981", isDoneState: true, orderIndex: 3, description: "Selesai", isDefault: false },
];

export const mockMasterMilestones = [
  { id: 1, name: "Sprint 1 - Foundation", phase: "Implementation", color: "#10b981", icon: "milestone", orderIndex: 1, description: "Pondasi arsitektur", isDefault: true },
];

export const mockMasterCategories = [
  { id: 1, name: "Bug Fix", color: "#ef4444", description: "Perbaikan bug kritis" },
  { id: 2, name: "Feature", color: "#3b82f6", description: "Fitur baru" },
];

export const mockAuditLogs = {
  items: [
    {
      id: 901,
      userId: "user-admin-1",
      userName: "Admin Modern",
      userEmail: "admin@trackerkerja.local",
      controllerName: "Tasks",
      actionName: "UpdateTask",
      httpMethod: "PUT",
      path: "/api/tasks/task-101",
      statusCode: 200,
      durationMs: 45,
      timestamp: new Date().toISOString(),
      details: JSON.stringify({ title: "Implementasi JWT Dual Auth", status: "In Progress" }),
    },
    {
      id: 900,
      userId: "user-member-1",
      userName: "Budi Santoso",
      userEmail: "budi@trackerkerja.local",
      controllerName: "Attendance",
      actionName: "ClockIn",
      httpMethod: "POST",
      path: "/api/attendance/clock-in",
      statusCode: 200,
      durationMs: 32,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      details: JSON.stringify({ workMode: "WFO" }),
    },
  ],
  totalCount: 2,
  page: 1,
  pageSize: 20,
  summary: {
    totalLogs: 148,
    todayCount: 14,
    successCount: 142,
    errorCount: 6,
    methodBreakdown: { POST: 65, PUT: 42, DELETE: 8, PATCH: 33 },
  },
};

export const mockAnnouncements = [
  {
    id: "ann-1",
    title: "Maintenance Server Rutin PostgreSQL",
    content: "Peningkatan kapasitas memori server database malam ini pukul 23:00 WIB.",
    type: "Informasi Penting",
    startDate: "2026-10-18T00:00:00Z",
    endDate: "2026-10-25T00:00:00Z",
    isActive: true,
  },
];
