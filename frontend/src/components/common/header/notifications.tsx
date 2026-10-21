"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/services/api/client";
import { BellIcon, SettingIcon } from "@/components/common/header/icons";
import { Button } from "@/components/tailgrids/core/button";
import { OverlayWrapper } from "@/components/tailgrids/core/overlay";
import { Popover } from "@/components/tailgrids/core/popover";
import { ScrollArea, ScrollAreaViewport, ScrollBar } from "@/components/tailgrids/core/scroll-area";
import { Header, Heading } from "react-aria-components";
import {
  CheckSquare,
  Sparkles,
  CalendarCheck,
  Megaphone,
  Bell,
  Check,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { toast } from "sonner";

interface NotificationItem {
  id: number;
  userId: string;
  companyId: number;
  title: string;
  message: string;
  category: string;
  actionUrl?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  createdByUserName?: string | null;
}

function getCategoryIcon(category: string) {
  switch (category?.toLowerCase()) {
    case "task":
      return <CheckSquare className="h-4 w-4 text-indigo-500" />;
    case "announcement":
      return <Sparkles className="h-4 w-4 text-amber-500" />;
    case "attendance":
      return <CalendarCheck className="h-4 w-4 text-emerald-500" />;
    case "broadcast":
      return <Megaphone className="h-4 w-4 text-purple-500" />;
    default:
      return <Bell className="h-4 w-4 text-gray-500" />;
  }
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return "Baru saja";
    if (diffMin < 60) return `${diffMin}m yang lalu`;
    if (diffHour < 24) return `${diffHour}j yang lalu`;
    if (diffDay === 1) return "Kemarin";
    if (diffDay < 7) return `${diffDay}h yang lalu`;

    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function NotificationsButton() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // 1. Fetch unread count for badge
  const { data: unreadData } = useQuery<{ unreadCount: number }>({
    queryKey: ["notifications-unread-count"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/notifications/unread-count");
        return res.data?.data || { unreadCount: 0 };
      } catch {
        return { unreadCount: 0 };
      }
    },
    refetchInterval: 30000,
  });

  const unreadCount = unreadData?.unreadCount ?? 0;

  // 2. Fetch latest 10 notifications for dropdown
  const { data: notifications = [] } = useQuery<NotificationItem[]>({
    queryKey: ["notifications-header"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/notifications?pageSize=10");
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
  });

  // Mutations
  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.put(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-header"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiClient.put("/notifications/read-all");
    },
    onSuccess: () => {
      toast.success("Semua notifikasi ditandai telah dibaca.");
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-header"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.isRead) {
      markAsReadMutation.mutate(item.id);
    }
    setIsOpen(false);
    if (item.actionUrl) {
      router.push(item.actionUrl);
    } else {
      router.push("/notifications");
    }
  };

  return (
    <OverlayWrapper isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button
        iconOnly
        appearance="outline"
        className="relative size-10 rounded-lg border border-card-border bg-card-background text-icon-primary shadow-xs focus-visible:border-input-primary-focus-border focus-visible:ring-4 focus-visible:ring-input-primary-focus-border/20 [&>svg]:size-auto"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className={cn("absolute top-2 right-2.5 z-1 flex items-center justify-center")}>
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
            </span>
          </span>
        )}
      </Button>

      <Popover
        placement="bottom end"
        className="w-96 overflow-hidden rounded-2xl border border-border-secondary-alt bg-background-white-secondary p-0 shadow-3xl dark:border-gray-800 dark:bg-gray-900"
      >
        {/* Header */}
        <Header className="flex items-center justify-between border-b border-border-secondary-alt px-5 pt-4 pb-3 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Heading level={4} className="text-sm font-bold text-text-primary dark:text-white">
              Notifikasi
            </Heading>
            {unreadCount > 0 && (
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400">
                {unreadCount} baru
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Link
              className="rounded-lg p-1 text-icon-secondary transition-colors hover:bg-gray-100 hover:text-icon-primary dark:hover:bg-gray-800"
              href="/profile/notification"
              title="Pengaturan Notifikasi"
              onClick={() => setIsOpen(false)}
            >
              <SettingIcon />
            </Link>
          </div>
        </Header>

        <ScrollArea className="h-96 max-h-96">
          <ScrollAreaViewport>
            {notifications.length > 0 ? (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {notifications.map((item) => (
                  <li key={item.id}>
                    <button
                      className={cn(
                        "group flex w-full cursor-pointer gap-3 p-3.5 text-left transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/50",
                        !item.isRead && "bg-indigo-50/30 dark:bg-indigo-950/20"
                      )}
                      onClick={() => handleNotificationClick(item)}
                    >
                      {/* Icon */}
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-white shadow-2xs dark:border-gray-800 dark:bg-gray-800">
                        {getCategoryIcon(item.category)}
                      </span>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p
                            className={cn(
                              "truncate text-xs text-gray-900 dark:text-white",
                              !item.isRead ? "font-bold" : "font-medium text-gray-700 dark:text-gray-300"
                            )}
                          >
                            {item.title}
                          </p>

                          {!item.isRead && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600" />
                          )}
                        </div>

                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                          {item.message}
                        </p>

                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-gray-400">
                          <span>{formatRelativeTime(item.createdAt)}</span>
                          {item.actionUrl && (
                            <span className="inline-flex items-center gap-0.5 text-indigo-600 hover:underline dark:text-indigo-400">
                              Buka <ExternalLink className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-12 text-center">
                <Bell className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
                <p className="mt-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Tidak ada notifikasi baru
                </p>
                <p className="text-[11px] text-gray-400">
                  Semua aktivitas dan pemberitahuan akan tampil di sini.
                </p>
              </div>
            )}
          </ScrollAreaViewport>
          <ScrollBar />
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border-secondary-alt px-4 py-3 dark:border-gray-800">
          <button
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending || unreadCount === 0}
            className="text-xs font-medium text-text-secondary transition-colors hover:text-indigo-600 disabled:opacity-40 dark:hover:text-indigo-400"
          >
            Tandai semua dibaca
          </button>
          <Button
            size="sm"
            onClick={() => {
              setIsOpen(false);
              router.push("/notifications");
            }}
            className="h-7 bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Pusat Notifikasi
          </Button>
        </div>
      </Popover>
    </OverlayWrapper>
  );
}
