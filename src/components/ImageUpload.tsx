'use client'

import { CldUploadWidget } from 'next-cloudinary'
import { ImagePlus, X } from 'lucide-react'

export default function ImageUpload({ 
  value, 
  onChange 
}: { 
  value: string, 
  onChange: (url: string) => void 
}) {
  return (
    <div className="flex flex-col items-start gap-4">
      {value ? (
        <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
          <img src={value} alt="Upload" className="w-full h-full object-contain" />
          <button 
            type="button"
            onClick={() => onChange('')}
            className="absolute top-1 right-1 bg-white p-1 rounded-full text-red-500 shadow-sm"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <CldUploadWidget 
          uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
          onSuccess={(result: any) => {
            onChange(result?.info?.secure_url)
          }}
        >
          {({ open }) => (
            <button
              type="button"
              onClick={() => open()}
              className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-blue-500 hover:text-blue-500 transition"
            >
              <ImagePlus size={24} className="mb-2" />
              <span className="text-sm font-medium">رفع صورة</span>
            </button>
          )}
        </CldUploadWidget>
      )}
    </div>
  )
}
