"use client";

import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Users, Target, AlertCircle, CheckCircle, XCircle, Download, Eye } from "lucide-react";

type ImportType = "subscribers" | "picks";
type ImportResult = {
  successful: number;
  skipped: number;
  failed: number;
  errors: string[];
  skippedRows?: { row: number; reason: string }[];
  dryRun?: boolean;
};

const SUBSCRIBER_TEMPLATE = "email,name,plan,status,language,joined_date\njohn@example.com,John Doe,vip_monthly,active,en,2026-01-15\njane@example.com,Jane Smith,vip_weekly,active,es,2026-02-01";
const PICKS_TEMPLATE = "pick,game,sport,result,odds,units,date,tier,confidence\nCeltics -4.5,Celtics vs Grizzlies,NBA,win,-110,2,2026-03-20,vip,strong\nOver 8.5,Yankees vs Red Sox,MLB,loss,-120,1,2026-03-19,free,standard\nChiefs ML,Chiefs vs Bills,NFL,push,+150,1.5,2026-03-18,vip,top";

export function CsvImportManager() {
  const [importType, setImportType] = useState<ImportType>("subscribers");
  const [file, setFile] = useState<File | null>(null);
  const [allRows, setAllRows] = useState<Record<string, string>[]>([]);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [previewResult, setPreviewResult] = useState<ImportResult | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setPreviewResult(null);
    setConfirmed(false);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCsv(text);
      if (parsed.length > 0) {
        setHeaders(Object.keys(parsed[0]));
        setAllRows(parsed);
        setPreview(parsed.slice(0, 10));
      }
    };
    reader.readAsText(f);
  }

  function parseCsv(text: string): Record<string, string>[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    const hdrs = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
    return lines.slice(1).map((line) => {
      const vals = line.split(",");
      const obj: Record<string, string> = {};
      hdrs.forEach((h, i) => {
        obj[h] = (vals[i] || "").trim();
      });
      return obj;
    });
  }

  async function handleDryRun() {
    if (!file) return;
    setLoading(true);
    setPreviewResult(null);

    try {
      const text = await file.text();
      const rows = parseCsv(text);

      const res = await fetch("/api/admin/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: importType, rows, dryRun: true }),
      });

      const data = await res.json();
      if (res.ok) {
        setPreviewResult(data);
      } else {
        setPreviewResult({ successful: 0, skipped: 0, failed: rows.length, errors: [data.error || "Preview failed"] });
      }
    } catch (err) {
      setPreviewResult({ successful: 0, skipped: 0, failed: 0, errors: [(err as Error).message] });
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setResult(null);

    try {
      const text = await file.text();
      const rows = parseCsv(text);

      const res = await fetch("/api/admin/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: importType, rows }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setPreviewResult(null);
        setConfirmed(true);
      } else {
        setResult({ successful: 0, skipped: 0, failed: rows.length, errors: [data.error || "Import failed"] });
      }
    } catch (err) {
      setResult({ successful: 0, skipped: 0, failed: 0, errors: [(err as Error).message] });
    } finally {
      setLoading(false);
    }
  }

  function downloadTemplate() {
    const content = importType === "subscribers" ? SUBSCRIBER_TEMPLATE : PICKS_TEMPLATE;
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${importType}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    setFile(null);
    setAllRows([]);
    setPreview([]);
    setHeaders([]);
    setResult(null);
    setPreviewResult(null);
    setConfirmed(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-6">
      {/* Import Type Selector */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => { setImportType("subscribers"); reset(); }}
          className={`flex items-center gap-3 rounded-xl border-2 p-5 transition-all ${
            importType === "subscribers"
              ? "border-primary bg-primary/5 shadow-md"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${
            importType === "subscribers" ? "bg-primary/10" : "bg-gray-100"
          }`}>
            <Users className={`h-6 w-6 ${importType === "subscribers" ? "text-primary" : "text-gray-400"}`} />
          </div>
          <div className="text-left">
            <p className="font-semibold text-navy">Import Subscribers</p>
            <p className="text-sm text-gray-500">Email, name, plan, status</p>
          </div>
        </button>

        <button
          onClick={() => { setImportType("picks"); reset(); }}
          className={`flex items-center gap-3 rounded-xl border-2 p-5 transition-all ${
            importType === "picks"
              ? "border-primary bg-primary/5 shadow-md"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${
            importType === "picks" ? "bg-primary/10" : "bg-gray-100"
          }`}>
            <Target className={`h-6 w-6 ${importType === "picks" ? "text-primary" : "text-gray-400"}`} />
          </div>
          <div className="text-left">
            <p className="font-semibold text-navy">Import Pick History</p>
            <p className="text-sm text-gray-500">Pick, game, result, odds</p>
          </div>
        </button>
      </div>

      {/* Instructions */}
      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-5">
        <h3 className="mb-3 font-semibold text-navy">
          {importType === "subscribers" ? "Subscriber CSV Format" : "Pick History CSV Format"}
        </h3>
        {importType === "subscribers" ? (
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>Required:</strong> <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs">email</code></p>
            <p><strong>Optional:</strong>{" "}
              <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs">name</code>{" "}
              <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs">plan</code>{" "}
              <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs">status</code>{" "}
              <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs">language</code>{" "}
              <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs">joined_date</code>
            </p>
            <p className="text-gray-400">Plan values: vip_weekly, vip_monthly, season_pass. Status: active, cancelled. Existing emails are skipped.</p>
          </div>
        ) : (
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>Required:</strong> at least <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs">pick</code> or <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs">game</code></p>
            <p><strong>Optional:</strong>{" "}
              <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs">sport</code>{" "}
              <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs">result</code>{" "}
              <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs">odds</code>{" "}
              <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs">units</code>{" "}
              <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs">date</code>{" "}
              <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs">tier</code>{" "}
              <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs">confidence</code>
            </p>
            <p className="text-gray-400">Result: win/loss/push (or w/l/p). Sport: NBA, MLB, NFL, NHL, Soccer, NCAA. Tier: free/vip. Blank defaults: units=1, tier=free, confidence=standard, date=today.</p>
          </div>
        )}
        <button
          onClick={downloadTemplate}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Download className="h-4 w-4" />
          Download Template CSV
        </button>
      </div>

      {/* File Upload */}
      <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-8 text-center transition-colors hover:border-primary/50">
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          id="csv-upload"
        />
        <label htmlFor="csv-upload" className="cursor-pointer">
          <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 font-medium text-navy">
            {file ? file.name : "Drop your CSV file here or click to browse"}
          </p>
          <p className="mt-1 text-sm text-gray-400">
            {file ? `${allRows.length} rows detected` : "Supports .csv files"}
          </p>
        </label>
      </div>

      {/* Preview Table */}
      {preview.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h3 className="font-semibold text-navy">Preview (first {Math.min(10, allRows.length)} of {allRows.length} rows)</h3>
            <span className="text-sm text-gray-400">{headers.length} columns detected</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">#</th>
                  {headers.map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                    {headers.map((h) => (
                      <td key={h} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[200px] truncate">{row[h] || <span className="text-gray-300">--</span>}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dry Run Preview Results */}
      {previewResult && !result && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-6 space-y-4">
          <h3 className="font-semibold text-navy text-lg flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-500" />
            Dry Run Preview
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3 rounded-lg bg-green-50 p-4">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-700">{previewResult.successful}</p>
                <p className="text-sm text-green-600">Will import</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-yellow-50 p-4">
              <AlertCircle className="h-6 w-6 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-yellow-700">{previewResult.skipped}</p>
                <p className="text-sm text-yellow-600">Will skip (duplicates)</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-red-50 p-4">
              <XCircle className="h-6 w-6 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-700">{previewResult.failed}</p>
                <p className="text-sm text-red-600">Errors</p>
              </div>
            </div>
          </div>

          {previewResult.skippedRows && previewResult.skippedRows.length > 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50/50 p-4">
              <p className="mb-2 text-sm font-medium text-yellow-700">Skipped rows:</p>
              <ul className="max-h-32 space-y-1 overflow-y-auto text-sm text-yellow-600">
                {previewResult.skippedRows.map((s, i) => (
                  <li key={i}>Row {s.row}: {s.reason}</li>
                ))}
              </ul>
            </div>
          )}

          {previewResult.errors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50/50 p-4">
              <p className="mb-2 text-sm font-medium text-red-700">Errors:</p>
              <ul className="max-h-32 space-y-1 overflow-y-auto text-sm text-red-600">
                {previewResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {previewResult.successful > 0 && (
            <button
              onClick={handleImport}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-semibold text-white shadow-md transition-all hover:bg-secondary disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5" />
                  Confirm Import ({previewResult.successful} rows)
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Preview / Import Buttons */}
      {preview.length > 0 && !result && !previewResult && (
        <div className="flex gap-3">
          <button
            onClick={handleDryRun}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-primary px-6 py-3.5 font-semibold text-primary transition-all hover:bg-primary/5 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Checking...
              </>
            ) : (
              <>
                <Eye className="h-5 w-5" />
                Preview Import
              </>
            )}
          </button>
          <button
            onClick={handleImport}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-semibold text-white shadow-md transition-all hover:bg-secondary disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                Import Directly
              </>
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {result && !result.dryRun && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <h3 className="font-semibold text-navy text-lg">Import Results</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3 rounded-lg bg-green-50 p-4">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-700">{result.successful}</p>
                <p className="text-sm text-green-600">Imported</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-yellow-50 p-4">
              <AlertCircle className="h-6 w-6 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-yellow-700">{result.skipped}</p>
                <p className="text-sm text-yellow-600">Skipped (duplicates)</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-red-50 p-4">
              <XCircle className="h-6 w-6 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-700">{result.failed}</p>
                <p className="text-sm text-red-600">Failed</p>
              </div>
            </div>
          </div>

          {result.skippedRows && result.skippedRows.length > 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50/50 p-4">
              <p className="mb-2 text-sm font-medium text-yellow-700">Skipped rows:</p>
              <ul className="max-h-32 space-y-1 overflow-y-auto text-sm text-yellow-600">
                {result.skippedRows.map((s, i) => (
                  <li key={i}>Row {s.row}: {s.reason}</li>
                ))}
              </ul>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50/50 p-4">
              <p className="mb-2 text-sm font-medium text-red-700">Errors:</p>
              <ul className="max-h-40 space-y-1 overflow-y-auto text-sm text-red-600">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Upload className="h-4 w-4" />
            Import More
          </button>
        </div>
      )}
    </div>
  );
}
