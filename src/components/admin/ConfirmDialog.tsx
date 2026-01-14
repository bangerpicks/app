'use client'

import { X } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'danger' | 'primary'
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const confirmButtonClass =
    confirmVariant === 'danger'
      ? 'bg-cinnabar hover:bg-red-600'
      : 'bg-lime-yellow hover:bg-yellow-400 text-midnight-violet'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-midnight-violet border border-lime-yellow rounded-[10px] p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-ivory">{title}</h3>
          <button
            onClick={onCancel}
            className="text-ivory hover:text-lime-yellow transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>
        <p className="text-ivory mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-ivory rounded-[10px] font-medium transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 ${confirmButtonClass} text-ivory rounded-[10px] font-medium transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
