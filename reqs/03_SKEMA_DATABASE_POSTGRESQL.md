# 🗄️ FASE 3: SKEMA BASIS DATA POSTGRESQL (DDL & MIGRATION)
## TRACKERKERJA MODERN (WORK TRACKER PRO)

> **Spesifikasi Skema Relasional 21+ Tabel, Konversi Tipe Data SQLite ke PostgreSQL, Indeks Komposit & Seeder Awal**  
> **Database Engine**: PostgreSQL 16+  
> **ORM Provider**: Npgsql.EntityFrameworkCore.PostgreSQL 8.0+  
> **Status**: Ready for Implementation  

---

## 1. Konversi Tipe Data dari SQLite ke PostgreSQL

| Entitas Data | SQLite (Lama) | PostgreSQL (Target) | Rasionalisasi Teknis |
| :--- | :--- | :--- | :--- |
| **Primary Key Angka** | `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL` atau `BIGSERIAL` | Standar urutan sequence PostgreSQL efisien |
| **User ID / GUID** | `TEXT` | `varchar(450)` atau `uuid` | Kompatibilitas dengan ASP.NET Core Identity |
| **Waktu / Tanggal** | `TEXT` (ISO string) | `timestamptz` | *Timestamp with time zone*, akurat multi-zona waktu |
| **Tanggal Saja** | `TEXT` (`yyyy-MM-dd`) | `date` | Tipe data kalender efisien 4-byte |
| **Boolean Flag** | `INTEGER` (0/1) | `boolean` (`true`/`false`) | Tipe boolean native SQL, lebih hemat memori |
| **Biaya & Anggaran** | `REAL` | `numeric(18,2)` | Menghilangkan *floating-point rounding error* pada kalkulasi burn rate |
| **Durasi Kerja** | `INTEGER` (Detik) | `bigint` atau `integer` | Kapasitas waktu detik tanpa batas overflow |
| **JSON Payload & Tools** | `TEXT` | `jsonb` | Mendukung kueri JSON native dan indeks GIN berkecepatan tinggi |

---

## 2. DDL Lengkap PostgreSQL (Skrip Eksekusi Database)

```sql
-- Inisialisasi Database (dieksekusi di database trackerkerja_db)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. TABEL COMPANIES (TENANT)
-- ==========================================
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(500),
    address VARCHAR(300),
    contact_email VARCHAR(150),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. TABEL ASPNETUSERS (IDENTITY & PROFIL)
-- ==========================================
CREATE TABLE IF NOT EXISTS asp_net_users (
    id VARCHAR(450) PRIMARY KEY,
    user_name VARCHAR(256),
    normalized_user_name VARCHAR(256),
    email VARCHAR(256),
    normalized_email VARCHAR(256),
    email_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    password_hash TEXT,
    security_stamp TEXT,
    concurrency_stamp TEXT,
    phone_number VARCHAR(50),
    phone_number_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    lockout_end TIMESTAMPTZ,
    lockout_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    access_failed_count INTEGER NOT NULL DEFAULT 0,
    -- Field Khusus TrackerKerja
    full_name VARCHAR(150) NOT NULL,
    job_title VARCHAR(100) NOT NULL DEFAULT 'Member',
    avatar_color VARCHAR(7) NOT NULL DEFAULT '#6366F1',
    profile_picture_url VARCHAR(300),
    cover_picture_url VARCHAR(300),
    company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    approved_at TIMESTAMPTZ,
    approved_by_user_id VARCHAR(450),
    rejection_reason VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. TABEL ASPNETROLES & USER_ROLES
-- ==========================================
CREATE TABLE IF NOT EXISTS asp_net_roles (
    id VARCHAR(450) PRIMARY KEY,
    name VARCHAR(256),
    normalized_name VARCHAR(256),
    concurrency_stamp TEXT
);

CREATE TABLE IF NOT EXISTS asp_net_user_roles (
    user_id VARCHAR(450) NOT NULL REFERENCES asp_net_users(id) ON DELETE CASCADE,
    role_id VARCHAR(450) NOT NULL REFERENCES asp_net_roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- Tabel Refresh Token JWT
CREATE TABLE IF NOT EXISTS user_refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(450) NOT NULL REFERENCES asp_net_users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    jwt_id VARCHAR(255) NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL
);

-- ==========================================
-- 4. TABEL MASTER DATA & REFERENSI
-- ==========================================
CREATE TABLE IF NOT EXISTS master_priorities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#6366F1',
    icon VARCHAR(50) NOT NULL DEFAULT 'flag',
    order_index INTEGER NOT NULL DEFAULT 0,
    description VARCHAR(200),
    is_default BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS master_statuses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#6366F1',
    is_done_state BOOLEAN NOT NULL DEFAULT FALSE,
    order_index INTEGER NOT NULL DEFAULT 0,
    description VARCHAR(200),
    is_default BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS master_milestones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    phase VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#6366F1',
    icon VARCHAR(50) NOT NULL DEFAULT 'milestone',
    order_index INTEGER NOT NULL DEFAULT 0,
    description VARCHAR(200),
    is_default BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#6366F1',
    description VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description VARCHAR(250),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_templates (
    id SERIAL PRIMARY KEY,
    event_code VARCHAR(100) UNIQUE NOT NULL,
    event_name VARCHAR(200) NOT NULL,
    category VARCHAR(50),
    subject VARCHAR(300) NOT NULL,
    body_html TEXT NOT NULL,
    available_variables VARCHAR(1000),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 5. TABEL PROJECTS (PROYEK & FINANSIAL)
-- ==========================================
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    color VARCHAR(7) NOT NULL DEFAULT '#6366F1',
    status INTEGER NOT NULL DEFAULT 0, -- 0=Active, 1=Completed, 2=Archived
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    client_name VARCHAR(150),
    project_manager_id VARCHAR(450) REFERENCES asp_net_users(id) ON DELETE SET NULL,
    budget NUMERIC(18,2) NOT NULL DEFAULT 0.00,
    actual_cost NUMERIC(18,2) NOT NULL DEFAULT 0.00,
    tags VARCHAR(200),
    deadline TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 6. TABEL TASKS (MANAJEMEN TUGAS KERJA)
-- ==========================================
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    priority INTEGER NOT NULL DEFAULT 1, -- 0=Low, 1=Medium, 2=High, 3=Critical
    status INTEGER NOT NULL DEFAULT 0,   -- 0=Todo, 1=InProgress, 2=Done, 3=Overdue
    progress INTEGER NOT NULL DEFAULT 0, -- 0 sampai 100
    milestone VARCHAR(100),
    obstacle TEXT,
    solution TEXT,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    assigned_to_user_id VARCHAR(450) REFERENCES asp_net_users(id) ON DELETE SET NULL,
    parent_task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    start_date TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 7. TABEL SESSIONS (TIMESHEET & MULTI-TIMER)
-- ==========================================
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id VARCHAR(450) NOT NULL REFERENCES asp_net_users(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ, -- NULL menandakan timer sedang aktif berjalan
    duration BIGINT NOT NULL DEFAULT 0, -- Durasi dalam detik
    notes VARCHAR(1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 8. TABEL ATTENDANCES (PRESENSI KERJA)
-- ==========================================
CREATE TABLE IF NOT EXISTS attendances (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(450) NOT NULL REFERENCES asp_net_users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    type INTEGER NOT NULL DEFAULT 1, -- 1=Present, 2=Leave, 3=Sick, 4=Permission, 5=BusinessTrip, 6=Holiday
    work_location INTEGER NOT NULL DEFAULT 1, -- 1=WFO, 2=WFH, 3=Dinas, 4=Remote
    clock_in TIMESTAMPTZ,
    clock_out TIMESTAMPTZ,
    total_hours DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    leave_reason VARCHAR(200),
    notes VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_attendance_user_date UNIQUE (user_id, date)
);

-- ==========================================
-- 9. TABEL NOTES & NOTE ATTACHMENTS
-- ==========================================
CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content_html TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'General',
    color VARCHAR(7) NOT NULL DEFAULT '#6366F1',
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    author_user_id VARCHAR(450) REFERENCES asp_net_users(id) ON DELETE SET NULL,
    task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS note_attachments (
    id SERIAL PRIMARY KEY,
    note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    content_type VARCHAR(100),
    file_extension VARCHAR(20),
    uploaded_by_user_id VARCHAR(450) REFERENCES asp_net_users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 10. TABEL GAMIFIKASI, BADGES & REWARDS
-- ==========================================
CREATE TABLE IF NOT EXISTS master_badges (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    category VARCHAR(50),
    icon VARCHAR(100) NOT NULL,
    color VARCHAR(50) NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    rarity INTEGER NOT NULL DEFAULT 1, -- 1=Common, 2=Rare, 3=Epic, 4=Legendary
    trigger_type INTEGER NOT NULL DEFAULT 0,
    trigger_threshold INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_badges (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(450) NOT NULL REFERENCES asp_net_users(id) ON DELETE CASCADE,
    badge_id INTEGER NOT NULL REFERENCES master_badges(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    awarded_by VARCHAR(450),
    CONSTRAINT uq_user_badge UNIQUE (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS daily_check_ins (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(450) NOT NULL REFERENCES asp_net_users(id) ON DELETE CASCADE,
    check_in_date DATE NOT NULL,
    check_in_time TIMESTAMPTZ NOT NULL,
    points_earned INTEGER NOT NULL DEFAULT 10,
    streak_day INTEGER NOT NULL DEFAULT 1,
    is_monthly_milestone BOOLEAN NOT NULL DEFAULT FALSE,
    notes VARCHAR(255),
    CONSTRAINT uq_daily_checkin UNIQUE (user_id, check_in_date)
);

CREATE TABLE IF NOT EXISTS reward_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description VARCHAR(500),
    point_cost INTEGER NOT NULL,
    stock INTEGER NOT NULL DEFAULT 10,
    category VARCHAR(50) NOT NULL DEFAULT 'Voucher',
    icon VARCHAR(100) NOT NULL DEFAULT 'gift',
    color VARCHAR(50) NOT NULL DEFAULT 'indigo',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_monthly_milestone_reward BOOLEAN NOT NULL DEFAULT FALSE,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reward_claims (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(450) NOT NULL REFERENCES asp_net_users(id) ON DELETE CASCADE,
    reward_item_id INTEGER NOT NULL REFERENCES reward_items(id) ON DELETE CASCADE,
    points_spent INTEGER NOT NULL,
    point_value_snapshot NUMERIC(18,2) NOT NULL DEFAULT 100.00,
    rupiah_equivalent NUMERIC(18,2) NOT NULL,
    status INTEGER NOT NULL DEFAULT 0, -- 0=Pending, 1=Approved, 2=Rejected
    user_notes VARCHAR(500),
    admin_notes VARCHAR(500),
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMPTZ,
    processed_by_user_id VARCHAR(450) REFERENCES asp_net_users(id) ON DELETE SET NULL
);

-- ==========================================
-- 11. TABEL PENGUMUMAN (ANNOUNCEMENTS)
-- ==========================================
CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'Pengumuman Umum', -- 'Informasi Penting' / 'Pengumuman Umum'
    start_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE, -- NULL = Global untuk semua
    created_by_user_id VARCHAR(450) REFERENCES asp_net_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_announcement_reads (
    id SERIAL PRIMARY KEY,
    announcement_id INTEGER NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id VARCHAR(450) NOT NULL REFERENCES asp_net_users(id) ON DELETE CASCADE,
    dont_show_again BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_announcement_read UNIQUE (announcement_id, user_id)
);

-- ==========================================
-- 12. TABEL LOGGING, AUDIT & TOOLS
-- ==========================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(450),
    user_email VARCHAR(256),
    user_name VARCHAR(150),
    controller_name VARCHAR(100),
    action_name VARCHAR(100),
    http_method VARCHAR(10),
    path VARCHAR(500),
    query_string VARCHAR(1000),
    ip_address VARCHAR(50),
    status_code INTEGER,
    duration_ms INTEGER,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    details JSONB
);

CREATE TABLE IF NOT EXISTS json_histories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    content JSONB NOT NULL,
    task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sql_histories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    content TEXT NOT NULL,
    dialect VARCHAR(50) DEFAULT 'PostgreSQL',
    task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 13. INDEKS KOMPOSIT UNTUK PERFORMA QUERY
-- ==========================================
CREATE INDEX IF NOT EXISTS ix_tasks_company_status ON tasks(company_id, status);
CREATE INDEX IF NOT EXISTS ix_tasks_assigned_due ON tasks(assigned_to_user_id, due_date);
CREATE INDEX IF NOT EXISTS ix_sessions_user_endtime ON sessions(user_id, end_time);
CREATE INDEX IF NOT EXISTS ix_sessions_task_id ON sessions(task_id);
CREATE INDEX IF NOT EXISTS ix_attendances_date_type ON attendances(date, type);
CREATE INDEX IF NOT EXISTS ix_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS ix_audit_logs_details_gin ON audit_logs USING GIN(details);
```

---

## 3. Skrip Data Seeder Awal (Initial Seed Data)

Skrip ini otomatis dijalankan saat inisialisasi basis data untuk menyediakan master status, prioritas, peran, dan user Administrator bawaan:

```sql
-- Peran Sistem (Roles)
INSERT INTO asp_net_roles (id, name, normalized_name, concurrency_stamp) VALUES
('r-admin', 'Administrator', 'ADMINISTRATOR', gen_random_uuid()::text),
('r-analyst', 'System Analyst', 'SYSTEM ANALYST', gen_random_uuid()::text),
('r-writer', 'Technical Writer', 'TECHNICAL WRITER', gen_random_uuid()::text),
('r-member', 'Member', 'MEMBER', gen_random_uuid()::text)
ON CONFLICT (id) DO NOTHING;

-- Perusahaan Default (HQ Tenant)
INSERT INTO companies (id, name, code, description, address, contact_email) VALUES
(1, 'Wahana Central Holding', 'WCH', 'Headquarter Enterprise Organization', 'Jakarta, Indonesia', 'admin@trackerkerja.local')
ON CONFLICT (id) DO NOTHING;

-- Master Prioritas
INSERT INTO master_priorities (id, name, color, icon, order_index, description, is_default) VALUES
(1, 'Low', '#10B981', 'arrow-down', 1, 'Prioritas rendah', false),
(2, 'Medium', '#F59E0B', 'minus', 2, 'Prioritas normal / sedang', true),
(3, 'High', '#EF4444', 'arrow-up', 3, 'Prioritas tinggi mendesak', false),
(4, 'Critical', '#881337', 'alert-circle', 4, 'Kendala kritis pemblokir operasional', false)
ON CONFLICT (id) DO NOTHING;

-- Master Status Tugas
INSERT INTO master_statuses (id, name, color, is_done_state, order_index, description, is_default) VALUES
(1, 'Todo', '#6B7280', false, 1, 'Belum dikerjakan', true),
(2, 'InProgress', '#3B82F6', false, 2, 'Sedang dalam pengerjaan', false),
(3, 'Done', '#10B981', true, 3, 'Pekerjaan telah selesai', false),
(4, 'Overdue', '#EF4444', false, 4, 'Melewati batas waktu', false)
ON CONFLICT (id) DO NOTHING;

-- Master Milestones (SDLC Waterfall & Agile)
INSERT INTO master_milestones (id, name, phase, color, icon, order_index, description, is_default) VALUES
(1, 'Requirement & Analysis', 'Planning', '#6366F1', 'file-text', 1, 'Fase analisis kebutuhan', true),
(2, 'Design & Architecture', 'Design', '#8B5CF6', 'layout', 2, 'Fase perancangan UI/UX & DB', false),
(3, 'Implementation & Coding', 'Development', '#3B82F6', 'code', 3, 'Fase implementasi kode', false),
(4, 'Testing & QA Matrix', 'Testing', '#EC4899', 'check-square', 4, 'Fase pengujian mutu software', false),
(5, 'Deployment & Go-Live', 'Release', '#10B981', 'rocket', 5, 'Fase rilis produksi', false)
ON CONFLICT (id) DO NOTHING;
```
