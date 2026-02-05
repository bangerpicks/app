'use client'

import { useState, useEffect } from 'react'
import { ShopItem, ShopItemFilters } from '@/types/shop'
import { getAllShopItems, deleteShopItem, updateShopItem } from '@/lib/shop'
import { ShopItemCard } from './ShopItemCard'
import { ConfirmDialog } from './ConfirmDialog'
import { Loader2, Filter, RefreshCw } from 'lucide-react'

interface ShopItemListProps {
  onEdit: (itemId: string) => void
  onRefresh: () => void
}

export function ShopItemList({ onEdit, onRefresh }: ShopItemListProps) {
  const [items, setItems] = useState<ShopItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ShopItemFilters>({
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    itemId: string | null
    itemName: string
  }>({
    isOpen: false,
    itemId: null,
    itemName: '',
  })

  const loadItems = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAllShopItems(filters)
      setItems(data)
    } catch (err: any) {
      console.error('Error loading shop items:', err)
      setError(err.message || 'Failed to load shop items')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
  }, [filters])

  const handleDelete = async () => {
    if (!deleteConfirm.itemId) return

    try {
      await deleteShopItem(deleteConfirm.itemId, true)
      setDeleteConfirm({ isOpen: false, itemId: null, itemName: '' })
      loadItems()
      onRefresh()
    } catch (err: any) {
      console.error('Error deleting shop item:', err)
      setError(err.message || 'Failed to delete shop item')
      setDeleteConfirm({ isOpen: false, itemId: null, itemName: '' })
    }
  }

  const handleToggleStatus = async (item: ShopItem) => {
    try {
      const newStatus = item.status === 'active' ? 'inactive' : 'active'
      await updateShopItem(item.itemId, { status: newStatus })
      loadItems()
      onRefresh()
    } catch (err: any) {
      console.error('Error toggling shop item status:', err)
      setError(err.message || 'Failed to update shop item status')
    }
  }

  const handleToggleFeatured = async (item: ShopItem) => {
    try {
      await updateShopItem(item.itemId, { featured: !item.featured })
      loadItems()
      onRefresh()
    } catch (err: any) {
      console.error('Error toggling featured status:', err)
      setError(err.message || 'Failed to update featured status')
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-midnight-violet border border-lime-yellow rounded-[10px] p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-ivory" />
            <span className="text-ivory font-medium">Filters:</span>
          </div>
          <div>
            <label className="block text-xs text-ivory opacity-70 mb-1">Status</label>
            <select
              value={filters.status || ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  status: e.target.value
                    ? (e.target.value as ShopItemFilters['status'])
                    : undefined,
                })
              }
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-[10px] text-ivory text-sm focus:outline-none focus:border-lime-yellow"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="sold_out">Sold Out</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-ivory opacity-70 mb-1">Category</label>
            <select
              value={filters.category || ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  category: e.target.value
                    ? (e.target.value as ShopItemFilters['category'])
                    : undefined,
                })
              }
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-[10px] text-ivory text-sm focus:outline-none focus:border-lime-yellow"
            >
              <option value="">All</option>
              <option value="digital">Digital</option>
              <option value="physical">Physical</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-ivory opacity-70 mb-1">Featured</label>
            <select
              value={filters.featured === undefined ? '' : filters.featured.toString()}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  featured: e.target.value === '' ? undefined : e.target.value === 'true',
                })
              }
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-[10px] text-ivory text-sm focus:outline-none focus:border-lime-yellow"
            >
              <option value="">All</option>
              <option value="true">Featured</option>
              <option value="false">Not Featured</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-ivory opacity-70 mb-1">Sort By</label>
            <select
              value={filters.sortBy || 'createdAt'}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  sortBy: e.target.value as 'name' | 'pointsCost' | 'createdAt',
                })
              }
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-[10px] text-ivory text-sm focus:outline-none focus:border-lime-yellow"
            >
              <option value="createdAt">Date Created</option>
              <option value="name">Name</option>
              <option value="pointsCost">Points Cost</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-ivory opacity-70 mb-1">Order</label>
            <select
              value={filters.sortOrder || 'desc'}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  sortOrder: e.target.value as 'asc' | 'desc',
                })
              }
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-[10px] text-ivory text-sm focus:outline-none focus:border-lime-yellow"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
          <button
            onClick={loadItems}
            disabled={loading}
            className="ml-auto px-4 py-2 bg-lime-yellow text-midnight-violet rounded-[10px] font-medium hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-cinnabar bg-opacity-20 border border-cinnabar rounded-[10px]">
          <p className="text-sm text-cinnabar">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-lime-yellow" size={32} />
        </div>
      )}

      {/* Items List */}
      {!loading && items.length === 0 && (
        <div className="text-center py-12">
          <p className="text-ivory opacity-70">No shop items found</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <ShopItemCard
              key={item.itemId}
              item={item}
              onEdit={() => onEdit(item.itemId)}
              onDelete={() =>
                setDeleteConfirm({
                  isOpen: true,
                  itemId: item.itemId,
                  itemName: item.name,
                })
              }
              onToggleStatus={() => handleToggleStatus(item)}
              onToggleFeatured={() => handleToggleFeatured(item)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Shop Item"
        message={`Are you sure you want to delete "${deleteConfirm.itemName}"? This action cannot be undone and will also delete the associated image.`}
        onConfirm={handleDelete}
        onCancel={() =>
          setDeleteConfirm({ isOpen: false, itemId: null, itemName: '' })
        }
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
      />
    </div>
  )
}
