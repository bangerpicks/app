'use client'

import { ShopItem, ShopItemStatus } from '@/types/shop'
import { Edit, Trash2, Star, StarOff, Power, PowerOff, Package, Coins } from 'lucide-react'

interface ShopItemCardProps {
  item: ShopItem
  onEdit: () => void
  onDelete: () => void
  onToggleStatus: () => void
  onToggleFeatured: () => void
}

export function ShopItemCard({
  item,
  onEdit,
  onDelete,
  onToggleStatus,
  onToggleFeatured,
}: ShopItemCardProps) {
  const isActive = item.status === 'active'
  const isFeatured = item.featured
  const isPhysical = item.category === 'physical'
  const hasStock = item.stock !== null && item.stock !== undefined

  const getStatusColor = (status: ShopItemStatus) => {
    switch (status) {
      case 'active':
        return 'bg-lime-yellow text-midnight-violet'
      case 'inactive':
        return 'bg-gray-500 text-ivory'
      case 'sold_out':
        return 'bg-cinnabar text-ivory'
      default:
        return 'bg-gray-500 text-ivory'
    }
  }

  const getStatusText = (status: ShopItemStatus) => {
    switch (status) {
      case 'active':
        return 'ACTIVE'
      case 'inactive':
        return 'INACTIVE'
      case 'sold_out':
        return 'SOLD OUT'
      default:
        return status.toUpperCase()
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A'
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return 'N/A'
    }
  }

  return (
    <div className="bg-midnight-violet border border-lime-yellow rounded-[10px] p-4 hover:border-lime-yellow transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-bold text-ivory truncate">{item.name}</h3>
            {isFeatured && (
              <Star className="text-lime-yellow flex-shrink-0" size={18} fill="currentColor" />
            )}
          </div>
          <p className="text-sm text-ivory opacity-70 line-clamp-2 mb-2">
            {item.description}
          </p>
        </div>
        <div className={`${getStatusColor(item.status)} px-2.5 py-1.5 rounded-[10px] ml-2 flex-shrink-0`}>
          <span className="text-xs font-bold">
            {getStatusText(item.status)}
          </span>
        </div>
      </div>

      {/* Image Preview */}
      {item.imageUrl && (
        <div className="w-full h-32 bg-gray-800 rounded-[10px] overflow-hidden border border-gray-700 mb-3">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-ivory">
          <span className="opacity-70">Category:</span>
          <span className="font-medium capitalize">{item.category}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-ivory">
          <Coins className="text-lime-yellow" size={16} />
          <span className="opacity-70">Cost:</span>
          <span className="font-bold">{item.pointsCost.toLocaleString()} points</span>
        </div>
        {isPhysical && (
          <>
            {hasStock && (
              <div className="flex items-center gap-2 text-sm text-ivory">
                <Package className="text-amber-glow" size={16} />
                <span className="opacity-70">Stock:</span>
                <span className="font-medium">{item.stock}</span>
              </div>
            )}
            {item.shippingRequired && (
              <div className="text-xs text-ivory opacity-60">
                Shipping required
              </div>
            )}
          </>
        )}
        {item.category === 'digital' && (
          <div className="text-xs text-ivory opacity-60">
            {item.badge && `Badge: ${item.badge}`}
            {item.theme && `Theme: ${item.theme}`}
            {item.customization && 'Customization available'}
          </div>
        )}
        {item.createdAt && (
          <div className="flex items-center gap-2 text-xs text-ivory opacity-60">
            <span>Created:</span>
            <span>{formatDate(item.createdAt)}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-3 border-t border-gray-700">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onEdit}
            className="flex items-center gap-1 px-3 py-1.5 bg-lime-yellow text-midnight-violet rounded-[10px] font-medium hover:bg-yellow-400 transition-colors text-sm"
          >
            <Edit size={16} />
            Edit
          </button>
          <button
            onClick={onToggleStatus}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-[10px] font-medium transition-colors text-sm ${
              isActive
                ? 'bg-gray-600 text-ivory hover:bg-gray-700'
                : 'bg-lime-yellow text-midnight-violet hover:bg-yellow-400'
            }`}
          >
            {isActive ? <PowerOff size={16} /> : <Power size={16} />}
            {isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={onToggleFeatured}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-[10px] font-medium transition-colors text-sm ${
              isFeatured
                ? 'bg-amber-glow text-midnight-violet hover:bg-orange-400'
                : 'bg-gray-600 text-ivory hover:bg-gray-700'
            }`}
          >
            {isFeatured ? <StarOff size={16} /> : <Star size={16} />}
            {isFeatured ? 'Unfeature' : 'Feature'}
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1 px-3 py-1.5 bg-cinnabar text-ivory rounded-[10px] font-medium hover:bg-red-600 transition-colors text-sm"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
