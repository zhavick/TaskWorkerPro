"use client";

import React, { useEffect, useState } from "react";
import { Building2 } from "lucide-react";

interface TenantInfo {
  companyId?: number;
  companyName?: string;
  companyCode?: string;
}

export function TenantBadge() {
  const [tenant, setTenant] = useState<TenantInfo>({
    companyName: "Wahana Central Holding",
    companyCode: "WCH",
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user_profile");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.companyCode || parsed.companyName) {
          setTenant({
            companyId: parsed.companyId,
            companyName: parsed.companyName || "Wahana Holding",
            companyCode: parsed.companyCode || "WCH",
          });
        }
      }
    } catch {
      // fallback default
    }
  }, []);

  return (
    <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-xs dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">
      <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
      <span className="font-mono font-bold">[{tenant.companyCode}]</span>
      <span className="hidden sm:inline font-medium text-gray-700 dark:text-gray-300">{tenant.companyName}</span>
    </div>
  );
}
