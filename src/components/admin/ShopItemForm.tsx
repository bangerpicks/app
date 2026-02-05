'use client'

import { useState, useEffect } from 'react'
import { ShopItem, ShopItemStatus, ShopItemCategory } from '@/types/shop'
import {
  createShopItem,
  updateShopItem,
  getShopItemById,
} from '@/lib/shop'
import { useAuth } from '@/lib/AuthProvider'
import { ImageUpload } from './ImageUpload'
import { X, Save, Send } from 'lucide-react'

interface ShopItemFormProps {
  itemId?: string
  onClose: () => void
  onSuccess: () => void
}

export function ShopItemForm({ itemId, onClose, onSuccess }: ShopItemFormProps) {
  const { user } = useAuth()
  const isEditing = !!itemId

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ShopItemCategory>('digital')
  const [pointsCost, setPointsCost] = useState<number>(100)
  const [imageUrl, setImageUrl] = useState('')
  const [featured, setFeatured] = useState(false)
  const [status, setStatus] = useState<ShopItemStatus>('inactive')
  
  // Digital item fields
  const [badge, setBadge] = useState('')
  const [theme, setTheme] = useState('')
  const [customization, setCustomization] = useState('')
  
  // Physical item fields
  const [shippingRequired, setShippingRequired] = useState(false)
  const [stock, setStock] = useState<number | null>(null)
  const [stockUnlimited, setStockUnlimited] = useState(true)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingExisting, setLoadingExisting] = useState(isEditing)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Load existing item data if editing
  useEffect(() => {
    if (!isEditing || !itemId) return

    async function loadItem() {
      try {
        setLoadingExisting(true)
        const item = await getShopItemById(itemId!)
        if (!item) {
          setError('Shop item not found')
          return
        }

        setName(item.name)
        setDescription(item.description)
        setCategory(item.category)
        setPointsCost(item.pointsCost)
        setImageUrl(item.imageUrl)
        setFeatured(item.featured)
        setStatus(item.status)
        
        if (item.category === 'digital') {
          setBadge(item.badge || '')
          setTheme(item.theme || '')
          setCustomization(item.customization ? JSON.stringify(item.customization, null, 2) : '')
        } else {
          setShippingRequired(item.shippingRequired ?? false)
          setStock(item.stock)
          setStockUnlimited(item.stock === null)
        }
      } catch (err: any) {
        console.error('Error loading shop item:', err)
        setError(err.message || 'Failed to load shop item')
      } finally {
        setLoadingExisting(false)
      }
    }

    loadItem()
  }, [isEditing, itemId])

  const validateField = (field: string, value: any): string | null => {
    switch (field) {
      case 'name':
        if (!value || value.trim() === '') return 'Name is required'
        if (value.length > 100) return 'Name must be 100 characters or less'
        return null
      case 'description':
        if (!value || value.trim() === '') return 'Description is required'
        if (value.length > 500) return 'Description must be 500 characters or less'
        return null
      case 'pointsCost':
        if (value === undefined || value === null || value === '') return 'Points cost is required'
        const num = Number(value)
        if (!Number.isInteger(num) || num < 1 || num > 100000) {
          return 'Points cost must be an integer between 1 and 100000'
        }
        return null
      case 'imageUrl':
        if (status === 'active' && (!value || value.trim() === '')) {
          return 'Image is required for active items'
        }
        return null
      case 'stock':
        if (category === 'physical' && !stockUnlimited) {
          const num = Number(value)
          if (value === '' || isNaN(num) || num < 0) {
            return 'Stock must be a non-negative integer'
          }
        }
        return null
      default:
        return null
    }
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    const nameError = validateField('name', name)
    if (nameError) errors.name = nameError
    
    const descError = validateField('description', description)
    if (descError) errors.description = descError
    
    const costError = validateField('pointsCost', pointsCost)
    if (costError) errors.pointsCost = costError
    
    const imageError = validateField('imageUrl', imageUrl)
    if (imageError) errors.imageUrl = imageError
    
    if (category === 'physical' && !stockUnlimited) {
      const stockError = validateField('stock', stock)
      if (stockError) errors.stock = stockError
    }
    
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async (publish: boolean = false) => {
    if (!validateForm()) {
      setError('Please fix the errors in the form')
      return
    }
    if (!user) {
      setError('You must be logged in to save shop items')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const itemData: any = {
        name: name.trim(),
        description: description.trim(),
        category,
        pointsCost: Number(pointsCost),
        imageUrl: imageUrl.trim(),
        featured,
        status: publish ? 'active' : status,
      }

      if (category === 'digital') {
        if (badge.trim()) itemData.badge = badge.trim()
        if (theme.trim()) itemData.theme = theme.trim()
        if (customization.trim()) {
          try {
            itemData.customization = JSON.parse(customization)
          } catch {
            setError('Invalid JSON in customization field')
            setLoading(false)
            return
          }
        }
      } else {
        itemData.shippingRequired = shippingRequired
        itemData.stock = stockUnlimited ? null : Number(stock)
      }

      if (isEditing && itemId) {
        await updateShopItem(itemId, itemData)
      } else {
        await createShopItem({
          ...itemData,
          createdBy: user.uid,
        })
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error saving shop item:', err)
      setError(err.message || 'Failed to save shop item')
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryChange = (newCategory: ShopItemCategory) => {
    setCategory(newCategory)
    // Clear category-specific fields when switching
    if (newCategory === 'digital') {
      setShippingRequired(false)
      setStock(null)
      setStockUnlimited(true)
    } else {
      setBadge('')
      setTheme('')
      setCustomization('')
    }
  }

  if (loadingExisting) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-midnight-violet border border-lime-yellow rounded-[10px] p-6">
          <p className="text-ivory">Loading shop item...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-4xl mx-auto bg-midnight-violet border border-lime-yellow rounded-[10px] p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-ivory">
              {isEditing ? 'Edit Shop Item' : 'Create New Shop Item'}
            </h2>
            <button
              onClick={onClose}
              className="text-ivory hover:text-lime-yellow transition-colors"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-cinnabar bg-opacity-20 border border-cinnabar rounded-[10px]">
              <p className="text-sm text-cinnabar">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Basic Info Section */}
            <div className="bg-gray-900 border border-gray-700 rounded-[10px] p-4">
              <h3 className="text-lg font-bold text-ivory mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm text-ivory mb-2">
                    Name <span className="text-cinnabar">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      const error = validateField('name', e.target.value)
                      setFieldErrors({ ...fieldErrors, name: error || '' })
                    }}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-[10px] text-ivory focus:outline-none focus:border-lime-yellow"
                    placeholder="Item name"
                  />
                  {fieldErrors.name && (
                    <p className="text-xs text-cinnabar mt-1">{fieldErrors.name}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-ivory mb-2">
                    Description <span className="text-cinnabar">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value)
                      const error = validateField('description', e.target.value)
                      setFieldErrors({ ...fieldErrors, description: error || '' })
                    }}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-[10px] text-ivory focus:outline-none focus:border-lime-yellow"
                    rows={3}
                    placeholder="Item description"
                  />
                  {fieldErrors.description && (
                    <p className="text-xs text-cinnabar mt-1">{fieldErrors.description}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-ivory mb-2">
                    Category <span className="text-cinnabar">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value as ShopItemCategory)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-[10px] text-ivory focus:outline-none focus:border-lime-yellow"
                  >
                    <option value="digital">Digital</option>
                    <option value="physical">Physical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-ivory mb-2">
                    Points Cost <span className="text-cinnabar">*</span>
                  </label>
                  <input
                    type="number"
                    value={pointsCost}
                    onChange={(e) => {
                      setPointsCost(Number(e.target.value))
                      const error = validateField('pointsCost', e.target.value)
                      setFieldErrors({ ...fieldErrors, pointsCost: error || '' })
                    }}
                    min="1"
                    max="100000"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-[10px] text-ivory focus:outline-none focus:border-lime-yellow"
                  />
                  {fieldErrors.pointsCost && (
                    <p className="text-xs text-cinnabar mt-1">{fieldErrors.pointsCost}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-ivory mb-2">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ShopItemStatus)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-[10px] text-ivory focus:outline-none focus:border-lime-yellow"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="sold_out">Sold Out</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="featured"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="w-4 h-4 text-lime-yellow bg-gray-800 border-gray-700 rounded focus:ring-lime-yellow"
                  />
                  <label htmlFor="featured" className="text-sm text-ivory">
                    Featured item
                  </label>
                </div>
              </div>
            </div>

            {/* Image Section */}
            <div className="bg-gray-900 border border-gray-700 rounded-[10px] p-4">
              <h3 className="text-lg font-bold text-ivory mb-4">Image</h3>
              <ImageUpload
                currentImageUrl={imageUrl}
                onImageUploaded={(url) => {
                  setImageUrl(url)
                  setFieldErrors({ ...fieldErrors, imageUrl: '' })
                }}
                onImageRemoved={() => {
                  setImageUrl('')
                  setFieldErrors({ ...fieldErrors, imageUrl: '' })
                }}
                itemId={itemId}
                disabled={loading}
              />
              {fieldErrors.imageUrl && (
                <p className="text-xs text-cinnabar mt-1">{fieldErrors.imageUrl}</p>
              )}
            </div>

            {/* Category-Specific Fields */}
            {category === 'digital' ? (
              <div className="bg-gray-900 border border-gray-700 rounded-[10px] p-4">
                <h3 className="text-lg font-bold text-ivory mb-4">Digital Item Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-ivory mb-2">Badge ID</label>
                    <input
                      type="text"
                      value={badge}
                      onChange={(e) => setBadge(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-[10px] text-ivory focus:outline-none focus:border-lime-yellow"
                      placeholder="e.g., premium"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-ivory mb-2">Theme ID</label>
                    <input
                      type="text"
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-[10px] text-ivory focus:outline-none focus:border-lime-yellow"
                      placeholder="e.g., dark"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-ivory mb-2">Customization (JSON)</label>
                    <textarea
                      value={customization}
                      onChange={(e) => setCustomization(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-[10px] text-ivory focus:outline-none focus:border-lime-yellow font-mono text-sm"
                      rows={4}
                      placeholder='{"frame": "gold"}'
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-700 rounded-[10px] p-4">
                <h3 className="text-lg font-bold text-ivory mb-4">Physical Item Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="shippingRequired"
                      checked={shippingRequired}
                      onChange={(e) => setShippingRequired(e.target.checked)}
                      className="w-4 h-4 text-lime-yellow bg-gray-800 border-gray-700 rounded focus:ring-lime-yellow"
                    />
                    <label htmlFor="shippingRequired" className="text-sm text-ivory">
                      Shipping required
                    </label>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        id="stockUnlimited"
                        checked={stockUnlimited}
                        onChange={(e) => {
                          setStockUnlimited(e.target.checked)
                          if (e.target.checked) {
                            setStock(null)
                          }
                        }}
                        className="w-4 h-4 text-lime-yellow bg-gray-800 border-gray-700 rounded focus:ring-lime-yellow"
                      />
                      <label htmlFor="stockUnlimited" className="text-sm text-ivory">
                        Unlimited stock
                      </label>
                    </div>
                    {!stockUnlimited && (
                      <div>
                        <input
                          type="number"
                          value={stock ?? ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? null : Number(e.target.value)
                            setStock(value)
                            const error = validateField('stock', value)
                            setFieldErrors({ ...fieldErrors, stock: error || '' })
                          }}
                          min="0"
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-[10px] text-ivory focus:outline-none focus:border-lime-yellow"
                          placeholder="Stock quantity"
                        />
                        {fieldErrors.stock && (
                          <p className="text-xs text-cinnabar mt-1">{fieldErrors.stock}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 justify-end pt-4 border-t border-gray-700">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-ivory rounded-[10px] font-medium transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={() => handleSave(false)}
                disabled={loading}
                className="px-6 py-2 bg-amber-glow hover:bg-orange-400 text-midnight-violet rounded-[10px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save size={18} />
                Save Draft
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={loading}
                className="px-6 py-2 bg-lime-yellow hover:bg-yellow-400 text-midnight-violet rounded-[10px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send size={18} />
                Publish
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
