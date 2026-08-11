'use client'

import { useState } from 'react'
import { ImagePlus, X, Link as LinkIcon, Upload } from 'lucide-react'

function compressImageToWebpBlob(file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> {
  return new Promise((resolve) => {
    // If SVG or GIF, don't compress via canvas to preserve animation/vector quality
    if (file.type.includes('svg') || file.type.includes('gif')) {
      resolve(file)
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob)
              } else {
                resolve(file)
              }
            },
            'image/webp',
            quality
          )
        } else {
          resolve(file)
        }
      }
      img.onerror = () => resolve(file)
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

function compressImageToBase64(file: File, maxWidth = 1000, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/webp', quality))
        } else {
          resolve(e.target?.result as string)
        }
      }
      img.onerror = () => resolve(e.target?.result as string)
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

export default function ImageUpload({ 
  value, 
  onChange 
}: { 
  value: string, 
  onChange: (url: string) => void 
}) {
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlText, setUrlText] = useState('')
  const [uploading, setUploading] = useState(false)

  // Cloudinary configuration (Free 25GB storage)
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'o2iy0uxo'
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default'

  const MAX_FILE_SIZE_MB = 10
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/heic']

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 1. Validate File Type (Strictly Images Only)
    if (!file.type.startsWith('image/') && !ALLOWED_IMAGE_TYPES.some(t => file.type.includes(t.replace('image/', '')))) {
      alert('عذراً، يرجى اختيار ملف صورة فقط (JPG, PNG, WEBP, GIF, SVG).')
      e.target.value = ''
      return
    }

    // 2. Validate File Size (Max 10 MB raw)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1)
      alert(`حجم الصورة (${fileSizeMB} ميغابايت) يتجاوز الحد الأقصى المسموح به (${MAX_FILE_SIZE_MB} ميغابايت).`)
      e.target.value = ''
      return
    }

    try {
      setUploading(true)

      // Convert and compress image to WebP client-side before uploading
      const compressedBlob = await compressImageToWebpBlob(file)
      const webpFileName = file.name.replace(/\.[^/.]+$/, '') + '.webp'

      const formData = new FormData()
      formData.append('file', compressedBlob, webpFileName)
      formData.append('upload_preset', uploadPreset)

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      })

      const data = await res.json()
      if (data?.secure_url) {
        onChange(data.secure_url)
      } else {
        // Fallback to compressed base64 if Cloudinary returns an error
        const compressedBase64 = await compressImageToBase64(file)
        if (compressedBase64) onChange(compressedBase64)
        setUploading(false)
        return
      }
    } catch (err) {
      console.error('Cloudinary upload error:', err)
      alert('تعذر الرفع السحابي، يمكنك استخدام رابط الصورة المباشر.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-3">
      {value ? (
        <div className="relative w-32 h-32 rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 shadow-sm">
          <img src={value} alt="Upload" className="w-full h-full object-cover" />
          <button 
            type="button"
            onClick={() => onChange('')}
            className="absolute top-1.5 right-1.5 bg-white/90 backdrop-blur-md p-1.5 rounded-full text-red-500 shadow-md hover:bg-white transition"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="space-y-3 w-full">
          <div className="flex items-center gap-3">
            {/* File Upload Input */}
            <label className="w-32 h-32 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-orange-500 hover:text-orange-500 transition cursor-pointer shrink-0">
              <Upload size={24} className="mb-2" />
              <span className="text-xs font-bold text-center px-2">{uploading ? 'جاري الرفع...' : 'رفع صورة (Cloudinary) ☁️'}</span>
              <input 
                type="file" 
                accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </label>

            {/* Direct URL input button */}
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="px-3.5 py-2.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition flex items-center gap-2"
            >
              <LinkIcon size={14} className="text-orange-500" />
              <span>إدخال رابط صورة مباشرة (URL)</span>
            </button>
          </div>

          {showUrlInput && (
            <div className="flex gap-2 w-full max-w-md animate-fade-in">
              <input
                type="text"
                placeholder="أدخل رابط الصورة (https://...)"
                value={urlText}
                onChange={e => setUrlText(e.target.value)}
                className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:border-orange-500 font-medium"
              />
              <button
                type="button"
                onClick={() => {
                  if (urlText.trim()) {
                    onChange(urlText.trim())
                    setUrlText('')
                    setShowUrlInput(false)
                  }
                }}
                className="px-4 py-2.5 bg-orange-500 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-orange-600 transition"
              >
                تعيين
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
