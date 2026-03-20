export default function BlogLoading() {
  return (
    <div className="animate-pulse">
      {/* Hero skeleton */}
      <div className="bg-gray-200 h-64 w-full" />

      {/* Category tabs */}
      <div className="flex justify-center gap-2 py-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 w-24 bg-gray-200 rounded-full" />
        ))}
      </div>

      {/* Post grid */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        <div className="h-6 w-40 bg-gray-200 rounded mb-8" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white border border-gray-200 p-6">
              <div className="flex gap-2 mb-4">
                <div className="h-6 w-20 bg-gray-200 rounded-full" />
                <div className="h-6 w-12 bg-gray-200 rounded-full" />
              </div>
              <div className="h-5 w-full bg-gray-200 rounded mb-2" />
              <div className="h-5 w-3/4 bg-gray-200 rounded mb-4" />
              <div className="h-4 w-full bg-gray-200 rounded mb-1" />
              <div className="h-4 w-2/3 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
