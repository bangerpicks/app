import { Timestamp } from 'firebase/firestore'

export type ShopItemCategory = 'digital' | 'physical'
export type ShopItemStatus = 'active' | 'inactive' | 'sold_out'

export interface ShopItem {
  itemId: string
  name: string
  description: string
  category: ShopItemCategory
  pointsCost: number
  imageUrl: string
  featured: boolean
  status: ShopItemStatus
  // Digital items
  badge?: string
  theme?: string
  customization?: object
  // Physical items
  shippingRequired?: boolean
  stock?: number | null // null means unlimited
  // Metadata (for admin)
  createdAt?: Timestamp
  updatedAt?: Timestamp
  createdBy?: string
}

export interface ShopClientProps {
  items: ShopItem[]
  userPoints: number
  username?: string
}

export interface ShopItemProps {
  item: ShopItem
  userPoints: number
  isRedeemed?: boolean
  onRedeem: (itemId: string) => void
}

/**
 * Input data for creating a shop item
 */
export interface CreateShopItemData {
  name: string
  description: string
  category: ShopItemCategory
  pointsCost: number
  imageUrl: string
  featured?: boolean
  status: ShopItemStatus
  // Digital items
  badge?: string
  theme?: string
  customization?: object
  // Physical items
  shippingRequired?: boolean
  stock?: number | null
  createdBy: string
}

/**
 * Filter options for shop item list
 */
export interface ShopItemFilters {
  status?: ShopItemStatus
  category?: ShopItemCategory
  featured?: boolean
  sortBy?: 'name' | 'pointsCost' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Shop item form data (for form state)
 */
export interface ShopItemFormData {
  name: string
  description: string
  category: ShopItemCategory
  pointsCost: number
  imageUrl: string
  featured: boolean
  status: ShopItemStatus
  // Digital items
  badge?: string
  theme?: string
  customization?: object
  // Physical items
  shippingRequired?: boolean
  stock?: number | null
}
