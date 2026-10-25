using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Xunit;
using Xunit.Abstractions;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Domain.Enums;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.Infrastructure.Services;

namespace TrackerKerja.Tests;

public class GenerateDockerSeedScriptTests
{
    private readonly ITestOutputHelper _output;

    public GenerateDockerSeedScriptTests(ITestOutputHelper output)
    {
        _output = output;
    }

    [Fact]
    public async Task GenerateFullDemoSeedSqlFromTaskTrackerV2()
    {
        var excelPath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../Sample Source DB/Task Tracker v2.xlsx"));
        if (!File.Exists(excelPath))
        {
            excelPath = @"/Users/mac/Projects/2026/taskpro/TaskWorkerPro/Sample Source DB/Task Tracker v2.xlsx";
        }
        Assert.True(File.Exists(excelPath), $"File not found at: {excelPath}");

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        using var context = new AppDbContext(options);

        // Seed Company 1
        var company = new Company
        {
            Id = 1,
            Name = "Wahana Central Holding",
            Code = "WCH",
            Description = "Headquarter Enterprise Organization",
            Address = "Jakarta, Indonesia",
            ContactEmail = "admin@trackerkerja.local"
        };
        context.Companies.Add(company);
        await context.SaveChangesAsync();

        var importService = new TaskExcelImportService(context);
        using var stream = File.OpenRead(excelPath);
        var preview = await importService.PreviewImportAsync(stream, "Task Tracker v2.xlsx", companyId: 1);

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

        var commitRes = await importService.CommitImportAsync(commitReq, companyId: 1);
        _output.WriteLine($"Committed: {commitRes.TotalImported} tasks, {commitRes.TotalProjectsCreated} projects, {commitRes.TotalUsersCreated} users");

        var users = await context.Users.ToListAsync();
        var projects = await context.Projects.ToListAsync();
        var tasks = await context.Tasks.Include(t => t.Project).ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("-- ============================================================================");
        sb.AppendLine("-- TRACKERKERJA MODERN (WORK TRACKER PRO)");
        sb.AppendLine("-- REALISTIC SEED DATA DARI TASK TRACKER V2.XLSX & ATTENDANCES LENGKAP");
        sb.AppendLine("-- File: 03_demo_seed.sql");
        sb.AppendLine("-- ============================================================================");
        sb.AppendLine();

        // 1. Perusahaan (Company 2 NSD untuk testing isolasi tenant)
        sb.AppendLine("-- 1. PERUSAHAAN (TENANT)");
        sb.AppendLine("INSERT INTO companies (id, name, code, description, address, contact_email, created_at)");
        sb.AppendLine("VALUES (");
        sb.AppendLine("    2,");
        sb.AppendLine("    'PT Nusantara Solusi Digital',");
        sb.AppendLine("    'NSD',");
        sb.AppendLine("    'Mitra Konsultan Teknologi & Cloud Integration',");
        sb.AppendLine("    'Bandung, Jawa Barat, Indonesia',");
        sb.AppendLine("    'halo@nusantara-digital.id',");
        sb.AppendLine("    CURRENT_TIMESTAMP - INTERVAL '60 days'");
        sb.AppendLine(")");
        sb.AppendLine("ON CONFLICT (id) DO UPDATE SET");
        sb.AppendLine("    name = EXCLUDED.name,");
        sb.AppendLine("    code = EXCLUDED.code,");
        sb.AppendLine("    description = EXCLUDED.description;");
        sb.AppendLine();

        // Mapping user deterministic IDs
        var userMapping = new Dictionary<string, (string Id, string JobTitle, string RoleId)>
        {
            { "syafix.said@elistec.com", ("usr-syafix", "System Analyst & Project Specialist", "r-analyst") },
            { "athallah.bariq@elistec.com", ("usr-athallah", "Technical Writer & Documentation Lead", "r-writer") },
            { "haviz.indra@elistec.com", ("usr-haviz", "Lead Full-Stack Developer", "r-member") },
            { "mohammad.danang@elistec.com", ("usr-danang", "QA Automation & Performance Engineer", "r-member") },
            { "syifa.kurnia@elistec.com", ("usr-syifa", "Business Analyst & QA Specialist", "r-analyst") },
            { "iqbal.ali@elistec.com", ("usr-iqbal", "Senior Backend & Integration Engineer", "r-member") },
            { "glenn.hakim@elistec.com", ("usr-glenn", "Frontend & UI/UX Developer", "r-member") },
            { "heni.rahayu@elistec.com", ("usr-heni", "Database Administrator & Data Analyst", "r-member") },
        };

        // Static password hash for 'TrackerKerja2026!'
        var defaultPasswordHash = PasswordHasher.HashPassword("TrackerKerja2026!");

        // 2. Users
        sb.AppendLine("-- 2. PENGGUNA TIM (8 ANGGOTA TASK TRACKER V2 + PENGGUNA PENDUKUNG)");
        sb.AppendLine("INSERT INTO asp_net_users (");
        sb.AppendLine("    id, user_name, normalized_user_name, email, normalized_email, email_confirmed,");
        sb.AppendLine("    password_hash, security_stamp, concurrency_stamp, phone_number,");
        sb.AppendLine("    full_name, job_title, avatar_color, company_id, is_approved, approved_at, created_at");
        sb.AppendLine(") VALUES ");

        var userListForSql = new List<string>();
        foreach (var u in users)
        {
            var emailLower = u.Email?.ToLowerInvariant() ?? "";
            var (staticId, jobTitle, roleId) = userMapping.ContainsKey(emailLower)
                ? userMapping[emailLower]
                : (u.Id, u.JobTitle ?? "Staff Pelaksana", "r-member");

            var phone = "0812" + Math.Abs(emailLower.GetHashCode()).ToString().PadLeft(8, '0')[..8];

            userListForSql.Add($@"('{staticId}', '{emailLower}', '{emailLower.ToUpperInvariant()}', '{emailLower}', '{emailLower.ToUpperInvariant()}', true, '{defaultPasswordHash}', gen_random_uuid()::text, gen_random_uuid()::text, '{phone}', '{EscapeSql(u.FullName)}', '{EscapeSql(jobTitle)}', '{u.AvatarColor ?? "#3B82F6"}', 1, true, CURRENT_TIMESTAMP - INTERVAL '90 days', CURRENT_TIMESTAMP - INTERVAL '90 days')");
        }

        // Add 1 pending user and 1 external user for testing tenant isolation
        userListForSql.Add(@"('usr-pending', 'calon.member@trackerkerja.local', 'CALON.MEMBER@TRACKERKERJA.LOCAL', 'calon.member@trackerkerja.local', 'CALON.MEMBER@TRACKERKERJA.LOCAL', true, '" + defaultPasswordHash + @"', gen_random_uuid()::text, gen_random_uuid()::text, '081298765435', 'Ahmad Wahyudi (Pending Approval)', 'Junior Data Analyst', '#F59E0B', 1, false, null, CURRENT_TIMESTAMP - INTERVAL '1 days')");
        userListForSql.Add(@"('usr-eksternal', 'dev@nusantara.local', 'DEV@NUSANTARA.LOCAL', 'dev@nusantara.local', 'DEV@NUSANTARA.LOCAL', true, '" + defaultPasswordHash + @"', gen_random_uuid()::text, gen_random_uuid()::text, '081398765499', 'Doni Prakoso', 'External Cloud Engineer', '#06B6D4', 2, true, CURRENT_TIMESTAMP - INTERVAL '10 days', CURRENT_TIMESTAMP - INTERVAL '10 days')");

        sb.AppendLine(string.Join(",\n", userListForSql));
        sb.AppendLine("ON CONFLICT (id) DO UPDATE SET");
        sb.AppendLine("    full_name = EXCLUDED.full_name,");
        sb.AppendLine("    job_title = EXCLUDED.job_title,");
        sb.AppendLine("    password_hash = EXCLUDED.password_hash,");
        sb.AppendLine("    is_approved = EXCLUDED.is_approved;");
        sb.AppendLine();

        // Assign Roles
        sb.AppendLine("-- Assign User Roles");
        sb.AppendLine("INSERT INTO asp_net_user_roles (user_id, role_id) VALUES");
        var roleAssignments = new List<string>();
        foreach (var u in users)
        {
            var emailLower = u.Email?.ToLowerInvariant() ?? "";
            var (staticId, _, roleId) = userMapping.ContainsKey(emailLower)
                ? userMapping[emailLower]
                : (u.Id, "", "r-member");
            roleAssignments.Add($"('{staticId}', '{roleId}')");
        }
        roleAssignments.Add("('usr-pending', 'r-member')");
        roleAssignments.Add("('usr-eksternal', 'r-member')");
        sb.AppendLine(string.Join(",\n", roleAssignments));
        sb.AppendLine("ON CONFLICT (user_id, role_id) DO NOTHING;");
        sb.AppendLine();

        // 3. Projects
        sb.AppendLine("-- 3. PROYEK DARI TASK TRACKER V2 (20+ PROYEK ENTERPRISE)");
        sb.AppendLine("INSERT INTO projects (id, name, description, color, status, company_id, client_name, project_manager_id, budget, actual_cost, tags, deadline, created_at)");
        sb.AppendLine("VALUES");
        var projectColors = new[] { "#4F46E5", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#3B82F6", "#14B8A6", "#6366F1" };
        var projectSqlList = new List<string>();
        int pIdx = 0;
        foreach (var p in projects.OrderBy(p => p.Id))
        {
            var color = projectColors[pIdx % projectColors.Length];
            var pmId = "usr-syafix";
            var budget = 75000000.00 + (p.Id * 5000000.00);
            var actualCost = budget * 0.65;
            var deadline = "CURRENT_TIMESTAMP + INTERVAL '90 days'";
            var createdAt = "CURRENT_TIMESTAMP - INTERVAL '85 days'";

            projectSqlList.Add($@"({p.Id}, '{EscapeSql(p.Name)}', '{EscapeSql(p.Description ?? ("Modul proyek operasional " + p.Name))}', '{color}', 0, 1, 'PT Elistec Corpora', '{pmId}', {budget:F2}, {actualCost:F2}, 'enterprise,tracking,sdlc', {deadline}, {createdAt})");
            pIdx++;
        }
        sb.AppendLine(string.Join(",\n", projectSqlList));
        sb.AppendLine("ON CONFLICT (id) DO UPDATE SET");
        sb.AppendLine("    name = EXCLUDED.name,");
        sb.AppendLine("    description = EXCLUDED.description,");
        sb.AppendLine("    color = EXCLUDED.color;");
        sb.AppendLine();
        sb.AppendLine("SELECT setval('projects_id_seq', (SELECT MAX(id) FROM projects));");
        sb.AppendLine();

        // 4. Tasks (491 Tasks)
        sb.AppendLine("-- 4. TUGAS OPERASIONAL REALISTIS (491 TUGAS DARI TASK TRACKER V2.XLSX)");
        sb.AppendLine("INSERT INTO tasks (");
        sb.AppendLine("    id, title, description, priority, status, progress, milestone, obstacle, solution,");
        sb.AppendLine("    project_id, category_id, assigned_to_user_id, parent_task_id, company_id,");
        sb.AppendLine("    start_date, due_date, created_at, updated_at");
        sb.AppendLine(") VALUES");

        // Map assigned_to_user_id to static IDs
        var userIdToStaticId = users.ToDictionary(
            u => u.Id,
            u => userMapping.TryGetValue(u.Email?.ToLowerInvariant() ?? "", out var m) ? m.Id : u.Id
        );

        var taskSqlList = new List<string>();
        int taskIdCounter = 1;
        foreach (var t in tasks)
        {
            var staticUserId = t.AssignedToUserId != null && userIdToStaticId.TryGetValue(t.AssignedToUserId, out var sid)
                ? $"'{sid}'"
                : "NULL";

            int priorityInt = (int)t.Priority;
            int statusInt = (int)t.Status;
            int progress = t.Progress;

            var startDateStr = t.StartDate.HasValue
                ? $"'{t.StartDate.Value:yyyy-MM-dd HH:mm:ss}+07'"
                : "CURRENT_TIMESTAMP - INTERVAL '30 days'";
            var dueDateStr = t.DueDate.HasValue
                ? $"'{t.DueDate.Value:yyyy-MM-dd HH:mm:ss}+07'"
                : "CURRENT_TIMESTAMP + INTERVAL '14 days'";

            var obstacleStr = string.IsNullOrWhiteSpace(t.Obstacle) ? "NULL" : $"'{EscapeSql(t.Obstacle)}'";
            var solutionStr = string.IsNullOrWhiteSpace(t.Solution) ? "NULL" : $"'{EscapeSql(t.Solution)}'";
            var milestoneStr = string.IsNullOrWhiteSpace(t.Milestone) ? "NULL" : $"'{EscapeSql(t.Milestone)}'";
            var descStr = string.IsNullOrWhiteSpace(t.Description) ? "NULL" : $"'{EscapeSql(t.Description)}'";

            int categoryId = (taskIdCounter % 5) + 1; // 1..5

            taskSqlList.Add($@"({taskIdCounter}, '{EscapeSql(t.Title)}', {descStr}, {priorityInt}, {statusInt}, {progress}, {milestoneStr}, {obstacleStr}, {solutionStr}, {t.ProjectId}, {categoryId}, {staticUserId}, NULL, 1, {startDateStr}, {dueDateStr}, CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP)");
            taskIdCounter++;
        }

        sb.AppendLine(string.Join(",\n", taskSqlList));
        sb.AppendLine("ON CONFLICT (id) DO UPDATE SET");
        sb.AppendLine("    title = EXCLUDED.title,");
        sb.AppendLine("    status = EXCLUDED.status,");
        sb.AppendLine("    progress = EXCLUDED.progress,");
        sb.AppendLine("    priority = EXCLUDED.priority,");
        sb.AppendLine("    obstacle = EXCLUDED.obstacle,");
        sb.AppendLine("    solution = EXCLUDED.solution;");
        sb.AppendLine();
        sb.AppendLine("SELECT setval('tasks_id_seq', (SELECT MAX(id) FROM tasks));");
        sb.AppendLine();

        // 5. Attendances (From 2026-08-01 to 2026-10-25)
        sb.AppendLine("-- 5. DATA PRESENSI KEHADIRAN ANGGOTA (1 AGUSTUS 2026 S/D 25 OKTOBER 2026)");
        sb.AppendLine("-- Skema: Jam Masuk Random 07:30 - 08:30 WIB, Jam Pulang Random 17:00 - 17:55 WIB");
        sb.AppendLine("INSERT INTO attendances (user_id, date, type, work_location, clock_in, clock_out, total_hours, notes, status, created_at, updated_at)");
        sb.AppendLine("VALUES");

        var attendanceSqlList = new List<string>();
        var targetMembers = userMapping.Values.Select(v => v.Id).ToList();

        var startDate = new DateOnly(2026, 8, 1);
        var endDate = new DateOnly(2026, 10, 25);
        var rand = new Random(42); // deterministic seed for reproducibility

        for (var cur = startDate; cur <= endDate; cur = cur.AddDays(1))
        {
            // Skip weekend
            if (cur.DayOfWeek == DayOfWeek.Saturday || cur.DayOfWeek == DayOfWeek.Sunday)
            {
                continue;
            }

            foreach (var memberId in targetMembers)
            {
                // In: 07:30 to 08:30 -> 7:30 + rand(0..60) minutes, rand(0..59) seconds
                int inTotalSec = (7 * 3600) + (30 * 60) + (rand.Next(0, 61) * 60) + rand.Next(0, 60);
                var inTime = new TimeOnly(inTotalSec / 3600, (inTotalSec % 3600) / 60, inTotalSec % 60);

                // Out: 17:00 to 17:55 -> 17:00 + rand(0..55) minutes, rand(0..59) seconds
                int outTotalSec = (17 * 3600) + (rand.Next(0, 56) * 60) + rand.Next(0, 60);
                var outTime = new TimeOnly(outTotalSec / 3600, (outTotalSec % 3600) / 60, outTotalSec % 60);

                var clockInDt = new DateTime(cur.Year, cur.Month, cur.Day, inTime.Hour, inTime.Minute, inTime.Second);
                var clockOutDt = new DateTime(cur.Year, cur.Month, cur.Day, outTime.Hour, outTime.Minute, outTime.Second);

                var totalHours = Math.Round((clockOutDt - clockInDt).TotalHours, 2);
                int workLocation = rand.NextDouble() < 0.70 ? 1 : 2; // 70% WFO (1), 30% WFH (2)
                var locLabel = workLocation == 1 ? "WFO Kantor Pusat" : "WFH Reguler";

                // If today (2026-10-25), wait: 2026-10-25 is Sunday! But cur <= endDate
                var clockInStr = $"'{cur:yyyy-MM-dd} {inTime:HH:mm:ss}+07'";
                var clockOutStr = $"'{cur:yyyy-MM-dd} {outTime:HH:mm:ss}+07'";

                attendanceSqlList.Add($@"('{memberId}', '{cur:yyyy-MM-dd}', 1, {workLocation}, {clockInStr}, {clockOutStr}, {totalHours:F2}, 'Presensi kerja reguler {locLabel}', 1, {clockInStr}, {clockOutStr})");
            }
        }

        sb.AppendLine(string.Join(",\n", attendanceSqlList));
        sb.AppendLine("ON CONFLICT (user_id, date) DO NOTHING;");
        sb.AppendLine();
        sb.AppendLine("SELECT setval('attendances_id_seq', (SELECT COALESCE(MAX(id), 1) FROM attendances));");
        sb.AppendLine();

        // 6. Timesheet Sessions & Active Session
        sb.AppendLine("-- 6. SESI TIMESHEET HISTORIS & FLOATING TIMER");
        sb.AppendLine("INSERT INTO sessions (id, task_id, user_id, start_time, end_time, duration, notes, created_at)");
        sb.AppendLine("VALUES");
        sb.AppendLine("(1001, 1, 'usr-syafix', CURRENT_TIMESTAMP - INTERVAL '15 days 8 hours', CURRENT_TIMESTAMP - INTERVAL '15 days 4 hours', 14400, 'Analisis alur integrasi TCES dan TCIS', CURRENT_TIMESTAMP - INTERVAL '15 days 4 hours'),");
        sb.AppendLine("(1002, 2, 'usr-danang', CURRENT_TIMESTAMP - INTERVAL '14 days 7 hours', CURRENT_TIMESTAMP - INTERVAL '14 days 3 hours', 14400, 'Testing sanitasi URL evidence integrasi QA', CURRENT_TIMESTAMP - INTERVAL '14 days 3 hours'),");
        sb.AppendLine("(1003, 3, 'usr-athallah', CURRENT_TIMESTAMP - INTERVAL '12 days 8 hours', CURRENT_TIMESTAMP - INTERVAL '12 days 4 hours', 14400, 'Penyusunan BRD dan skenario integrasi API', CURRENT_TIMESTAMP - INTERVAL '12 days 4 hours'),");
        sb.AppendLine("(1004, 4, 'usr-haviz', CURRENT_TIMESTAMP - INTERVAL '10 days 8 hours', CURRENT_TIMESTAMP - INTERVAL '10 days 3 hours', 18000, 'Review arsitektur endpoint API Settlement Payment', CURRENT_TIMESTAMP - INTERVAL '10 days 3 hours'),");
        sb.AppendLine("(1005, 5, 'usr-superadmin', CURRENT_TIMESTAMP - INTERVAL '1 hours 15 minutes', NULL, 0, 'Sesi pengerjaan aktif: Refactoring webhook retry strategy', CURRENT_TIMESTAMP - INTERVAL '1 hours 15 minutes')");
        sb.AppendLine("ON CONFLICT (id) DO UPDATE SET notes = EXCLUDED.notes;");
        sb.AppendLine();
        sb.AppendLine("SELECT setval('sessions_id_seq', (SELECT MAX(id) FROM sessions));");
        sb.AppendLine();

        // 7. Catatan Kerja Dokumentasi (Notes)
        sb.AppendLine("-- 7. CATATAN KERJA DOKUMENTASI (NOTES)");
        sb.AppendLine("INSERT INTO notes (id, title, content_html, category, color, is_pinned, author_user_id, company_id, created_at)");
        sb.AppendLine("VALUES");
        sb.AppendLine("(1, 'Panduan Arsitektur & Clean Architecture .NET 8', '<h3>Struktur Arsitektur Enterprise</h3><p>Sistem dibangun dengan pemisahan 4 lapis Domain, Application, Infrastructure, dan WebApi.</p>', 'Backend', '#3B82F6', true, 'usr-superadmin', 1, CURRENT_TIMESTAMP - INTERVAL '14 days'),");
        sb.AppendLine("(2, 'Standard Operating Procedure (SOP) Deployment Docker Produksi', '<h3>Langkah Rilis Satu Perintah</h3><pre><code>docker compose up --build -d</code></pre>', 'DevOps', '#F59E0B', true, 'usr-superadmin', 1, CURRENT_TIMESTAMP - INTERVAL '10 days'),");
        sb.AppendLine("(3, 'Catatan Arsitektur Integrasi API TCES-TCIS', '<p>Pembahasan integrasi API quotation, simulasi asuransi, dan gateway settlement.</p>', 'Integrasi', '#10B981', false, 'usr-syafix', 1, CURRENT_TIMESTAMP - INTERVAL '7 days')");
        sb.AppendLine("ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;");
        sb.AppendLine();
        sb.AppendLine("SELECT setval('notes_id_seq', (SELECT MAX(id) FROM notes));");
        sb.AppendLine();

        // 8. Gamifikasi & Check-In Streak
        sb.AppendLine("-- 8. GAMIFIKASI & CHECK-IN STREAK");
        sb.AppendLine("INSERT INTO daily_check_ins (user_id, check_in_date, check_in_time, points_earned, streak_day, is_monthly_milestone, notes)");
        sb.AppendLine("VALUES");
        sb.AppendLine("('usr-superadmin', CURRENT_DATE - 7, CURRENT_TIMESTAMP - INTERVAL '7 days', 10, 1, false, 'Check-in hari ke-1'),");
        sb.AppendLine("('usr-superadmin', CURRENT_DATE - 6, CURRENT_TIMESTAMP - INTERVAL '6 days', 10, 2, false, 'Check-in hari ke-2'),");
        sb.AppendLine("('usr-superadmin', CURRENT_DATE - 5, CURRENT_TIMESTAMP - INTERVAL '5 days', 10, 3, false, 'Check-in hari ke-3'),");
        sb.AppendLine("('usr-superadmin', CURRENT_DATE - 4, CURRENT_TIMESTAMP - INTERVAL '4 days', 10, 4, false, 'Check-in hari ke-4'),");
        sb.AppendLine("('usr-superadmin', CURRENT_DATE - 3, CURRENT_TIMESTAMP - INTERVAL '3 days', 10, 5, false, 'Check-in hari ke-5'),");
        sb.AppendLine("('usr-superadmin', CURRENT_DATE - 2, CURRENT_TIMESTAMP - INTERVAL '2 days', 10, 6, false, 'Check-in hari ke-6'),");
        sb.AppendLine("('usr-superadmin', CURRENT_DATE - 1, CURRENT_TIMESTAMP - INTERVAL '1 days', 10, 7, false, 'Check-in hari ke-7 (Streak Flame)'),");
        sb.AppendLine("('usr-superadmin', CURRENT_DATE, CURRENT_TIMESTAMP, 10, 8, false, 'Check-in hari ke-8 aktif')");
        sb.AppendLine("ON CONFLICT (user_id, check_in_date) DO NOTHING;");
        sb.AppendLine();
        sb.AppendLine("INSERT INTO user_badges (user_id, badge_id, unlocked_at, is_featured, awarded_by)");
        sb.AppendLine("VALUES");
        sb.AppendLine("('usr-superadmin', 1, CURRENT_TIMESTAMP - INTERVAL '15 days', true, 'System Automation'),");
        sb.AppendLine("('usr-superadmin', 2, CURRENT_TIMESTAMP - INTERVAL '1 days', true, 'System Automation')");
        sb.AppendLine("ON CONFLICT (user_id, badge_id) DO NOTHING;");
        sb.AppendLine();

        // 9. Pengumuman
        sb.AppendLine("-- 9. PENGUMUMAN RESMI AKTIF (ANNOUNCEMENTS)");
        sb.AppendLine("INSERT INTO announcements (id, title, content, type, start_date, end_date, is_active, company_id, created_by_user_id, created_at)");
        sb.AppendLine("VALUES");
        sb.AppendLine("(1, 'Jadwal Pemeliharaan Terjadwal Database Server', 'Pemberitahuan optimalisasi database PostgreSQL 16 pada akhir pekan.', 'Informasi Penting', CURRENT_TIMESTAMP - INTERVAL '1 days', CURRENT_TIMESTAMP + INTERVAL '5 days', true, 1, 'usr-superadmin', CURRENT_TIMESTAMP - INTERVAL '1 days'),");
        sb.AppendLine("(2, 'Data Operasional Task Tracker v2 & Presensi Tim Terpasang', 'Sistem TrackerKerja telah mengimpor 491 tugas operasional dan presensi tim terpadu.', 'Pengumuman Umum', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP + INTERVAL '14 days', true, 1, 'usr-superadmin', CURRENT_TIMESTAMP - INTERVAL '2 days')");
        sb.AppendLine("ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content;");
        sb.AppendLine();
        sb.AppendLine("SELECT setval('announcements_id_seq', (SELECT MAX(id) FROM announcements));");
        sb.AppendLine("SELECT setval('master_priorities_id_seq', (SELECT MAX(id) FROM master_priorities));");
        sb.AppendLine("SELECT setval('master_statuses_id_seq', (SELECT MAX(id) FROM master_statuses));");
        sb.AppendLine("SELECT setval('master_milestones_id_seq', (SELECT MAX(id) FROM master_milestones));");
        sb.AppendLine("SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));");
        sb.AppendLine("SELECT setval('projects_id_seq', (SELECT MAX(id) FROM projects));");
        sb.AppendLine();
        sb.AppendLine("-- SEED DATA TASK TRACKER V2 & PRESENSI SELESAI");

        var sqlContent = sb.ToString();

        // Write to database/init/03_demo_seed.sql
        var targetSqlPath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../database/init/03_demo_seed.sql"));
        if (!File.Exists(targetSqlPath))
        {
            targetSqlPath = @"/Users/mac/Projects/2026/taskpro/TaskWorkerPro/database/init/03_demo_seed.sql";
        }
        await File.WriteAllTextAsync(targetSqlPath, sqlContent, Encoding.UTF8);

        _output.WriteLine($"Successfully generated SQL seed: {targetSqlPath} ({sqlContent.Length} chars, {attendanceSqlList.Count} attendances, {taskSqlList.Count} tasks)");
        Assert.True(File.Exists(targetSqlPath));
    }

    private static string EscapeSql(string? input)
    {
        if (input == null) return "";
        return input.Replace("'", "''");
    }
}
