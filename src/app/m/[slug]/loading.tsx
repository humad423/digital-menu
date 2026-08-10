export default function MenuLoading() {
  return (
    <div dir="rtl" className="bg-slate-50 text-slate-800 font-sans pb-28">
      <div className="max-w-md sm:max-w-lg mx-auto px-4 pt-3 space-y-4">
        
        {/* Search Bar Skeleton */}
        <div className="h-11 bg-white rounded-2xl border border-slate-200/80 shadow-2xs animate-pulse" />

        {/* Categories Pills Skeleton */}
        <div className="flex gap-2 overflow-hidden py-1">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-8 w-24 bg-white rounded-full border border-slate-200/80 shrink-0 animate-pulse" />
          ))}
        </div>

        {/* Section Header Skeleton */}
        <div className="flex items-center gap-2 pt-2">
          <div className="h-5 bg-slate-200 rounded-md w-32 animate-pulse" />
        </div>

        {/* Menu Items Skeleton Cards */}
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200/80 p-3 flex gap-3 shadow-2xs animate-pulse">
              <div className="w-24 h-24 sm:w-28 sm:h-28 bg-slate-200 rounded-xl shrink-0" />
              <div className="flex-1 flex flex-col justify-between py-1">
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 rounded-md w-3/4" />
                  <div className="h-3 bg-slate-150 rounded-md w-full" />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="h-5 bg-slate-200 rounded-md w-16" />
                  <div className="w-9 h-9 bg-slate-200 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
