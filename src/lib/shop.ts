/**
 * Shop item Firestore operations for admin management
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db } from './firebase'
import { ShopItem, CreateShopItemData, ShopItemFilters } from '@/types/shop'
import { withTimeout } from './firestore-utils'

/**
 * Validate shop item data
 */
function validateShopItemData(data: Partial<CreateShopItemData>, isUpdate: boolean = false): void {
  if (!isUpdate || data.name !== undefined) {
    if (!data.name || data.name.trim() === '') {
      throw new Error('Item name is required')
    }
    if (data.name.length > 100) {
      throw new Error('Item name must be 100 characters or less')
    }
  }

  if (!isUpdate || data.description !== undefined) {
    if (!data.description || data.description.trim() === '') {
      throw new Error('Item description is required')
    }
    if (data.description.length > 500) {
      throw new Error('Item description must be 500 characters or less')
    }
  }

  if (!isUpdate || data.category !== undefined) {
    if (!data.category || (data.category !== 'digital' && data.category !== 'physical')) {
      throw new Error('Item category must be "digital" or "physical"')
    }
  }

  if (!isUpdate || data.pointsCost !== undefined) {
    if (data.pointsCost === undefined || data.pointsCost === null) {
      throw new Error('Points cost is required')
    }
    if (!Number.isInteger(data.pointsCost) || data.pointsCost < 1 || data.pointsCost > 100000) {
      throw new Error('Points cost must be an integer between 1 and 100000')
    }
  }

  if (!isUpdate || data.status !== undefined) {
    if (!data.status || !['active', 'inactive', 'sold_out'].includes(data.status)) {
      throw new Error('Status must be "active", "inactive", or "sold_out"')
    }
  }

  // Validate image URL for active items
  if (data.status === 'active' && (!data.imageUrl || data.imageUrl.trim() === '')) {
    throw new Error('Image URL is required for active items')
  }

  // Category-specific validation
  if (data.category === 'digital') {
    // Digital items should have at least one of badge, theme, or customization
    if (
      (!data.badge || data.badge.trim() === '') &&
      (!data.theme || data.theme.trim() === '') &&
      (!data.customization || Object.keys(data.customization).length === 0)
    ) {
      // Only warn, don't throw - allow flexibility
      console.warn('Digital item should have at least one of: badge, theme, or customization')
    }
  } else if (data.category === 'physical') {
    // Physical items: validate stock
    if (data.stock !== undefined && data.stock !== null) {
      if (!Number.isInteger(data.stock) || data.stock < 0) {
        throw new Error('Stock must be a non-negative integer or null (unlimited)')
      }
    }
    // Default shippingRequired to true if stock is set
    if (data.stock !== undefined && data.stock !== null && data.shippingRequired === undefined) {
      data.shippingRequired = true
    }
  }
}

/**
 * Create a new shop item
 * 
 * @param data - Shop item data
 * @returns Item ID
 */
export async function createShopItem(data: CreateShopItemData): Promise<string> {
  try {
    // Validate input
    validateShopItemData(data, false)

    // Generate unique item ID
    const itemId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const now = Timestamp.now()
    const shopItemData: ShopItem & { createdAt: Timestamp; updatedAt: Timestamp; createdBy: string } = {
      itemId,
      name: data.name.trim(),
      description: data.description.trim(),
      category: data.category,
      pointsCost: data.pointsCost,
      imageUrl: data.imageUrl.trim(),
      featured: data.featured ?? false,
      status: data.status,
      createdAt: now,
      updatedAt: now,
      createdBy: data.createdBy,
      ...(data.category === 'digital' && {
        ...(data.badge && { badge: data.badge.trim() }),
        ...(data.theme && { theme: data.theme.trim() }),
        ...(data.customization && { customization: data.customization }),
      }),
      ...(data.category === 'physical' && {
        shippingRequired: data.shippingRequired ?? false,
        stock: data.stock ?? null,
      }),
    }

    await setDoc(doc(db, 'shopItems', itemId), shopItemData)
    return itemId
  } catch (error) {
    console.error('Error creating shop item:', error)
    throw error
  }
}

/**
 * Update an existing shop item
 * 
 * @param itemId - Item ID
 * @param updates - Partial shop item data to update
 */
export async function updateShopItem(
  itemId: string,
  updates: Partial<Omit<CreateShopItemData, 'createdBy'>>
): Promise<void> {
  try {
    const itemRef = doc(db, 'shopItems', itemId)
    const itemDoc = await withTimeout(
      getDoc(itemRef),
      10000,
      'Failed to load shop item - request timed out'
    )
    
    if (!itemDoc.exists()) {
      throw new Error('Shop item not found')
    }

    const existingData = itemDoc.data() as ShopItem
    const mergedData = { ...existingData, ...updates }

    // Validate merged data
    validateShopItemData(mergedData, true)

    const updateData: any = {
      updatedAt: Timestamp.now(),
    }

    if (updates.name !== undefined) {
      updateData.name = updates.name.trim()
    }
    if (updates.description !== undefined) {
      updateData.description = updates.description.trim()
    }
    if (updates.category !== undefined) {
      updateData.category = updates.category
    }
    if (updates.pointsCost !== undefined) {
      updateData.pointsCost = updates.pointsCost
    }
    if (updates.imageUrl !== undefined) {
      updateData.imageUrl = updates.imageUrl.trim()
    }
    if (updates.featured !== undefined) {
      updateData.featured = updates.featured
    }
    if (updates.status !== undefined) {
      updateData.status = updates.status
    }

    // Handle category-specific fields
    if (updates.category === 'digital' || existingData.category === 'digital') {
      if (updates.badge !== undefined) {
        updateData.badge = updates.badge?.trim() || null
      }
      if (updates.theme !== undefined) {
        updateData.theme = updates.theme?.trim() || null
      }
      if (updates.customization !== undefined) {
        updateData.customization = updates.customization || null
      }
      // Clear physical fields if switching to digital
      if (updates.category === 'digital') {
        updateData.shippingRequired = null
        updateData.stock = null
      }
    }

    if (updates.category === 'physical' || existingData.category === 'physical') {
      if (updates.shippingRequired !== undefined) {
        updateData.shippingRequired = updates.shippingRequired
      }
      if (updates.stock !== undefined) {
        updateData.stock = updates.stock
      }
      // Clear digital fields if switching to physical
      if (updates.category === 'physical') {
        updateData.badge = null
        updateData.theme = null
        updateData.customization = null
      }
    }

    await updateDoc(itemRef, updateData)
  } catch (error) {
    console.error('Error updating shop item:', error)
    throw error
  }
}

/**
 * Delete a shop item
 * 
 * @param itemId - Item ID
 * @param deleteImage - Whether to delete associated image from Storage
 */
export async function deleteShopItem(itemId: string, deleteImage: boolean = true): Promise<void> {
  try {
    const itemRef = doc(db, 'shopItems', itemId)
    const itemDoc = await withTimeout(
      getDoc(itemRef),
      10000,
      'Failed to load shop item - request timed out'
    )
    
    if (!itemDoc.exists()) {
      throw new Error('Shop item not found')
    }

    const itemData = itemDoc.data() as ShopItem

    // Delete image from Storage if requested and URL exists
    if (deleteImage && itemData.imageUrl) {
      try {
        await deleteShopItemImage(itemData.imageUrl)
      } catch (imageError) {
        console.warn('Error deleting shop item image:', imageError)
        // Continue with document deletion even if image deletion fails
      }
    }

    // Delete document
    await deleteDoc(itemRef)
  } catch (error) {
    console.error('Error deleting shop item:', error)
    throw error
  }
}

/**
 * Get a single shop item by ID
 * 
 * @param itemId - Item ID
 * @returns Shop item data or null if not found
 */
export async function getShopItemById(itemId: string): Promise<ShopItem | null> {
  try {
    const itemDoc = await withTimeout(
      getDoc(doc(db, 'shopItems', itemId)),
      10000,
      'Failed to load shop item - request timed out'
    )
    
    if (!itemDoc.exists()) {
      return null
    }
    
    return {
      ...itemDoc.data(),
      itemId: itemDoc.id,
    } as ShopItem
  } catch (error) {
    console.error('Error getting shop item:', error)
    throw error
  }
}

/**
 * Get all shop items with optional filters
 * 
 * @param filters - Optional filters
 * @returns Array of shop items
 */
export async function getAllShopItems(filters?: ShopItemFilters): Promise<ShopItem[]> {
  try {
    const constraints: QueryConstraint[] = []
    
    if (filters?.status) {
      constraints.push(where('status', '==', filters.status))
    }
    
    if (filters?.category) {
      constraints.push(where('category', '==', filters.category))
    }
    
    if (filters?.featured !== undefined) {
      constraints.push(where('featured', '==', filters.featured))
    }
    
    // Sorting
    if (filters?.sortBy === 'name') {
      constraints.push(orderBy('name', filters.sortOrder || 'asc'))
    } else if (filters?.sortBy === 'pointsCost') {
      constraints.push(orderBy('pointsCost', filters.sortOrder || 'asc'))
    } else {
      // Default: sort by creation date descending
      constraints.push(orderBy('createdAt', filters?.sortOrder || 'desc'))
    }
    
    const q = query(collection(db, 'shopItems'), ...constraints)
    const snapshot = await withTimeout(
      getDocs(q),
      10000,
      'Failed to load shop items - request timed out'
    )
    
    return snapshot.docs.map((doc) => ({
      ...doc.data(),
      itemId: doc.id,
    })) as ShopItem[]
  } catch (error) {
    console.error('Error getting shop items:', error)
    throw error
  }
}

/**
 * Upload shop item image to Firebase Storage
 * 
 * @param file - Image file to upload
 * @param itemId - Optional item ID (for existing items)
 * @returns Download URL
 */
export async function uploadShopItemImage(file: File, itemId?: string): Promise<string> {
  try {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only JPG, PNG, and WebP images are allowed.')
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      throw new Error('File size exceeds 5MB limit. Please compress the image.')
    }

    const storage = getStorage()
    const timestamp = Date.now()
    const filename = `${timestamp}-${file.name}`
    const path = itemId ? `shop-items/${itemId}/${filename}` : `shop-items/temp/${filename}`
    const storageRef = ref(storage, path)

    // Upload file
    await uploadBytes(storageRef, file)

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef)
    return downloadURL
  } catch (error) {
    console.error('Error uploading shop item image:', error)
    throw error
  }
}

/**
 * Delete shop item image from Firebase Storage
 * 
 * @param imageUrl - Image URL to delete
 */
export async function deleteShopItemImage(imageUrl: string): Promise<void> {
  try {
    // Extract path from URL
    // Firebase Storage URLs format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
    const url = new URL(imageUrl)
    const pathMatch = url.pathname.match(/\/o\/(.+)\?/)
    
    if (!pathMatch) {
      throw new Error('Invalid image URL format')
    }

    // Decode the path (URL encoded)
    const encodedPath = pathMatch[1]
    const decodedPath = decodeURIComponent(encodedPath)

    const storage = getStorage()
    const imageRef = ref(storage, decodedPath)

    await deleteObject(imageRef)
  } catch (error) {
    console.error('Error deleting shop item image:', error)
    throw error
  }
}
