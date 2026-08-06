export default function HomeLoading() {
  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-28">
      {/* Top Header Skeleton */}
      <header className="bg-slate-900 text-white shadow-lg border-b border-slate-800">
        <div className="max-w-md sm:max-w-lg mx-auto px-4 py-3.5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="h-7 bg-slate-800 rounded-lg w-28 animate-pulse" />
            <div className="h-8 bg-slate-800 rounded-full w-32 animate-pulse" />
            <div className="h-8 bg-slate-800 rounded-full w-8 animate-pulse" />
          </div>
          <div className="h-10 bg-slate-800 rounded-2xl animate-pulse" />
          <div className="flex gap-2 overflow-hidden pt-1">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-8 w-20 bg-slate-800 rounded-xl shrink-0 animate-pulse" />
            ))}
          </div>
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="max-w-md sm:max-w-lg mx-auto px-4 mt-5 space-y-6">
        {/* Banner Skeleton */}
        <div className="h-36 bg-slate-200 rounded-3xl animate-pulse" />

        {/* Offers Section Skeleton */}
        <div className="space-y-2.5">
          <div className="flex justify-between">
            <div className="h-5 bg-slate-200 rounded-md w-28 animate-pulse" />
            <div className="h-4 bg-slate-200 rounded-md w-16 animate-pulse" />
          </div>
          <div className="flex gap-3 overflow-hidden">
            {[1, 2].map(i => (
              <div key={i} className="w-60 h-48 bg-white border border-slate-200 rounded-2xl shrink-0 animate-pulse p-3 space-y-2">
                <div className="h-24 bg-slate-200 rounded-xl" />
                <div className="h-4 bg-slate-200 rounded-md w-3/4" />
                <div className="h-4 bg-slate-200 rounded-md w-1/2" />
              </div>
            ))}
          </div>
        </div>

        {/* Store Cards Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs animate-pulse">
              <div className="h-44 bg-slate-200" />
              <div className="p-4 space-y-3">
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-200 -mt-7 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded-md w-1/2" />
                    <div className="h-3 bg-slate-150 rounded-md w-1/3" />
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between">
                  <div className="h-5 bg-slate-200 rounded-md w-24" />
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
