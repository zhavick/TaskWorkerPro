import * as signalR from "@microsoft/signalr";
import { getBaseUrl } from "@/services/api/client";

export function getSignalRHubUrl(): string {
  const base = getBaseUrl().replace(/\/api\/?$/, "");
  return `${base}/hubs/notifications`;
}

export function createNotificationHubConnection(): signalR.HubConnection | null {
  if (typeof window === "undefined") return null;

  const hubUrl = getSignalRHubUrl();

  return new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, {
      accessTokenFactory: () => {
        return localStorage.getItem("access_token") || "";
      },
      skipNegotiation: false,
      transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(signalR.LogLevel.Warning)
    .build();
}
