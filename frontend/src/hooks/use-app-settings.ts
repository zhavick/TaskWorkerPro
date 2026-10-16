'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';
import { useEffect, useState } from 'react';

export interface SystemSettingItem {
  key: string;
  value: string;
  description?: string;
  updatedAt?: string;
}

const DEFAULT_APP_NAME = 'TrackerKerja Modern';
const STORAGE_KEY = 'wtp_app_name';

export function useAppSettings() {
  const [cachedAppName, setCachedAppName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_APP_NAME;
    }
    return DEFAULT_APP_NAME;
  });

  const query = useQuery<SystemSettingItem[]>({
    queryKey: ['systemSettings'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/settings');
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 60 * 1000,
  });

  const serverAppName = query.data?.find((s) => s.key === 'AppName')?.value;
  const appName = serverAppName || cachedAppName || DEFAULT_APP_NAME;

  useEffect(() => {
    if (serverAppName && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, serverAppName);
      setCachedAppName(serverAppName);
    }
  }, [serverAppName]);

  return {
    ...query,
    appName,
    settings: query.data || [],
  };
}
