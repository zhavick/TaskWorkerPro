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

    public GamificationController(AppDbContext context, ICurrentTenantService tenantService)
    {
        _context = context;
        _tenantService = tenantService;
    }

    [HttpGet("status")]
    public async Task<IActionResult> GetGamificationStatus()
    {
        var userId = _tenantService.UserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

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

        var entry = new DailyCheckIn
        {
            UserId = userId,
            CheckInDate = today,
            CheckInTime = DateTimeOffset.UtcNow,
            PointsEarned = 10,
            StreakDay = newStreak,
            IsMonthlyMilestone = false
        };

        _context.DailyCheckIns.Add(entry);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = $"Check-In berhasil! Anda mendapatkan +10 Poin. Rangkaian Streak: {newStreak} Hari.",
            pointsEarned = 10,
            streakDay = newStreak
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

        // Calculate user current available points
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
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
}
