'use client'

import { useState, useEffect } from 'react'
import { useIsAdmin } from '@/lib/useIsAdmin'
import { useAuth } from '@/lib/AuthProvider'
import { GameweekList } from '@/components/admin/GameweekList'
import { GameweekForm } from '@/components/admin/GameweekForm'
import { ShopItemList } from '@/components/admin/ShopItemList'
import { ShopItemForm } from '@/components/admin/ShopItemForm'
import { Settings } from '@/components/admin/Settings'
import { ToastContainer, useToast } from '@/components/admin/Toast'
import { Plus, Loader2, Shield, ShoppingBag } from 'lucide-react'

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const { isAdmin, loading: adminLoading } = useIsAdmin()
  const [showForm, setShowForm] = useState(false)
  const [editingGameweekId, setEditingGameweekId] = useState<string | undefined>()
  const [showShopForm, setShowShopForm] = useState(false)
  const [editingShopItemId, setEditingShopItemId] = useState<string | undefined>()
  const [refreshKey, setRefreshKey] = useState(0)
  const [shopRefreshKey, setShopRefreshKey] = useState(0)
  const [renderError, setRenderError] = useState<string | null>(null)
  const toast = useToast()

  const loading = authLoading || adminLoading

  // Debug logging only in development
  const isDev = process.env.NODE_ENV === 'development'
  
  useEffect(() => {
    if (isDev) {
      console.log('[Admin Page] Component mounted', {
        user: user?.uid || 'null',
        authLoading,
        adminLoading,
        isAdmin,
        loading,
      })
    }
  }, [user, authLoading, adminLoading, isAdmin, loading, isDev])

  const handleCreateNew = () => {
    setEditingGameweekId(undefined)
    setShowForm(true)
  }

  const handleEdit = (gameweekId: string) => {
    setEditingGameweekId(gameweekId)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingGameweekId(undefined)
  }

  const handleSuccess = () => {
    toast.success(
      editingGameweekId
        ? 'Gameweek updated successfully'
        : 'Gameweek created successfully'
    )
    setRefreshKey((prev) => prev + 1)
  }

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1)
  }

  // Shop item handlers
  const handleCreateNewShopItem = () => {
    setEditingShopItemId(undefined)
    setShowShopForm(true)
  }

  const handleEditShopItem = (itemId: string) => {
    setEditingShopItemId(itemId)
    setShowShopForm(true)
  }

  const handleCloseShopForm = () => {
    setShowShopForm(false)
    setEditingShopItemId(undefined)
  }

  const handleShopItemSuccess = () => {
    toast.success(
      editingShopItemId
        ? 'Shop item updated successfully'
        : 'Shop item created successfully'
    )
    setShopRefreshKey((prev) => prev + 1)
  }

  const handleShopRefresh = () => {
    setShopRefreshKey((prev) => prev + 1)
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-midnight-violet flex items-center justify-center" style={{ backgroundColor: '#240830', minHeight: '100vh' }}>
        <div className="text-center">
          <Loader2 className="animate-spin text-lime-yellow mx-auto mb-4" size={32} />
          <p className="text-ivory" style={{ color: '#fdfff0' }}>Loading...</p>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-midnight-violet flex items-center justify-center" style={{ backgroundColor: '#240830', minHeight: '100vh' }}>
        <div className="text-center">
          <Shield className="text-cinnabar mx-auto mb-4" size={48} />
          <h1 className="text-2xl font-bold text-ivory mb-2" style={{ color: '#fdfff0' }}>Authentication Required</h1>
          <p className="text-ivory opacity-70" style={{ color: '#fdfff0' }}>Please sign in to access the admin dashboard</p>
        </div>
      </div>
    )
  }

  // Not admin
  if (!isAdmin && !loading) {
    return (
      <div className="min-h-screen bg-midnight-violet flex items-center justify-center" style={{ backgroundColor: '#240830', minHeight: '100vh' }}>
        <div className="text-center max-w-md px-4">
          <Shield className="text-cinnabar mx-auto mb-4" size={48} />
          <h1 className="text-2xl font-bold text-ivory mb-2" style={{ color: '#fdfff0' }}>Unauthorized</h1>
          <p className="text-ivory opacity-70 mb-4" style={{ color: '#fdfff0' }}>
            You do not have permission to access this page
          </p>
          {user && (
            <div className="mt-4 p-4 bg-gray-800 rounded-lg text-left">
              <p className="text-sm text-ivory opacity-70 mb-2" style={{ color: '#fdfff0' }}>Debug Info:</p>
              <p className="text-xs text-ivory opacity-60 font-mono break-all" style={{ color: '#fdfff0' }}>
                User UID: {user.uid}
              </p>
              <p className="text-xs text-ivory opacity-60 mt-2" style={{ color: '#fdfff0' }}>
                Check the browser console for detailed admin check logs.
                Verify your UID is in the <code className="bg-gray-700 px-1 rounded">settings/app.adminUids</code> array in Firestore.
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Fallback render if somehow we reach here without proper state
  if (!isAdmin) {
    if (isDev) {
      console.warn('[Admin Page] Unexpected state - not admin but reached dashboard render')
    }
    return (
      <div className="min-h-screen bg-midnight-violet flex items-center justify-center">
        <div className="text-center">
          <p className="text-ivory">Unexpected state. Check console.</p>
        </div>
      </div>
    )
  }

  // Render admin dashboard - only reached if user is admin and not loading
  return (
    <div className="min-h-screen bg-midnight-violet" style={{ backgroundColor: '#240830', minHeight: '100vh' }}>
      {/* Header */}
      <div className="border-b border-lime-yellow bg-midnight-violet">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-ivory mb-2">Admin Dashboard</h1>
              <p className="text-ivory opacity-70">Manage gameweeks, shop items, and settings</p>
            </div>
            <button
              onClick={handleCreateNew}
              className="px-6 py-3 bg-lime-yellow text-midnight-violet font-bold rounded-[10px] hover:bg-yellow-400 transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              Create New Gameweek
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        <Settings />
        
        {/* Gameweeks Section */}
        <div>
          <div className="border-b border-lime-yellow mb-6">
            <div className="flex items-center justify-between pb-4">
              <div>
                <h2 className="text-2xl font-bold text-ivory">Gameweek Management</h2>
                <p className="text-ivory opacity-70 text-sm mt-1">Manage gameweeks and fixtures</p>
              </div>
              <button
                onClick={handleCreateNew}
                className="px-6 py-3 bg-lime-yellow text-midnight-violet font-bold rounded-[10px] hover:bg-yellow-400 transition-colors flex items-center gap-2"
              >
                <Plus size={20} />
                Create New Gameweek
              </button>
            </div>
          </div>
          <GameweekList
            key={refreshKey}
            onEdit={handleEdit}
            onRefresh={handleRefresh}
          />
        </div>

        {/* Shop Management Section */}
        <div>
          <div className="border-b border-lime-yellow mb-6">
            <div className="flex items-center justify-between pb-4">
              <div>
                <h2 className="text-2xl font-bold text-ivory flex items-center gap-2">
                  <ShoppingBag size={28} />
                  Shop Catalog Management
                </h2>
                <p className="text-ivory opacity-70 text-sm mt-1">Create, edit, and manage shop items for redemption</p>
              </div>
              <button
                onClick={handleCreateNewShopItem}
                className="px-6 py-3 bg-lime-yellow text-midnight-violet font-bold rounded-[10px] hover:bg-yellow-400 transition-colors flex items-center gap-2"
              >
                <Plus size={20} />
                Create New Item
              </button>
            </div>
          </div>
          <ShopItemList
            key={shopRefreshKey}
            onEdit={handleEditShopItem}
            onRefresh={handleShopRefresh}
          />
        </div>
      </div>

      {/* Gameweek Form Modal */}
      {showForm && (
        <GameweekForm
          gameweekId={editingGameweekId}
          onClose={handleCloseForm}
          onSuccess={handleSuccess}
        />
      )}

      {/* Shop Item Form Modal */}
      {showShopForm && (
        <ShopItemForm
          itemId={editingShopItemId}
          onClose={handleCloseShopForm}
          onSuccess={handleShopItemSuccess}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  )
}
