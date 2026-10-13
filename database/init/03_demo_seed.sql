-- ============================================================================
-- TRACKERKERJA MODERN (WORK TRACKER PRO)
-- COMPREHENSIVE REALISTIC DEMO SEED DATA
-- File: 03_demo_seed.sql
-- ============================================================================

-- 1. PERUSAHAAN (TENANT)
-- Company 1 (WCH) sudah ada dari 02_init_seed.sql
-- Tambah Company 2 untuk testing isolasi multi-tenant
INSERT INTO companies (id, name, code, description, address, contact_email, created_at)
VALUES (
    2,
    'PT Nusantara Solusi Digital',
    'NSD',
    'Mitra Konsultan Teknologi & Cloud Integration',
    'Bandung, Jawa Barat, Indonesia',
    'halo@nusantara-digital.id',
    CURRENT_TIMESTAMP - INTERVAL '60 days'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    code = EXCLUDED.code,
    description = EXCLUDED.description;

-- 2. PENGGUNA TIM (USERS)
-- Password hash untuk 'AdminSecurePassword2026!': 9asNwa7EPG/7Z7WdQwf7CQ==:o/lGJLm0Ep0m8GGwKCfHY5B2U2KViQ8//CaORVVUt6s=
INSERT INTO asp_net_users (
    id, user_name, normalized_user_name, email, normalized_email, email_confirmed,
    password_hash, security_stamp, concurrency_stamp, phone_number,
    full_name, job_title, avatar_color, company_id, is_approved, approved_at, created_at
) VALUES 
(
    'usr-budi',
    'budi.santoso@trackerkerja.local',
    'BUDI.SANTOSO@TRACKERKERJA.LOCAL',
    'budi.santoso@trackerkerja.local',
    'BUDI.SANTOSO@TRACKERKERJA.LOCAL',
    true,
    '9asNwa7EPG/7Z7WdQwf7CQ==:o/lGJLm0Ep0m8GGwKCfHY5B2U2KViQ8//CaORVVUt6s=',
    gen_random_uuid()::text,
    gen_random_uuid()::text,
    '081298765431',
    'Budi Santoso',
    'Lead Full-Stack Developer',
    '#3B82F6',
    1,
    true,
    CURRENT_TIMESTAMP - INTERVAL '45 days',
    CURRENT_TIMESTAMP - INTERVAL '45 days'
),
(
    'usr-siti',
    'siti.rahma@trackerkerja.local',
    'SITI.RAHMA@TRACKERKERJA.LOCAL',
    'siti.rahma@trackerkerja.local',
    'SITI.RAHMA@TRACKERKERJA.LOCAL',
    true,
    '9asNwa7EPG/7Z7WdQwf7CQ==:o/lGJLm0Ep0m8GGwKCfHY5B2U2KViQ8//CaORVVUt6s=',
    gen_random_uuid()::text,
    gen_random_uuid()::text,
    '081298765432',
    'Siti Rahmawati',
    'Senior UI/UX Product Designer',
    '#EC4899',
    1,
    true,
    CURRENT_TIMESTAMP - INTERVAL '40 days',
    CURRENT_TIMESTAMP - INTERVAL '40 days'
),
(
    'usr-reza',
    'reza.pratama@trackerkerja.local',
    'REZA.PRATAMA@TRACKERKERJA.LOCAL',
    'reza.pratama@trackerkerja.local',
    'REZA.PRATAMA@TRACKERKERJA.LOCAL',
    true,
    '9asNwa7EPG/7Z7WdQwf7CQ==:o/lGJLm0Ep0m8GGwKCfHY5B2U2KViQ8//CaORVVUt6s=',
    gen_random_uuid()::text,
    gen_random_uuid()::text,
    '081298765433',
    'Reza Pratama',
    'QA Automation & Performance Engineer',
    '#10B981',
    1,
    true,
    CURRENT_TIMESTAMP - INTERVAL '30 days',
    CURRENT_TIMESTAMP - INTERVAL '30 days'
),
(
    'usr-dian',
    'dian.kusuma@trackerkerja.local',
    'DIAN.KUSUMA@TRACKERKERJA.LOCAL',
    'dian.kusuma@trackerkerja.local',
    'DIAN.KUSUMA@TRACKERKERJA.LOCAL',
    true,
    '9asNwa7EPG/7Z7WdQwf7CQ==:o/lGJLm0Ep0m8GGwKCfHY5B2U2KViQ8//CaORVVUt6s=',
    gen_random_uuid()::text,
    gen_random_uuid()::text,
    '081298765434',
    'Dian Kusuma',
    'Technical Writer & Analyst',
    '#8B5CF6',
    1,
    true,
    CURRENT_TIMESTAMP - INTERVAL '25 days',
    CURRENT_TIMESTAMP - INTERVAL '25 days'
),
(
    'usr-pending',
    'calon.member@trackerkerja.local',
    'CALON.MEMBER@TRACKERKERJA.LOCAL',
    'calon.member@trackerkerja.local',
    'CALON.MEMBER@TRACKERKERJA.LOCAL',
    true,
    '9asNwa7EPG/7Z7WdQwf7CQ==:o/lGJLm0Ep0m8GGwKCfHY5B2U2KViQ8//CaORVVUt6s=',
    gen_random_uuid()::text,
    gen_random_uuid()::text,
    '081298765435',
    'Ahmad Wahyudi (Pending Approval)',
    'Junior Data Analyst',
    '#F59E0B',
    1,
    false, -- Menunggu approval admin
    null,
    CURRENT_TIMESTAMP - INTERVAL '1 days'
),
(
    'usr-eksternal',
    'dev@nusantara.local',
    'DEV@NUSANTARA.LOCAL',
    'dev@nusantara.local',
    'DEV@NUSANTARA.LOCAL',
    true,
    '9asNwa7EPG/7Z7WdQwf7CQ==:o/lGJLm0Ep0m8GGwKCfHY5B2U2KViQ8//CaORVVUt6s=',
    gen_random_uuid()::text,
    gen_random_uuid()::text,
    '081398765499',
    'Doni Prakoso',
    'External Cloud Engineer',
    '#06B6D4',
    2, -- Perusahaan NSD
    true,
    CURRENT_TIMESTAMP - INTERVAL '10 days',
    CURRENT_TIMESTAMP - INTERVAL '10 days'
)
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    job_title = EXCLUDED.job_title,
    password_hash = EXCLUDED.password_hash,
    is_approved = EXCLUDED.is_approved;

-- Assign Roles
INSERT INTO asp_net_user_roles (user_id, role_id) VALUES
('usr-budi', 'r-analyst'),
('usr-siti', 'r-member'),
('usr-reza', 'r-member'),
('usr-dian', 'r-writer'),
('usr-pending', 'r-member'),
('usr-eksternal', 'r-member')
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 3. PROYEK ENTERPRISE (4 PROYEK DENGAN STATISTIK BURN RATE BERBEDA)
INSERT INTO projects (id, name, description, color, status, company_id, client_name, project_manager_id, budget, actual_cost, tags, deadline, created_at)
VALUES
(
    1,
    'Core Banking Revamp 2026',
    'Modernisasi arsitektur perbankan inti ke microservices, pemisahan ledger, dan transaksi berkecepatan tinggi.',
    '#4F46E5',
    0, -- Active
    1, -- WCH
    'Bank Mandiri Syariah Finansial',
    'usr-superadmin',
    150000000.00,
    95000000.00, -- Burn rate 63.3% (Aman)
    'banking,finance,microservices',
    CURRENT_TIMESTAMP + INTERVAL '60 days',
    CURRENT_TIMESTAMP - INTERVAL '30 days'
),
(
    2,
    'Mobile HRIS & ESS Portal',
    'Pengembangan portal mandiri karyawan berbasis Next.js PWA untuk pengajuan cuti, presensi GPS, dan slip gaji digital.',
    '#F59E0B',
    0, -- Active
    1, -- WCH
    'Internal Holding Group',
    'usr-budi',
    80000000.00,
    72000000.00, -- Burn rate 90.0% (Warning)
    'hris,portal,mobile',
    CURRENT_TIMESTAMP + INTERVAL '25 days',
    CURRENT_TIMESTAMP - INTERVAL '20 days'
),
(
    3,
    'Supply Chain IoT Tracker',
    'Platform pemantau armada logistik dan sensor temperatur kontainer secara real-time dengan telemetri MQTT.',
    '#EF4444',
    0, -- Active
    1, -- WCH
    'Wahana Logistik Mandiri',
    'usr-superadmin',
    50000000.00,
    58000000.00, -- Burn rate 116.0% (Overbudget)
    'iot,fleet,telemetry',
    CURRENT_TIMESTAMP + INTERVAL '10 days',
    CURRENT_TIMESTAMP - INTERVAL '35 days'
),
(
    4,
    'AI Document Intelligence',
    'Ekstraksi otomatis dokumen invoice, formulir pajak, dan kontrak legal menggunakan LLM dan OCR pipeline.',
    '#10B981',
    0, -- Active
    1, -- WCH
    'FinTech Nusantara Partners',
    'usr-budi',
    120000000.00,
    30000000.00, -- Burn rate 25.0% (Aman)
    'ai,llm,ocr,automation',
    CURRENT_TIMESTAMP + INTERVAL '90 days',
    CURRENT_TIMESTAMP - INTERVAL '15 days'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    budget = EXCLUDED.budget,
    actual_cost = EXCLUDED.actual_cost,
    color = EXCLUDED.color;

-- Sinkronkan sequence projects
SELECT setval('projects_id_seq', (SELECT MAX(id) FROM projects));

-- 4. TUGAS KANBAN & SUB-TUGAS (12+ TUGAS LINTAS KOLOM)
INSERT INTO tasks (
    id, title, description, priority, status, progress, milestone, obstacle, solution,
    project_id, category_id, assigned_to_user_id, parent_task_id, company_id,
    start_date, due_date, created_at, updated_at
) VALUES
-- Kolom Todo (status=0)
(
    101,
    'Setup Helm Charts & Kubernetes Ingress di GCP',
    'Konfigurasi manifest k8s deployment, horizontal pod autoscaler, dan TLS ingress cert-manager.',
    2, -- High
    0, -- Todo
    0,
    'Deployment & Go-Live',
    null,
    null,
    1, -- Core Banking
    3, -- DevOps
    'usr-budi',
    null,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '7 days',
    CURRENT_TIMESTAMP - INTERVAL '3 days',
    CURRENT_TIMESTAMP
),
(
    102,
    'Implementasi Face Recognition Biometrik Presensi',
    'Integrasi library AI deteksi wajah liveness check anti spoofing pada modul presensi kamera smartphone.',
    1, -- Medium
    0, -- Todo
    10,
    'Implementation & Coding',
    null,
    null,
    2, -- HRIS
    2, -- Frontend
    'usr-siti',
    null,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '14 days',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP
),
(
    103,
    'Redesign Halaman Profil Pengguna & Multi-Theme Settings',
    'Pembaruan tata letak kartu profil, cover upload dropzone, dan tema dark/light TailGrids modern.',
    0, -- Low
    0, -- Todo
    0,
    'Design & Architecture',
    null,
    null,
    2, -- HRIS
    2, -- Frontend
    'usr-siti',
    null,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '10 days',
    CURRENT_TIMESTAMP - INTERVAL '1 days',
    CURRENT_TIMESTAMP
),

-- Kolom InProgress (status=1)
(
    104,
    'Integrasi Payment Gateway Virtual Account & QRIS',
    'Implementasi webhook notifikasi pembayaran otomatis dari Midtrans / Xendit dengan idempotency key.',
    3, -- Critical
    1, -- InProgress
    65,
    'Implementation & Coding',
    'Dokumentasi API sandbox payment gateway lambat merespon saat simulasi callback refund timeout.',
    'Menambahkan exponential backoff retry middleware dan manual reconciliation trigger di admin panel.',
    1, -- Core Banking
    1, -- Backend
    'usr-superadmin',
    null,
    1,
    CURRENT_TIMESTAMP - INTERVAL '5 days',
    CURRENT_TIMESTAMP + INTERVAL '3 days',
    CURRENT_TIMESTAMP - INTERVAL '5 days',
    CURRENT_TIMESTAMP
),
(
    105,
    'Optimasi Query PostgreSQL Full-Text Search & Indexing GIN',
    'Pembuatan tsvector indeks dan partisi tabel log audit untuk query jutaan baris data sub-detik.',
    2, -- High
    1, -- InProgress
    40,
    'Implementation & Coding',
    null,
    null,
    1, -- Core Banking
    1, -- Backend
    'usr-budi',
    null,
    1,
    CURRENT_TIMESTAMP - INTERVAL '3 days',
    CURRENT_TIMESTAMP + INTERVAL '4 days',
    CURRENT_TIMESTAMP - INTERVAL '3 days',
    CURRENT_TIMESTAMP
),
(
    106,
    'Generator Laporan PDF Slip Gaji Karyawan via Chromium Headless',
    'Penyusunan template HTML Tailwind CSS untuk ekspor slip gaji terenkripsi password NIK karyawan.',
    1, -- Medium
    1, -- InProgress
    50,
    'Implementation & Coding',
    null,
    null,
    2, -- HRIS
    1, -- Backend
    'usr-dian',
    null,
    1,
    CURRENT_TIMESTAMP - INTERVAL '4 days',
    CURRENT_TIMESTAMP + INTERVAL '5 days',
    CURRENT_TIMESTAMP - INTERVAL '4 days',
    CURRENT_TIMESTAMP
),
(
    107,
    'Pipeline Telemetri IoT GPS Realtime via WebSockets',
    'Ingestion 5.000 events/detik dari perangkat GPS tracker kontainer logistik dengan buffer Redis queue.',
    2, -- High
    1, -- InProgress
    75,
    'Implementation & Coding',
    'Koneksi socket sempat drop ketika perangkat GPS melintasi area pegunungan minim sinyal BTS.',
    'Implementasi offline SQLite caching pada firmware perangkat sebelum bulk sinkronisasi ulang.',
    3, -- Supply Chain
    3, -- DevOps
    'usr-superadmin',
    null,
    1,
    CURRENT_TIMESTAMP - INTERVAL '8 days',
    CURRENT_TIMESTAMP + INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '8 days',
    CURRENT_TIMESTAMP
),

-- Kolom Done (status=2)
(
    108,
    'Inisialisasi Solusi Clean Architecture .NET 8 & PostgreSQL 16',
    'Scaffolding 4 layer proyek Domain, Application, Infrastructure, WebApi dan konfigurasi EF Core.',
    3, -- Critical
    2, -- Done
    100,
    'Requirement & Analysis',
    null,
    null,
    1, -- Core Banking
    1, -- Backend
    'usr-superadmin',
    null,
    1,
    CURRENT_TIMESTAMP - INTERVAL '20 days',
    CURRENT_TIMESTAMP - INTERVAL '15 days',
    CURRENT_TIMESTAMP - INTERVAL '20 days',
    CURRENT_TIMESTAMP - INTERVAL '15 days'
),
(
    109,
    'Perancangan Design System TailGrids & Modern Color Tokens',
    'Konfigurasi tema Tailwind CSS v4, font Inter Google Fonts, glassmorphism card, dan dialog modals.',
    1, -- Medium
    2, -- Done
    100,
    'Design & Architecture',
    null,
    null,
    2, -- HRIS
    2, -- Frontend
    'usr-siti',
    null,
    1,
    CURRENT_TIMESTAMP - INTERVAL '18 days',
    CURRENT_TIMESTAMP - INTERVAL '12 days',
    CURRENT_TIMESTAMP - INTERVAL '18 days',
    CURRENT_TIMESTAMP - INTERVAL '12 days'
),
(
    110,
    'Pembuatan Widget Floating Active Multi-Timer Bar',
    'Komponen timer mengambang di bawah layar dengan second ticker akurat dan modal multi-sesi serentak.',
    2, -- High
    2, -- Done
    100,
    'Implementation & Coding',
    null,
    null,
    1, -- Core Banking
    2, -- Frontend
    'usr-budi',
    null,
    1,
    CURRENT_TIMESTAMP - INTERVAL '10 days',
    CURRENT_TIMESTAMP - INTERVAL '5 days',
    CURRENT_TIMESTAMP - INTERVAL '10 days',
    CURRENT_TIMESTAMP - INTERVAL '5 days'
),
(
    111,
    'Penyusunan Dokumen Spesifikasi Rekayasa Sistem (reqs/)',
    'Penulisan 14 bab spesifikasi teknis arsitektur, skema DB, keamanan, dan roadmap sistem terpadu.',
    0, -- Low
    2, -- Done
    100,
    'Requirement & Analysis',
    null,
    null,
    1, -- Core Banking
    5, -- Documentation
    'usr-dian',
    null,
    1,
    CURRENT_TIMESTAMP - INTERVAL '25 days',
    CURRENT_TIMESTAMP - INTERVAL '20 days',
    CURRENT_TIMESTAMP - INTERVAL '25 days',
    CURRENT_TIMESTAMP - INTERVAL '20 days'
),

-- Kolom Overdue (status=3)
(
    112,
    'Audit Keamanan OWASP Top 10 & Vulnerability Scanning Q3',
    'Penetrasi pengujian keamanan autentikasi JWT token rotation, SQL injection, dan header CSP.',
    3, -- Critical
    3, -- Overdue
    30,
    'Testing & QA Matrix',
    'Sertifikat SSL staging kedaluwarsa menghambat eksekusi suite automated DAST scanner ZAP.',
    'Pembaruan otomatis Let''s Encrypt staging certs dijadwalkan ulang besok pagi.',
    3, -- Supply Chain
    4, -- QA & Testing
    'usr-reza',
    null,
    1,
    CURRENT_TIMESTAMP - INTERVAL '15 days',
    CURRENT_TIMESTAMP - INTERVAL '2 days', -- Due date lampau
    CURRENT_TIMESTAMP - INTERVAL '15 days',
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    status = EXCLUDED.status,
    progress = EXCLUDED.progress,
    priority = EXCLUDED.priority,
    obstacle = EXCLUDED.obstacle,
    solution = EXCLUDED.solution;

-- Sinkronkan sequence tasks
SELECT setval('tasks_id_seq', (SELECT MAX(id) FROM tasks));

-- 5. SESI TIMESHEET HISTORIS & SESI AKTIF BERJALAN
INSERT INTO sessions (id, task_id, user_id, start_time, end_time, duration, notes, created_at)
VALUES
-- Sesi historis 14 hari terakhir
(1001, 108, 'usr-superadmin', CURRENT_TIMESTAMP - INTERVAL '19 days 8 hours', CURRENT_TIMESTAMP - INTERVAL '19 days 4 hours', 14400, 'Scaffolding proyek Clean Architecture dan konfigurasi DB context', CURRENT_TIMESTAMP - INTERVAL '19 days 4 hours'),
(1002, 108, 'usr-superadmin', CURRENT_TIMESTAMP - INTERVAL '18 days 7 hours', CURRENT_TIMESTAMP - INTERVAL '18 days 3 hours', 14400, 'Penyusunan entity model relasional PostgreSQL dan global query filter', CURRENT_TIMESTAMP - INTERVAL '18 days 3 hours'),
(1003, 109, 'usr-siti', CURRENT_TIMESTAMP - INTERVAL '17 days 8 hours', CURRENT_TIMESTAMP - INTERVAL '17 days 4 hours', 14400, 'Merancang palet warna Tailwind CSS dan komponen TailGrids', CURRENT_TIMESTAMP - INTERVAL '17 days 4 hours'),
(1004, 109, 'usr-siti', CURRENT_TIMESTAMP - INTERVAL '16 days 6 hours', CURRENT_TIMESTAMP - INTERVAL '16 days 2 hours', 14400, 'Pembuatan layout responsive header, sidebar, dan mobile sheet', CURRENT_TIMESTAMP - INTERVAL '16 days 2 hours'),
(1005, 110, 'usr-budi', CURRENT_TIMESTAMP - INTERVAL '9 days 8 hours', CURRENT_TIMESTAMP - INTERVAL '9 days 3 hours', 18000, 'Implementasi floating timer bar dengan real-time ticker', CURRENT_TIMESTAMP - INTERVAL '9 days 3 hours'),
(1006, 110, 'usr-budi', CURRENT_TIMESTAMP - INTERVAL '8 days 7 hours', CURRENT_TIMESTAMP - INTERVAL '8 days 4 hours', 10800, 'Integrasi mutation stop timer dan dialog multi-timer', CURRENT_TIMESTAMP - INTERVAL '8 days 4 hours'),
(1007, 104, 'usr-superadmin', CURRENT_TIMESTAMP - INTERVAL '4 days 8 hours', CURRENT_TIMESTAMP - INTERVAL '4 days 3 hours', 18000, 'Integrasi API sandbox gateway Midtrans dan validasi SHA512 signature', CURRENT_TIMESTAMP - INTERVAL '4 days 3 hours'),
(1008, 104, 'usr-superadmin', CURRENT_TIMESTAMP - INTERVAL '3 days 7 hours', CURRENT_TIMESTAMP - INTERVAL '3 days 2 hours', 18000, 'Pembuatan webhook handler idempotent dengan PostgreSQL lock', CURRENT_TIMESTAMP - INTERVAL '3 days 2 hours'),
(1009, 105, 'usr-budi', CURRENT_TIMESTAMP - INTERVAL '2 days 8 hours', CURRENT_TIMESTAMP - INTERVAL '2 days 4 hours', 14400, 'Benchmarking query full text search sebelum dan sesudah indeks GIN', CURRENT_TIMESTAMP - INTERVAL '2 days 4 hours'),
(1010, 106, 'usr-dian', CURRENT_TIMESTAMP - INTERVAL '2 days 6 hours', CURRENT_TIMESTAMP - INTERVAL '2 days 3 hours', 10800, 'Penyusunan CSS print styling template slip gaji landscape', CURRENT_TIMESTAMP - INTERVAL '2 days 3 hours'),
(1011, 107, 'usr-superadmin', CURRENT_TIMESTAMP - INTERVAL '1 days 8 hours', CURRENT_TIMESTAMP - INTERVAL '1 days 4 hours', 14400, 'Pengujian broker WebSocket handling 1.000 simultaneous telemetry feeds', CURRENT_TIMESTAMP - INTERVAL '1 days 4 hours'),
(1012, 112, 'usr-reza', CURRENT_TIMESTAMP - INTERVAL '1 days 5 hours', CURRENT_TIMESTAMP - INTERVAL '1 days 2 hours', 10800, 'Eksekusi automated penetration testing script OWASP ZAP', CURRENT_TIMESTAMP - INTERVAL '1 days 2 hours'),
-- Sesi AKTIF sedang berjalan untuk menguji Floating Timer Bar (end_time = NULL)
(1013, 104, 'usr-superadmin', CURRENT_TIMESTAMP - INTERVAL '1 hours 15 minutes', NULL, 0, 'Sesi pengerjaan aktif: Refactoring webhook retry strategy', CURRENT_TIMESTAMP - INTERVAL '1 hours 15 minutes')
ON CONFLICT (id) DO UPDATE SET
    notes = EXCLUDED.notes,
    duration = EXCLUDED.duration;

-- Sinkronkan sequence sessions
SELECT setval('sessions_id_seq', (SELECT MAX(id) FROM sessions));

-- 6. PRESENSI KERJA HARIAN (10 HARI TERAKHIR)
INSERT INTO attendances (user_id, date, type, work_location, clock_in, clock_out, total_hours, notes, created_at)
VALUES
-- Hari ini
('usr-superadmin', CURRENT_DATE, 1, 1, CURRENT_DATE + TIME '08:10:00', NULL, 0.0, 'Masuk kantor tepat waktu, standby deploy sprint.', CURRENT_TIMESTAMP),
('usr-budi', CURRENT_DATE, 1, 2, CURRENT_DATE + TIME '08:25:00', NULL, 0.0, 'WFH jadwal reguler hari Selasa.', CURRENT_TIMESTAMP),
('usr-siti', CURRENT_DATE, 1, 1, CURRENT_DATE + TIME '08:05:00', NULL, 0.0, 'WFO review mockup bersama tim product.', CURRENT_TIMESTAMP),
('usr-reza', CURRENT_DATE, 1, 1, CURRENT_DATE + TIME '08:30:00', NULL, 0.0, 'WFO sprint regression testing.', CURRENT_TIMESTAMP),
('usr-dian', CURRENT_DATE, 1, 4, CURRENT_DATE + TIME '08:15:00', NULL, 0.0, 'Remote kerja dari co-working space.', CURRENT_TIMESTAMP),

-- Kemarin (H-1)
('usr-superadmin', CURRENT_DATE - 1, 1, 1, (CURRENT_DATE - 1) + TIME '08:15:00', (CURRENT_DATE - 1) + TIME '17:45:00', 8.5, 'Presensi WFO normal.', CURRENT_TIMESTAMP - INTERVAL '1 days'),
('usr-budi', CURRENT_DATE - 1, 1, 1, (CURRENT_DATE - 1) + TIME '08:20:00', (CURRENT_DATE - 1) + TIME '17:30:00', 8.1, 'Presensi WFO normal.', CURRENT_TIMESTAMP - INTERVAL '1 days'),
('usr-siti', CURRENT_DATE - 1, 1, 2, (CURRENT_DATE - 1) + TIME '08:00:00', (CURRENT_DATE - 1) + TIME '17:15:00', 8.2, 'WFH desain iterasi.', CURRENT_TIMESTAMP - INTERVAL '1 days'),
('usr-reza', CURRENT_DATE - 1, 1, 1, (CURRENT_DATE - 1) + TIME '08:40:00', (CURRENT_DATE - 1) + TIME '17:50:00', 8.1, 'WFO testing pipeline.', CURRENT_TIMESTAMP - INTERVAL '1 days'),
('usr-dian', CURRENT_DATE - 1, 1, 4, (CURRENT_DATE - 1) + TIME '08:10:00', (CURRENT_DATE - 1) + TIME '17:20:00', 8.1, 'Remote writing SOP.', CURRENT_TIMESTAMP - INTERVAL '1 days'),

-- H-2
('usr-superadmin', CURRENT_DATE - 2, 1, 3, (CURRENT_DATE - 2) + TIME '08:00:00', (CURRENT_DATE - 2) + TIME '18:00:00', 9.0, 'Dinas luar kunjungan data center.', CURRENT_TIMESTAMP - INTERVAL '2 days'),
('usr-budi', CURRENT_DATE - 2, 1, 1, (CURRENT_DATE - 2) + TIME '08:15:00', (CURRENT_DATE - 2) + TIME '17:35:00', 8.3, 'WFO pairing coding.', CURRENT_TIMESTAMP - INTERVAL '2 days'),
('usr-siti', CURRENT_DATE - 2, 1, 1, (CURRENT_DATE - 2) + TIME '08:10:00', (CURRENT_DATE - 2) + TIME '17:10:00', 8.0, 'WFO presentasi UX.', CURRENT_TIMESTAMP - INTERVAL '2 days'),

-- H-3
('usr-superadmin', CURRENT_DATE - 3, 1, 1, (CURRENT_DATE - 3) + TIME '08:25:00', (CURRENT_DATE - 3) + TIME '17:40:00', 8.2, 'WFO evaluasi sprint.', CURRENT_TIMESTAMP - INTERVAL '3 days'),
('usr-budi', CURRENT_DATE - 3, 1, 2, (CURRENT_DATE - 3) + TIME '08:30:00', (CURRENT_DATE - 3) + TIME '17:30:00', 8.0, 'WFH maintenance server.', CURRENT_TIMESTAMP - INTERVAL '3 days')
ON CONFLICT (user_id, date) DO NOTHING;

-- 7. CATATAN KERJA DOKUMENTASI (NOTES)
INSERT INTO notes (id, title, content_html, category, color, is_pinned, author_user_id, company_id, created_at)
VALUES
(
    1,
    'Panduan Arsitektur & Clean Architecture .NET 8',
    '<h3>Struktur Arsitektur Enterprise</h3><p>Sistem dibangun dengan pemisahan 4 lapis:</p><ul><li><strong>Domain:</strong> Entitas inti tanpa dependensi eksternal.</li><li><strong>Application:</strong> DTO, interface layanan, dan use-case.</li><li><strong>Infrastructure:</strong> Implementasi DbContext PostgreSQL, JWT, ClosedXML.</li><li><strong>WebApi:</strong> Controller REST, middleware penanganan error global.</li></ul><p>Semua query read-only wajib menggunakan <code>.AsNoTracking()</code> untuk memaksimalkan efisiensi memory allocation.</p>',
    'Backend',
    '#3B82F6',
    true,
    'usr-superadmin',
    1,
    CURRENT_TIMESTAMP - INTERVAL '14 days'
),
(
    2,
    'Standard Operating Procedure (SOP) Deployment Docker Produksi',
    '<h3>Langkah Rilis Satu Perintah</h3><pre><code>docker compose down\ndocker compose up --build -d</code></pre><p>Pastikan container PostgreSQL telah melewati pemeriksaan status <strong>healthy</strong> sebelum backend mulai melayani traffic pengguna di port 5008.</p>',
    'DevOps',
    '#F59E0B',
    true,
    'usr-superadmin',
    1,
    CURRENT_TIMESTAMP - INTERVAL '10 days'
),
(
    3,
    'Koleksi Token Desain TailGrids & Next.js 16',
    '<h3>Panduan Tampilan UI</h3><p>Menggunakan Tailwind CSS v4 dengan dukungan native CSS variables untuk mode Gelap/Terang. Hindari penggunaan inline hardcoded colors; utamakan token <code>bg-card-surface-area</code> dan <code>text-gray-900 dark:text-white</code>.</p>',
    'Frontend',
    '#10B981',
    false,
    'usr-siti',
    1,
    CURRENT_TIMESTAMP - INTERVAL '7 days'
),
(
    4,
    'Catatan Pengujian Integrasi Multi-Timer & Idempotency',
    '<h3>Hasil Uji Konkurensi</h3><p>Sistem berhasil menangani lebih dari satu timer aktif per user tanpa terjadi tumpang tindih waktu (race condition) berkat isolasi level transaksi ACID PostgreSQL.</p>',
    'SOP',
    '#8B5CF6',
    false,
    'usr-reza',
    1,
    CURRENT_TIMESTAMP - INTERVAL '3 days'
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    content_html = EXCLUDED.content_html,
    is_pinned = EXCLUDED.is_pinned;

-- Sinkronkan sequence notes
SELECT setval('notes_id_seq', (SELECT MAX(id) FROM notes));

-- 8. GAMIFIKASI & CHECK-IN STREAK (ADMIN CHECK-IN 8 HARI)
INSERT INTO daily_check_ins (user_id, check_in_date, check_in_time, points_earned, streak_day, is_monthly_milestone, notes)
VALUES
('usr-superadmin', CURRENT_DATE - 7, CURRENT_TIMESTAMP - INTERVAL '7 days', 10, 1, false, 'Check-in hari ke-1'),
('usr-superadmin', CURRENT_DATE - 6, CURRENT_TIMESTAMP - INTERVAL '6 days', 10, 2, false, 'Check-in hari ke-2'),
('usr-superadmin', CURRENT_DATE - 5, CURRENT_TIMESTAMP - INTERVAL '5 days', 10, 3, false, 'Check-in hari ke-3'),
('usr-superadmin', CURRENT_DATE - 4, CURRENT_TIMESTAMP - INTERVAL '4 days', 10, 4, false, 'Check-in hari ke-4'),
('usr-superadmin', CURRENT_DATE - 3, CURRENT_TIMESTAMP - INTERVAL '3 days', 10, 5, false, 'Check-in hari ke-5'),
('usr-superadmin', CURRENT_DATE - 2, CURRENT_TIMESTAMP - INTERVAL '2 days', 10, 6, false, 'Check-in hari ke-6'),
('usr-superadmin', CURRENT_DATE - 1, CURRENT_TIMESTAMP - INTERVAL '1 days', 10, 7, false, 'Check-in hari ke-7 (Streak Flame)'),
('usr-superadmin', CURRENT_DATE, CURRENT_TIMESTAMP, 10, 8, false, 'Check-in hari ke-8 aktif')
ON CONFLICT (user_id, check_in_date) DO NOTHING;

-- Berikan 2 Badge ke Admin
INSERT INTO user_badges (user_id, badge_id, unlocked_at, is_featured, awarded_by)
VALUES
('usr-superadmin', 1, CURRENT_TIMESTAMP - INTERVAL '15 days', true, 'System Automation'),
('usr-superadmin', 2, CURRENT_TIMESTAMP - INTERVAL '1 days', true, 'System Automation')
ON CONFLICT (user_id, badge_id) DO NOTHING;

-- Riwayat Klaim Hadiah
INSERT INTO reward_claims (
    id, user_id, reward_item_id, points_spent, point_value_snapshot, rupiah_equivalent,
    status, user_notes, admin_notes, claimed_at, processed_at, processed_by_user_id
) VALUES (
    1,
    'usr-superadmin',
    1, -- Voucher GoPay Rp 50.000
    500,
    100.00,
    50000.00,
    1, -- Approved
    'Mohon ditransfer ke nomor GoPay 081234567890',
    'Disetujui dan saldo telah berhasil dikirim via transfer korporat.',
    CURRENT_TIMESTAMP - INTERVAL '5 days',
    CURRENT_TIMESTAMP - INTERVAL '4 days',
    'usr-superadmin'
)
ON CONFLICT (id) DO NOTHING;

-- Sinkronkan sequence reward_claims
SELECT setval('reward_claims_id_seq', (SELECT MAX(id) FROM reward_claims));

-- 9. PENGUMUMAN RESMI AKTIF (ANNOUNCEMENTS)
INSERT INTO announcements (
    id, title, content, type, start_date, end_date, is_active, company_id, created_by_user_id, created_at
) VALUES 
(
    1,
    'Jadwal Pemeliharaan Terjadwal Database Server Akhir Pekan',
    'Diberitahukan kepada seluruh anggota tim bahwa pada hari Sabtu pukul 22:00 - 24:00 WIB akan dilaksanakan optimasi vacuum database dan peningkatan resource container. Mohon pastikan seluruh timer aktif dihentikan sebelum jam pemeliharaan.',
    'Informasi Penting',
    CURRENT_TIMESTAMP - INTERVAL '1 days',
    CURRENT_TIMESTAMP + INTERVAL '5 days',
    true,
    1, -- WCH
    'usr-superadmin',
    CURRENT_TIMESTAMP - INTERVAL '1 days'
),
(
    2,
    'Sosialisasi Standar Baru Clean Architecture & Multi-Tenancy 2026',
    'TrackerKerja Modern kini resmi beroperasi dengan ASP.NET Core 8 Web API dan PostgreSQL 16. Silakan laporkan masukan atau kendala operasional melalui kanal DevOps holding.',
    'Pengumuman Umum',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP + INTERVAL '14 days',
    true,
    1, -- WCH
    'usr-superadmin',
    CURRENT_TIMESTAMP - INTERVAL '2 days'
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    is_active = EXCLUDED.is_active;

-- Sinkronkan sequence announcements
SELECT setval('announcements_id_seq', (SELECT MAX(id) FROM announcements));

-- Sinkronkan sequence master data & projects
SELECT setval('master_priorities_id_seq', (SELECT MAX(id) FROM master_priorities));
SELECT setval('master_statuses_id_seq', (SELECT MAX(id) FROM master_statuses));
SELECT setval('master_milestones_id_seq', (SELECT MAX(id) FROM master_milestones));
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));
SELECT setval('projects_id_seq', (SELECT MAX(id) FROM projects));

-- SEED DATA DEMO SELESAI
