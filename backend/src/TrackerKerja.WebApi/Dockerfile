# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Salin file project dan restore dependencies
COPY ["src/TrackerKerja.Domain/TrackerKerja.Domain.csproj", "src/TrackerKerja.Domain/"]
COPY ["src/TrackerKerja.Application/TrackerKerja.Application.csproj", "src/TrackerKerja.Application/"]
COPY ["src/TrackerKerja.Infrastructure/TrackerKerja.Infrastructure.csproj", "src/TrackerKerja.Infrastructure/"]
COPY ["src/TrackerKerja.WebApi/TrackerKerja.WebApi.csproj", "src/TrackerKerja.WebApi/"]

RUN dotnet restore "src/TrackerKerja.WebApi/TrackerKerja.WebApi.csproj"

# Salin source code lengkap dan compile
COPY . .
WORKDIR "/src/src/TrackerKerja.WebApi"
RUN dotnet build "TrackerKerja.WebApi.csproj" -c Release -o /app/build

# Publish Stage
FROM build AS publish
RUN dotnet publish "TrackerKerja.WebApi.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
EXPOSE 5000

ENV ASPNETCORE_URLS=http://+:5000
ENV ASPNETCORE_ENVIRONMENT=Production

COPY --from=publish /app/publish .

# Buat folder uploads untuk file persisten
RUN mkdir -p /app/uploads

ENTRYPOINT ["dotnet", "TrackerKerja.WebApi.dll"]
