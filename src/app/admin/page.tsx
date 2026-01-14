'use client'

import { useState } from 'react'
import { useIsAdmin } from '@/lib/useIsAdmin'
import { useAuth } from '@/lib/AuthProvider'
import { GameweekList } from '@/components/admin/GameweekList'
import { GameweekForm } from '@/components/admin/GameweekForm'
import { Settings } from '@/components/admin/Settings'
import { ToastContainer, useToast } from '@/components/admin/Toast'
import { Plus, Loader2, Shield } from 'lucide-react'

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const { isAdmin, loading: adminLoading } = useIsAdmin()
  const [showForm, setShowForm] = useState(false)
  const [editingGameweekId, setEditingGameweekId] = useState<string | undefined>()
  const [refreshKey, setRefreshKey] = useState(0)
  const toast = useToast()

  const loading = authLoading || adminLoading

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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-midnight-violet flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-lime-yellow mx-auto mb-4" size={32} />
          <p className="text-ivory">Loading...</p>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-midnight-violet flex items-center justify-center">
        <div className="text-center">
          <Shield className="text-cinnabar mx-auto mb-4" size={48} />
          <h1 className="text-2xl font-bold text-ivory mb-2">Authentication Required</h1>
          <p className="text-ivory opacity-70">Please sign in to access the admin dashboard</p>
        </div>
      </div>
    )
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-midnight-violet flex items-center justify-center">
        <div className="text-center">
          <Shield className="text-cinnabar mx-auto mb-4" size={48} />
          <h1 className="text-2xl font-bold text-ivory mb-2">Unauthorized</h1>
          <p className="text-ivory opacity-70">
            You do not have permission to access this page
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-midnight-violet">
      {/* Header */}
      <div className="border-b border-lime-yellow bg-midnight-violet">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-ivory mb-2">Admin Dashboard</h1>
              <p className="text-ivory opacity-70">Manage gameweeks and fixtures</p>
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
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <Settings />
        <GameweekList
          key={refreshKey}
          onEdit={handleEdit}
          onRefresh={handleRefresh}
        />
      </div>

      {/* Gameweek Form Modal */}
      {showForm && (
        <GameweekForm
          gameweekId={editingGameweekId}
          onClose={handleCloseForm}
          onSuccess={handleSuccess}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  )
}
