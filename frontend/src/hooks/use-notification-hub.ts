"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import * as signalR from "@microsoft/signalr";
import { createNotificationHubConnection } from "@/services/signalr/notification-hub";

export interface ReceivedNotification {
  id: number;
  userId: string;
  companyId: number;
  title: string;
  message: string;
  category: string;
  actionUrl?: string | null;
  isRead: boolean;
  createdAt: string;
  createdByUserName?: string | null;
}

export function useNotificationHub() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("access_token");
    if (!token) return;

    const connection = createNotificationHubConnection();
    if (!connection) return;

    connectionRef.current = connection;

    connection.on("ReceiveNotification", (notification: ReceivedNotification) => {
      // Show interactive toast
      toast.info(notification.title || "Notifikasi Baru", {
        description: notification.message,
        duration: 6000,
        action: notification.actionUrl
          ? {
              label: "Buka",
              onClick: () => {
                if (notification.actionUrl) {
                  router.push(notification.actionUrl);
                }
              },
            }
          : undefined,
      });

      // Instantly refresh query cache
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-header"] });
    });

    let isMounted = true;

    async function startConnection() {
      try {
        if (connection && connection.state === signalR.HubConnectionState.Disconnected) {
          await connection.start();
        }
      } catch (err) {
        // Silently retry or log - automatic reconnect will handle subsequent attempts
        console.warn("SignalR connection attempt failed:", err);
      }
    }

    startConnection();

    return () => {
      isMounted = false;
      if (connectionRef.current) {
        connectionRef.current.stop().catch(() => {});
        connectionRef.current = null;
      }
    };
  }, [queryClient, router]);

  return {
    connection: connectionRef.current,
  };
}
