using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrackerKerja.Domain.Entities;
using TrackerKerja.Domain.Enums;
using TrackerKerja.Infrastructure.Persistence;
using TrackerKerja.WebApi.Controllers;
using Xunit;

namespace TrackerKerja.Tests;

public class DashboardControllerTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly FakeTenantService _adminTenantService;

    public DashboardControllerTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _adminTenantService = new FakeTenantService(1, "TEST", "test-user-id", true);
        _context = new AppDbContext(options, _adminTenantService);
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    [Fact]
    public async Task GetStats_ReturnsAccurateMetrics()
    {
        // Arrange
        _context.Tasks.AddRange(
            new WorkTask { Id = 1, Title = "Task 1", Status = Domain.Enums.TaskStatus.Todo, AssignedToUserId = "test-user-id", CompanyId = 1 },
            new WorkTask { Id = 2, Title = "Task 2", Status = Domain.Enums.TaskStatus.InProgress, AssignedToUserId = "test-user-id", CompanyId = 1 },
            new WorkTask { Id = 3, Title = "Task 3", Status = Domain.Enums.TaskStatus.Done, AssignedToUserId = "test-user-id", CompanyId = 1 }
        );

        _context.Projects.Add(new Project { Id = 1, Name = "Alpha", Status = ProjectStatus.Active, CompanyId = 1 });

        await _context.SaveChangesAsync();

        var controller = new DashboardController(_context, _adminTenantService);

        // Act
        var result = await controller.GetStats() as OkObjectResult;

        // Assert
        Assert.NotNull(result);
        Assert.Equal(200, result.StatusCode);
    }

    [Fact]
    public async Task GetProductivityChart_ReturnsDaysList()
    {
        // Arrange
        var controller = new DashboardController(_context, _adminTenantService);

        // Act
        var result = await controller.GetProductivityChart(7) as OkObjectResult;

        // Assert
        Assert.NotNull(result);
        Assert.Equal(200, result.StatusCode);
    }

    [Fact]
    public async Task GetDistribution_ReturnsGroupings()
    {
        // Arrange
        _context.Tasks.Add(new WorkTask
        {
            Id = 10,
            Title = "Task Distributed",
            Priority = TaskPriority.High,
            Status = Domain.Enums.TaskStatus.InProgress,
            AssignedToUserId = "test-user-id",
            CompanyId = 1
        });
        await _context.SaveChangesAsync();

        var controller = new DashboardController(_context, _adminTenantService);

        // Act
        var result = await controller.GetDistribution() as OkObjectResult;

        // Assert
        Assert.NotNull(result);
        Assert.Equal(200, result.StatusCode);
    }

    [Fact]
    public async Task GetDistribution_ReturnsMemberWorkloadDistribution_IncludingNewMembers()
    {
        // Arrange
        var projectA = new Project { Id = 101, Name = "Integrasi API", Color = "#6366F1", CompanyId = 1 };
        var projectB = new Project { Id = 102, Name = "Settlement", Color = "#10B981", CompanyId = 1 };
        _context.Projects.AddRange(projectA, projectB);

        var userSyafix = new AppUser
        {
            Id = "user-syafix",
            UserName = "syafix",
            FullName = "Syafix",
            JobTitle = "Senior Developer",
            IsApproved = true,
            CompanyId = 1
        };

        var userSyifa = new AppUser
        {
            Id = "user-syifa",
            UserName = "syifa",
            FullName = "Syifa",
            JobTitle = "QA Engineer",
            IsApproved = true,
            CompanyId = 1
        };

        _context.Users.AddRange(userSyafix, userSyifa);

        _context.Tasks.AddRange(
            new WorkTask
            {
                Id = 21,
                Title = "Endpoint Settlement",
                ProjectId = 102,
                AssignedToUserId = "user-syafix",
                Status = Domain.Enums.TaskStatus.InProgress,
                CompanyId = 1
            },
            new WorkTask
            {
                Id = 22,
                Title = "Webhook Integrasi",
                ProjectId = 101,
                AssignedToUserId = "user-syafix",
                Status = Domain.Enums.TaskStatus.Done,
                CompanyId = 1
            },
            new WorkTask
            {
                Id = 23,
                Title = "Testing API Sanity",
                ProjectId = 101,
                AssignedToUserId = "user-syifa",
                Status = Domain.Enums.TaskStatus.InProgress,
                CompanyId = 1
            }
        );

        await _context.SaveChangesAsync();

        var controller = new DashboardController(_context, _adminTenantService);

        // Act
        var result = await controller.GetDistribution() as OkObjectResult;

        // Assert
        Assert.NotNull(result);
        Assert.Equal(200, result.StatusCode);

        var json = System.Text.Json.JsonSerializer.Serialize(result.Value);
        using var doc = System.Text.Json.JsonDocument.Parse(json);
        var root = doc.RootElement.GetProperty("data");

        Assert.True(root.TryGetProperty("byMember", out var byMemberProp));
        Assert.Equal(System.Text.Json.JsonValueKind.Array, byMemberProp.ValueKind);

        var memberNames = new List<string>();
        foreach (var item in byMemberProp.EnumerateArray())
        {
            memberNames.Add(item.GetProperty("name").GetString()!);
        }

        Assert.Contains("Syafix", memberNames);
        Assert.Contains("Syifa", memberNames);
    }

    [Fact]
    public async Task GetDistribution_NonAdmin_CanViewTeamWorkloadOfSameCompany()
    {
        // Arrange
        var comp1Project = new Project { Id = 201, Name = "Proyek Alpha Corp", Color = "#6366F1", CompanyId = 1 };
        var comp2Project = new Project { Id = 202, Name = "Proyek Beta Inc", Color = "#EF4444", CompanyId = 2 };
        _context.Projects.AddRange(comp1Project, comp2Project);

        var memberAlpha = new AppUser
        {
            Id = "user-alpha",
            UserName = "alpha",
            FullName = "Alpha Member",
            JobTitle = "Frontend Developer",
            IsApproved = true,
            CompanyId = 1
        };

        var memberBeta = new AppUser
        {
            Id = "user-beta",
            UserName = "beta",
            FullName = "Beta Teammate",
            JobTitle = "Backend Developer",
            IsApproved = true,
            CompanyId = 1
        };

        var otherCompUser = new AppUser
        {
            Id = "user-gamma",
            UserName = "gamma",
            FullName = "Gamma Competitor",
            JobTitle = "Analyst",
            IsApproved = true,
            CompanyId = 2
        };

        _context.Users.AddRange(memberAlpha, memberBeta, otherCompUser);

        _context.Tasks.AddRange(
            new WorkTask
            {
                Id = 301,
                Title = "Alpha Task 1",
                ProjectId = 201,
                AssignedToUserId = "user-alpha",
                Status = Domain.Enums.TaskStatus.Done,
                CompanyId = 1
            },
            new WorkTask
            {
                Id = 302,
                Title = "Alpha Task 2",
                ProjectId = 201,
                AssignedToUserId = "user-alpha",
                Status = Domain.Enums.TaskStatus.InProgress,
                CompanyId = 1
            },
            new WorkTask
            {
                Id = 303,
                Title = "Beta Task Teammate",
                ProjectId = 201,
                AssignedToUserId = "user-beta",
                Status = Domain.Enums.TaskStatus.InProgress,
                CompanyId = 1
            },
            new WorkTask
            {
                Id = 304,
                Title = "Gamma Other Company Task",
                ProjectId = 202,
                AssignedToUserId = "user-gamma",
                Status = Domain.Enums.TaskStatus.Done,
                CompanyId = 2
            }
        );

        await _context.SaveChangesAsync();

        // Non-Admin user 'user-alpha' in Company 1
        var nonAdminTenant = new FakeTenantService(1, "COMP1", "user-alpha", false);
        var controller = new DashboardController(_context, nonAdminTenant);

        // Act
        var result = await controller.GetDistribution() as OkObjectResult;

        // Assert
        Assert.NotNull(result);
        Assert.Equal(200, result.StatusCode);

        var json = System.Text.Json.JsonSerializer.Serialize(result.Value);
        using var doc = System.Text.Json.JsonDocument.Parse(json);
        var data = doc.RootElement.GetProperty("data");

        // Total company tasks should be 3 (excluding Company 2's task)
        Assert.Equal(3, data.GetProperty("totalTasks").GetInt32());

        var byMember = data.GetProperty("byMember");
        var membersList = new List<(string name, int value, int inProgress, int done)>();
        foreach (var item in byMember.EnumerateArray())
        {
            membersList.Add((
                item.GetProperty("name").GetString()!,
                item.GetProperty("value").GetInt32(),
                item.GetProperty("inProgressCount").GetInt32(),
                item.GetProperty("doneCount").GetInt32()
            ));
        }

        // Must see both Alpha and Beta
        Assert.Contains(membersList, m => m.name == "Alpha Member" && m.value == 2 && m.done == 1 && m.inProgress == 1);
        Assert.Contains(membersList, m => m.name == "Beta Teammate" && m.value == 1 && m.inProgress == 1);

        // Must NOT see user from Company 2 (multi-tenant boundary maintained)
        Assert.DoesNotContain(membersList, m => m.name == "Gamma Competitor");
    }

    [Fact]
    public async Task GetDistribution_WhenCompanyHasTasks_ResolvesTargetCompanyIdAndReturnsRealMembers()
    {
        // Arrange: Admin has company 99 which has 0 tasks. Company 4 has 2 tasks and 2 members.
        var adminTenant = new FakeTenantService(99, "ADMIN_HOLDING", "usr-admin", true);
        var controller = new DashboardController(_context, adminTenant);

        _context.Users.AddRange(
            new AppUser { Id = "m-1", FullName = "Syafix Said", CompanyId = 4, IsApproved = true },
            new AppUser { Id = "m-2", FullName = "Iqbal Ali", CompanyId = 4, IsApproved = true }
        );

        _context.Tasks.AddRange(
            new WorkTask { Id = 801, Title = "Task Elistec 1", CompanyId = 4, AssignedToUserId = "m-1", Status = Domain.Enums.TaskStatus.Done },
            new WorkTask { Id = 802, Title = "Task Elistec 2", CompanyId = 4, AssignedToUserId = "m-2", Status = Domain.Enums.TaskStatus.InProgress }
        );
        await _context.SaveChangesAsync();

        // Act - call with companyId = 4 explicitly
        var resultExplicit = await controller.GetDistribution(4) as OkObjectResult;
        Assert.NotNull(resultExplicit);
        var jsonDoc = JsonDocument.Parse(System.Text.Json.JsonSerializer.Serialize(resultExplicit!.Value));
        var dataExplicit = jsonDoc.RootElement.GetProperty("data");
        Assert.Equal(2, dataExplicit.GetProperty("totalTasks").GetInt32());

        // Act - call with null companyId, admin defaults to company with tasks (4)
        var resultAuto = await controller.GetDistribution(null) as OkObjectResult;
        Assert.NotNull(resultAuto);
        var jsonDocAuto = JsonDocument.Parse(System.Text.Json.JsonSerializer.Serialize(resultAuto!.Value));
        var dataAuto = jsonDocAuto.RootElement.GetProperty("data");
        Assert.Equal(2, dataAuto.GetProperty("totalTasks").GetInt32());

        var byMember = dataAuto.GetProperty("byMember");
        var memberNames = new List<string>();
        foreach (var m in byMember.EnumerateArray())
        {
            memberNames.Add(m.GetProperty("name").GetString()!);
        }
        Assert.Contains("Syafix Said", memberNames);
        Assert.Contains("Iqbal Ali", memberNames);
    }

    private class FakeTenantService : TrackerKerja.Application.Common.Interfaces.ICurrentTenantService
    {
        public FakeTenantService(int? companyId, string? companyCode, string? userId, bool isAdmin)
        {
            CompanyId = companyId;
            CompanyCode = companyCode;
            UserId = userId;
            IsAdmin = isAdmin;
        }

        public int? CompanyId { get; set; }
        public string? CompanyCode { get; set; }
        public string? UserId { get; set; }
        public bool IsAdmin { get; set; }
    }
}
