using System.Globalization;
using System.Text;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Enums;

namespace TrackerKerja.Infrastructure.Services;

/// <summary>
/// Hasil parsing berkas dump SQL (SQLite / PostgreSQL / generik) menjadi model sinkronisasi.
/// </summary>
public sealed class SqlDumpParseResult
{
    public SyncDatabaseData Data { get; } = new();

    /// <summary>Pasangan (UserId, NamaPeran) dari tabel AspNetUserRoles + AspNetRoles.</summary>
    public List<(string UserId, string RoleName)> UserRoles { get; } = new();

    /// <summary>Jumlah baris yang berhasil dipetakan ke tabel yang dikenali.</summary>
    public int RecognizedRows { get; set; }

    /// <summary>Jumlah baris per tabel yang dikenali.</summary>
    public Dictionary<string, int> TableCounts { get; } = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>Tabel yang ada di berkas tetapi sengaja tidak diimpor (log, riwayat, dsb).</summary>
    public HashSet<string> IgnoredTables { get; } = new(StringComparer.OrdinalIgnoreCase);
}

/// <summary>
/// Parser dump SQL toleran-skema. Tidak bergantung pada DDL; hanya membaca pernyataan INSERT
/// lalu memetakan kolom berdasarkan nama (tanpa peduli huruf besar/kecil, snake_case atau PascalCase)
/// ke model sinkronisasi sehingga dapat digabung lewat jalur merge yang sama dengan sinkronisasi API.
/// Kolom yang tidak ada akan memakai nilai bawaan, kolom asing diabaikan, dan alias lama
/// (mis. Announcements.AnnouncementDate/Status) dipetakan ke bentuk tabel saat ini.
/// </summary>
public static class SqlDumpImportParser
{
    private sealed class Row
    {
        private readonly Dictionary<string, string?> _values;

        public Row(Dictionary<string, string?> values) => _values = values;

        public bool Has(string name) => _values.ContainsKey(Norm(name));

        public string? Str(params string[] names)
        {
            foreach (var n in names)
            {
                if (_values.TryGetValue(Norm(n), out var v) && v != null) return v;
            }
            return null;
        }

        public long? LongN(params string[] names)
        {
            var s = Str(names);
            if (s == null) return null;
            if (long.TryParse(s, NumberStyles.Integer, CultureInfo.InvariantCulture, out var l)) return l;
            if (double.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out var d)) return (long)d;
            return null;
        }

        public int? IntN(params string[] names)
        {
            var l = LongN(names);
            return l.HasValue ? (int?)l.Value : null;
        }

        public int Int(int def, params string[] names) => IntN(names) ?? def;

        public long Long(long def, params string[] names) => LongN(names) ?? def;

        public double Dbl(double def, params string[] names)
        {
            var s = Str(names);
            return s != null && double.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out var d) ? d : def;
        }

        public decimal Dec(decimal def, params string[] names)
        {
            var s = Str(names);
            return s != null && decimal.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out var d) ? d : def;
        }

        public bool Bool(bool def, params string[] names)
        {
            var s = Str(names);
            if (s == null) return def;
            return s.Trim().ToLowerInvariant() switch
            {
                "1" or "true" or "t" or "yes" or "y" => true,
                "0" or "false" or "f" or "no" or "n" => false,
                _ => def
            };
        }

        public DateTimeOffset? Date(params string[] names)
        {
            var s = Str(names);
            if (string.IsNullOrWhiteSpace(s)) return null;
            return DateTimeOffset.TryParse(s, CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var dt)
                ? dt
                : null;
        }

        public DateOnly? DateOnlyValue(params string[] names)
        {
            var s = Str(names);
            if (string.IsNullOrWhiteSpace(s)) return null;
            if (s.Length >= 10 && DateOnly.TryParseExact(s[..10], "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var d))
            {
                return d;
            }
            var full = Date(names);
            return full.HasValue ? DateOnly.FromDateTime(full.Value.UtcDateTime) : null;
        }

        public T EnumVal<T>(T def, params string[] names) where T : struct, Enum
        {
            var s = Str(names);
            if (s == null) return def;
            if (int.TryParse(s, NumberStyles.Integer, CultureInfo.InvariantCulture, out var i))
            {
                return (T)System.Enum.ToObject(typeof(T), i);
            }
            return System.Enum.TryParse<T>(s, ignoreCase: true, out var parsed) ? parsed : def;
        }
    }

    /// <summary>Normalisasi nama tabel/kolom: huruf kecil tanpa underscore / kutip.</summary>
    private static string Norm(string name) =>
        name.Trim().Trim('"', '`', '\'', '[', ']').Replace("_", string.Empty).ToLowerInvariant();

    private static readonly HashSet<string> KnownTables = new(StringComparer.OrdinalIgnoreCase)
    {
        "companies", "aspnetusers", "aspnetroles", "aspnetuserroles", "categories",
        "masterpriorities", "masterstatuses", "mastermilestones", "masterbadges", "userbadges",
        "dailycheckins", "rewarditems", "rewardclaims", "emailtemplates", "systemsettings",
        "announcements", "projects", "tasks", "sessions", "attendances", "notes", "noteattachments"
    };

    /// <summary>
    /// Memecah skrip SQL menjadi pernyataan per titik-koma dengan menghormati string bertanda kutip
    /// (sehingga isi catatan HTML multi-baris atau yang mengandung ';' / '--' tidak terpotong).
    /// </summary>
    public static List<string> SplitStatements(string sql)
    {
        var list = new List<string>();
        var sb = new StringBuilder();
        var inQuote = false;

        for (var i = 0; i < sql.Length; i++)
        {
            var c = sql[i];

            if (inQuote)
            {
                sb.Append(c);
                if (c == '\'')
                {
                    if (i + 1 < sql.Length && sql[i + 1] == '\'')
                    {
                        sb.Append('\'');
                        i++;
                    }
                    else
                    {
                        inQuote = false;
                    }
                }
                continue;
            }

            if (c == '\'')
            {
                inQuote = true;
                sb.Append(c);
            }
            else if (c == '-' && i + 1 < sql.Length && sql[i + 1] == '-')
            {
                // komentar baris: lewati sampai akhir baris
                while (i < sql.Length && sql[i] != '\n') i++;
                sb.Append('\n');
            }
            else if (c == '/' && i + 1 < sql.Length && sql[i + 1] == '*')
            {
                var end = sql.IndexOf("*/", i + 2, StringComparison.Ordinal);
                i = end < 0 ? sql.Length : end + 1;
            }
            else if (c == ';')
            {
                sb.Append(c);
                var stmt = sb.ToString().Trim();
                if (stmt.Length > 0) list.Add(stmt);
                sb.Clear();
            }
            else
            {
                sb.Append(c);
            }
        }

        var rest = sb.ToString().Trim();
        if (rest.Length > 0) list.Add(rest);
        return list;
    }

    public static SqlDumpParseResult Parse(string sql)
    {
        var result = new SqlDumpParseResult();
        if (string.IsNullOrWhiteSpace(sql)) return result;

        var tables = new Dictionary<string, List<Row>>(StringComparer.OrdinalIgnoreCase);

        foreach (var stmt in SplitStatements(sql))
        {
            foreach (var (table, row) in ParseInsert(stmt))
            {
                var key = Norm(table);
                if (!KnownTables.Contains(key))
                {
                    result.IgnoredTables.Add(table.Trim().Trim('"', '`', '[', ']'));
                    continue;
                }

                if (!tables.TryGetValue(key, out var list))
                {
                    list = new List<Row>();
                    tables[key] = list;
                }
                list.Add(row);
            }
        }

        MapAll(tables, result);
        return result;
    }

    private static IEnumerable<(string Table, Row Row)> ParseInsert(string stmt)
    {
        var s = stmt.TrimStart();
        if (!s.StartsWith("INSERT", StringComparison.OrdinalIgnoreCase)) yield break;

        var i = 6;
        SkipWs(s, ref i);

        // OR REPLACE / OR IGNORE
        if (MatchWord(s, ref i, "OR"))
        {
            SkipWs(s, ref i);
            ReadIdentifier(s, ref i);
            SkipWs(s, ref i);
        }

        if (!MatchWord(s, ref i, "INTO")) yield break;
        SkipWs(s, ref i);

        var table = ReadIdentifier(s, ref i);
        // dukung "schema"."table"
        if (i < s.Length && s[i] == '.')
        {
            i++;
            table = ReadIdentifier(s, ref i);
        }
        SkipWs(s, ref i);

        if (i >= s.Length || s[i] != '(') yield break;
        i++;

        var columns = new List<string>();
        while (i < s.Length)
        {
            SkipWs(s, ref i);
            columns.Add(Norm(ReadIdentifier(s, ref i)));
            SkipWs(s, ref i);
            if (i < s.Length && s[i] == ',') { i++; continue; }
            if (i < s.Length && s[i] == ')') { i++; break; }
            yield break;
        }

        SkipWs(s, ref i);
        if (!MatchWord(s, ref i, "VALUES")) yield break;

        while (i < s.Length)
        {
            SkipWs(s, ref i);
            if (i >= s.Length || s[i] != '(') yield break;
            i++;

            var values = new List<string?>();
            while (i < s.Length)
            {
                values.Add(ReadValue(s, ref i));
                SkipWs(s, ref i);
                if (i < s.Length && s[i] == ',') { i++; continue; }
                if (i < s.Length && s[i] == ')') { i++; break; }
                break;
            }

            var dict = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
            for (var c = 0; c < columns.Count && c < values.Count; c++)
            {
                dict[columns[c]] = values[c];
            }
            yield return (table, new Row(dict));

            SkipWs(s, ref i);
            if (i < s.Length && s[i] == ',') { i++; continue; }
            yield break;
        }
    }

    private static void SkipWs(string s, ref int i)
    {
        while (i < s.Length && char.IsWhiteSpace(s[i])) i++;
    }

    private static bool MatchWord(string s, ref int i, string word)
    {
        if (i + word.Length > s.Length) return false;
        if (!string.Equals(s.Substring(i, word.Length), word, StringComparison.OrdinalIgnoreCase)) return false;
        var next = i + word.Length;
        if (next < s.Length && (char.IsLetterOrDigit(s[next]) || s[next] == '_')) return false;
        i = next;
        return true;
    }

    private static string ReadIdentifier(string s, ref int i)
    {
        SkipWs(s, ref i);
        if (i >= s.Length) return string.Empty;

        char? close = s[i] switch { '"' => '"', '`' => '`', '[' => ']', _ => null };
        if (close.HasValue)
        {
            i++;
            var start = i;
            while (i < s.Length && s[i] != close.Value) i++;
            var id = s.Substring(start, i - start);
            if (i < s.Length) i++;
            return id;
        }

        var begin = i;
        while (i < s.Length && (char.IsLetterOrDigit(s[i]) || s[i] == '_')) i++;
        return s.Substring(begin, i - begin);
    }

    private static string? ReadValue(string s, ref int i)
    {
        SkipWs(s, ref i);
        if (i >= s.Length) return null;

        // Awalan tipe string seperti N'..' / E'..'
        if ((s[i] == 'N' || s[i] == 'n' || s[i] == 'E' || s[i] == 'e') && i + 1 < s.Length && s[i + 1] == '\'')
        {
            i++;
        }

        if (s[i] == '\'')
        {
            var sb = new StringBuilder();
            i++;
            while (i < s.Length)
            {
                if (s[i] == '\'')
                {
                    if (i + 1 < s.Length && s[i + 1] == '\'')
                    {
                        sb.Append('\'');
                        i += 2;
                        continue;
                    }
                    i++;
                    break;
                }
                sb.Append(s[i++]);
            }

            // lewati cast seperti ::timestamp bila ada
            while (i < s.Length && s[i] != ',' && s[i] != ')') i++;
            return sb.ToString();
        }

        var begin = i;
        var depth = 0;
        while (i < s.Length && !(depth == 0 && (s[i] == ',' || s[i] == ')')))
        {
            if (s[i] == '(') depth++;
            else if (s[i] == ')') depth--;
            i++;
        }

        var token = s.Substring(begin, i - begin).Trim();
        if (token.Length == 0 || token.Equals("NULL", StringComparison.OrdinalIgnoreCase)) return null;
        return token;
    }

    private static void MapAll(Dictionary<string, List<Row>> tables, SqlDumpParseResult result)
    {
        var now = DateTimeOffset.UtcNow;
        var d = result.Data;

        void Count(string table, int n)
        {
            if (n <= 0) return;
            result.RecognizedRows += n;
            result.TableCounts[table] = result.TableCounts.GetValueOrDefault(table) + n;
        }

        List<Row> Rows(string key) => tables.TryGetValue(key, out var l) ? l : new List<Row>();

        foreach (var r in Rows("companies"))
        {
            var id = r.IntN("Id");
            if (!id.HasValue) continue;
            d.Companies.Add(new CompanySyncDto
            {
                Id = id.Value,
                Name = r.Str("Name") ?? $"Perusahaan {id.Value}",
                Code = r.Str("Code") ?? $"CMP{id.Value}",
                Description = r.Str("Description"),
                Address = r.Str("Address"),
                ContactEmail = r.Str("ContactEmail"),
                CreatedAt = r.Date("CreatedAt") ?? now
            });
            Count("Companies", 1);
        }

        foreach (var r in Rows("aspnetusers"))
        {
            var id = r.Str("Id");
            if (string.IsNullOrWhiteSpace(id)) continue;
            d.Users.Add(new UserSyncDto
            {
                Id = id,
                UserName = r.Str("UserName"),
                NormalizedUserName = r.Str("NormalizedUserName"),
                Email = r.Str("Email"),
                NormalizedEmail = r.Str("NormalizedEmail"),
                EmailConfirmed = r.Bool(false, "EmailConfirmed"),
                PasswordHash = r.Str("PasswordHash"),
                SecurityStamp = r.Str("SecurityStamp"),
                ConcurrencyStamp = r.Str("ConcurrencyStamp"),
                PhoneNumber = r.Str("PhoneNumber"),
                FullName = r.Str("FullName") ?? r.Str("UserName") ?? "Pengguna",
                JobTitle = r.Str("JobTitle") ?? "Member",
                AvatarColor = r.Str("AvatarColor") ?? "#6366F1",
                ProfilePictureUrl = r.Str("ProfilePictureUrl"),
                CoverPictureUrl = r.Str("CoverPictureUrl"),
                CompanyId = r.IntN("CompanyId"),
                IsApproved = r.Bool(true, "IsApproved"),
                ApprovedAt = r.Date("ApprovedAt"),
                ApprovedByUserId = r.Str("ApprovedByUserId"),
                CreatedAt = r.Date("CreatedAt") ?? now
            });
            Count("AspNetUsers", 1);
        }

        foreach (var r in Rows("categories"))
        {
            var id = r.IntN("Id");
            if (!id.HasValue) continue;
            d.Categories.Add(new CategorySyncDto
            {
                Id = id.Value,
                Name = r.Str("Name") ?? $"Kategori {id.Value}",
                Color = r.Str("Color") ?? "#6366F1",
                Description = r.Str("Description"),
                CreatedAt = r.Date("CreatedAt") ?? now
            });
            Count("Categories", 1);
        }

        foreach (var r in Rows("masterpriorities"))
        {
            var id = r.IntN("Id");
            if (!id.HasValue) continue;
            d.MasterPriorities.Add(new MasterPrioritySyncDto
            {
                Id = id.Value,
                Name = r.Str("Name") ?? $"Prioritas {id.Value}",
                Color = r.Str("Color") ?? "#6366F1",
                Icon = r.Str("Icon") ?? "flag",
                OrderIndex = r.Int(0, "OrderIndex"),
                Description = r.Str("Description"),
                IsDefault = r.Bool(false, "IsDefault")
            });
            Count("MasterPriorities", 1);
        }

        foreach (var r in Rows("masterstatuses"))
        {
            var id = r.IntN("Id");
            if (!id.HasValue) continue;
            d.MasterStatuses.Add(new MasterStatusSyncDto
            {
                Id = id.Value,
                Name = r.Str("Name") ?? $"Status {id.Value}",
                Color = r.Str("Color") ?? "#6366F1",
                IsDoneState = r.Bool(false, "IsDoneState"),
                OrderIndex = r.Int(0, "OrderIndex"),
                Description = r.Str("Description"),
                IsDefault = r.Bool(false, "IsDefault")
            });
            Count("MasterStatuses", 1);
        }

        foreach (var r in Rows("mastermilestones"))
        {
            var id = r.IntN("Id");
            if (!id.HasValue) continue;
            d.MasterMilestones.Add(new MasterMilestoneSyncDto
            {
                Id = id.Value,
                Name = r.Str("Name") ?? $"Milestone {id.Value}",
                Phase = r.Str("Phase") ?? string.Empty,
                Color = r.Str("Color") ?? "#6366F1",
                Icon = r.Str("Icon") ?? "milestone",
                OrderIndex = r.Int(0, "OrderIndex"),
                Description = r.Str("Description"),
                IsDefault = r.Bool(false, "IsDefault")
            });
            Count("MasterMilestones", 1);
        }

        foreach (var r in Rows("masterbadges"))
        {
            var id = r.IntN("Id");
            var code = r.Str("Code");
            if (!id.HasValue || string.IsNullOrWhiteSpace(code)) continue;
            d.MasterBadges.Add(new MasterBadgeSyncDto
            {
                Id = id.Value,
                Code = code,
                Name = r.Str("Name") ?? code,
                Description = r.Str("Description"),
                Category = r.Str("Category"),
                Icon = r.Str("Icon") ?? "award",
                Color = r.Str("Color") ?? "#10B981",
                Points = r.Int(0, "Points"),
                Rarity = r.EnumVal(BadgeRarity.Common, "Rarity"),
                TriggerType = r.Int(0, "TriggerType"),
                TriggerThreshold = r.Int(1, "TriggerThreshold"),
                IsActive = r.Bool(true, "IsActive"),
                OrderIndex = r.Int(0, "OrderIndex"),
                CreatedAt = r.Date("CreatedAt") ?? now
            });
            Count("MasterBadges", 1);
        }

        foreach (var r in Rows("rewarditems"))
        {
            var id = r.IntN("Id");
            if (!id.HasValue) continue;
            d.RewardItems.Add(new RewardItemSyncDto
            {
                Id = id.Value,
                Name = r.Str("Name") ?? $"Hadiah {id.Value}",
                Description = r.Str("Description"),
                PointCost = r.Int(0, "PointCost"),
                Stock = r.Int(10, "Stock"),
                Category = r.Str("Category") ?? "Voucher",
                ImageUrl = r.Str("ImageUrl"),
                Icon = r.Str("Icon") ?? "gift",
                Color = r.Str("Color") ?? "indigo",
                IsActive = r.Bool(true, "IsActive"),
                IsMonthlyMilestoneReward = r.Bool(false, "IsMonthlyMilestoneReward"),
                OrderIndex = r.Int(0, "OrderIndex"),
                CreatedAt = r.Date("CreatedAt") ?? now
            });
            Count("RewardItems", 1);
        }

        foreach (var r in Rows("emailtemplates"))
        {
            var id = r.IntN("Id");
            var code = r.Str("EventCode");
            if (!id.HasValue || string.IsNullOrWhiteSpace(code)) continue;
            d.EmailTemplates.Add(new EmailTemplateSyncDto
            {
                Id = id.Value,
                EventCode = code,
                EventName = r.Str("EventName") ?? code,
                Category = r.Str("Category"),
                Subject = r.Str("Subject") ?? string.Empty,
                BodyHtml = r.Str("BodyHtml") ?? string.Empty,
                AvailableVariables = r.Str("AvailableVariables"),
                IsActive = r.Bool(true, "IsActive"),
                UpdatedByUserId = r.Str("UpdatedByUserId"),
                CreatedAt = r.Date("CreatedAt") ?? now,
                UpdatedAt = r.Date("UpdatedAt") ?? r.Date("CreatedAt") ?? now
            });
            Count("EmailTemplates", 1);
        }

        foreach (var r in Rows("systemsettings"))
        {
            var key = r.Str("Key");
            if (string.IsNullOrWhiteSpace(key)) continue;
            d.SystemSettings.Add(new SystemSettingSyncDto
            {
                Key = key,
                Value = r.Str("Value") ?? string.Empty,
                Description = r.Str("Description"),
                UpdatedAt = r.Date("UpdatedAt") ?? now
            });
            Count("SystemSettings", 1);
        }

        foreach (var r in Rows("announcements"))
        {
            var id = r.IntN("Id");
            if (!id.HasValue) continue;
            var start = r.Date("StartDate", "AnnouncementDate") ?? r.Date("CreatedAt") ?? now;
            d.Announcements.Add(new AnnouncementSyncDto
            {
                Id = id.Value,
                Title = r.Str("Title") ?? "Pengumuman",
                Content = r.Str("Content") ?? string.Empty,
                // Skema lama menyimpan jenis pengumuman pada kolom "Status"
                Type = r.Str("Type", "Status", "Category") ?? "Pengumuman Umum",
                StartDate = start,
                EndDate = r.Date("EndDate") ?? start.AddDays(30),
                IsActive = r.Bool(true, "IsActive"),
                CompanyId = r.IntN("CompanyId"),
                CreatedByUserId = r.Str("CreatedByUserId"),
                CreatedAt = r.Date("CreatedAt") ?? now,
                UpdatedAt = r.Date("UpdatedAt") ?? r.Date("CreatedAt") ?? now
            });
            Count("Announcements", 1);
        }

        foreach (var r in Rows("projects"))
        {
            var id = r.IntN("Id");
            if (!id.HasValue) continue;
            d.Projects.Add(new ProjectSyncDto
            {
                Id = id.Value,
                Name = r.Str("Name") ?? $"Proyek {id.Value}",
                Description = r.Str("Description"),
                Color = r.Str("Color") ?? "#6366F1",
                Status = r.EnumVal(ProjectStatus.Active, "Status"),
                CompanyId = r.IntN("CompanyId"),
                ClientName = r.Str("ClientName"),
                ProjectManagerId = r.Str("ProjectManagerId"),
                Budget = r.Dec(0, "Budget"),
                ActualCost = r.Dec(0, "ActualCost"),
                UseBudget = r.Bool(false, "UseBudget"),
                Tags = r.Str("Tags"),
                Deadline = r.Date("Deadline"),
                CreatedAt = r.Date("CreatedAt") ?? now
            });
            Count("Projects", 1);
        }

        foreach (var r in Rows("tasks"))
        {
            var id = r.IntN("Id");
            if (!id.HasValue) continue;
            d.Tasks.Add(new TaskSyncDto
            {
                Id = id.Value,
                Title = r.Str("Title") ?? $"Tugas {id.Value}",
                Description = r.Str("Description"),
                Priority = r.EnumVal(TaskPriority.Medium, "Priority"),
                Status = r.EnumVal(Domain.Enums.TaskStatus.Todo, "Status"),
                Progress = r.Int(0, "Progress"),
                Milestone = r.Str("Milestone"),
                Obstacle = r.Str("Obstacle"),
                Solution = r.Str("Solution"),
                Tags = r.Str("Tags"),
                ProjectId = r.IntN("ProjectId"),
                CategoryId = r.IntN("CategoryId"),
                AssignedToUserId = r.Str("AssignedToUserId"),
                ParentTaskId = r.IntN("ParentTaskId"),
                CompanyId = r.IntN("CompanyId"),
                StartDate = r.Date("StartDate"),
                DueDate = r.Date("DueDate"),
                CreatedAt = r.Date("CreatedAt") ?? now,
                UpdatedAt = r.Date("UpdatedAt") ?? r.Date("CreatedAt") ?? now
            });
            Count("Tasks", 1);
        }

        foreach (var r in Rows("sessions"))
        {
            var id = r.IntN("Id");
            var taskId = r.IntN("TaskId");
            var start = r.Date("StartTime");
            if (!id.HasValue || !taskId.HasValue || !start.HasValue) continue;
            d.Sessions.Add(new SessionSyncDto
            {
                Id = id.Value,
                TaskId = taskId.Value,
                UserId = r.Str("UserId") ?? string.Empty,
                StartTime = start.Value,
                EndTime = r.Date("EndTime"),
                Duration = r.Long(0, "Duration"),
                Notes = r.Str("Notes"),
                CreatedAt = r.Date("CreatedAt") ?? start.Value
            });
            Count("Sessions", 1);
        }

        foreach (var r in Rows("attendances"))
        {
            var id = r.IntN("Id");
            var date = r.DateOnlyValue("Date");
            if (!id.HasValue || !date.HasValue) continue;
            d.Attendances.Add(new AttendanceSyncDto
            {
                Id = id.Value,
                UserId = r.Str("UserId") ?? string.Empty,
                Date = date.Value,
                Type = r.EnumVal(AttendanceType.Present, "Type"),
                WorkLocation = r.EnumVal(WorkLocation.WFO, "WorkLocation"),
                Status = r.Int(1, "Status"),
                ApprovedByUserId = r.Str("ApprovedByUserId"),
                ClockIn = r.Date("ClockIn"),
                ClockOut = r.Date("ClockOut"),
                TotalHours = r.Dbl(0, "TotalHours"),
                LeaveReason = r.Str("LeaveReason"),
                Notes = r.Str("Notes"),
                CreatedAt = r.Date("CreatedAt") ?? now,
                UpdatedAt = r.Date("UpdatedAt") ?? r.Date("CreatedAt") ?? now
            });
            Count("Attendances", 1);
        }

        foreach (var r in Rows("notes"))
        {
            var id = r.IntN("Id");
            if (!id.HasValue) continue;
            var created = r.Date("CreatedAt") ?? now;
            d.Notes.Add(new WorkNoteSyncDto
            {
                Id = id.Value,
                Title = r.Str("Title") ?? "Catatan",
                ContentHtml = r.Str("ContentHtml", "Content", "Body") ?? string.Empty,
                Category = r.Str("Category") ?? "General",
                Color = r.Str("Color") ?? "#6366F1",
                IsPinned = r.Bool(false, "IsPinned"),
                AuthorUserId = r.Str("AuthorUserId", "UserId", "CreatedByUserId"),
                TaskId = r.IntN("TaskId"),
                CompanyId = r.IntN("CompanyId"),
                CreatedAt = created,
                UpdatedAt = r.Date("UpdatedAt") ?? created
            });
            Count("Notes", 1);
        }

        foreach (var r in Rows("noteattachments"))
        {
            var id = r.IntN("Id");
            var noteId = r.IntN("NoteId");
            if (!id.HasValue || !noteId.HasValue) continue;
            var fileName = r.Str("FileName") ?? $"lampiran-{id.Value}";
            d.NoteAttachments.Add(new NoteAttachmentSyncDto
            {
                Id = id.Value,
                NoteId = noteId.Value,
                FileName = fileName,
                FilePath = r.Str("FilePath") ?? string.Empty,
                FileSize = r.Long(0, "FileSize"),
                ContentType = r.Str("ContentType"),
                FileExtension = r.Str("FileExtension") ?? Path.GetExtension(fileName),
                UploadedByUserId = r.Str("UploadedByUserId"),
                UploadedAt = r.Date("UploadedAt") ?? now
            });
            Count("NoteAttachments", 1);
        }

        foreach (var r in Rows("userbadges"))
        {
            var id = r.IntN("Id");
            var userId = r.Str("UserId");
            var badgeId = r.IntN("BadgeId");
            if (!id.HasValue || string.IsNullOrWhiteSpace(userId) || !badgeId.HasValue) continue;
            d.UserBadges.Add(new UserBadgeSyncDto
            {
                Id = id.Value,
                UserId = userId,
                BadgeId = badgeId.Value,
                BadgeCode = r.Str("BadgeCode"),
                UnlockedAt = r.Date("UnlockedAt") ?? now,
                IsFeatured = r.Bool(false, "IsFeatured"),
                AwardedBy = r.Str("AwardedBy")
            });
            Count("UserBadges", 1);
        }

        foreach (var r in Rows("dailycheckins"))
        {
            var id = r.IntN("Id");
            var userId = r.Str("UserId");
            var date = r.DateOnlyValue("CheckInDate");
            if (!id.HasValue || string.IsNullOrWhiteSpace(userId) || !date.HasValue) continue;
            d.DailyCheckIns.Add(new DailyCheckInSyncDto
            {
                Id = id.Value,
                UserId = userId,
                CheckInDate = date.Value,
                CheckInTime = r.Date("CheckInTime") ?? now,
                PointsEarned = r.Int(10, "PointsEarned"),
                StreakDay = r.Int(1, "StreakDay"),
                IsMonthlyMilestone = r.Bool(false, "IsMonthlyMilestone"),
                Notes = r.Str("Notes")
            });
            Count("DailyCheckIns", 1);
        }

        foreach (var r in Rows("rewardclaims"))
        {
            var id = r.IntN("Id");
            var userId = r.Str("UserId");
            var itemId = r.IntN("RewardItemId");
            if (!id.HasValue || string.IsNullOrWhiteSpace(userId) || !itemId.HasValue) continue;
            d.RewardClaims.Add(new RewardClaimSyncDto
            {
                Id = id.Value,
                UserId = userId,
                RewardItemId = itemId.Value,
                RewardItemName = r.Str("RewardItemName"),
                PointsSpent = r.Int(0, "PointsSpent"),
                Status = r.EnumVal(ClaimStatus.Pending, "Status"),
                ClaimedAt = r.Date("ClaimedAt") ?? now,
                ProcessedAt = r.Date("ProcessedAt"),
                ProcessedByUserId = r.Str("ProcessedByUserId"),
                AdminNotes = r.Str("AdminNotes")
            });
            Count("RewardClaims", 1);
        }

        // Peran pengguna: petakan RoleId -> nama peran lalu hubungkan ke pengguna.
        var roleNameById = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var r in Rows("aspnetroles"))
        {
            var id = r.Str("Id");
            var name = r.Str("Name");
            if (!string.IsNullOrWhiteSpace(id) && !string.IsNullOrWhiteSpace(name))
            {
                roleNameById[id] = name;
            }
        }
        foreach (var r in Rows("aspnetuserroles"))
        {
            var userId = r.Str("UserId");
            var roleId = r.Str("RoleId");
            if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(roleId)) continue;
            // RoleId bisa berupa Id peran dari dump, atau langsung nama peran
            var roleName = roleNameById.TryGetValue(roleId, out var n) ? n : roleId;
            result.UserRoles.Add((userId, roleName));
            Count("AspNetUserRoles", 1);
        }
    }
}
