import { Upload } from "lucide-react";
import { CsvImportManager } from "@/components/admin/csv-import-manager";

export default function ImportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Upload className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">
            Import Data
          </h1>
          <p className="text-sm text-gray-500">
            Import subscribers and pick history from CSV files
          </p>
        </div>
      </div>

      <CsvImportManager />
    </div>
  );
}
