'use client'

import { useState } from 'react'
import { ImagePlus, X } from 'lucide-react'

export default function MultiImageUpload({
  images = [],
  onChange
}: {
  images: string[]
  onChange: (urls: string[]) => void
}) {
  const [uploading, setUploading] = useState(false)

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'o2iy0uxo'
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default'

  const MAX_FILE_SIZE_MB = 5
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = Array.from(e.target.files || [])
    if (rawFiles.length === 0) return

    // 1. Filter out invalid types
    const validFormatFiles = rawFiles.filter(
      file => file.type.startsWith('image/') || ALLOWED_IMAGE_TYPES.includes(file.type)
    )

    if (validFormatFiles.length < rawFiles.length) {
      alert('تم استبعاد بعض الملفات لأنها ليست ملفات صور صالحة (PNG, JPG, WEBP, GIF, SVG).')
    }

    // 2. Filter out oversized files (> 5MB)
    const validSizeFiles = validFormatFiles.filter(file => file.size <= MAX_FILE_SIZE_BYTES)

    if (validSizeFiles.length < validFormatFiles.length) {
      alert(`تم استبعاد بعض الصور لأن حجمها يتجاوز الحد الأقصى المسموح به (${MAX_FILE_SIZE_MB} ميغابايت).`)
    }

    if (validSizeFiles.length === 0) {
      e.target.value = ''
      return
    }

    setUploading(true)
    const newUrls: string[] = []

    for (const file of validSizeFiles) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('upload_preset', uploadPreset)

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData
        })

        const data = await res.json()
        if (data?.secure_url) {
          newUrls.push(data.secure_url)
        } else {
          // Fallback base64
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onload = (event) => resolve(event.target?.result as string)
            reader.readAsDataURL(file)
          })
          if (base64) newUrls.push(base64)
        }
      } catch (err) {
        console.error('Upload error:', err)
      }
    }

    if (newUrls.length > 0) {
      onChange([...images, ...newUrls])
    }
    setUploading(false)
    e.target.value = ''
  }

  const removeImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index)
    onChange(updated)
  }

  return (
    <div className="space-y-2 w-full">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
        {images.map((url, idx) => (
          <div key={idx} className="relative h-24 rounded-2xl overflow-hidden border border-slate-200 group bg-slate-100">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(idx)}
              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-90 hover:opacity-100 shadow-sm transition"
            >
              <X size={12} />
            </button>
            {idx === 0 && (
              <span className="absolute bottom-1 right-1 bg-slate-900/80 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md">
                الرئيسية
              </span>
            )}
          </div>
        ))}

        {/* Add Image Button */}
        <label className="h-24 rounded-2xl border-2 border-dashed border-slate-300 hover:border-orange-500 bg-slate-50 hover:bg-orange-50/40 flex flex-col items-center justify-center cursor-pointer transition p-2 text-center">
          {uploading ? (
            <div className="flex flex-col items-center gap-1">
              <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] font-bold text-slate-500">رفع...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 text-slate-500 hover:text-orange-600">
              <ImagePlus size={18} />
              <span className="text-[10px] font-black">+ إضافة صورة</span>
            </div>
          )}
          <input
            type="file"
            accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
            multiple
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>
      <p className="text-[10px] text-slate-400 font-bold">
        💡 يمكنك رفع أكثر من صورة للموديل (مثال: صورة أمامية، صورة خلفية، تفاصيل القماش). الصورة الأولى هي الرئيسية.
      </p>
    </div>
  )
}
