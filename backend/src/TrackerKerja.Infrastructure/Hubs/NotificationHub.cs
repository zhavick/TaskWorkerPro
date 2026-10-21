using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace TrackerKerja.Infrastructure.Hubs;

[Authorize]
public class NotificationHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var companyIdClaim = Context.User?.FindFirst("companyId")?.Value
            ?? Context.User?.FindFirst("CompanyId")?.Value;

        if (!string.IsNullOrEmpty(companyIdClaim))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"company_{companyIdClaim}");
        }

        await base.OnConnectedAsync();
    }
}
