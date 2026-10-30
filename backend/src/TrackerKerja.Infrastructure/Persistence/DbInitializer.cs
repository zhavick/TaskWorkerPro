using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Domain.Enums;
using TrackerKerja.Infrastructure.Services;

namespace TrackerKerja.Infrastructure.Persistence;

public static class DbInitializer
{
    public static async Task SeedAsync(AppDbContext context, ITaskExcelImportService? excelImportService = null)
    {
        // 0. Pastikan Skema Tabel Terpasang & Termigrasi (PostgreSQL)
        if (context.Database.IsRelational())
        {
            try
            {
                await context.Database.ExecuteSqlRawAsync(@"
                    -- Auto-migrate columns & types for PostgreSQL
                    DO $$ 
                    BEGIN 
                        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN 
                            ALTER TABLE tasks ALTER COLUMN title TYPE VARCHAR(500);
                            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags VARCHAR(200);
                            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by_user_id VARCHAR(450);
                        END IF;

                        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN 
                            ALTER TABLE projects ADD COLUMN IF NOT EXISTS use_budget BOOLEAN NOT NULL DEFAULT FALSE;
                            ALTER TABLE projects ADD COLUMN IF NOT EXISTS tags VARCHAR(200);
                        END IF;

                        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendances') THEN 
                            ALTER TABLE attendances ADD COLUMN IF NOT EXISTS status INTEGER NOT NULL DEFAULT 1;
                            ALTER TABLE attendances ADD COLUMN IF NOT EXISTS approved_by_user_id VARCHAR(450);
                        END IF;

                        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_templates') THEN 
                            ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS updated_by_user_id VARCHAR(450);
                        END IF;

                        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reward_items') THEN 
                            ALTER TABLE reward_items ADD COLUMN IF NOT EXISTS image_url VARCHAR(300);
                        END IF;

                        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'announcements') THEN 
                            ALTER TABLE announcements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
                        END IF;

                        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'json_histories') THEN 
                            ALTER TABLE json_histories ADD COLUMN IF NOT EXISTS user_id VARCHAR(450);
                        END IF;

                        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sql_histories') THEN 
                            ALTER TABLE sql_histories ADD COLUMN IF NOT EXISTS user_id VARCHAR(450);
                        END IF;
                    END $$;

                    CREATE TABLE IF NOT EXISTS user_badge_snapshots (
                        id SERIAL PRIMARY KEY,
                        snapshot_batch_id VARCHAR(100) NOT NULL,
                        reset_mode VARCHAR(50) NOT NULL,
                        user_id VARCHAR(450) NOT NULL,
                        badge_id INTEGER NOT NULL,
                        original_unlocked_at TIMESTAMPTZ NOT NULL,
                        is_featured BOOLEAN NOT NULL DEFAULT FALSE,
                        awarded_by VARCHAR(450),
                        snapshot_created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        is_restored BOOLEAN NOT NULL DEFAULT FALSE,
                        restored_at TIMESTAMPTZ,
                        restored_by VARCHAR(450)
                    );
                    CREATE INDEX IF NOT EXISTS ix_user_badge_snapshots_batch_id ON user_badge_snapshots(snapshot_batch_id);
                    CREATE INDEX IF NOT EXISTS ix_user_badge_snapshots_user_id ON user_badge_snapshots(user_id);

                    CREATE TABLE IF NOT EXISTS import_logs (
                        id SERIAL PRIMARY KEY,
                        file_name VARCHAR(255) NOT NULL,
                        total_rows INTEGER NOT NULL,
                        success_rows INTEGER NOT NULL,
                        failed_rows INTEGER NOT NULL,
                        errors TEXT,
                        imported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        imported_by VARCHAR(450)
                    );
                    CREATE INDEX IF NOT EXISTS ix_import_logs_imported_at ON import_logs(imported_at DESC);

                    CREATE TABLE IF NOT EXISTS audit_logs (
                        id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                        user_id TEXT,
                        user_email TEXT,
                        user_name TEXT,
                        controller_name TEXT,
                        action_name TEXT,
                        http_method TEXT,
                        path TEXT,
                        query_string TEXT,
                        ip_address TEXT,
                        status_code INTEGER NOT NULL,
                        duration_ms INTEGER NOT NULL,
                        timestamp TIMESTAMPTZ NOT NULL,
                        details TEXT
                    );
                    CREATE INDEX IF NOT EXISTS ix_audit_logs_timestamp ON audit_logs(timestamp DESC);
                    CREATE INDEX IF NOT EXISTS ix_audit_logs_user_id ON audit_logs(user_id);
                    CREATE INDEX IF NOT EXISTS ix_audit_logs_controller_name ON audit_logs(controller_name);

                    DROP INDEX IF EXISTS ix_audit_logs_details_gin;
                    DO $$ 
                    BEGIN 
                        IF EXISTS (
                            SELECT 1 FROM information_schema.columns 
                            WHERE table_name = 'audit_logs' AND column_name = 'details' AND data_type = 'jsonb'
                        ) THEN 
                            ALTER TABLE audit_logs ALTER COLUMN details TYPE text USING details::text;
                        END IF;
                    END $$;

                    CREATE TABLE IF NOT EXISTS sync_histories (
                        id SERIAL PRIMARY KEY,
                        direction INTEGER NOT NULL,
                        status INTEGER NOT NULL,
                        target_host TEXT NOT NULL,
                        total_records_synced INTEGER NOT NULL,
                        file_size_bytes BIGINT NOT NULL,
                        summary_json TEXT,
                        error_message TEXT,
                        created_at TIMESTAMPTZ NOT NULL,
                        triggered_by_user_id TEXT
                    );
                    CREATE INDEX IF NOT EXISTS ix_sync_histories_created_at ON sync_histories(created_at DESC);

                    CREATE TABLE IF NOT EXISTS user_notifications (
                        id SERIAL PRIMARY KEY,
                        user_id VARCHAR(450) NOT NULL REFERENCES asp_net_users(id) ON DELETE CASCADE,
                        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                        title VARCHAR(500) NOT NULL,
                        message TEXT NOT NULL,
                        category VARCHAR(50) NOT NULL DEFAULT 'Task',
                        action_url VARCHAR(500),
                        is_read BOOLEAN NOT NULL DEFAULT FALSE,
                        read_at TIMESTAMPTZ,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        created_by_user_id VARCHAR(450) REFERENCES asp_net_users(id) ON DELETE SET NULL
                    );
                    CREATE INDEX IF NOT EXISTS ix_user_notifications_user_id ON user_notifications(user_id);
                    CREATE INDEX IF NOT EXISTS ix_user_notifications_created_at ON user_notifications(created_at DESC);
                ");
            }
            catch
            {
                // Ignore DDL errors if unsupported or already managed
            }

            // Tabel notifikasi tidak ada di database/init, dibuat terpisah agar tidak ikut gagal bila DDL di atas error
            try
            {
                await context.Database.ExecuteSqlRawAsync(@"
                    CREATE TABLE IF NOT EXISTS user_notifications (
                        id SERIAL PRIMARY KEY,
                        user_id VARCHAR(450) NOT NULL REFERENCES asp_net_users(id) ON DELETE CASCADE,
                        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                        title TEXT NOT NULL,
                        message TEXT NOT NULL,
                        category TEXT NOT NULL DEFAULT 'Task',
                        action_url TEXT,
                        is_read BOOLEAN NOT NULL DEFAULT FALSE,
                        read_at TIMESTAMPTZ,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        created_by_user_id VARCHAR(450) REFERENCES asp_net_users(id) ON DELETE SET NULL
                    );
                    CREATE INDEX IF NOT EXISTS ix_user_notifications_user_id ON user_notifications(user_id);
                    CREATE INDEX IF NOT EXISTS ix_user_notifications_company_id ON user_notifications(company_id);
                    CREATE INDEX IF NOT EXISTS ix_user_notifications_created_by_user_id ON user_notifications(created_by_user_id);
                ");
            }
            catch
            {
                // Ignore DDL errors if unsupported or already managed
            }

            // Tabel Timesheet Periods & Company Timesheet Configs
            try
            {
                await context.Database.ExecuteSqlRawAsync(@"
                    CREATE TABLE IF NOT EXISTS timesheet_periods (
                        id SERIAL PRIMARY KEY,
                        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                        period_code VARCHAR(50) NOT NULL,
                        name VARCHAR(200) NOT NULL,
                        start_date DATE NOT NULL,
                        end_date DATE NOT NULL,
                        working_days_count INTEGER NOT NULL DEFAULT 21,
                        is_closed BOOLEAN NOT NULL DEFAULT FALSE,
                        notes TEXT,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE INDEX IF NOT EXISTS ix_timesheet_periods_company_id ON timesheet_periods(company_id);
                    CREATE INDEX IF NOT EXISTS ix_timesheet_periods_start_date ON timesheet_periods(start_date DESC);

                    CREATE TABLE IF NOT EXISTS company_timesheet_configs (
                        id SERIAL PRIMARY KEY,
                        company_id INTEGER NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
                        template_file_path VARCHAR(500),
                        header_title VARCHAR(200) NOT NULL DEFAULT 'ELISTEC - Timesheet',
                        client_name VARCHAR(200) NOT NULL DEFAULT 'Tugu Insurance',
                        sow_number VARCHAR(100),
                        approver_title VARCHAR(100) NOT NULL DEFAULT 'Mengetahui,',
                        approver_name VARCHAR(150) NOT NULL DEFAULT 'xxxx',
                        resource_title VARCHAR(100) NOT NULL DEFAULT 'Resource,',
                        include_weekends BOOLEAN NOT NULL DEFAULT TRUE,
                        weekend_task_text_format VARCHAR(500) NOT NULL DEFAULT 'Hari Libur Akhir Pekan ({DayName}) - Tidak Ada Pengerjaan Task',
                        header_row_index INTEGER NOT NULL DEFAULT 7,
                        data_start_row_index INTEGER NOT NULL DEFAULT 8,
                        columns_mapping_json TEXT NOT NULL DEFAULT '[]',
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE INDEX IF NOT EXISTS ix_company_timesheet_configs_company_id ON company_timesheet_configs(company_id);

                    CREATE TABLE IF NOT EXISTS holidays (
                        id SERIAL PRIMARY KEY,
                        date DATE NOT NULL,
                        name VARCHAR(200) NOT NULL,
                        description VARCHAR(500),
                        is_national BOOLEAN NOT NULL DEFAULT TRUE,
                        company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                    );
                    CREATE INDEX IF NOT EXISTS ix_holidays_date ON holidays(date);
                    CREATE INDEX IF NOT EXISTS ix_holidays_company_id ON holidays(company_id);
                    CREATE UNIQUE INDEX IF NOT EXISTS uq_holiday_date_company ON holidays(date, COALESCE(company_id, 0));

                    -- Pastikan seluruh presensi kehadiran sinkron 8 jam kerja dan berstatus Approved
                    UPDATE attendances 
                    SET total_hours = 8.0, status = 2, notes = 'Presensi sinkronisasi 8 jam tugas harian' 
                    WHERE (total_hours = 0 OR status = 1) AND type = 1;
                ");
            }
            catch
            {
                // Ignore DDL errors if unsupported or already managed
            }
        }

        // 1. Pastikan Perusahaan Default (HQ Tenant)
        var company = await context.Companies.FirstOrDefaultAsync(c => c.Code == "WCH");
        if (company == null)
        {
            company = new Company
            {
                Name = "Wahana Central Holding",
                Code = "WCH",
                Description = "Headquarter Enterprise Organization",
                Address = "Jakarta, Indonesia",
                ContactEmail = "admin@trackerkerja.local",
                CreatedAt = DateTimeOffset.UtcNow
            };
            context.Companies.Add(company);
            await context.SaveChangesAsync();
        }

        // 2. Pastikan Akun Administrator Bawaan (admin@trackerkerja.local / AdminSecurePassword2026!)
        var adminEmail = "admin@trackerkerja.local";
        var adminUser = await context.Users.FirstOrDefaultAsync(u => u.Email == adminEmail);
        if (adminUser == null)
        {
            adminUser = new AppUser
            {
                Id = "usr-superadmin",
                UserName = adminEmail,
                NormalizedUserName = adminEmail.ToUpperInvariant(),
                Email = adminEmail,
                NormalizedEmail = adminEmail.ToUpperInvariant(),
                EmailConfirmed = true,
                FullName = "Super Administrator",
                JobTitle = "Lead Systems Architect & Administrator",
                AvatarColor = "#6366F1",
                CompanyId = company.Id,
                IsApproved = true,
                ApprovedAt = DateTimeOffset.UtcNow,
                PasswordHash = PasswordHasher.HashPassword("AdminSecurePassword2026!"),
                CreatedAt = DateTimeOffset.UtcNow
            };
            context.Users.Add(adminUser);
            await context.SaveChangesAsync();
        }
        else if (string.IsNullOrEmpty(adminUser.PasswordHash) || !adminUser.PasswordHash.Contains(':'))
        {
            adminUser.PasswordHash = PasswordHasher.HashPassword("AdminSecurePassword2026!");
            adminUser.IsApproved = true;
            await context.SaveChangesAsync();
        }

        // Pastikan Master Peran Sistem (Admin, Project Manager, Staff/Member, DataPurgeAdmin)
        var rolesToEnsure = new List<(string Id, string Name)>
        {
            ("r-admin", "Administrator"),
            ("r-pm", "Project Manager"),
            ("r-staff", "Staff"),
            ("r-member", "Member"),
            ("r-purge-admin", "DataPurgeAdmin")
        };
        foreach (var (rId, rName) in rolesToEnsure)
        {
            var roleExists = await context.Roles.FirstOrDefaultAsync(r => r.Id == rId || r.Name.ToLower() == rName.ToLower());
            if (roleExists == null)
            {
                context.Roles.Add(new AppRole
                {
                    Id = rId,
                    Name = rName,
                    NormalizedName = rName.ToUpperInvariant()
                });
            }
        }
        await context.SaveChangesAsync();

        // 3. Pastikan Koleksi 70+ Master Badge Gaul & Modern Anak Muda (FSD 5.20.4 + Ekstensi Gamifikasi Kreatif)
        var badges = new List<MasterBadge>
        {
            // Kategori: Tugas & Eksekusi (1-6)
            new MasterBadge { Code = "FIRST_TASK", Name = "First Blood Eksekusi", Description = "Selesaikan tugas kerja pertama Anda dalam sistem.", Category = "Tugas", Icon = "check-circle", Color = "#10B981", Points = 50, Rarity = BadgeRarity.Common, OrderIndex = 1 },
            new MasterBadge { Code = "TASK_5", Name = "Sat Set Anti Wacana", Description = "Tuntaskan 5 tugas kerja tanpa menunda-nunda.", Category = "Tugas", Icon = "zap", Color = "#3B82F6", Points = 75, Rarity = BadgeRarity.Common, OrderIndex = 2 },
            new MasterBadge { Code = "TASK_10", Name = "Si Paling Eksekutor", Description = "Selesaikan 10 tugas kerja dengan hasil memuaskan.", Category = "Tugas", Icon = "check-square", Color = "#6366F1", Points = 150, Rarity = BadgeRarity.Rare, OrderIndex = 3 },
            new MasterBadge { Code = "TASK_25", Name = "Algojo Backlog", Description = "Babat habis 25 tugas kerja dari backlog sprint.", Category = "Tugas", Icon = "layers", Color = "#8B5CF6", Points = 300, Rarity = BadgeRarity.Rare, OrderIndex = 4 },
            new MasterBadge { Code = "TASK_50", Name = "Mesin Pencetak Done", Description = "Kumpulkan 50 tugas kerja berstatus Done.", Category = "Tugas", Icon = "check-check", Color = "#EC4899", Points = 600, Rarity = BadgeRarity.Epic, OrderIndex = 5 },
            new MasterBadge { Code = "TASK_100", Name = "Dewa Sprint", Description = "100 tugas tuntas! Anda adalah legenda hidup eksekusi kerja.", Category = "Tugas", Icon = "crown", Color = "#F59E0B", Points = 1200, Rarity = BadgeRarity.Legendary, OrderIndex = 6 },

            // Kategori: Timesheet & Jam Kerja (7-12)
            new MasterBadge { Code = "HOURS_1", Name = "Langkah Perdana", Description = "Catat 1 jam kerja pertama di lembar timesheet.", Category = "Timesheet", Icon = "clock", Color = "#06B6D4", Points = 25, Rarity = BadgeRarity.Common, OrderIndex = 7 },
            new MasterBadge { Code = "HOURS_10", Name = "Kopi & Keringat", Description = "Akumulasi 10 jam fokus kerja produktif nyata.", Category = "Timesheet", Icon = "coffee", Color = "#10B981", Points = 100, Rarity = BadgeRarity.Common, OrderIndex = 8 },
            new MasterBadge { Code = "HOURS_40", Name = "Jawara Timesheet", Description = "Tembus 40 jam kerja setara 1 minggu penuh.", Category = "Timesheet", Icon = "timer", Color = "#3B82F6", Points = 250, Rarity = BadgeRarity.Rare, OrderIndex = 9 },
            new MasterBadge { Code = "HOURS_100", Name = "Detik Demi Detik", Description = "Akumulasi 100 jam kerja tercatat presisi di timesheet.", Category = "Timesheet", Icon = "hourglass", Color = "#6366F1", Points = 500, Rarity = BadgeRarity.Rare, OrderIndex = 10 },
            new MasterBadge { Code = "HOURS_200", Name = "Man-Days Glider", Description = "Raih 200 jam kerja setara 25 Man-Days efisiensi tinggi.", Category = "Timesheet", Icon = "activity", Color = "#8B5CF6", Points = 1000, Rarity = BadgeRarity.Epic, OrderIndex = 11 },
            new MasterBadge { Code = "HOURS_500", Name = "Dedikasi Tanpa Batas", Description = "500 jam kerja penuh loyalitas dan dedikasi profesional.", Category = "Timesheet", Icon = "shield", Color = "#F59E0B", Points = 2500, Rarity = BadgeRarity.Legendary, OrderIndex = 12 },

            // Kategori: Presensi & Kehadiran (13-17)
            new MasterBadge { Code = "ATTEND_1", Name = "Hadir Perdana", Description = "Lakukan presensi Clock-In pertama kali dalam sistem.", Category = "Presensi", Icon = "calendar-check", Color = "#10B981", Points = 25, Rarity = BadgeRarity.Common, OrderIndex = 13 },
            new MasterBadge { Code = "ATTEND_10", Name = "Presensi Rajin", Description = "10 hari presensi tepat waktu di jam operasional kantor.", Category = "Presensi", Icon = "calendar", Color = "#3B82F6", Points = 100, Rarity = BadgeRarity.Common, OrderIndex = 14 },
            new MasterBadge { Code = "ATTEND_25", Name = "Pejuang Absensi", Description = "25 hari hadir konsisten tanpa absen satu hari pun.", Category = "Presensi", Icon = "calendar-days", Color = "#6366F1", Points = 250, Rarity = BadgeRarity.Rare, OrderIndex = 15 },
            new MasterBadge { Code = "WFO_HERO", Name = "Pejuang Aspal WFO", Description = "5 kali presensi kerja langsung di kantor fisik (WFO).", Category = "Presensi", Icon = "building", Color = "#F59E0B", Points = 100, Rarity = BadgeRarity.Common, OrderIndex = 16 },
            new MasterBadge { Code = "WFH_HERO", Name = "WFH Tetap Gacor", Description = "5 kali presensi kerja remote (WFH) dengan produktivitas tinggi.", Category = "Presensi", Icon = "laptop", Color = "#06B6D4", Points = 100, Rarity = BadgeRarity.Common, OrderIndex = 17 },

            // Kategori: Daily Check-In & Streak (18-25)
            new MasterBadge { Code = "CHECKIN_1", Name = "Sapaan Perdana", Description = "Klaim poin Daily Check-In pertama Anda.", Category = "Streak", Icon = "sparkler", Color = "#F59E0B", Points = 10, Rarity = BadgeRarity.Common, OrderIndex = 18 },
            new MasterBadge { Code = "CHECKIN_7", Name = "Konsistensi Mingguan", Description = "7 hari aktif menjalankan check-in harian.", Category = "Streak", Icon = "flame", Color = "#F97316", Points = 100, Rarity = BadgeRarity.Common, OrderIndex = 19 },
            new MasterBadge { Code = "CHECKIN_15", Name = "Jawara 15 Hari", Description = "Capai target milestone 15 hari check-in bulanan (50% target).", Category = "Streak", Icon = "award", Color = "#EF4444", Points = 250, Rarity = BadgeRarity.Rare, OrderIndex = 20 },
            new MasterBadge { Code = "CHECKIN_30", Name = "Raja Sebulan Penuh", Description = "Tembus 30 hari check-in penuh (100% target saldo).", Category = "Streak", Icon = "crown", Color = "#8B5CF6", Points = 500, Rarity = BadgeRarity.Epic, OrderIndex = 21 },
            new MasterBadge { Code = "STREAK_3", Name = "Percikan Api", Description = "Pertahankan streak check-in berturut-turut selama 3 hari.", Category = "Streak", Icon = "flame", Color = "#F59E0B", Points = 50, Rarity = BadgeRarity.Common, OrderIndex = 22 },
            new MasterBadge { Code = "STREAK_7", Name = "Api Membara", Description = "Streak 7 hari berturut-turut tanpa pernah terputus.", Category = "Streak", Icon = "zap", Color = "#F97316", Points = 150, Rarity = BadgeRarity.Rare, OrderIndex = 23 },
            new MasterBadge { Code = "STREAK_14", Name = "Pantang Kendor", Description = "Streak 14 hari konsistensi baja tanpa kendur.", Category = "Streak", Icon = "flame", Color = "#EF4444", Points = 350, Rarity = BadgeRarity.Epic, OrderIndex = 24 },
            new MasterBadge { Code = "STREAK_30", Name = "Sultan Check-In 30 Hari", Description = "Raih streak 30 hari utuh! Membuka klaim reward bulanan eksklusif.", Category = "Streak", Icon = "crown", Color = "#F59E0B", Points = 1000, Rarity = BadgeRarity.Legendary, OrderIndex = 25 },

            // Kategori: Utilitas Developer & Catatan (26-29)
            new MasterBadge { Code = "NOTE_1", Name = "Pencatat Ulung", Description = "Buat catatan kerja atau SOP pertama Anda.", Category = "Catatan", Icon = "book-open", Color = "#10B981", Points = 25, Rarity = BadgeRarity.Common, OrderIndex = 26 },
            new MasterBadge { Code = "NOTE_5", Name = "Ensiklopedia Proyek", Description = "Dokumentasikan 5 catatan teknis dan SOP tim.", Category = "Catatan", Icon = "library", Color = "#3B82F6", Points = 125, Rarity = BadgeRarity.Rare, OrderIndex = 27 },
            new MasterBadge { Code = "DEWA_SQL", Name = "Dewa SQL", Description = "Format dan rapikan kueri database menggunakan SQL Beautifier.", Category = "Developer", Icon = "database", Color = "#6366F1", Points = 75, Rarity = BadgeRarity.Common, OrderIndex = 28 },
            new MasterBadge { Code = "PAWANG_JSON", Name = "Pawang JSON", Description = "Validasi dan format payload JSON dengan JSON Tools.", Category = "Developer", Icon = "code", Color = "#8B5CF6", Points = 75, Rarity = BadgeRarity.Common, OrderIndex = 29 },

            // Kategori: Kolaborasi & Ekstra (30-42)
            new MasterBadge { Code = "SI_CURHAT", Name = "Jujur Pada Kendala", Description = "Dokumentasikan kendala kerja (Obstacle) untuk transparansi tim.", Category = "Tugas", Icon = "alert-circle", Color = "#F59E0B", Points = 50, Rarity = BadgeRarity.Common, OrderIndex = 30 },
            new MasterBadge { Code = "SI_SOLUTIF", Name = "Si Paling Solutif", Description = "Sertakan solusi teknis (Solution) cerdas untuk menyelesaikan tugas.", Category = "Tugas", Icon = "lightbulb", Color = "#10B981", Points = 75, Rarity = BadgeRarity.Common, OrderIndex = 31 },
            new MasterBadge { Code = "PEMBABAT_SUBTASK", Name = "Ahli Dekomposisi", Description = "Pecah tugas besar menjadi hierarki sub-tugas terstruktur.", Category = "Tugas", Icon = "list-tree", Color = "#06B6D4", Points = 50, Rarity = BadgeRarity.Common, OrderIndex = 32 },
            new MasterBadge { Code = "PEMBURU_REWARD", Name = "Pemberani Tukar Poin", Description = "Klaim reward nyata pertama Anda dari Reward Store.", Category = "Reward", Icon = "gift", Color = "#EC4899", Points = 100, Rarity = BadgeRarity.Common, OrderIndex = 33 },
            new MasterBadge { Code = "MVP_KANTOR", Name = "MVP Idola Kantor", Description = "Masuk 3 besar peringkat teratas leaderboard gamifikasi.", Category = "Prestasi", Icon = "star", Color = "#F59E0B", Points = 500, Rarity = BadgeRarity.Epic, OrderIndex = 34 },
            new MasterBadge { Code = "TIMER_MASTER", Name = "Penjinak Multi-Timer", Description = "Operasikan lebih dari 1 sesi timer secara bersamaan.", Category = "Timesheet", Icon = "timer", Color = "#6366F1", Points = 50, Rarity = BadgeRarity.Common, OrderIndex = 35 },
            new MasterBadge { Code = "KALENDER_PRO", Name = "Pengatur Jadwal Elit", Description = "Eksplorasi visualisasi tugas dalam kalender 4-mode.", Category = "Tugas", Icon = "calendar-days", Color = "#3B82F6", Points = 50, Rarity = BadgeRarity.Common, OrderIndex = 36 },
            new MasterBadge { Code = "TEMA_STILIS", Name = "Fashionista UI", Description = "Ganti tema visual workspace dari 40 tema eye-friendly.", Category = "Sistem", Icon = "palette", Color = "#8B5CF6", Points = 25, Rarity = BadgeRarity.Common, OrderIndex = 37 },
            new MasterBadge { Code = "IMPORT_WIZARD", Name = "Penyihir Spreadsheet", Description = "Impor data tugas tim dari berkas Excel multi-sheet.", Category = "Tugas", Icon = "file-spreadsheet", Color = "#10B981", Points = 100, Rarity = BadgeRarity.Rare, OrderIndex = 38 },
            new MasterBadge { Code = "EXPORT_NINJA", Name = "Ninja Laporan ARMS", Description = "Unduh laporan spreadsheet ClosedXML format ARMS 21-kolom.", Category = "Tugas", Icon = "download", Color = "#06B6D4", Points = 100, Rarity = BadgeRarity.Rare, OrderIndex = 39 },
            new MasterBadge { Code = "PEJUANG_LEMBUR", Name = "Lembur Bergengsi", Description = "Rekam sesi kerja produktif di atas pukul 18:00.", Category = "Timesheet", Icon = "moon", Color = "#F59E0B", Points = 75, Rarity = BadgeRarity.Common, OrderIndex = 40 },
            new MasterBadge { Code = "SQUAD_LEADER", Name = "Nahkoda Proyek", Description = "Selesaikan proyek tim hingga mencapai progress tuntas 100%.", Category = "Prestasi", Icon = "flag", Color = "#6366F1", Points = 500, Rarity = BadgeRarity.Epic, OrderIndex = 41 },
            new MasterBadge { Code = "ULTIMATE_LEGEND", Name = "Legenda Hidup TrackerKerja", Description = "Akumulasikan lebih dari 2000 total poin gamifikasi.", Category = "Prestasi", Icon = "sparkle", Color = "#F59E0B", Points = 1000, Rarity = BadgeRarity.Legendary, OrderIndex = 42 },

            // Lencana Kreatif Ekstensi Upstream (43-55)
            new MasterBadge { Code = "TIME_LORD", Name = "Pengendali Waktu (Time Lord)", Description = "Catat minimal 15 sesi timesheet dengan durasi terencana tanpa jeda kosong.", Category = "Timesheet", Icon = "hourglass", Color = "#06B6D4", Points = 200, Rarity = BadgeRarity.Rare, OrderIndex = 43 },
            new MasterBadge { Code = "SPRINT_CHAMPION", Name = "Kampiun Sprint Cepat", Description = "Selesaikan minimal 3 tugas berstatus Done dalam kurun waktu 1 hari yang sama.", Category = "Tugas", Icon = "zap", Color = "#EC4899", Points = 250, Rarity = BadgeRarity.Epic, OrderIndex = 44 },
            new MasterBadge { Code = "BUG_HUNTER", Name = "Pemburu Kutu Kode (Bug Hunter)", Description = "Tuntaskan tugas yang memuat kendala bug, fix, atau penyelesaian isu teknis.", Category = "Tugas", Icon = "shield-alert", Color = "#EF4444", Points = 150, Rarity = BadgeRarity.Rare, OrderIndex = 45 },
            new MasterBadge { Code = "CLEAN_SWEEPER", Name = "Sapu Bersih Backlog", Description = "Tuntaskan semua sub-tugas yang terdaftar hingga mencapai 100% tuntas.", Category = "Tugas", Icon = "sparkles", Color = "#10B981", Points = 200, Rarity = BadgeRarity.Rare, OrderIndex = 46 },
            new MasterBadge { Code = "DOCUMENTATION_GURU", Name = "Kamus Berjalan (Doc Guru)", Description = "Buat catatan kerja (WorkNotes) yang dilengkapi lampiran berkas dokumen/gambar.", Category = "Catatan", Icon = "paperclip", Color = "#6366F1", Points = 200, Rarity = BadgeRarity.Rare, OrderIndex = 47 },
            new MasterBadge { Code = "MARATHONER", Name = "Pelari Maraton Fokus", Description = "Selesaikan sesi fokus kerja timesheet berdurasi minimal 3 jam berturut-turut tanpa jeda.", Category = "Timesheet", Icon = "flame", Color = "#F97316", Points = 250, Rarity = BadgeRarity.Epic, OrderIndex = 48 },
            new MasterBadge { Code = "PERFECT_ATTENDANCE", Name = "Presensi Tanpa Cela", Description = "Catat kehadiran kerja sebanyak 20 hari tanpa ada status terlambat atau alpa.", Category = "Presensi", Icon = "award", Color = "#10B981", Points = 350, Rarity = BadgeRarity.Epic, OrderIndex = 49 },
            new MasterBadge { Code = "TASK_CRUSHER", Name = "Penghancur Target Urgent", Description = "Selesaikan tugas berprioritas Urgent / High dengan sukses tepat waktu.", Category = "Tugas", Icon = "target", Color = "#DC2626", Points = 200, Rarity = BadgeRarity.Rare, OrderIndex = 50 },
            new MasterBadge { Code = "TEAM_CATALYST", Name = "Katalisator Tim", Description = "Berkontribusi aktif dan menyelesaikan tugas di minimal 2 proyek berbeda.", Category = "Prestasi", Icon = "users", Color = "#3B82F6", Points = 300, Rarity = BadgeRarity.Epic, OrderIndex = 51 },
            new MasterBadge { Code = "CONSISTENCY_KING", Name = "Raja Konsistensi 21 Hari", Description = "Pertahankan streak daily check-in selama 21 hari pembentukan kebiasaan emas.", Category = "Streak", Icon = "crown", Color = "#EAB308", Points = 500, Rarity = BadgeRarity.Legendary, OrderIndex = 52 },
            new MasterBadge { Code = "MILESTONE_MASTER", Name = "Penakluk Milestone", Description = "Selesaikan tugas yang terhubung langsung dengan target Milestone proyek.", Category = "Prestasi", Icon = "flag", Color = "#8B5CF6", Points = 200, Rarity = BadgeRarity.Rare, OrderIndex = 53 },
            new MasterBadge { Code = "ZEN_WORKER", Name = "Fokus Zen Bebas Hambatan", Description = "Selesaikan 10 tugas kerja dengan lancar tanpa hambatan.", Category = "Tugas", Icon = "smile", Color = "#06B6D4", Points = 200, Rarity = BadgeRarity.Rare, OrderIndex = 54 },
            new MasterBadge { Code = "LIFELONG_LEARNER", Name = "Pembelajar Sejati", Description = "Tulis catatan kerja bertema riset, SOP, panduan teknis, atau dokumentasi arsitektur.", Category = "Catatan", Icon = "book-marked", Color = "#14B8A6", Points = 150, Rarity = BadgeRarity.Rare, OrderIndex = 55 },

            // Kategori: Waktu Aplikasi & Ketekunan (Screen Time & Dedikasi) (56-60)
            new MasterBadge { Code = "APP_HOURS_5", Name = "Kenalan Sama Sistem", Description = "Gunakan aplikasi secara produktif selama total 5 jam.", Category = "Aplikasi", Icon = "monitor", Color = "#3B82F6", Points = 50, Rarity = BadgeRarity.Common, OrderIndex = 56 },
            new MasterBadge { Code = "APP_HOURS_25", Name = "Sahabat Workspace", Description = "Catat 25 jam waktu aktifitas di dalam aplikasi kerja.", Category = "Aplikasi", Icon = "layout", Color = "#10B981", Points = 150, Rarity = BadgeRarity.Common, OrderIndex = 57 },
            new MasterBadge { Code = "APP_HOURS_100", Name = "Penghuni Tetap Dashboard", Description = "Tembus akumulasi 100 jam pemakaian aplikasi.", Category = "Aplikasi", Icon = "zap", Color = "#6366F1", Points = 400, Rarity = BadgeRarity.Rare, OrderIndex = 58 },
            new MasterBadge { Code = "APP_HOURS_250", Name = "Ksatria Layar Kaca", Description = "Tembus 250 jam aktif! Anda adalah veteran pengguna TaskWorkerPro.", Category = "Aplikasi", Icon = "crown", Color = "#8B5CF6", Points = 1000, Rarity = BadgeRarity.Epic, OrderIndex = 59 },
            new MasterBadge { Code = "MARATHON_FOKUS", Name = "Maraton Fokus Deep Work", Description = "Selesaikan sesi kerja fokus tanpa henti selama 3 jam (10.800 detik).", Category = "Timesheet", Icon = "flame", Color = "#EF4444", Points = 200, Rarity = BadgeRarity.Rare, OrderIndex = 60 },

            // Kategori: Pembuatan Tugas & Inisiatif (61-65)
            new MasterBadge { Code = "TASK_CREATE_1", Name = "Pencetus Inisiatif", Description = "Buat dan daftarkan tugas kerja pertama ke dalam sistem.", Category = "Inisiatif", Icon = "folder-plus", Color = "#10B981", Points = 25, Rarity = BadgeRarity.Common, OrderIndex = 61 },
            new MasterBadge { Code = "TASK_CREATE_10", Name = "Perancang Solusi", Description = "Inisiasi 10 tugas kerja untuk menggerakkan proyek tim.", Category = "Inisiatif", Icon = "clipboard-list", Color = "#06B6D4", Points = 100, Rarity = BadgeRarity.Common, OrderIndex = 62 },
            new MasterBadge { Code = "TASK_CREATE_25", Name = "Arsitek Pekerjaan", Description = "Buat 25 tugas kerja terstruktur untuk meningkatkan kapabilitas sprint.", Category = "Inisiatif", Icon = "layers", Color = "#3B82F6", Points = 250, Rarity = BadgeRarity.Rare, OrderIndex = 63 },
            new MasterBadge { Code = "TASK_CREATE_50", Name = "Inisiator Ulung", Description = "Rancang 50 tugas kerja dengan perencanaan matang dan terarah.", Category = "Inisiatif", Icon = "sparkles", Color = "#8B5CF6", Points = 500, Rarity = BadgeRarity.Epic, OrderIndex = 64 },
            new MasterBadge { Code = "TASK_CREATE_100", Name = "Master Konseptor", Description = "Inisiasi 100 tugas kerja! Anda adalah otak pergerakan ritme operasional tim.", Category = "Inisiatif", Icon = "crown", Color = "#F59E0B", Points = 1000, Rarity = BadgeRarity.Legendary, OrderIndex = 65 },

            // Kategori: Frekuensi & Kedisiplinan Timesheet (66-70)
            new MasterBadge { Code = "TIMESHEET_LOG_3", Name = "Pencatat Konsisten", Description = "Simpan minimal 3 sesi lembar timesheet ke dalam sistem.", Category = "Timesheet", Icon = "clock", Color = "#10B981", Points = 30, Rarity = BadgeRarity.Common, OrderIndex = 66 },
            new MasterBadge { Code = "TIMESHEET_LOG_15", Name = "Disiplin Waktu", Description = "Lakukan 15 kali pencatatan sesi kerja di lembar timesheet.", Category = "Timesheet", Icon = "timer", Color = "#3B82F6", Points = 150, Rarity = BadgeRarity.Common, OrderIndex = 67 },
            new MasterBadge { Code = "TIMESHEET_LOG_50", Name = "Master Timesheet", Description = "Akumulasi 50 sesi timesheet tersimpan rapi dan akurat.", Category = "Timesheet", Icon = "hourglass", Color = "#6366F1", Points = 400, Rarity = BadgeRarity.Rare, OrderIndex = 68 },
            new MasterBadge { Code = "TIMESHEET_LOG_100", Name = "Centurion Presisi", Description = "Tembus 100 sesi timesheet! Komitmen akurasi waktu kerja kelas dunia.", Category = "Timesheet", Icon = "award", Color = "#8B5CF6", Points = 800, Rarity = BadgeRarity.Epic, OrderIndex = 69 },
            new MasterBadge { Code = "TIMESHEET_LOG_250", Name = "Legenda Akurasi", Description = "250 sesi timesheet tercatat sempurna. Standar keteladanan tertinggi.", Category = "Timesheet", Icon = "shield-check", Color = "#F59E0B", Points = 1500, Rarity = BadgeRarity.Legendary, OrderIndex = 70 },

            // Kategori: Prestasi Kreatif & Gaya Kerja (71-76)
            new MasterBadge { Code = "EARLY_BIRD", Name = "Burung Pagi (Early Bird)", Description = "Mulai kerja atau lakukan Clock-In sebelum pukul 08:00 pagi.", Category = "Presensi", Icon = "sun", Color = "#F59E0B", Points = 75, Rarity = BadgeRarity.Common, OrderIndex = 71 },
            new MasterBadge { Code = "NIGHT_OWL", Name = "Burung Hantu (Night Owl)", Description = "Selesaikan tugas atau catat sesi produktif di atas pukul 21:00 malam.", Category = "Timesheet", Icon = "moon", Color = "#6366F1", Points = 75, Rarity = BadgeRarity.Common, OrderIndex = 72 },
            new MasterBadge { Code = "SAME_DAY_FINISHER", Name = "Kilat Satu Hari (Same-Day Finisher)", Description = "Buat dan selesaikan tugas hingga status Done pada hari yang sama.", Category = "Tugas", Icon = "zap", Color = "#10B981", Points = 100, Rarity = BadgeRarity.Rare, OrderIndex = 73 },
            new MasterBadge { Code = "BUG_EXTERMINATOR", Name = "Pembasmi Kutu (Bug Exterminator)", Description = "Selesaikan 5 tugas perbaikan bug atau troubleshooting sistem.", Category = "Developer", Icon = "shield-alert", Color = "#EF4444", Points = 150, Rarity = BadgeRarity.Rare, OrderIndex = 74 },
            new MasterBadge { Code = "MULTI_PROJECT", Name = "Penjelajah Proyek", Description = "Selesaikan tugas kerja di minimal 3 proyek yang berbeda.", Category = "Prestasi", Icon = "compass", Color = "#06B6D4", Points = 200, Rarity = BadgeRarity.Rare, OrderIndex = 75 },
            new MasterBadge { Code = "ZERO_OVERDUE", Name = "Pemberantas Tenggat (Zero Overdue)", Description = "Selesaikan minimal 20 tugas dengan nol tugas berstatus terlambat (overdue).", Category = "Prestasi", Icon = "check-check", Color = "#10B981", Points = 350, Rarity = BadgeRarity.Epic, OrderIndex = 76 }
        };

        var existingCodes = await context.MasterBadges.Select(b => b.Code).ToListAsync();
        var existingSet = new HashSet<string>(existingCodes, StringComparer.OrdinalIgnoreCase);
        var missingBadges = badges.Where(b => !existingSet.Contains(b.Code)).ToList();

        if (missingBadges.Count > 0)
        {
            context.MasterBadges.AddRange(missingBadges);
            await context.SaveChangesAsync();
        }

        // 4. Pastikan Katalog Hadiah Nyata (FSD 5.20.5 & 5.20.6)
        if (!await context.RewardItems.AnyAsync())
        {
            var rewards = new List<RewardItem>
            {
                new RewardItem { Name = "Voucher Kopi Kenangan / Janji Jiwa 50K", Description = "Voucher digital belanja kopi favorit senilai Rp 50.000.", PointCost = 500, Stock = 50, Category = "F&B", Icon = "coffee", Color = "#10B981", IsActive = true, IsMonthlyMilestoneReward = false, OrderIndex = 1 },
                new RewardItem { Name = "Saldo E-Wallet GoPay / OVO Rp 100.000", Description = "Transfer saldo dompet digital langsung ke nomor ponsel Anda.", PointCost = 1000, Stock = 30, Category = "E-Wallet", Icon = "wallet", Color = "#3B82F6", IsActive = true, IsMonthlyMilestoneReward = false, OrderIndex = 2 },
                new RewardItem { Name = "Tumbler Stainless Steel TrackerKerja Pro", Description = "Botol minum eksklusif insulasi suhu panas & dingin 500ml.", PointCost = 1500, Stock = 20, Category = "Merchandise", Icon = "glass-water", Color = "#6366F1", IsActive = true, IsMonthlyMilestoneReward = false, OrderIndex = 3 },
                new RewardItem { Name = "T-Shirt Developer 'Si Paling Done' Exclusive", Description = "Kaos katun combed 30s premium dengan sablon tipografi modern.", PointCost = 2000, Stock = 15, Category = "Merchandise", Icon = "shirt", Color = "#8B5CF6", IsActive = true, IsMonthlyMilestoneReward = false, OrderIndex = 4 },
                new RewardItem { Name = "Wireless Bluetooth ANC Earbuds", Description = "Headset nirkabel dengan fitur Active Noise Cancelling untuk fokus kerja.", PointCost = 3500, Stock = 10, Category = "Gadget", Icon = "headphones", Color = "#EC4899", IsActive = true, IsMonthlyMilestoneReward = false, OrderIndex = 5 },
                new RewardItem { Name = "Mechanical Keyboard RGB Hot-Swappable", Description = "Keyboard mekanik 75% khusus pencapai Monthly Streak 30 Hari.", PointCost = 5000, Stock = 5, Category = "Gadget", Icon = "keyboard", Color = "#F59E0B", IsActive = true, IsMonthlyMilestoneReward = true, OrderIndex = 6 }
            };

            context.RewardItems.AddRange(rewards);
            await context.SaveChangesAsync();
        }

        // 5. Pastikan Master Prioritas Default (FSD Master Data)
        if (!await context.MasterPriorities.AnyAsync())
        {
            var priorities = new List<MasterPriority>
            {
                new MasterPriority { Name = "Rendah", Color = "#10B981", Icon = "flag", OrderIndex = 1, Description = "Tugas dengan urgensi rendah dan waktu penyelesaian fleksibel.", IsDefault = false },
                new MasterPriority { Name = "Sedang", Color = "#3B82F6", Icon = "flag", OrderIndex = 2, Description = "Tugas standar operasional sehari-hari.", IsDefault = true },
                new MasterPriority { Name = "Tinggi", Color = "#F59E0B", Icon = "flag", OrderIndex = 3, Description = "Tugas dengan prioritas dan dampak penting bagi sistem.", IsDefault = false },
                new MasterPriority { Name = "Kritis", Color = "#EF4444", Icon = "alert-triangle", OrderIndex = 4, Description = "Tugas darurat/blocking yang membutuhkan penanganan segera.", IsDefault = false }
            };

            context.MasterPriorities.AddRange(priorities);
            await context.SaveChangesAsync();
        }

        // 6. Pastikan Master Status Default (FSD Master Data)
        if (!await context.MasterStatuses.AnyAsync())
        {
            var statuses = new List<MasterStatus>
            {
                new MasterStatus { Name = "To Do", Color = "#64748B", IsDoneState = false, OrderIndex = 1, Description = "Tugas baru siap dikerjakan.", IsDefault = true },
                new MasterStatus { Name = "In Progress", Color = "#6366F1", IsDoneState = false, OrderIndex = 2, Description = "Tugas sedang dalam pengerjaan aktif.", IsDefault = false },
                new MasterStatus { Name = "Done", Color = "#10B981", IsDoneState = true, OrderIndex = 3, Description = "Tugas telah selesai dikerjakan dan diverifikasi.", IsDefault = false },
                new MasterStatus { Name = "Overdue", Color = "#EF4444", IsDoneState = false, OrderIndex = 4, Description = "Tugas telah melampaui tenggat waktu.", IsDefault = false }
            };

            context.MasterStatuses.AddRange(statuses);
            await context.SaveChangesAsync();
        }

        // 7. Pastikan Master Milestone Default SDLC (FSD Master Data)
        if (!await context.MasterMilestones.AnyAsync())
        {
            var milestones = new List<MasterMilestone>
            {
                new MasterMilestone { Name = "Perencanaan", Phase = "Planning", Color = "#6366F1", Icon = "calendar", OrderIndex = 1, Description = "Tahap inisiasi, analisis kebutuhan dan spesifikasi.", IsDefault = false },
                new MasterMilestone { Name = "Analisis & Desain", Phase = "Design", Color = "#8B5CF6", Icon = "layout", OrderIndex = 2, Description = "Perancangan arsitektur, UI/UX, dan flow sistem.", IsDefault = false },
                new MasterMilestone { Name = "Pengembangan", Phase = "Implementation", Color = "#3B82F6", Icon = "code", OrderIndex = 3, Description = "Eksekusi penulisan kode program dan modul fitur.", IsDefault = true },
                new MasterMilestone { Name = "Pengujian QA", Phase = "Testing", Color = "#F59E0B", Icon = "check-circle", OrderIndex = 4, Description = "Uji coba fungsionalitas, bug fixing, dan verifikasi kualitas.", IsDefault = false },
                new MasterMilestone { Name = "Rilis Produksi", Phase = "Deployment", Color = "#10B981", Icon = "rocket", OrderIndex = 5, Description = "Deployment ke server staging/production dan serah terima.", IsDefault = false },
                new MasterMilestone { Name = "Pemeliharaan", Phase = "Maintenance", Color = "#06B6D4", Icon = "settings", OrderIndex = 6, Description = "Monitoring pasca-rilis, optimasi berkala, dan dukungan operasional.", IsDefault = false }
            };

            context.MasterMilestones.AddRange(milestones);
            await context.SaveChangesAsync();
        }

        // 8. Pastikan Kategori Tugas Standar (FSD Master Data)
        if (!await context.Categories.AnyAsync())
        {
            var defaultCategories = new List<Category>
            {
                new Category { Name = "Pengembangan Fitur", Color = "#3B82F6", Description = "Pembuatan atau penambahan fitur baru aplikasi.", CreatedAt = DateTimeOffset.UtcNow },
                new Category { Name = "Perbaikan Bug", Color = "#EF4444", Description = "Investigasi dan perbaikan kesalahan teknis atau bug.", CreatedAt = DateTimeOffset.UtcNow },
                new Category { Name = "Infrastruktur & DevOps", Color = "#8B5CF6", Description = "Pengaturan server, database, security, dan pipeline CI/CD.", CreatedAt = DateTimeOffset.UtcNow },
                new Category { Name = "Dokumentasi & Riset", Color = "#10B981", Description = "Penyusunan SOP, dokumen teknis, riset tools atau benchmarking.", CreatedAt = DateTimeOffset.UtcNow },
                new Category { Name = "Desain & UI/UX", Color = "#EC4899", Description = "Eksplorasi wireframe, prototipe, dan aset visual antarmuka.", CreatedAt = DateTimeOffset.UtcNow }
            };

            context.Categories.AddRange(defaultCategories);
            await context.SaveChangesAsync();
        }

        // 9. Inisialisasi Otomatis Data Tugas dari Task Tracker v2.xlsx Jika Tabel Kosong
        await AutoSeedTaskTrackerExcelAsync(context, excelImportService);

        // 10. Inisialisasi Otomatis Presensi Kehadiran Anggota (1 Agustus 2026 s/d 25 Oktober 2026)
        await AutoSeedAttendancesAsync(context);

        // 11. Inisialisasi Otomatis Master Data Hari Libur Nasional 2026 Jika Kosong
        await AutoSeedHolidaysAsync(context);
    }

    private static async Task AutoSeedTaskTrackerExcelAsync(AppDbContext context, ITaskExcelImportService? excelImportService)
    {
        if (await context.Tasks.AnyAsync()) return;

        var candidatePaths = new[]
        {
            "/app/seed-data/Task Tracker v2.xlsx",
            Path.Combine(AppContext.BaseDirectory, "seed-data/Task Tracker v2.xlsx"),
            Path.Combine(Directory.GetCurrentDirectory(), "Sample Source DB/Task Tracker v2.xlsx"),
            Path.Combine(AppContext.BaseDirectory, "../../../../../Sample Source DB/Task Tracker v2.xlsx"),
            Path.Combine(AppContext.BaseDirectory, "../../../../Sample Source DB/Task Tracker v2.xlsx"),
            "/Users/mac/Projects/2026/taskpro/TaskWorkerPro/Sample Source DB/Task Tracker v2.xlsx"
        };

        string? foundPath = candidatePaths.FirstOrDefault(File.Exists);
        if (foundPath == null) return;

        try
        {
            var service = excelImportService ?? new TaskExcelImportService(context);
            using var fileStream = File.OpenRead(foundPath);
            var preview = await service.PreviewImportAsync(fileStream, Path.GetFileName(foundPath), companyId: 1);

            var commitReq = new TaskImportCommitRequest(
                DefaultProjectId: null,
                BulkAssignUserId: null,
                SelectedRowIndexes: null,
                Rows: preview.Rows,
                AutoCreateMissingUsers: true,
                DefaultJobTitle: "Staff Pelaksana",
                DefaultPassword: "TrackerKerja2026!",
                EmailDomain: "elistec.com",
                AutoApproveNewUsers: true
            );

            await service.CommitImportAsync(commitReq, companyId: 1);
        }
        catch
        {
            // Abaikan kesalahan auto-import jika file rusak atau tidak diizinkan agar startup tetap berjalan
        }
    }

    private static async Task AutoSeedAttendancesAsync(AppDbContext context)
    {
        if (await context.Attendances.AnyAsync()) return;

        // Ambil seluruh user anggota tim di perusahaan (kecuali user pending)
        var users = await context.Users
            .Where(u => u.Id != "usr-pending" && (u.CompanyId == 1 || u.CompanyId == null))
            .ToListAsync();

        if (!users.Any()) return;

        var startDate = new DateOnly(2026, 8, 1);
        var endDate = new DateOnly(2026, 10, 25);
        var rand = new Random(42);
        var attendances = new List<Attendance>();

        for (var cur = startDate; cur <= endDate; cur = cur.AddDays(1))
        {
            if (cur.DayOfWeek == DayOfWeek.Saturday || cur.DayOfWeek == DayOfWeek.Sunday)
            {
                continue;
            }

            foreach (var user in users)
            {
                int inTotalSec = (7 * 3600) + (30 * 60) + (rand.Next(0, 61) * 60) + rand.Next(0, 60);
                var inTime = new TimeOnly(inTotalSec / 3600, (inTotalSec % 3600) / 60, inTotalSec % 60);

                int outTotalSec = (17 * 3600) + (rand.Next(0, 56) * 60) + rand.Next(0, 60);
                var outTime = new TimeOnly(outTotalSec / 3600, (outTotalSec % 3600) / 60, outTotalSec % 60);

                var clockIn = new DateTimeOffset(cur.Year, cur.Month, cur.Day, inTime.Hour, inTime.Minute, inTime.Second, TimeSpan.FromHours(7));
                var clockOut = new DateTimeOffset(cur.Year, cur.Month, cur.Day, outTime.Hour, outTime.Minute, outTime.Second, TimeSpan.FromHours(7));

                var totalHours = Math.Round((clockOut - clockIn).TotalHours, 2);
                var workLocation = rand.NextDouble() < 0.70 ? WorkLocation.WFO : WorkLocation.WFH;
                var locLabel = workLocation == WorkLocation.WFO ? "WFO Kantor Pusat" : "WFH Reguler";

                attendances.Add(new Attendance
                {
                    UserId = user.Id,
                    Date = cur,
                    Type = AttendanceType.Present,
                    WorkLocation = workLocation,
                    ClockIn = clockIn,
                    ClockOut = clockOut,
                    TotalHours = totalHours,
                    Notes = $"Presensi kerja reguler {locLabel}",
                    Status = 1,
                    CreatedAt = clockIn,
                    UpdatedAt = clockOut
                });
            }
        }

        if (attendances.Any())
        {
            context.Attendances.AddRange(attendances);
            await context.SaveChangesAsync();
        }
    }

    public static async Task AutoSeedHolidaysAsync(AppDbContext context, int year = 2026)
    {
        if (await context.Holidays.IgnoreQueryFilters().AnyAsync(h => h.IsNational && h.Date.Year == year)) return;

        var nationalHolidays = GetDefaultNationalHolidays(year);
        if (nationalHolidays.Any())
        {
            context.Holidays.AddRange(nationalHolidays);
            await context.SaveChangesAsync();
        }
    }

    public static List<Holiday> GetDefaultNationalHolidays(int year = 2026)
    {
        if (year != 2026) return new List<Holiday>();

        return new List<Holiday>
        {
            new Holiday { Date = new DateOnly(2026, 1, 1), Name = "Tahun Baru 2026 Masehi", Description = "Tahun Baru Masehi", IsNational = true },
            new Holiday { Date = new DateOnly(2026, 1, 16), Name = "Isra Mi'raj Nabi Muhammad SAW", Description = "Peringatan Isra Mi'raj", IsNational = true },
            new Holiday { Date = new DateOnly(2026, 2, 17), Name = "Tahun Baru Imlek 2577 Kongzili", Description = "Tahun Baru Imlek", IsNational = true },
            new Holiday { Date = new DateOnly(2026, 3, 20), Name = "Hari Suci Nyepi (Tahun Baru Saka 1948)", Description = "Hari Suci Nyepi", IsNational = true },
            new Holiday { Date = new DateOnly(2026, 3, 21), Name = "Hari Raya Idul Fitri 1447 Hijriah (Hari 1)", Description = "Idul Fitri 1447 H", IsNational = true },
            new Holiday { Date = new DateOnly(2026, 3, 22), Name = "Hari Raya Idul Fitri 1447 Hijriah (Hari 2)", Description = "Idul Fitri 1447 H", IsNational = true },
            new Holiday { Date = new DateOnly(2026, 4, 3), Name = "Wafat Yesus Kristus (Jumat Agung)", Description = "Wafat Yesus Kristus", IsNational = true },
            new Holiday { Date = new DateOnly(2026, 5, 1), Name = "Hari Buruh Internasional", Description = "May Day", IsNational = true },
            new Holiday { Date = new DateOnly(2026, 5, 14), Name = "Kenaikan Yesus Kristus", Description = "Kenaikan Yesus Kristus", IsNational = true },
            new Holiday { Date = new DateOnly(2026, 5, 27), Name = "Hari Raya Idul Adha 1447 Hijriah", Description = "Idul Adha 1447 H", IsNational = true },
            new Holiday { Date = new DateOnly(2026, 5, 31), Name = "Hari Raya Waisak 2570 BE", Description = "Hari Raya Waisak", IsNational = true },
            new Holiday { Date = new DateOnly(2026, 6, 1), Name = "Hari Lahir Pancasila", Description = "Hari Lahir Pancasila", IsNational = true },
            new Holiday { Date = new DateOnly(2026, 6, 16), Name = "Tahun Baru Islam 1448 Hijriah", Description = "1 Muharram 1448 H", IsNational = true },
            new Holiday { Date = new DateOnly(2026, 8, 17), Name = "Hari Proklamasi Kemerdekaan RI", Description = "HUT RI ke-81", IsNational = true },
            new Holiday { Date = new DateOnly(2026, 8, 25), Name = "Maulid Nabi Muhammad SAW", Description = "Peringatan Maulid Nabi", IsNational = true },
            new Holiday { Date = new DateOnly(2026, 12, 25), Name = "Hari Raya Natal", Description = "Hari Raya Natal", IsNational = true }
        };
    }
}
