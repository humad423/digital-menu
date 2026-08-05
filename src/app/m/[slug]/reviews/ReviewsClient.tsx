'use client'

import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { ArrowRight, Star, Plus, Check, MessageSquare, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function ReviewsClient({
  restaurant,
  initialRatings
}: {
  restaurant: any
  initialRatings: any[]
}) {
  const { isLoggedIn, profile, openAuthModal } = useAuth()
  const [ratings, setRatings] = useState<any[]>(initialRatings)
  const [showAddForm, setShowAddForm] = useState(false)
  const [ratingStars, setRatingStars] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchRatings = async () => {
    const { data } = await supabase
      .from('ratings')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false })

    if (data) setRatings(data)
  }

  const avgRating = ratings.length > 0
    ? (ratings.reduce((acc, curr) => acc + curr.rating, 0) / ratings.length).toFixed(1)
    : 'جديد'

  const handleOpenAddForm = () => {
    if (!isLoggedIn) {
      openAuthModal(() => {
        setShowAddForm(true)
      })
    } else {
      setShowAddForm(true)
    }
  }

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setSubmitting(true)

    const payload = {
      restaurant_id: restaurant.id,
      user_phone: profile.phone,
      user_name: profile.full_name || 'زبون رقم ' + profile.phone.slice(-4),
      rating: ratingStars,
      comment: comment.trim() || null
    }

    await supabase.from('ratings').insert([payload])
    setSubmitting(false)
    setShowAddForm(false)
    setComment('')
    await fetchRatings()
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20 dir-rtl">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href={`/m/${restaurant.slug}`}
            className="w-9 h-9 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center hover:bg-gray-200 transition"
          >
            <ArrowRight size={18} />
          </Link>
          <div>
            <h1 className="text-base font-black text-gray-900 leading-tight">تقييمات الزبائن</h1>
            <p className="text-[11px] text-gray-400 font-bold">{restaurant.name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* Rating Summary Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 text-center relative overflow-hidden">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-500 border border-amber-200 flex items-center justify-center text-2xl font-black mx-auto mb-3 shadow-inner">
            ⭐ {avgRating}
          </div>
          <h2 className="text-lg font-black text-gray-900 mb-1">تقييمات {restaurant.name}</h2>
          <p className="text-xs text-gray-400 font-bold mb-4">
            {ratings.length > 0 ? `بناءً على ${ratings.length} تقييم حقيقي من الزبائن` : 'لا توجد تقييمات بعد'}
          </p>

          {!showAddForm && (
            <button
              onClick={handleOpenAddForm}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-xs rounded-2xl shadow-md hover:shadow-lg transition active:scale-98 flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              <span>أضف تقييمك للمطعم ⭐</span>
            </button>
          )}
        </div>

        {/* Add Rating Form */}
        {showAddForm && (
          <form onSubmit={handleSubmitRating} className="bg-white rounded-3xl p-5 shadow-sm border border-orange-200 space-y-4 animate-fade-in">
            <h3 className="font-black text-sm text-gray-900 text-center">شاركنا رأيك في الوجبات والخدمة ⭐</h3>

            {/* Star Selector */}
            <div className="flex justify-center gap-3 text-3xl">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatingStars(star)}
                  className={`transition transform hover:scale-125 ${
                    star <= ratingStars ? 'text-amber-400' : 'text-gray-300'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">ملاحظتك / تعليقك (اختياري)</label>
              <textarea
                rows={3}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="اكتب تعليقك حول طعم الطعام ونظافة الوجبات..."
                className="w-full p-3 border border-gray-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-orange-100 bg-gray-50 focus:bg-white transition"
              ></textarea>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-xs rounded-2xl shadow-md hover:shadow-lg transition active:scale-98 disabled:opacity-50"
              >
                {submitting ? 'جاري الحفظ...' : 'حفظ التقييم ⭐'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-3.5 bg-gray-100 text-gray-600 font-bold text-xs rounded-2xl hover:bg-gray-200 transition"
              >
                إلغاء
              </button>
            </div>
          </form>
        )}

        {/* Ratings List */}
        <div className="space-y-3">
          <h3 className="font-black text-sm text-gray-900 px-1">آراء الزبائن ({ratings.length})</h3>
          
          {ratings.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-gray-100">
              <span className="text-3xl block mb-2">🍽️</span>
              <p className="text-xs text-gray-400 font-bold">لا توجد تقييمات مكتوبة بعد. كن أول من يقيّم هذا المطعم!</p>
            </div>
          ) : (
            ratings.map(item => (
              <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-black text-xs text-gray-900">{item.user_name || 'زبون'}</span>
                  <div className="flex text-amber-400 text-xs">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i}>{i < item.rating ? '★' : '☆'}</span>
                    ))}
                  </div>
                </div>
                {item.comment && (
                  <p className="text-xs text-gray-600 leading-relaxed font-medium mt-1 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    {item.comment}
                  </p>
                )}
                <span className="text-[10px] text-gray-400 font-medium block mt-2">
                  {new Date(item.created_at).toLocaleDateString('ar-EG')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
