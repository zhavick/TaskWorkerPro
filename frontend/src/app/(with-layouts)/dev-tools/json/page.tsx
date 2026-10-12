"use client";

import React, { useState } from "react";
import { apiClient } from "@/services/api/client";
import { Code, Copy, Check, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/tailgrids/core/button";
import { toast } from "sonner";

export default function JsonFormatterPage() {
  const [input, setInput] = useState('{"title":"TrackerKerja Modern","version":2,"features":["multi-timer","postgresql","clean-architecture"]}');
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFormat = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post("/dev-tools/json/format", { rawJson: input });
      setOutput(res.data.data.formatted);
      toast.success("JSON berhasil divalidasi dan diformat rapi!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Format JSON tidak valid");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    toast.success("Tersalin ke clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 px-2 py-4 lg:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Developer Tools: JSON Validator & Beautifier
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Validasi payload JSON, format lekukan (indentasi), dan deteksi kesalahan sintaks secara instan.
          </p>
        </div>

        <Button
          onClick={handleFormat}
          disabled={loading || !input.trim()}
          className="gap-2 bg-indigo-600 font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700"
        >
          <Sparkles className="h-4 w-4" />
          Format JSON
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            Raw JSON Input
          </label>
          <textarea
            rows={16}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3 font-mono text-xs text-gray-900 leading-relaxed dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
            placeholder="Tempelkan raw JSON di sini..."
          />
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Formatted Output
            </label>
            {output && (
              <Button size="sm" variant="ghost" onClick={handleCopy} className="h-7 gap-1 text-xs">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Tersalin" : "Salin"}
              </Button>
            )}
          </div>
          <textarea
            readOnly
            rows={16}
            value={output}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3 font-mono text-xs text-indigo-700 leading-relaxed dark:border-gray-800 dark:bg-gray-950 dark:text-indigo-300"
            placeholder="Hasil JSON yang diformat akan muncul di sini..."
          />
        </div>
      </div>
    </div>
  );
}
