"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export function ProfileActions() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);

      const res = await fetch("/api/user/import-tvtime", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jsonData),
      });

      if (res.ok) {
        const result = await res.json();
        setSuccessMessage(`Successfully imported ${result.showsCount} shows and ${result.episodesCount} episodes!`);
        router.refresh();
      } else {
        const errorText = await res.text();
        setErrorMessage(errorText || "Failed to import TV Time data");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to read or parse JSON file");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/user/export-data");
      if (res.ok) {
        const data = await res.json();
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
          JSON.stringify(data, null, 2)
        )}`;
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", jsonString);
        downloadAnchor.setAttribute("download", "movix-data-export.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        setSuccessMessage("Data exported successfully!");
      } else {
        setErrorMessage("Failed to export data");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearData = async () => {
    setIsClearing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setShowClearConfirm(false);

    try {
      const res = await fetch("/api/user/clear-data", {
        method: "POST",
      });

      if (res.ok) {
        setSuccessMessage("All your ratings, watchlist, and tracked TV shows have been cleared.");
        router.refresh();
      } else {
        setErrorMessage("Failed to clear data");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to clear data");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Banners */}
      {errorMessage && (
        <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-4 text-sm text-red-300 flex items-center gap-3">
          <span className="material-symbols-outlined text-red-400 shrink-0">error</span>
          <span>{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 text-sm text-emerald-300 flex items-center gap-3 animate-fade-in">
          <span className="material-symbols-outlined text-emerald-400 shrink-0">check_circle</span>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Settings Panel */}
      <div className="glass-panel rounded-2xl border border-white/10 p-6 md:p-8 space-y-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
          <span className="material-symbols-outlined text-yellow-400">settings</span>
          Data & Settings
        </h3>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Import Card */}
          <div className="flex flex-col justify-between p-5 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition">
            <div className="space-y-2 mb-4">
              <h4 className="font-semibold text-white text-sm">Import TV Time Data</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Select your TV Time JSON export to restore your watched history and tracked series.
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={handleImportClick}
                disabled={isImporting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 disabled:bg-zinc-800 text-black disabled:text-zinc-600 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                {isImporting ? (
                  <div className="w-4 h-4 border-2 border-zinc-600 border-t-black rounded-full animate-spin"></div>
                ) : (
                  <span className="material-symbols-outlined text-[16px]">upload_file</span>
                )}
                Import JSON
              </button>
            </div>
          </div>

          {/* Export Card */}
          <div className="flex flex-col justify-between p-5 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition">
            <div className="space-y-2 mb-4">
              <h4 className="font-semibold text-white text-sm">Export My Data</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Download all your watchlist items, movie ratings, and TV tracking history in a single JSON file.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 border border-white/10 text-white disabled:text-zinc-600 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                {isExporting ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <span className="material-symbols-outlined text-[16px]">download</span>
                )}
                Export to JSON
              </button>
            </div>
          </div>

          {/* Clear Card */}
          <div className="flex flex-col justify-between p-5 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition">
            <div className="space-y-2 mb-4">
              <h4 className="font-semibold text-white text-sm">Clear My Data</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Permanently delete all your watchlist movies, ratings, and TV shows from the database.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                disabled={isClearing}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-650 hover:bg-red-600 disabled:bg-zinc-900 border border-transparent text-white disabled:text-zinc-600 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                Clear All Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <span className="material-symbols-outlined text-red-400 text-3xl">warning</span>
              <h3 className="text-xl font-bold text-white">Clear All Data?</h3>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Are you absolutely sure you want to delete all your ratings, movie watchlist, and tracked TV shows? This action is <strong className="text-white">permanent</strong> and cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2.5 rounded-lg border border-white/10 bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearData}
                className="px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider transition cursor-pointer"
              >
                Yes, Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
