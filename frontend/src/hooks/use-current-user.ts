"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import { useState, useEffect } from "react";

export interface UserProfileInfo {
  id: string;
  fullName: string;
  email: string;
  jobTitle: string;
  avatarColor?: string | null;
  profilePictureUrl?: string | null;
  coverPictureUrl?: string | null;
  companyId?: number | null;
  companyName?: string | null;
  companyCode?: string | null;
  isApproved: boolean;
  roles: string[];
  phoneNumber?: string | null;
  createdAt?: string;
}

export function useCurrentUser() {
  const [cachedUser, setCachedUser] = useState<UserProfileInfo | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("user_profile");
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  const { data: profile, isLoading } = useQuery<UserProfileInfo>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      const res = await apiClient.get("/profile");
      const data = res.data?.data;
      if (data && typeof window !== "undefined") {
        localStorage.setItem("user_profile", JSON.stringify(data));
      }
      return data;
    },
    initialData: cachedUser || undefined,
    staleTime: 5 * 60 * 1000,
  });

  const user = profile || cachedUser;

  const isAdmin = Boolean(
    user?.roles?.includes("Administrator") ||
    user?.roles?.includes("SuperAdmin") ||
    user?.jobTitle?.toLowerCase().includes("admin") ||
    user?.email?.toLowerCase().includes("admin@")
  );

  return {
    user,
    userId: user?.id,
    fullName: user?.fullName,
    email: user?.email,
    roles: user?.roles || [],
    isAdmin,
    isLoading: isLoading && !user,
  };
}
