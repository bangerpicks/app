'use client'

import { useState, useRef, DragEvent } from 'react'
import { uploadShopItemImage } from '@/lib/shop'
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react'

interface ImageUploadProps {
  currentImageUrl?: string
  onImageUploaded: (imageUrl: string) => void
  onImageRemoved?: () => void
  itemId?: string
  disabled?: boolean
}

export function ImageUpload({
  currentImageUrl,
  onImageUploaded,
  onImageRemoved,
  itemId,
  disabled = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Only JPG, PNG, and WebP images are allowed.')
      return
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      setError('File size exceeds 5MB limit. Please compress the image.')
      return
    }

    setError(null)
    setUploading(true)

    try {
      const imageUrl = await uploadShopItemImage(file, itemId)
      onImageUploaded(imageUrl)
    } catch (err: any) {
      console.error('Error uploading image:', err)
      setError(err.message || 'Failed to upload image. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleDrag = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (disabled || uploading) return

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleRemove = () => {
    if (onImageRemoved) {
      onImageRemoved()
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setError(null)
  }

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm text-ivory mb-2">
        Image <span className="text-cinnabar">*</span>
      </label>

      {/* Current Image Preview */}
      {currentImageUrl && !uploading && (
        <div className="relative mb-4">
          <div className="relative w-full h-48 bg-gray-800 rounded-[10px] overflow-hidden border border-gray-700">
            <img
              src={currentImageUrl}
              alt="Current item image"
              className="w-full h-full object-contain"
            />
            {!disabled && (
              <button
                onClick={handleRemove}
                className="absolute top-2 right-2 p-1.5 bg-cinnabar text-ivory rounded-full hover:bg-red-600 transition-colors"
                aria-label="Remove image"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Upload Area */}
      {(!currentImageUrl || uploading) && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={handleClick}
          className={`
            relative border-2 border-dashed rounded-[10px] p-6 text-center cursor-pointer
            transition-colors
            ${dragActive ? 'border-lime-yellow bg-lime-yellow/10' : 'border-gray-700 bg-gray-800/50'}
            ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-lime-yellow hover:bg-gray-800'}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileInput}
            className="hidden"
            disabled={disabled || uploading}
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="animate-spin text-lime-yellow" size={32} />
              <p className="text-sm text-ivory">Uploading image...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-gray-700 rounded-full">
                {currentImageUrl ? (
                  <ImageIcon className="text-ivory" size={24} />
                ) : (
                  <Upload className="text-ivory" size={24} />
                )}
              </div>
              <div>
                <p className="text-sm text-ivory font-medium">
                  {currentImageUrl ? 'Click to replace image' : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-ivory opacity-70 mt-1">
                  JPG, PNG, or WebP (max 5MB)
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-2 bg-cinnabar bg-opacity-20 border border-cinnabar rounded-[10px]">
          <p className="text-sm text-cinnabar">{error}</p>
        </div>
      )}
    </div>
  )
}
