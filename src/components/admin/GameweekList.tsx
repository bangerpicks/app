'use client'

import { useState, useEffect } from 'react'
import { AdminGameweekData, GameweekFilters } from '@/types/admin'
import { getAllGameweeks, deleteGameweek, updateGameweek, getGameweekById, getGameweekFixtures } from '@/lib/admin'
import { GameweekCard } from './GameweekCard'
import { ConfirmDialog } from './ConfirmDialog'
import { Loader2, Filter, RefreshCw } from 'lucide-react'

interface GameweekListProps {
  onEdit: (gameweekId: string) => void
  onRefresh: () => void
}

export function GameweekList({ onEdit, onRefresh }: GameweekListProps) {
  const [gameweeks, setGameweeks] = useState<AdminGameweekData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<GameweekFilters>({
    sortBy: 'date',
    sortOrder: 'desc',
  })
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    gameweekId: string | null
    gameweekName: string
  }>({
    isOpen: false,
    gameweekId: null,
    gameweekName: '',
  })

  const loadGameweeks = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAllGameweeks(filters)
      setGameweeks(data)
    } catch (err: any) {
      console.error('Error loading gameweeks:', err)
      setError(err.message || 'Failed to load gameweeks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGameweeks()
  }, [filters])

  const handleDelete = async () => {
    if (!deleteConfirm.gameweekId) return

    try {
      await deleteGameweek(deleteConfirm.gameweekId)
      setDeleteConfirm({ isOpen: false, gameweekId: null, gameweekName: '' })
      loadGameweeks()
      onRefresh()
    } catch (err: any) {
      console.error('Error deleting gameweek:', err)
      setError(err.message || 'Failed to delete gameweek')
      setDeleteConfirm({ isOpen: false, gameweekId: null, gameweekName: '' })
    }
  }

  const handleDuplicate = async (gameweek: AdminGameweekData) => {
    // For now, just open the edit form with the gameweek
    // The user can then save it as a new gameweek
    // In a full implementation, we'd create a duplicate directly
    onEdit(gameweek.gameweekId)
  }

  const handleToggleStatus = async (gameweek: AdminGameweekData) => {
    try {
      const newStatus = gameweek.status === 'active' ? 'draft' : 'active'
      await updateGameweek(gameweek.gameweekId, { status: newStatus })
      loadGameweeks()
      onRefresh()
    } catch (err: any) {
      console.error('Error toggling gameweek status:', err)
      setError(err.message || 'Failed to update gameweek status')
    }
  }

  const handleToggleForceOpen = async (gameweek: AdminGameweekData) => {
    try {
      const newValue = !(gameweek.forceOpenForTesting === true)
      await updateGameweek(gameweek.gameweekId, { forceOpenForTesting: newValue })
      loadGameweeks()
      onRefresh()
    } catch (err: any) {
      console.error('Error toggling force open:', err)
      setError(err.message || 'Failed to update force open setting')
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
                    ? (e.target.value as GameweekFilters['status'])
                    : undefined,
                })
              }
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-[10px] text-ivory text-sm focus:outline-none focus:border-lime-yellow"
            >
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-ivory opacity-70 mb-1">Sort By</label>
            <select
              value={filters.sortBy || 'date'}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  sortBy: e.target.value as 'date' | 'name',
                })
              }
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-[10px] text-ivory text-sm focus:outline-none focus:border-lime-yellow"
            >
              <option value="date">Date</option>
              <option value="name">Name</option>
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
            onClick={loadGameweeks}
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

      {/* Gameweek List */}
      {!loading && gameweeks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-ivory opacity-70">No gameweeks found</p>
        </div>
      )}

      {!loading && gameweeks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gameweeks.map((gameweek) => (
            <GameweekCard
              key={gameweek.gameweekId}
              gameweek={gameweek}
              onEdit={() => onEdit(gameweek.gameweekId)}
              onDelete={() =>
                setDeleteConfirm({
                  isOpen: true,
                  gameweekId: gameweek.gameweekId,
                  gameweekName: gameweek.name,
                })
              }
              onDuplicate={() => handleDuplicate(gameweek)}
              onToggleStatus={() => handleToggleStatus(gameweek)}
              onToggleForceOpen={() => handleToggleForceOpen(gameweek)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Gameweek"
        message={`Are you sure you want to delete "${deleteConfirm.gameweekName}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() =>
          setDeleteConfirm({ isOpen: false, gameweekId: null, gameweekName: '' })
        }
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
      />
    </div>
  )
}
