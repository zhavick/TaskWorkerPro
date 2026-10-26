"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import { Search, X, Check, Layers, AlertCircle, ChevronDown } from "lucide-react";

interface SearchableTaskPickerProps {
  value?: number | null;
  onChange: (taskId: number | null, task?: any) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  initialTaskTitle?: string;
}

export function SearchableTaskPicker({
  value,
  onChange,
  placeholder = "Cari tugas berdasarkan judul atau kode [TK-xxxx]...",
  required = false,
  disabled = false,
  className = "",
  initialTaskTitle,
}: SearchableTaskPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch tasks with search query
  const { data: tasks = [], isLoading } = useQuery<any[]>({
    queryKey: ["searchableTasks", searchQuery],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) {
          params.append("search", searchQuery.trim());
        }
        params.append("pageSize", "50");
        const res = await apiClient.get(`/tasks?${params.toString()}`);
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 30 * 1000,
  });

  // Find currently selected task object
  const selectedTask = tasks.find((t: any) => t.id === value);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (t: any) => {
    onChange(t.id, t);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null, undefined);
    setSearchQuery("");
  };

  const displayTitle = selectedTask
    ? `[TK-${String(selectedTask.id).padStart(4, "0")}] ${selectedTask.title}`
    : value
    ? initialTaskTitle || `[TK-${String(value).padStart(4, "0")}] Tugas #${value}`
    : null;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Hidden input for HTML form validation if required */}
      {required && (
        <input
          tabIndex={-1}
          autoComplete="off"
          style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
          value={value ?? ""}
          onChange={() => {}}
          required={required}
        />
      )}

      {/* Main Trigger / Selected View */}
      {displayTitle ? (
        <div
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`flex items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-indigo-50/50 px-3 py-2 text-xs transition-all cursor-pointer dark:border-indigo-900/60 dark:bg-indigo-950/30 ${
            disabled ? "opacity-60 cursor-not-allowed" : "hover:border-indigo-400"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-white text-[10px] font-bold">
              <Layers className="size-3" />
            </span>
            <span className="font-semibold text-gray-900 dark:text-white truncate">
              {displayTitle}
            </span>
            {selectedTask?.projectName && (
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white shrink-0"
                style={{ backgroundColor: selectedTask.projectColor || "#6366F1" }}
              >
                {selectedTask.projectName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="rounded-md p-0.5 text-gray-400 hover:bg-indigo-100 hover:text-gray-700 dark:hover:bg-indigo-900/60 dark:hover:text-gray-200"
                title="Hapus pilihan"
              >
                <X className="size-3.5" />
              </button>
            )}
            <ChevronDown className="size-3.5 text-gray-400" />
          </div>
        </div>
      ) : (
        <div
          onClick={() => !disabled && setIsOpen(true)}
          className={`flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs shadow-2xs transition-all cursor-pointer dark:border-gray-800 dark:bg-gray-900 ${
            disabled ? "opacity-60 cursor-not-allowed" : "hover:border-indigo-400 focus-within:border-indigo-500"
          }`}
        >
          <Search className="size-3.5 text-gray-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            disabled={disabled}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            placeholder={placeholder}
            className="w-full bg-transparent text-xs text-gray-800 placeholder-gray-400 focus:outline-hidden dark:text-gray-200"
          />
          <ChevronDown className="size-3.5 text-gray-400 shrink-0" />
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl backdrop-blur-md dark:border-gray-800 dark:bg-gray-900">
          {/* Search box inside dropdown if a task was already selected */}
          {displayTitle && (
            <div className="mb-1.5 flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 dark:border-gray-800 dark:bg-gray-800/50">
              <Search className="size-3 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                autoFocus
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik untuk mencari tugas lain..."
                className="w-full bg-transparent text-xs text-gray-800 placeholder-gray-400 focus:outline-hidden dark:text-gray-200"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          )}

          {/* Task list options */}
          <div className="space-y-0.5">
            {tasks.length > 0 ? (
              tasks.map((t: any) => {
                const isSelected = t.id === value;
                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelect(t)}
                    className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                        : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                        TK-{String(t.id).padStart(4, "0")}
                      </span>
                      <span className="truncate">{t.title}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {t.projectName && (
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                          style={{ backgroundColor: t.projectColor || "#6366F1" }}
                        >
                          {t.projectName}
                        </span>
                      )}
                      {isSelected && <Check className="size-3.5 text-indigo-600 dark:text-indigo-400" />}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-4 text-center text-xs text-gray-400">
                {isLoading ? "Mencari tugas..." : "Tidak ada tugas yang cocok."}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
