'use client'

import { useState } from 'react'
import { CldUploadWidget } from 'next-cloudinary'
import { ImagePlus, X, Link as LinkIcon } from 'lucide-react'

export default function ImageUpload({ 
  value, 
  onChange 
}: { 
  value: string, 
  onChange: (url: string) => void 
}) {
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlText, setUrlText] = useState('')

  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default'

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
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {/* Cloudinary Widget Upload */}
            <CldUploadWidget 
              uploadPreset={uploadPreset}
              onSuccess={(result: any) => {
                if (result?.info?.secure_url) {
                  onChange(result.info.secure_url)
                }
              }}
            >
              {({ open }) => (
                <button
                  type="button"
                  onClick={() => {
                    try {
                      open()
                    } catch (e) {
                      setShowUrlInput(true)
                    }
                  }}
                  className="w-32 h-32 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-orange-500 hover:text-orange-500 transition"
                >
                  <ImagePlus size={24} className="mb-2" />
                  <span className="text-xs font-bold">رفع صورة ☁️</span>
                </button>
              )}
            </CldUploadWidget>

            {/* Direct URL input button */}
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="px-3 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition flex items-center gap-1.5"
            >
              <LinkIcon size={14} />
              <span>إدخال رابط صورة مباشرة</span>
            </button>
          </div>

          {showUrlInput && (
            <div className="flex gap-2 w-full max-w-sm">
              <input
                type="text"
                placeholder="أدخل رابط الصورة (https://...)"
                value={urlText}
                onChange={e => setUrlText(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:border-orange-500"
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
                className="px-4 py-2 bg-orange-500 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-orange-600"
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
