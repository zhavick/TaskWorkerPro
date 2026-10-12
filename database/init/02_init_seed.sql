-- ============================================================================
-- TRACKERKERJA MODERN (WORK TRACKER PRO)
-- INITIAL SEED DATA
-- File: 02_init_seed.sql
-- ============================================================================

-- 1. Peran Pengguna (Roles)
INSERT INTO asp_net_roles (id, name, normalized_name, concurrency_stamp) VALUES
('r-admin', 'Administrator', 'ADMINISTRATOR', gen_random_uuid()::text),
('r-analyst', 'System Analyst', 'SYSTEM ANALYST', gen_random_uuid()::text),
('r-writer', 'Technical Writer', 'TECHNICAL WRITER', gen_random_uuid()::text),
('r-member', 'Member', 'MEMBER', gen_random_uuid()::text)
ON CONFLICT (id) DO NOTHING;

-- 2. Perusahaan Default (HQ Tenant)
INSERT INTO companies (id, name, code, description, address, contact_email) VALUES
(1, 'Wahana Central Holding', 'WCH', 'Headquarter Enterprise Organization', 'Jakarta, Indonesia', 'admin@trackerkerja.local')
ON CONFLICT (id) DO NOTHING;

-- 3. Akun Administrator Bawaan (Password: AdminSecurePassword2026!)
-- Hash PBKDF2 Identity kompatibel atau temporary seeder
INSERT INTO asp_net_users (
    id, user_name, normalized_user_name, email, normalized_email, email_confirmed,
    password_hash, security_stamp, concurrency_stamp, phone_number,
    full_name, job_title, avatar_color, company_id, is_approved, approved_at
) VALUES (
    'usr-superadmin',
    'admin@trackerkerja.local',
    'ADMIN@TRACKERKERJA.LOCAL',
    'admin@trackerkerja.local',
    'ADMIN@TRACKERKERJA.LOCAL',
    true,
    'AQAAAAIAAYagAAAAEO9zR+qVqZ1E10aZ4KzD+nU/F6iK3hX5oYw1v9L9wB7yX+q8A1b2C3d4E5f6G7h8==', -- Seed hash placeholder (akan diupdate via EF Seeder)
    gen_random_uuid()::text,
    gen_random_uuid()::text,
    '081234567890',
    'Super Administrator',
    'Lead Systems Architect',
    '#6366F1',
    1,
    true,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;

-- Assign Admin Role
INSERT INTO asp_net_user_roles (user_id, role_id) VALUES
('usr-superadmin', 'r-admin')
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 4. Master Prioritas
INSERT INTO master_priorities (id, name, color, icon, order_index, description, is_default) VALUES
(1, 'Low', '#10B981', 'arrow-down', 1, 'Prioritas rendah', false),
(2, 'Medium', '#F59E0B', 'minus', 2, 'Prioritas normal / sedang', true),
(3, 'High', '#EF4444', 'arrow-up', 3, 'Prioritas tinggi mendesak', false),
(4, 'Critical', '#881337', 'alert-circle', 4, 'Kendala kritis pemblokir operasional', false)
ON CONFLICT (id) DO NOTHING;

-- 5. Master Status Tugas
INSERT INTO master_statuses (id, name, color, is_done_state, order_index, description, is_default) VALUES
(1, 'Todo', '#6B7280', false, 1, 'Belum dikerjakan', true),
(2, 'InProgress', '#3B82F6', false, 2, 'Sedang dalam pengerjaan', false),
(3, 'Done', '#10B981', true, 3, 'Pekerjaan telah selesai', false),
(4, 'Overdue', '#EF4444', false, 4, 'Melewati batas waktu penyelesaian', false)
ON CONFLICT (id) DO NOTHING;

-- 6. Master Tonggak Pencapaian (SDLC Milestones)
INSERT INTO master_milestones (id, name, phase, color, icon, order_index, description, is_default) VALUES
(1, 'Requirement & Analysis', 'Planning', '#6366F1', 'file-text', 1, 'Fase analisis kebutuhan dan FSD', true),
(2, 'Design & Architecture', 'Design', '#8B5CF6', 'layout', 2, 'Fase perancangan UI/UX & arsitektur DB', false),
(3, 'Implementation & Coding', 'Development', '#3B82F6', 'code', 3, 'Fase implementasi kode software', false),
(4, 'Testing & QA Matrix', 'Testing', '#EC4899', 'check-square', 4, 'Fase pengujian mutu software E2E', false),
(5, 'Deployment & Go-Live', 'Release', '#10B981', 'rocket', 5, 'Fase rilis produksi dan delivery', false)
ON CONFLICT (id) DO NOTHING;

-- 7. Kategori Pekerjaan Awal
INSERT INTO categories (id, name, color, description) VALUES
(1, 'Backend & API', '#3B82F6', 'Pengembangan API, database, dan arsitektur server'),
(2, 'Frontend & UI', '#10B981', 'Pengembangan antarmuka Next.js dan Tailwind CSS'),
(3, 'DevOps & Cloud', '#F59E0B', 'Container Docker, CI/CD, dan infrastruktur server'),
(4, 'QA & Testing', '#EC4899', 'Pengujian mutu perangkat lunak dan E2E test cases'),
(5, 'Documentation', '#8B5CF6', 'Dokumentasi teknis, user manual, dan SOP')
ON CONFLICT (id) DO NOTHING;

-- 8. Pengaturan Sistem Global 4-Tab (Default Settings)
INSERT INTO system_settings (key, value, description) VALUES
('App:PublicBaseUrl', 'http://localhost:3000', 'URL publik aplikasi frontend Next.js'),
('App:EnableSwaggerInProd', 'false', 'Izinkan akses OpenAPI Swagger di lingkungan production'),
('Security:SessionTimeoutMinutes', '60', 'Batas inaktivitas pengguna sebelum auto-logout (menit)'),
('Security:SessionWarningBeforeMinutes', '5', 'Waktu peringatan sebelum sesi kedaluwarsa (menit)'),
('Sync:MasterHostUrl', 'https://central.trackerkerja.local', 'Host server induk untuk sinkronisasi multi-instance'),
('Sync:AutoSyncIntervalMinutes', '60', 'Interval sinkronisasi data otomatis antar instance (menit)'),
('Database:VacuumSchedule', 'Weekly', 'Jadwal otomatis pemeliharaan pembersihan database VACUUM'),
('Smtp:Host', 'smtp.gmail.com', 'Alamat host mail server SMTP'),
('Smtp:Port', '587', 'Port server SMTP'),
('Smtp:EnableSsl', 'true', 'Gunakan koneksi terenkripsi SSL/TLS')
ON CONFLICT (key) DO NOTHING;

-- 9. Template Email Event Bawaan
INSERT INTO email_templates (id, event_code, event_name, category, subject, body_html, available_variables, is_active) VALUES
(1, 'ADMIN_NEW_USER_ALERT', 'Pemberitahuan Pendaftar Baru', 'Auth', 'Pendaftaran Baru Memerlukan Persetujuan - {UserFullName}', 
 '<h3>Pendaftaran Pengguna Baru</h3><p>Pengguna baru <strong>{UserFullName}</strong> ({UserEmail}) telah mendaftar dengan kode perusahaan <strong>{CompanyCode}</strong> dan menunggu persetujuan Anda.</p>',
 '{UserFullName},{UserEmail},{CompanyCode},{RegisterDate}', true),
(2, 'USER_APPROVED', 'Akun Disetujui', 'Auth', 'Selamat! Akun TrackerKerja Anda Telah Disetujui',
 '<h3>Akun Anda Aktif!</h3><p>Halo {UserFullName}, pendaftaran Anda di <strong>{CompanyName}</strong> telah disetujui. Anda dapat masuk ke aplikasi sekarang.</p>',
 '{UserFullName},{CompanyName},{LoginUrl}', true),
(3, 'PASSWORD_RESET', 'Permintaan Reset Kata Sandi', 'Security', 'Instruksi Pengaturan Ulang Kata Sandi TrackerKerja',
 '<h3>Reset Kata Sandi</h3><p>Klik tautan berikut untuk mereset kata sandi Anda: <a href="{ResetUrl}">Reset Password</a>. Tautan berlaku 15 menit.</p>',
 '{UserFullName},{ResetUrl},{TokenLifespan}', true)
ON CONFLICT (id) DO NOTHING;

-- 10. Master Badges Awal
INSERT INTO master_badges (id, code, name, description, category, icon, color, points, rarity, trigger_type, trigger_threshold) VALUES
(1, 'BADGE_FIRST_TASK', 'First Step Master', 'Menyelesaikan tugas pertama Anda', 'Productivity', 'award', '#10B981', 50, 1, 1, 1),
(2, 'BADGE_STREAK_7', 'Consistency Flame', 'Check-in 7 hari berturut-turut tanpa putus', 'Attendance', 'flame', '#F59E0B', 100, 2, 2, 7),
(3, 'BADGE_STREAK_30', 'Monthly Champion', 'Check-in 30 hari penuh dalam satu bulan kalender', 'Attendance', 'crown', '#EC4899', 300, 3, 2, 30),
(4, 'BADGE_TIME_100H', 'Century Logger', 'Mencatat lebih dari 100 jam kerja di timesheet', 'Timesheet', 'clock', '#8B5CF6', 250, 3, 3, 360000)
ON CONFLICT (id) DO NOTHING;

-- 11. Katalog Hadiah Awal (Reward Items)
INSERT INTO reward_items (id, name, description, point_cost, stock, category, icon, color) VALUES
(1, 'Voucher GoPay Rp 50.000', 'Saldo saldo e-wallet GoPay ditransfer ke nomor terdaftar', 500, 20, 'E-Wallet', 'wallet', '#10B981'),
(2, 'Voucher OVO Rp 50.000', 'Saldo saldo e-wallet OVO ditransfer ke nomor terdaftar', 500, 20, 'E-Wallet', 'wallet', '#8B5CF6'),
(3, 'Pulsa Seluler Rp 100.000', 'Pulsa all operator (Telkomsel, Indosat, XL)', 1000, 15, 'Pulsa', 'smartphone', '#3B82F6'),
(4, 'Tumbler Stainless Eksklusif', 'Tumbler termos kopi branding Work Tracker Pro', 1500, 10, 'Merchandise', 'coffee', '#F59E0B')
ON CONFLICT (id) DO NOTHING;
