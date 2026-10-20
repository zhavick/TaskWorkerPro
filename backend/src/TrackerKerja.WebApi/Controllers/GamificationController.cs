using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Application.Common.Interfaces;
using TrackerKerja.Application.DTOs;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Domain.Enums;
using TrackerKerja.Infrastructure.Persistence;

namespace TrackerKerja.WebApi.Controllers;

[ApiController]
[Route("api/gamification")]
[Authorize]
public class GamificationController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICurrentTenantService _tenantService;
    private readonly IBadgeEvaluationService? _badgeService;

    public GamificationController(
        AppDbContext context,
        ICurrentTenantService tenantService,
        IBadgeEvaluationService? badgeService = null)
    {
        _context = context;
        _tenantService = tenantService;
        _badgeService = badgeService;
    }

    [HttpGet("status")]
    public async Task<IActionResult> GetGamificationStatus()
    {
        var userId = _tenantService.UserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        if (_badgeService != null)
        {
            await _badgeService.EvaluateBadgesAsync(userId);
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var currentMonth = today.Month;
        var currentYear = today.Year;

        // 1. Check-ins this month
        var checkInsThisMonth = await _context.DailyCheckIns
            .Where(c => c.UserId == userId && c.CheckInDate.Month == currentMonth && c.CheckInDate.Year == currentYear)
            .OrderByDescending(c => c.CheckInDate)
            .ToListAsync();

        bool hasCheckedInToday = checkInsThisMonth.Any(c => c.CheckInDate == today);
        int daysCheckedInThisMonth = checkInsThisMonth.Count;
        int monthlyCheckInPoints = checkInsThisMonth.Sum(c => c.PointsEarned);

        // Milestones
        bool reached15 = daysCheckedInThisMonth >= 15;
        bool reached30 = daysCheckedInThisMonth >= 30;
        int milestoneBonus = (reached15 ? 100 : 0) + (reached30 ? 200 : 0);

        // 2. Permanent additive badge points
        var userBadges = await _context.UserBadges
            .Include(ub => ub.Badge)
            .Where(ub => ub.UserId == userId)
            .ToListAsync();

        int badgePoints = userBadges.Sum(ub => ub.Badge.Points);

        // 3. Claims spent
        var pointsSpent = await _context.RewardClaims
            .Where(rc => rc.UserId == userId && rc.Status != ClaimStatus.Rejected)
            .SumAsync(rc => rc.PointsSpent);

        int totalCurrentPoints = Math.Max(0, (monthlyCheckInPoints + milestoneBonus + badgePoints) - pointsSpent);

        // 4. Streak calculation with 2-day tolerance
        int currentStreak = 0;
        var lastCheckIn = await _context.DailyCheckIns
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.CheckInDate)
            .FirstOrDefaultAsync();

        if (lastCheckIn != null)
        {
            var dayDiff = today.DayNumber - lastCheckIn.CheckInDate.DayNumber;
            if (dayDiff <= 2) // within 2 days tolerance
            {
                currentStreak = lastCheckIn.StreakDay;
            }
        }

        var dto = new GamificationSummaryDto(
            totalCurrentPoints,
            monthlyCheckInPoints + milestoneBonus,
            badgePoints,
            currentStreak,
            hasCheckedInToday,
            daysCheckedInThisMonth,
            reached15,
            reached30,
            userBadges.Count
        );

        return Ok(new { success = true, data = dto });
    }

    [HttpPost("check-in")]
    [HttpPost("checkin")]
    public async Task<IActionResult> DailyCheckIn()
    {
        var userId = _tenantService.UserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var existingToday = await _context.DailyCheckIns
            .FirstOrDefaultAsync(c => c.UserId == userId && c.CheckInDate == today);

        if (existingToday != null)
        {
            return BadRequest(new { success = false, message = "Anda sudah melakukan Check-In untuk hari ini." });
        }

        // Get last check-in to determine streak
        var lastCheckIn = await _context.DailyCheckIns
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.CheckInDate)
            .FirstOrDefaultAsync();

        int newStreak = 1;
        if (lastCheckIn != null)
        {
            var dayDiff = today.DayNumber - lastCheckIn.CheckInDate.DayNumber;
            if (dayDiff == 1)
            {
                newStreak = lastCheckIn.StreakDay + 1;
            }
            else if (dayDiff == 2)
            {
                // 1 day skipped, within 2-day tolerance
                newStreak = lastCheckIn.StreakDay + 1;
            }
            else
            {
                // Streak broken
                newStreak = 1;
            }
        }

        bool isMonthlyMilestone = newStreak >= 30;
        int pointsEarned = 10;
        if (isMonthlyMilestone)
        {
            pointsEarned += 500; // Monthly streak 30-day bonus per FSD 5.20.3
        }

        var entry = new DailyCheckIn
        {
            UserId = userId,
            CheckInDate = today,
            CheckInTime = DateTimeOffset.UtcNow,
            PointsEarned = pointsEarned,
            StreakDay = newStreak,
            IsMonthlyMilestone = isMonthlyMilestone
        };

        _context.DailyCheckIns.Add(entry);
        await _context.SaveChangesAsync();

        if (_badgeService != null)
        {
            await _badgeService.EvaluateBadgesAsync(userId);
        }

        return Ok(new
        {
            success = true,
            message = isMonthlyMilestone
                ? $"Luar biasa! Anda mencapai Monthly Streak 30 Hari! +{pointsEarned} Poin diperoleh & reward milestone terbuka!"
                : $"Check-In berhasil! Anda mendapatkan +{pointsEarned} Poin. Rangkaian Streak: {newStreak} Hari.",
            pointsEarned,
            streakDay = newStreak,
            isMonthlyMilestone
        });
    }

    [HttpGet("monthly-progress")]
    public async Task<IActionResult> GetMonthlyProgress()
    {
        var userId = _tenantService.UserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var currentMonth = today.Month;
        var currentYear = today.Year;

        var checkIns = await _context.DailyCheckIns
            .Where(c => c.UserId == userId && c.CheckInDate.Month == currentMonth && c.CheckInDate.Year == currentYear)
            .OrderBy(c => c.CheckInDate)
            .Select(c => c.CheckInDate)
            .ToListAsync();

        return Ok(new
        {
            success = true,
            totalDays = checkIns.Count,
            progress15Percent = Math.Min(100, (int)Math.Round((double)checkIns.Count / 15.0 * 100)),
            progress30Percent = Math.Min(100, (int)Math.Round((double)checkIns.Count / 30.0 * 100)),
            dates = checkIns
        });
    }

    [HttpGet("leaderboard")]
    public async Task<IActionResult> GetLeaderboard()
    {
        var companyId = _tenantService.CompanyId;
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var currentMonth = today.Month;
        var currentYear = today.Year;

        var users = await _context.Users
            .Where(u => u.IsApproved && (!companyId.HasValue || u.CompanyId == companyId.Value))
            .Include(u => u.DailyCheckIns.Where(c => c.CheckInDate.Month == currentMonth && c.CheckInDate.Year == currentYear))
            .Include(u => u.Badges).ThenInclude(b => b.Badge)
            .ToListAsync();

        var leaderboard = users.Select(u =>
        {
            var checkInPts = u.DailyCheckIns.Sum(c => c.PointsEarned);
            var badgePts = u.Badges.Sum(b => b.Badge.Points);
            var lastCheckIn = u.DailyCheckIns.OrderByDescending(c => c.CheckInDate).FirstOrDefault();
            int streak = lastCheckIn?.StreakDay ?? 0;

            return new
            {
                UserId = u.Id,
                UserName = u.FullName,
                UserAvatar = u.ProfilePictureUrl,
                Points = checkInPts + badgePts,
                StreakDays = streak
            };
        })
        .OrderByDescending(x => x.Points)
        .ThenByDescending(x => x.StreakDays)
        .Select((x, idx) => new LeaderboardItemDto(
            x.UserId,
            x.UserName,
            x.UserAvatar,
            x.Points,
            x.StreakDays,
            idx + 1
        ))
        .Take(10)
        .ToList();

        return Ok(new { success = true, data = leaderboard });
    }

    [HttpGet("badges")]
    public async Task<IActionResult> GetBadges()
    {
        var userId = _tenantService.UserId;
        if (!string.IsNullOrEmpty(userId) && _badgeService != null)
        {
            await _badgeService.EvaluateBadgesAsync(userId);
        }

        var masterBadges = await _context.MasterBadges
            .Where(b => b.IsActive)
            .OrderBy(b => b.OrderIndex)
            .ToListAsync();

        var myUnlocked = await _context.UserBadges
            .Where(ub => ub.UserId == userId)
            .ToDictionaryAsync(ub => ub.BadgeId, ub => ub.UnlockedAt);

        var result = masterBadges.Select(b => new BadgeItemDto(
            b.Id,
            b.Code,
            b.Name,
            b.Description,
            b.Category,
            b.Icon,
            b.Color,
            b.Points,
            b.Rarity,
            myUnlocked.ContainsKey(b.Id),
            myUnlocked.TryGetValue(b.Id, out var dt) ? dt : null
        )).ToList();

        return Ok(new { success = true, data = result });
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserBadges(string userId)
    {
        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
        {
            return NotFound(new { success = false, message = "Pengguna tidak ditemukan." });
        }

        var masterBadges = await _context.MasterBadges
            .Where(b => b.IsActive)
            .OrderBy(b => b.OrderIndex)
            .ToListAsync();

        var userUnlocked = await _context.UserBadges
            .Where(ub => ub.UserId == userId)
            .ToDictionaryAsync(ub => ub.BadgeId, ub => ub.UnlockedAt);

        var badges = masterBadges.Select(b => new BadgeItemDto(
            b.Id,
            b.Code,
            b.Name,
            b.Description,
            b.Category,
            b.Icon,
            b.Color,
            b.Points,
            b.Rarity,
            userUnlocked.ContainsKey(b.Id),
            userUnlocked.TryGetValue(b.Id, out var dt) ? dt : null
        )).ToList();

        var totalBadgePoints = masterBadges.Where(b => userUnlocked.ContainsKey(b.Id)).Sum(b => b.Points);

        return Ok(new
        {
            success = true,
            data = new
            {
                userId = user.Id,
                userName = user.FullName,
                avatarUrl = user.ProfilePictureUrl,
                totalBadgePoints,
                unlockedCount = userUnlocked.Count,
                badges
            }
        });
    }

    [HttpGet("rewards")]
    public async Task<IActionResult> GetRewards()
    {
        var rewards = await _context.RewardItems
            .Where(r => r.IsActive)
            .OrderBy(r => r.OrderIndex)
            .Select(r => new RewardItemDto(
                r.Id,
                r.Name,
                r.Description,
                r.PointCost,
                r.PointCost * 100.00m, // 1 Poin = Rp 100
                r.Stock,
                r.Category,
                r.Icon,
                r.Color,
                r.IsActive
            ))
            .ToListAsync();

        return Ok(new { success = true, data = rewards });
    }

    [HttpPost("rewards/claim")]
    public async Task<IActionResult> ClaimReward([FromBody] ClaimRewardRequest request)
    {
        var userId = _tenantService.UserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var reward = await _context.RewardItems.FirstOrDefaultAsync(r => r.Id == request.RewardItemId && r.IsActive);
        if (reward == null) return NotFound(new { success = false, message = "Hadiah tidak ditemukan atau tidak aktif." });

        if (reward.Stock <= 0) return BadRequest(new { success = false, message = "Stok hadiah ini sudah habis." });

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // Validasi Monthly Streak Milestone Reward (FSD 5.20.3)
        if (reward.IsMonthlyMilestoneReward)
        {
            var hasMilestone = await _context.DailyCheckIns
                .AnyAsync(c => c.UserId == userId && c.CheckInDate.Month == today.Month && c.CheckInDate.Year == today.Year && c.IsMonthlyMilestone);
            if (!hasMilestone)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Hadiah ini khusus untuk pengguna yang telah meraih Monthly Streak Milestone (Streak 30 Hari)."
                });
            }
        }

        // Calculate user current available points
        var checkInPts = await _context.DailyCheckIns
            .Where(c => c.UserId == userId && c.CheckInDate.Month == today.Month && c.CheckInDate.Year == today.Year)
            .SumAsync(c => c.PointsEarned);

        var badgePts = await _context.UserBadges
            .Where(ub => ub.UserId == userId)
            .SumAsync(ub => ub.Badge.Points);

        var spentPts = await _context.RewardClaims
            .Where(rc => rc.UserId == userId && rc.Status != ClaimStatus.Rejected)
            .SumAsync(rc => rc.PointsSpent);

        int available = (checkInPts + badgePts) - spentPts;

        if (available < reward.PointCost)
        {
            return BadRequest(new
            {
                success = false,
                message = $"Saldo poin Anda ({available} Poin) tidak mencukupi untuk menukar hadiah ini ({reward.PointCost} Poin)."
            });
        }

        var claim = new RewardClaim
        {
            UserId = userId,
            RewardItemId = reward.Id,
            PointsSpent = reward.PointCost,
            PointValueSnapshot = 100.00m,
            RupiahEquivalent = reward.PointCost * 100.00m,
            Status = ClaimStatus.Pending,
            UserNotes = request.UserNotes?.Trim(),
            ClaimedAt = DateTimeOffset.UtcNow
        };

        reward.Stock -= 1;
        _context.RewardClaims.Add(claim);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = "Pengajuan klaim hadiah berhasil dikirim dan menunggu persetujuan Administrator.",
            data = claim
        });
    }

    [HttpGet("rewards/claims")]
    public async Task<IActionResult> GetMyClaims()
    {
        var userId = _tenantService.UserId;
        var claims = await _context.RewardClaims
            .Include(rc => rc.RewardItem)
            .Include(rc => rc.ProcessedByUser)
            .Where(rc => rc.UserId == userId)
            .OrderByDescending(rc => rc.ClaimedAt)
            .Select(rc => new RewardClaimDto(
                rc.Id,
                rc.UserId,
                _tenantService.UserId ?? "Me",
                rc.RewardItemId,
                rc.RewardItem.Name,
                rc.PointsSpent,
                rc.RupiahEquivalent,
                rc.Status,
                rc.UserNotes,
                rc.AdminNotes,
                rc.ClaimedAt,
                rc.ProcessedAt,
                rc.ProcessedByUser != null ? rc.ProcessedByUser.FullName : null
            ))
            .ToListAsync();

        return Ok(new { success = true, data = claims });
    }

    [HttpGet("admin/claims")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> GetAdminClaims()
    {
        var claims = await _context.RewardClaims
            .Include(rc => rc.User)
            .Include(rc => rc.RewardItem)
            .Include(rc => rc.ProcessedByUser)
            .OrderByDescending(rc => rc.ClaimedAt)
            .Select(rc => new RewardClaimDto(
                rc.Id,
                rc.UserId,
                rc.User.FullName,
                rc.RewardItemId,
                rc.RewardItem.Name,
                rc.PointsSpent,
                rc.RupiahEquivalent,
                rc.Status,
                rc.UserNotes,
                rc.AdminNotes,
                rc.ClaimedAt,
                rc.ProcessedAt,
                rc.ProcessedByUser != null ? rc.ProcessedByUser.FullName : null
            ))
            .ToListAsync();

        return Ok(new { success = true, data = claims });
    }

    [HttpPost("admin/claims/{id}/process")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> ProcessClaim(int id, [FromBody] ProcessRewardClaimRequest request)
    {
        var claim = await _context.RewardClaims
            .Include(rc => rc.RewardItem)
            .FirstOrDefaultAsync(rc => rc.Id == id);

        if (claim == null) return NotFound(new { success = false, message = "Klaim hadiah tidak ditemukan." });

        if (claim.Status != ClaimStatus.Pending)
        {
            return BadRequest(new { success = false, message = "Klaim ini sudah pernah diproses sebelumnya." });
        }

        claim.Status = request.IsApproved ? ClaimStatus.Approved : ClaimStatus.Rejected;
        claim.AdminNotes = request.AdminNotes?.Trim();
        claim.ProcessedAt = DateTimeOffset.UtcNow;
        claim.ProcessedByUserId = _tenantService.UserId;

        // If rejected, restore stock
        if (!request.IsApproved && claim.RewardItem != null)
        {
            claim.RewardItem.Stock += 1;
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = request.IsApproved ? "Klaim hadiah telah disetujui." : "Klaim hadiah telah ditolak dan poin dikembalikan.",
            status = claim.Status
        });
    }

    [HttpGet("admin/rewards")]
    [Authorize(Roles = "Administrator,SuperAdmin")]
    public async Task<IActionResult> GetAdminRewards()
    {
        var rewards = await _context.RewardItems
            .OrderBy(r => r.OrderIndex)
            .Select(r => new RewardItemDto(
                r.Id,
                r.Name,
                r.Description,
                r.PointCost,
                r.PointCost * 100.00m,
                r.Stock,
                r.Category,
                r.Icon,
                r.Color,
                r.IsActive
            ))
            .ToListAsync();

        return Ok(new { success = true, data = rewards });
    }

    [HttpPost("admin/rewards")]
    [Authorize(Roles = "Administrator,SuperAdmin")]
    public async Task<IActionResult> CreateReward([FromBody] CreateOrUpdateRewardItemRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { success = false, message = "Nama hadiah wajib diisi." });
        }

        if (request.PointCost <= 0)
        {
            return BadRequest(new { success = false, message = "Biaya poin harus lebih dari 0." });
        }

        var reward = new RewardItem
        {
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            PointCost = request.PointCost,
            Stock = Math.Max(0, request.Stock),
            Category = string.IsNullOrWhiteSpace(request.Category) ? "Voucher" : request.Category.Trim(),
            Icon = string.IsNullOrWhiteSpace(request.Icon) ? "gift" : request.Icon.Trim(),
            Color = string.IsNullOrWhiteSpace(request.Color) ? "indigo" : request.Color.Trim(),
            IsActive = request.IsActive,
            IsMonthlyMilestoneReward = request.IsMonthlyMilestoneReward,
            OrderIndex = request.OrderIndex,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _context.RewardItems.Add(reward);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Hadiah baru berhasil ditambahkan ke katalog.", data = reward });
    }

    [HttpPut("admin/rewards/{id}")]
    [Authorize(Roles = "Administrator,SuperAdmin")]
    public async Task<IActionResult> UpdateReward(int id, [FromBody] CreateOrUpdateRewardItemRequest request)
    {
        var reward = await _context.RewardItems.FirstOrDefaultAsync(r => r.Id == id);
        if (reward == null) return NotFound(new { success = false, message = "Item hadiah tidak ditemukan." });

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(new { success = false, message = "Nama hadiah wajib diisi." });
        }

        if (request.PointCost <= 0)
        {
            return BadRequest(new { success = false, message = "Biaya poin harus lebih dari 0." });
        }

        reward.Name = request.Name.Trim();
        reward.Description = request.Description?.Trim();
        reward.PointCost = request.PointCost;
        reward.Stock = Math.Max(0, request.Stock);
        reward.Category = string.IsNullOrWhiteSpace(request.Category) ? reward.Category : request.Category.Trim();
        reward.Icon = string.IsNullOrWhiteSpace(request.Icon) ? reward.Icon : request.Icon.Trim();
        reward.Color = string.IsNullOrWhiteSpace(request.Color) ? reward.Color : request.Color.Trim();
        reward.IsActive = request.IsActive;
        reward.IsMonthlyMilestoneReward = request.IsMonthlyMilestoneReward;
        reward.OrderIndex = request.OrderIndex;

        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Katalog hadiah berhasil diperbarui.", data = reward });
    }

    [HttpDelete("admin/rewards/{id}")]
    [Authorize(Roles = "Administrator,SuperAdmin")]
    public async Task<IActionResult> DeleteReward(int id)
    {
        var reward = await _context.RewardItems.FirstOrDefaultAsync(r => r.Id == id);
        if (reward == null) return NotFound(new { success = false, message = "Item hadiah tidak ditemukan." });

        bool hasClaims = await _context.RewardClaims.AnyAsync(rc => rc.RewardItemId == id);
        if (hasClaims)
        {
            // Soft delete / deactivate if it has claim history to protect referential integrity
            reward.IsActive = false;
            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Hadiah dinonaktifkan dari katalog karena memiliki riwayat penukaran." });
        }

        _context.RewardItems.Remove(reward);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Hadiah berhasil dihapus dari katalog." });
    }

    [HttpGet("admin/badges/awards")]
    [Authorize(Roles = "Administrator,SuperAdmin")]
    public async Task<IActionResult> GetAdminBadgeAwards()
    {
        var awards = await _context.UserBadges
            .Include(ub => ub.User)
            .Include(ub => ub.Badge)
            .OrderByDescending(ub => ub.UnlockedAt)
            .Select(ub => new UserBadgeItemDto(
                ub.Id,
                ub.UserId,
                ub.User.FullName,
                ub.BadgeId,
                ub.Badge.Name,
                ub.Badge.Code,
                ub.Badge.Icon,
                ub.Badge.Color,
                ub.Badge.Points,
                ub.Badge.Rarity,
                ub.UnlockedAt,
                ub.AwardedBy
            ))
            .ToListAsync();

        return Ok(new { success = true, data = awards });
    }

    [HttpPost("admin/badges/award")]
    [HttpPost("award")]
    [Authorize(Roles = "Administrator,SuperAdmin")]
    public async Task<IActionResult> AwardBadge([FromBody] AwardBadgeRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.UserId))
        {
            return BadRequest(new { success = false, message = "Pengguna penerima lencana wajib dipilih." });
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.UserId);
        if (user == null) return NotFound(new { success = false, message = "Pengguna tidak ditemukan." });

        var badge = await _context.MasterBadges.FirstOrDefaultAsync(b => b.Id == request.BadgeId);
        if (badge == null) return NotFound(new { success = false, message = "Master badge tidak ditemukan." });

        var existing = await _context.UserBadges.FirstOrDefaultAsync(ub => ub.UserId == request.UserId && ub.BadgeId == request.BadgeId);
        if (existing != null)
        {
            return BadRequest(new { success = false, message = $"Pengguna '{user.FullName}' sudah memiliki lencana '{badge.Name}'." });
        }

        var userBadge = new UserBadge
        {
            UserId = request.UserId,
            BadgeId = request.BadgeId,
            UnlockedAt = DateTimeOffset.UtcNow,
            AwardedBy = _tenantService.UserId ?? "Administrator"
        };

        _context.UserBadges.Add(userBadge);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = $"Lencana '{badge.Name}' (+{badge.Points} Poin) berhasil dianugerahkan kepada '{user.FullName}'."
        });
    }

    [HttpDelete("admin/badges/{badgeId}/user/{userId}")]
    [Authorize(Roles = "Administrator,SuperAdmin")]
    public async Task<IActionResult> RevokeBadge(int badgeId, string userId)
    {
        var userBadge = await _context.UserBadges
            .Include(ub => ub.Badge)
            .Include(ub => ub.User)
            .FirstOrDefaultAsync(ub => ub.BadgeId == badgeId && ub.UserId == userId);

        if (userBadge == null)
        {
            return NotFound(new { success = false, message = "Rekod perolehan lencana tidak ditemukan." });
        }

        _context.UserBadges.Remove(userBadge);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = $"Lencana '{userBadge.Badge.Name}' berhasil ditarik dari pengguna '{userBadge.User.FullName}'."
        });
    }
}
