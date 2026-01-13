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
