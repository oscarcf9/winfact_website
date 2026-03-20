export default function HistoryLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 bg-gray-200 rounded-lg" />

      {/* Filter bar */}
      <div className="flex gap-3">
        <div className="h-10 w-28 bg-gray-200 rounded-xl" />
        <div className="h-10 w-28 bg-gray-200 rounded-xl" />
        <div className="h-10 w-28 bg-gray-200 rounded-xl" />
      </div>

      {/* Pick rows */}
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-white border border-gray-200 p-4 flex items-center gap-4">
            <div className="h-10 w-10 bg-gray-200 rounded-full shrink-0" />
            <div className="flex-1">
              <div className="h-4 w-48 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-32 bg-gray-200 rounded" />
            </div>
            <div className="h-6 w-16 bg-gray-200 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
