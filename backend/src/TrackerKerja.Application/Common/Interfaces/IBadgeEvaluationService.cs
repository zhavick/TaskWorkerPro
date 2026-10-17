using TrackerKerja.Domain.Entities;

namespace TrackerKerja.Application.Common.Interfaces;

public interface IBadgeEvaluationService
{
    Task<List<MasterBadge>> EvaluateBadgesAsync(string userId);
}
