export default function OffersLoading() {
  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      {/* Header Skeleton */}
      <header className="bg-slate-900 text-white shadow-lg border-b border-slate-800">
        <div className="max-w-md sm:max-w-lg mx-auto px-4 py-3.5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-800 animate-pulse" />
              <div className="space-y-1">
                <div className="h-4 bg-slate-700 rounded-md w-36 animate-pulse" />
                <div className="h-3 bg-slate-800 rounded-md w-48 animate-pulse" />
              </div>
            </div>
          </div>
          <div className="h-10 bg-slate-800 rounded-2xl animate-pulse" />
          <div className="flex gap-2 overflow-hidden pt-1">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-8 w-20 bg-slate-800 rounded-xl shrink-0 animate-pulse" />
            ))}
          </div>
        </div>
      </header>

      {/* Main Grid Skeleton */}
      <main className="max-w-md sm:max-w-lg mx-auto px-4 mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden animate-pulse">
              <div className="h-40 w-full bg-slate-200" />
              <div className="p-4 space-y-3">
                <div className="h-3 bg-slate-200 rounded-md w-1/3" />
                <div className="h-4 bg-slate-200 rounded-md w-3/4" />
                <div className="h-3 bg-slate-150 rounded-md w-full" />
                <div className="pt-3 border-t border-slate-100 flex justify-between">
                  <div className="h-5 bg-slate-200 rounded-md w-16" />
                  <div className="h-4 bg-slate-200 rounded-md w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
