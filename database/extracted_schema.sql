CREATE TABLE Announcements (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Title TEXT NOT NULL,
                Content TEXT NOT NULL,
                AnnouncementDate TEXT NOT NULL,
                EndDate TEXT NOT NULL,
                Status TEXT NOT NULL DEFAULT 'Pengumuman Umum',
                IsActive INTEGER NOT NULL DEFAULT 1,
                CreatedByUserId TEXT NULL,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NOT NULL,
                FOREIGN KEY (CreatedByUserId) REFERENCES AspNetUsers(Id) ON DELETE SET NULL
            );

========================================================

CREATE TABLE "AspNetRoleClaims" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_AspNetRoleClaims" PRIMARY KEY AUTOINCREMENT,
    "RoleId" TEXT NOT NULL,
    "ClaimType" TEXT NULL,
    "ClaimValue" TEXT NULL,
    CONSTRAINT "FK_AspNetRoleClaims_AspNetRoles_RoleId" FOREIGN KEY ("RoleId") REFERENCES "AspNetRoles" ("Id") ON DELETE CASCADE
);

========================================================

CREATE TABLE "AspNetRoles" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_AspNetRoles" PRIMARY KEY,
    "Name" TEXT NULL,
    "NormalizedName" TEXT NULL,
    "ConcurrencyStamp" TEXT NULL
);

========================================================

CREATE TABLE "AspNetUserClaims" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_AspNetUserClaims" PRIMARY KEY AUTOINCREMENT,
    "UserId" TEXT NOT NULL,
    "ClaimType" TEXT NULL,
    "ClaimValue" TEXT NULL,
    CONSTRAINT "FK_AspNetUserClaims_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
);

========================================================

CREATE TABLE "AspNetUserLogins" (
    "LoginProvider" TEXT NOT NULL,
    "ProviderKey" TEXT NOT NULL,
    "ProviderDisplayName" TEXT NULL,
    "UserId" TEXT NOT NULL,
    CONSTRAINT "PK_AspNetUserLogins" PRIMARY KEY ("LoginProvider", "ProviderKey"),
    CONSTRAINT "FK_AspNetUserLogins_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
);

========================================================

CREATE TABLE "AspNetUserRoles" (
    "UserId" TEXT NOT NULL,
    "RoleId" TEXT NOT NULL,
    CONSTRAINT "PK_AspNetUserRoles" PRIMARY KEY ("UserId", "RoleId"),
    CONSTRAINT "FK_AspNetUserRoles_AspNetRoles_RoleId" FOREIGN KEY ("RoleId") REFERENCES "AspNetRoles" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_AspNetUserRoles_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
);

========================================================

CREATE TABLE "AspNetUserTokens" (
    "UserId" TEXT NOT NULL,
    "LoginProvider" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "Value" TEXT NULL,
    CONSTRAINT "PK_AspNetUserTokens" PRIMARY KEY ("UserId", "LoginProvider", "Name"),
    CONSTRAINT "FK_AspNetUserTokens_AspNetUsers_UserId" FOREIGN KEY ("UserId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
);

========================================================

CREATE TABLE "AspNetUsers" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_AspNetUsers" PRIMARY KEY,
    "FullName" TEXT NOT NULL,
    "JobTitle" TEXT NOT NULL,
    "AvatarColor" TEXT NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UserName" TEXT NULL,
    "NormalizedUserName" TEXT NULL,
    "Email" TEXT NULL,
    "NormalizedEmail" TEXT NULL,
    "EmailConfirmed" INTEGER NOT NULL,
    "PasswordHash" TEXT NULL,
    "SecurityStamp" TEXT NULL,
    "ConcurrencyStamp" TEXT NULL,
    "PhoneNumber" TEXT NULL,
    "PhoneNumberConfirmed" INTEGER NOT NULL,
    "TwoFactorEnabled" INTEGER NOT NULL,
    "LockoutEnd" TEXT NULL,
    "LockoutEnabled" INTEGER NOT NULL,
    "AccessFailedCount" INTEGER NOT NULL
, "ProfilePictureUrl" TEXT NULL, CompanyId INTEGER, IsApproved INTEGER NOT NULL DEFAULT 1, ApprovedAt TEXT NULL, ApprovedByUserId TEXT NULL, RejectionReason TEXT NULL, CoverPictureUrl TEXT NULL);

========================================================

CREATE TABLE Attendances (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                UserId TEXT NOT NULL,
                Date TEXT NOT NULL,
                Type INTEGER NOT NULL DEFAULT 1,
                WorkLocation INTEGER NOT NULL DEFAULT 1,
                ClockIn TEXT NULL,
                ClockOut TEXT NULL,
                TotalHours REAL NOT NULL DEFAULT 0,
                LeaveReason TEXT NULL,
                Notes TEXT NULL,
                Status INTEGER NOT NULL DEFAULT 1,
                ApprovedByUserId TEXT NULL,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NOT NULL,
                FOREIGN KEY (UserId) REFERENCES AspNetUsers(Id) ON DELETE CASCADE,
                FOREIGN KEY (ApprovedByUserId) REFERENCES AspNetUsers(Id) ON DELETE SET NULL
            );

========================================================

CREATE TABLE "AuditLogs" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_AuditLogs" PRIMARY KEY AUTOINCREMENT,
    "UserId" TEXT NULL,
    "UserEmail" TEXT NULL,
    "UserName" TEXT NULL,
    "ControllerName" TEXT NOT NULL,
    "ActionName" TEXT NOT NULL,
    "HttpMethod" TEXT NOT NULL,
    "Path" TEXT NOT NULL,
    "QueryString" TEXT NULL,
    "IpAddress" TEXT NULL,
    "StatusCode" INTEGER NOT NULL,
    "DurationMs" INTEGER NOT NULL,
    "Timestamp" TEXT NOT NULL,
    "Details" TEXT NULL
);

========================================================

CREATE TABLE "Categories" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Categories" PRIMARY KEY AUTOINCREMENT,
    "Name" TEXT NOT NULL,
    "Color" TEXT NOT NULL
, Description TEXT);

========================================================

CREATE TABLE Companies (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Name TEXT NOT NULL,
                Code TEXT NULL,
                Description TEXT NULL,
                CreatedAt TEXT NOT NULL
            );

========================================================

CREATE TABLE DailyCheckIns (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                UserId TEXT NOT NULL,
                CheckInDate TEXT NOT NULL,
                CheckInTime TEXT NOT NULL,
                PointsEarned INTEGER NOT NULL DEFAULT 10,
                StreakDay INTEGER NOT NULL DEFAULT 1,
                IsMonthlyMilestone INTEGER NOT NULL DEFAULT 0,
                Notes TEXT NULL,
                FOREIGN KEY (UserId) REFERENCES AspNetUsers(Id) ON DELETE CASCADE
            );

========================================================

CREATE TABLE EmailTemplates (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                EventCode TEXT NOT NULL,
                EventName TEXT NOT NULL,
                Category TEXT NULL,
                Subject TEXT NOT NULL,
                BodyHtml TEXT NOT NULL,
                AvailableVariables TEXT NULL,
                IsActive INTEGER NOT NULL DEFAULT 1,
                CreatedAt TEXT NOT NULL,
                UpdatedAt TEXT NOT NULL,
                UpdatedByUserId TEXT NULL
            );

========================================================

CREATE TABLE "ImportLogs" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_ImportLogs" PRIMARY KEY AUTOINCREMENT,
    "FileName" TEXT NOT NULL,
    "TotalRows" INTEGER NOT NULL,
    "SuccessRows" INTEGER NOT NULL,
    "FailedRows" INTEGER NOT NULL,
    "Errors" TEXT NULL,
    "ImportedAt" TEXT NOT NULL,
    "ImportedBy" TEXT NULL
);

========================================================

CREATE TABLE "JsonHistories" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_JsonHistories" PRIMARY KEY AUTOINCREMENT,
    "Name" TEXT NOT NULL,
    "Content" TEXT NOT NULL,
    "TaskId" INTEGER NULL,
    "CreatedAt" TEXT NOT NULL, UserId TEXT NULL,
    CONSTRAINT "FK_JsonHistories_Tasks_TaskId" FOREIGN KEY ("TaskId") REFERENCES "Tasks" ("Id")
);

========================================================

CREATE TABLE MasterBadges (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Code TEXT NOT NULL,
                Name TEXT NOT NULL,
                Description TEXT NULL,
                Category TEXT NULL,
                Icon TEXT NULL,
                Color TEXT NULL,
                Points INTEGER NOT NULL DEFAULT 100,
                Rarity INTEGER NOT NULL DEFAULT 1,
                TriggerType INTEGER NOT NULL DEFAULT 0,
                TriggerThreshold INTEGER NOT NULL DEFAULT 1,
                IsActive INTEGER NOT NULL DEFAULT 1,
                OrderIndex INTEGER NOT NULL DEFAULT 0,
                CreatedAt TEXT NOT NULL
            );

========================================================

CREATE TABLE MasterMilestones (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Name TEXT NOT NULL,
                Phase TEXT NOT NULL,
                Color TEXT NULL,
                Icon TEXT NULL,
                OrderIndex INTEGER NOT NULL DEFAULT 0,
                Description TEXT NULL,
                IsDefault INTEGER NOT NULL DEFAULT 0
            );

========================================================

CREATE TABLE MasterPriorities (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Name TEXT NOT NULL,
                Color TEXT NULL,
                Icon TEXT NULL,
                OrderIndex INTEGER NOT NULL DEFAULT 0,
                Description TEXT NULL,
                IsDefault INTEGER NOT NULL DEFAULT 0
            );

========================================================

CREATE TABLE MasterStatuses (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Name TEXT NOT NULL,
                Color TEXT NULL,
                IsDoneState INTEGER NOT NULL DEFAULT 0,
                OrderIndex INTEGER NOT NULL DEFAULT 0,
                Description TEXT NULL,
                IsDefault INTEGER NOT NULL DEFAULT 0
            );

========================================================

CREATE TABLE NoteAttachments (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                NoteId INTEGER NOT NULL,
                FileName TEXT NOT NULL,
                FilePath TEXT NOT NULL,
                FileSize INTEGER NOT NULL DEFAULT 0,
                ContentType TEXT NULL,
                FileExtension TEXT NULL,
                UploadedAt TEXT NOT NULL,
                UploadedByUserId TEXT NULL,
                FOREIGN KEY (NoteId) REFERENCES Notes(Id) ON DELETE CASCADE,
                FOREIGN KEY (UploadedByUserId) REFERENCES AspNetUsers(Id) ON DELETE SET NULL
            );

========================================================

CREATE TABLE "Notes" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Notes" PRIMARY KEY AUTOINCREMENT,
    "Title" TEXT NOT NULL,
    "ContentHtml" TEXT NOT NULL,
    "Category" TEXT NOT NULL,
    "Color" TEXT NOT NULL,
    "IsPinned" INTEGER NOT NULL,
    "CreatedAt" TEXT NOT NULL,
    "UpdatedAt" TEXT NOT NULL,
    "AuthorUserId" TEXT NULL,
    "TaskId" INTEGER NULL, CompanyId INTEGER,
    CONSTRAINT "FK_Notes_AspNetUsers_AuthorUserId" FOREIGN KEY ("AuthorUserId") REFERENCES "AspNetUsers" ("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_Notes_Tasks_TaskId" FOREIGN KEY ("TaskId") REFERENCES "Tasks" ("Id") ON DELETE SET NULL
);

========================================================

CREATE TABLE "Projects" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Projects" PRIMARY KEY AUTOINCREMENT,
    "Name" TEXT NOT NULL,
    "Description" TEXT NULL,
    "Color" TEXT NOT NULL,
    "Deadline" TEXT NULL,
    "Status" INTEGER NOT NULL,
    "CreatedAt" TEXT NOT NULL
, CompanyId INTEGER, ClientName TEXT NULL, Budget REAL NULL, ActualCost REAL NULL, ProjectManagerId TEXT NULL, Tags TEXT NULL, UseBudget INTEGER NOT NULL DEFAULT 0);

========================================================

CREATE TABLE RewardClaims (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                UserId TEXT NOT NULL,
                RewardItemId INTEGER NOT NULL,
                PointsSpent INTEGER NOT NULL DEFAULT 0,
                PointValueSnapshot INTEGER NOT NULL DEFAULT 100,
                RupiahEquivalent REAL NOT NULL DEFAULT 0,
                Status INTEGER NOT NULL DEFAULT 0,
                UserNotes TEXT NULL,
                AdminNotes TEXT NULL,
                ClaimedAt TEXT NOT NULL,
                ProcessedAt TEXT NULL,
                ProcessedByUserId TEXT NULL,
                FOREIGN KEY (UserId) REFERENCES AspNetUsers(Id) ON DELETE CASCADE,
                FOREIGN KEY (RewardItemId) REFERENCES RewardItems(Id) ON DELETE CASCADE,
                FOREIGN KEY (ProcessedByUserId) REFERENCES AspNetUsers(Id) ON DELETE SET NULL
            );

========================================================

CREATE TABLE RewardItems (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Name TEXT NOT NULL,
                Description TEXT NULL,
                PointCost INTEGER NOT NULL DEFAULT 100,
                Stock INTEGER NOT NULL DEFAULT 10,
                Category TEXT NULL,
                ImageUrl TEXT NULL,
                Icon TEXT NULL,
                Color TEXT NULL,
                IsActive INTEGER NOT NULL DEFAULT 1,
                IsMonthlyMilestoneReward INTEGER NOT NULL DEFAULT 0,
                OrderIndex INTEGER NOT NULL DEFAULT 0,
                CreatedAt TEXT NOT NULL
            );

========================================================

CREATE TABLE "Sessions" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Sessions" PRIMARY KEY AUTOINCREMENT,
    "TaskId" INTEGER NOT NULL,
    "StartTime" TEXT NOT NULL,
    "EndTime" TEXT NULL,
    "Duration" INTEGER NOT NULL,
    "Notes" TEXT NULL, UserId TEXT,
    CONSTRAINT "FK_Sessions_Tasks_TaskId" FOREIGN KEY ("TaskId") REFERENCES "Tasks" ("Id") ON DELETE CASCADE
);

========================================================

CREATE TABLE SqlHistories (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Name TEXT NOT NULL,
                Content TEXT NOT NULL,
                Dialect TEXT NULL,
                TaskId INTEGER NULL,
                CreatedAt TEXT NOT NULL, UserId TEXT NULL,
                FOREIGN KEY (TaskId) REFERENCES Tasks(Id) ON DELETE SET NULL
            );

========================================================

CREATE TABLE IF NOT EXISTS "integration_payload" (
    "id" BIGSERIAL NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "ref_id" VARCHAR(50) NOT NULL,
    "payload" JSON NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(150) NOT NULL,
    "status" VARCHAR(100) NOT NULL,
    "message" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "response_from_tics" JSONB NOT NULL,
    "email_sent" INTEGER(4) NOT NULL DEFAULT 0,
    "email_sent_at" TIMESTAMP NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "email_error_response" JSONB NOT NULL,
    "email_failed_at" TIMESTAMP NOT NULL,
    "email_attempt" INTEGER(4) NOT NULL DEFAULT 0,
    "email_last_attempt_at" TIMESTAMP NOT NULL,
    "retry_count" INTEGER(4) NOT NULL DEFAULT 0,
    PRIMARY KEY ("id")
);

========================================================

CREATE TABLE SystemSettings (
                Key TEXT PRIMARY KEY,
                Value TEXT NOT NULL,
                Description TEXT NULL,
                UpdatedAt TEXT NOT NULL
            );

========================================================

CREATE TABLE "Tasks" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Tasks" PRIMARY KEY AUTOINCREMENT,
    "AssignedToUserId" TEXT NULL,
    "CategoryId" INTEGER NULL,
    "CreatedAt" TEXT NOT NULL,
    "Description" TEXT NULL,
    "DueDate" TEXT NULL,
    "Priority" INTEGER NOT NULL,
    "ProjectId" INTEGER NULL,
    "StartDate" TEXT NULL,
    "Status" INTEGER NOT NULL,
    "Tags" TEXT NULL,
    "Title" TEXT NOT NULL,
    "UpdatedAt" TEXT NOT NULL, Obstacle TEXT, Solution TEXT, Progress INTEGER NOT NULL DEFAULT 0, ParentTaskId INTEGER, Milestone TEXT, CompanyId INTEGER,
    CONSTRAINT "FK_Tasks_AspNetUsers_AssignedToUserId" FOREIGN KEY ("AssignedToUserId") REFERENCES "AspNetUsers" ("Id"),
    CONSTRAINT "FK_Tasks_Categories_CategoryId" FOREIGN KEY ("CategoryId") REFERENCES "Categories" ("Id"),
    CONSTRAINT "FK_Tasks_Projects_ProjectId" FOREIGN KEY ("ProjectId") REFERENCES "Projects" ("Id")
);

========================================================

CREATE TABLE UserBadgeSnapshots (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                SnapshotBatchId TEXT NOT NULL,
                ResetMode TEXT NOT NULL DEFAULT 'transactional',
                UserId TEXT NOT NULL,
                BadgeId INTEGER NOT NULL,
                OriginalUnlockedAt TEXT NOT NULL,
                IsFeatured INTEGER NOT NULL DEFAULT 0,
                AwardedBy TEXT NULL,
                SnapshotCreatedAt TEXT NOT NULL,
                IsRestored INTEGER NOT NULL DEFAULT 0,
                RestoredAt TEXT NULL,
                RestoredBy TEXT NULL,
                FOREIGN KEY (UserId) REFERENCES AspNetUsers(Id) ON DELETE CASCADE,
                FOREIGN KEY (BadgeId) REFERENCES MasterBadges(Id) ON DELETE CASCADE
            );

========================================================

CREATE TABLE UserBadges (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                UserId TEXT NOT NULL,
                BadgeId INTEGER NOT NULL,
                UnlockedAt TEXT NOT NULL,
                IsFeatured INTEGER NOT NULL DEFAULT 0,
                AwardedBy TEXT NULL,
                FOREIGN KEY (UserId) REFERENCES AspNetUsers(Id) ON DELETE CASCADE,
                FOREIGN KEY (BadgeId) REFERENCES MasterBadges(Id) ON DELETE CASCADE
            );

========================================================

CREATE TABLE "__EFMigrationsHistory" (
    "MigrationId" TEXT NOT NULL CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY,
    "ProductVersion" TEXT NOT NULL
);

========================================================

