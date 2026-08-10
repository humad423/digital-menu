'use client'

import React from 'react'

export default function MenuSkeletonLoader() {
  return (
    <div className="space-y-6 animate-pulse dir-rtl p-4 max-w-lg mx-auto">
      {/* Search Bar Skeleton */}
      <div className="w-full h-12 bg-slate-200/80 rounded-2xl"></div>

      {/* Category Tabs Skeleton */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-24 h-9 bg-slate-200 rounded-full shrink-0"></div>
        ))}
      </div>

      {/* Category Title Skeleton */}
      <div className="w-36 h-6 bg-slate-300 rounded-lg mt-4"></div>

      {/* Product Items Skeleton List */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs">
            {/* Image Placeholder */}
            <div className="w-24 h-24 bg-slate-200 rounded-xl shrink-0"></div>
            
            {/* Details Placeholder */}
            <div className="flex-1 space-y-2 py-1">
              <div className="w-3/4 h-4 bg-slate-200 rounded-md"></div>
              <div className="w-full h-3 bg-slate-100 rounded-md"></div>
              <div className="w-1/2 h-3 bg-slate-100 rounded-md"></div>
              <div className="flex justify-between items-center pt-2">
                <div className="w-16 h-5 bg-orange-200/60 rounded-md"></div>
                <div className="w-8 h-8 bg-emerald-200/60 rounded-full"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
