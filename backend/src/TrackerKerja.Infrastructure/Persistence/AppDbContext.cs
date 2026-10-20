using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Domain.Entities;

namespace TrackerKerja.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    private readonly ICurrentTenantService? _tenantService;

    public AppDbContext(DbContextOptions<AppDbContext> options, ICurrentTenantService? tenantService = null)
        : base(options)
    {
        _tenantService = tenantService;
    }

    public DbSet<Company> Companies => Set<Company>();
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<UserRefreshToken> UserRefreshTokens => Set<UserRefreshToken>();
    public DbSet<MasterPriority> MasterPriorities => Set<MasterPriority>();
    public DbSet<MasterStatus> MasterStatuses => Set<MasterStatus>();
    public DbSet<MasterMilestone> MasterMilestones => Set<MasterMilestone>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();
    public DbSet<EmailTemplate> EmailTemplates => Set<EmailTemplate>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<WorkTask> Tasks => Set<WorkTask>();
    public DbSet<WorkSession> Sessions => Set<WorkSession>();
    public DbSet<Attendance> Attendances => Set<Attendance>();
    public DbSet<WorkNote> Notes => Set<WorkNote>();
    public DbSet<NoteAttachment> NoteAttachments => Set<NoteAttachment>();
    public DbSet<MasterBadge> MasterBadges => Set<MasterBadge>();
    public DbSet<UserBadge> UserBadges => Set<UserBadge>();
    public DbSet<DailyCheckIn> DailyCheckIns => Set<DailyCheckIn>();
    public DbSet<RewardItem> RewardItems => Set<RewardItem>();
    public DbSet<RewardClaim> RewardClaims => Set<RewardClaim>();
    public DbSet<Announcement> Announcements => Set<Announcement>();
    public DbSet<UserAnnouncementRead> UserAnnouncementReads => Set<UserAnnouncementRead>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<JsonHistory> JsonHistories => Set<JsonHistory>();
    public DbSet<SqlHistory> SqlHistories => Set<SqlHistory>();
    public DbSet<SyncHistory> SyncHistories => Set<SyncHistory>();
    public DbSet<UserBadgeSnapshot> UserBadgeSnapshots => Set<UserBadgeSnapshot>();
    public DbSet<ImportLog> ImportLogs => Set<ImportLog>();

    public int? CurrentCompanyId => _tenantService?.CompanyId;
    public bool IsCurrentUserAdmin => _tenantService?.IsAdmin ?? false;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // 1. Table Names Mapping
        modelBuilder.Entity<Company>().ToTable("companies");
        modelBuilder.Entity<AppUser>().ToTable("asp_net_users");
        modelBuilder.Entity<UserRefreshToken>().ToTable("user_refresh_tokens");
        modelBuilder.Entity<MasterPriority>().ToTable("master_priorities");
        modelBuilder.Entity<MasterStatus>().ToTable("master_statuses");
        modelBuilder.Entity<MasterMilestone>().ToTable("master_milestones");
        modelBuilder.Entity<Category>().ToTable("categories");
        modelBuilder.Entity<SystemSetting>().ToTable("system_settings");
        modelBuilder.Entity<EmailTemplate>().ToTable("email_templates");
        modelBuilder.Entity<Project>().ToTable("projects");
        modelBuilder.Entity<WorkTask>().ToTable("tasks");
        modelBuilder.Entity<WorkSession>().ToTable("sessions");
        modelBuilder.Entity<Attendance>().ToTable("attendances");
        modelBuilder.Entity<WorkNote>().ToTable("notes");
        modelBuilder.Entity<NoteAttachment>().ToTable("note_attachments");
        modelBuilder.Entity<MasterBadge>().ToTable("master_badges");
        modelBuilder.Entity<UserBadge>().ToTable("user_badges");
        modelBuilder.Entity<UserBadgeSnapshot>().ToTable("user_badge_snapshots");
        modelBuilder.Entity<DailyCheckIn>().ToTable("daily_check_ins");
        modelBuilder.Entity<RewardItem>().ToTable("reward_items");
        modelBuilder.Entity<RewardClaim>().ToTable("reward_claims");
        modelBuilder.Entity<Announcement>().ToTable("announcements");
        modelBuilder.Entity<UserAnnouncementRead>().ToTable("user_announcement_reads");
        modelBuilder.Entity<AuditLog>().ToTable("audit_logs");
        modelBuilder.Entity<JsonHistory>().ToTable("json_histories");
        modelBuilder.Entity<SqlHistory>().ToTable("sql_histories");
        modelBuilder.Entity<SyncHistory>().ToTable("sync_histories");
        modelBuilder.Entity<ImportLog>().ToTable("import_logs");

        // 2. Primary Keys & Unique Constraints
        modelBuilder.Entity<SystemSetting>().HasKey(s => s.Key);

        modelBuilder.Entity<Attendance>()
            .HasIndex(a => new { a.UserId, a.Date })
            .IsUnique();

        modelBuilder.Entity<DailyCheckIn>()
            .HasIndex(d => new { d.UserId, d.CheckInDate })
            .IsUnique();

        modelBuilder.Entity<UserBadge>()
            .HasIndex(ub => new { ub.UserId, ub.BadgeId })
            .IsUnique();

        modelBuilder.Entity<UserAnnouncementRead>()
            .HasIndex(uar => new { uar.AnnouncementId, uar.UserId })
            .IsUnique();

        // 3. Foreign Key Relationships
        modelBuilder.Entity<WorkTask>()
            .HasOne(t => t.ParentTask)
            .WithMany(t => t.Subtasks)
            .HasForeignKey(t => t.ParentTaskId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<WorkTask>()
            .HasOne(t => t.AssignedToUser)
            .WithMany(u => u.AssignedTasks)
            .HasForeignKey(t => t.AssignedToUserId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Project>()
            .HasOne(p => p.ProjectManager)
            .WithMany()
            .HasForeignKey(p => p.ProjectManagerId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<WorkSession>()
            .HasOne(s => s.Task)
            .WithMany(t => t.Sessions)
            .HasForeignKey(s => s.TaskId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<WorkNote>()
            .HasOne(n => n.AuthorUser)
            .WithMany(u => u.Notes)
            .HasForeignKey(n => n.AuthorUserId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<WorkNote>()
            .HasMany(n => n.Attachments)
            .WithOne(a => a.Note)
            .HasForeignKey(a => a.NoteId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<RewardClaim>()
            .HasOne(rc => rc.User)
            .WithMany(u => u.RewardClaims)
            .HasForeignKey(rc => rc.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<RewardClaim>()
            .HasOne(rc => rc.ProcessedByUser)
            .WithMany()
            .HasForeignKey(rc => rc.ProcessedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Attendance>()
            .HasOne(a => a.User)
            .WithMany(u => u.Attendances)
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Attendance>()
            .HasOne(a => a.ApprovedByUser)
            .WithMany()
            .HasForeignKey(a => a.ApprovedByUserId)
            .OnDelete(DeleteBehavior.SetNull);

        // 4. Multi-Tenancy Global Query Filter
        modelBuilder.Entity<WorkTask>().HasQueryFilter(t =>
            IsCurrentUserAdmin || CurrentCompanyId == null || t.CompanyId == CurrentCompanyId);

        modelBuilder.Entity<Project>().HasQueryFilter(p =>
            IsCurrentUserAdmin || CurrentCompanyId == null || p.CompanyId == CurrentCompanyId);

        modelBuilder.Entity<WorkNote>().HasQueryFilter(n =>
            IsCurrentUserAdmin || CurrentCompanyId == null || n.CompanyId == CurrentCompanyId);

        modelBuilder.Entity<Announcement>().HasQueryFilter(a =>
            IsCurrentUserAdmin || a.CompanyId == null || CurrentCompanyId == null || a.CompanyId == CurrentCompanyId);
    }
}
