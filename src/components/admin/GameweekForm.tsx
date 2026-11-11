'use client'

import { useState, useEffect } from 'react'
import { APIFootballFixture } from '@/lib/api-football'
import { AdminGameweekData, GameweekStatus } from '@/types/admin'
import {
  createGameweek,
  updateGameweek,
  getGameweekById,
  saveGameweekFixtures,
  getGameweekFixtures,
  getAppSettings,
} from '@/lib/admin'
import { useAuth } from '@/lib/AuthProvider'
import { FixtureSearch } from './FixtureSearch'
import { ConfirmDialog } from './ConfirmDialog'
import { calculateLockFromFirstKickoff, DEFAULT_LOCK_MINUTES_BEFORE_KICKOFF } from '@/lib/gameweek-constants'
import { X, Save, Send } from 'lucide-react'

interface GameweekFormProps {
  gameweekId?: string
  onClose: () => void
  onSuccess: () => void
}

export function GameweekForm({
  gameweekId,
  onClose,
  onSuccess,
}: GameweekFormProps) {
  const { user } = useAuth()
  const isEditing = !!gameweekId

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState<GameweekStatus>('draft')
  const [selectedFixtures, setSelectedFixtures] = useState<APIFootballFixture[]>([])
  const [searchResults, setSearchResults] = useState<APIFootballFixture[]>([]) // All fixtures from search
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingExisting, setLoadingExisting] = useState(isEditing)
  const [lockAt, setLockAt] = useState('')
  const [lockManuallyEdited, setLockManuallyEdited] = useState(false)
  const [minutesBeforeKickoff, setMinutesBeforeKickoff] = useState<number>(
    DEFAULT_LOCK_MINUTES_BEFORE_KICKOFF
  )
  const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false)
  const [pendingPublish, setPendingPublish] = useState(false)

  // Load settings to get deadline offset
  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await getAppSettings()
        if (settings?.gameweekDeadlineOffsetMinutes !== undefined) {
          setMinutesBeforeKickoff(settings.gameweekDeadlineOffsetMinutes)
        }
      } catch (err) {
        console.error('Error loading settings:', err)
        // Use default value if settings can't be loaded
      }
    }
    loadSettings()
  }, [])

  // Load existing gameweek data if editing
  useEffect(() => {
    if (!isEditing || !gameweekId) return

    async function loadGameweek() {
      try {
        setLoadingExisting(true)
        const gameweek = await getGameweekById(gameweekId!)
        if (!gameweek) {
          setError('Gameweek not found')
          return
        }

        setName(gameweek.name)
        setDescription(gameweek.description || '')
        setStatus(gameweek.status)

        // Convert Firestore timestamps to datetime-local format
        const start = gameweek.startDate.toDate()
        const end = gameweek.endDate.toDate()

        setStartDate(formatDateTimeLocal(start))
        setEndDate(formatDateTimeLocal(end))

        const lockSource = gameweek.lockAt ?? gameweek.deadline
        setLockAt(formatDateTimeLocal(lockSource.toDate()))
        setLockManuallyEdited(true)

        // Load fixtures
        const fixtures = await getGameweekFixtures(gameweekId!)
        // Convert fixture data back to APIFootballFixture format
        const apiFixtures: APIFootballFixture[] = fixtures.map((f) => f.fixture)
        setSelectedFixtures(apiFixtures)
      } catch (err: any) {
        console.error('Error loading gameweek:', err)
        setError(err.message || 'Failed to load gameweek')
      } finally {
        setLoadingExisting(false)
      }
    }

    loadGameweek()
  }, [isEditing, gameweekId])

  useEffect(() => {
    if (lockManuallyEdited || selectedFixtures.length === 0) {
      return
    }
    const suggested = calculateLockFromFirstKickoff(selectedFixtures, minutesBeforeKickoff)
    if (suggested) {
      setLockAt(formatDateTimeLocal(suggested))
    }
  }, [selectedFixtures, minutesBeforeKickoff, lockManuallyEdited])

  const resolveLockDate = (): Date | null => {
    if (lockAt) {
      return parseDateTimeLocal(lockAt)
    }
    return calculateLockFromFirstKickoff(selectedFixtures, minutesBeforeKickoff)
  }

  function formatDateTimeLocal(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  function parseDateTimeLocal(value: string): Date {
    return new Date(value)
  }

  // Convert datetime-local to date format (YYYY-MM-DD) for fixture search
  function datetimeToDate(datetime: string): string {
    if (!datetime) return ''
    return datetime.split('T')[0]
  }

  const handleSelectFixture = (fixture: APIFootballFixture) => {
    if (selectedFixtures.length >= 10) {
      setError('Maximum 10 fixtures allowed')
      return
    }
    if (selectedFixtures.some((f) => f.fixture.id === fixture.fixture.id)) {
      return // Already selected
    }
    setSelectedFixtures([...selectedFixtures, fixture])
    setError(null)
  }

  const handleDeselectFixture = (fixtureId: number) => {
    setSelectedFixtures(selectedFixtures.filter((f) => f.fixture.id !== fixtureId))
  }

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setError('Gameweek name is required')
      return false
    }
    // Can calculate deadline from search results even if no fixtures selected yet
    // But we still need at least one fixture to be selected to save
    if (selectedFixtures.length === 0) {
      setError('At least one fixture must be selected')
      return false
    }
    if (selectedFixtures.length > 10) {
      setError('Maximum 10 fixtures allowed')
      return false
    }
    if (!startDate || !endDate) {
      setError('Start and end dates are required')
      return false
    }
    const start = parseDateTimeLocal(startDate)
    const end = parseDateTimeLocal(endDate)
    if (start >= end) {
      setError('End date must be after start date')
      return false
    }
    // Deadline is auto-calculated from fixtures (selected or search results)
    const lockDate = resolveLockDate()
    if (!lockDate) {
      setError('Pick lock cannot be calculated. Select fixtures and set a lock time.')
      return false
    }
    return true
  }

  const performSave = async (publish: boolean) => {
    if (!user) {
      setError('You must be logged in to save gameweeks')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const start = parseDateTimeLocal(startDate)
      const end = parseDateTimeLocal(endDate)
      const lockDate = resolveLockDate()
      if (!lockDate) {
        setError('Cannot save: pick lock time is required')
        return
      }

      const fixtureIds = selectedFixtures.map((f) => f.fixture.id)
      const nextStatus: GameweekStatus = publish ? 'active' : status

      if (isEditing && gameweekId) {
        await updateGameweek(gameweekId!, {
          name,
          description,
          startDate: start,
          endDate: end,
          deadline: lockDate,
          lockAt: lockDate,
          status: nextStatus,
          fixtureIds,
        })

        // Update fixtures subcollection
        await saveGameweekFixtures(gameweekId!, selectedFixtures, user.uid)
      } else {
        // Create new gameweek
        const newGameweekId = await createGameweek({
          name,
          description,
          startDate: start,
          endDate: end,
          deadline: lockDate,
          lockAt: lockDate,
          status: publish ? 'active' : 'draft',
          fixtureIds,
          createdBy: user.uid,
        })

        // Save fixtures subcollection
        await saveGameweekFixtures(newGameweekId, selectedFixtures, user.uid)
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error saving gameweek:', err)
      setError(err.message || 'Failed to save gameweek')
    } finally {
      setLoading(false)
      setPendingPublish(false)
    }
  }

  const handleSave = async (publish: boolean = false) => {
    if (!validateForm()) return
    if (!user) {
      setError('You must be logged in to save gameweeks')
      return
    }

    if (!publish && status === 'completed') {
      setPendingPublish(false)
      setCompleteConfirmOpen(true)
      return
    }

    await performSave(publish)
  }

  if (loadingExisting) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-midnight-violet border border-lime-yellow rounded-[10px] p-6">
          <p className="text-ivory">Loading gameweek...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-7xl mx-auto bg-midnight-violet border border-lime-yellow rounded-[10px] p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-ivory">
              {isEditing ? 'Edit Gameweek' : 'Create New Gameweek'}
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
                <div>
                  <label className="block text-sm text-ivory mb-2">
                    Name <span className="text-cinnabar">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-[10px] text-ivory focus:outline-none focus:border-lime-yellow"
                    placeholder="Gameweek 1"
                  />
                </div>
                <div>
                  <label className="block text-sm text-ivory mb-2">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as GameweekStatus)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-[10px] text-ivory focus:outline-none focus:border-lime-yellow"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-ivory mb-2">
                    Start Date/Time <span className="text-cinnabar">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-[10px] text-ivory focus:outline-none focus:border-lime-yellow"
                  />
                </div>
                <div>
                  <label className="block text-sm text-ivory mb-2">
                    End Date/Time <span className="text-cinnabar">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-[10px] text-ivory focus:outline-none focus:border-lime-yellow"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-ivory mb-2">
                    Pick lock (deadline){' '}
                    <span className="text-ivory/60 text-xs">
                      default {minutesBeforeKickoff} min before first kickoff
                    </span>
                  </label>
                  <input
                    type="datetime-local"
                    value={lockAt}
                    onChange={(e) => {
                      setLockAt(e.target.value)
                      setLockManuallyEdited(true)
                    }}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-[10px] text-ivory focus:outline-none focus:border-lime-yellow"
                  />
                </div>
                <div>
                  <label className="block text-sm text-ivory mb-2">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-[10px] text-ivory focus:outline-none focus:border-lime-yellow"
                    rows={3}
                    placeholder="Optional description..."
                  />
                </div>
              </div>
            </div>

            {/* Fixture Selection Section */}
            <div className="bg-gray-900 border border-gray-700 rounded-[10px] p-4">
              <h3 className="text-lg font-bold text-ivory mb-4">
                Fixture Selection ({selectedFixtures.length}/10)
              </h3>
              <FixtureSearch
                onSelectFixture={handleSelectFixture}
                onDeselectFixture={handleDeselectFixture}
                selectedFixtures={selectedFixtures}
                maxSelections={10}
                fromDate={datetimeToDate(startDate)}
                toDate={datetimeToDate(endDate)}
                onSearchResultsChange={setSearchResults}
              />
            </div>

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

      <ConfirmDialog
        isOpen={completeConfirmOpen}
        title="Mark gameweek completed?"
        message="Completing this gameweek awards podium bonus points (once). Prefer Archive for test weeks you want to hide without paying bonuses."
        onConfirm={() => {
          setCompleteConfirmOpen(false)
          void performSave(pendingPublish)
        }}
        onCancel={() => setCompleteConfirmOpen(false)}
        confirmText="Complete & award podium"
        cancelText="Cancel"
        confirmVariant="danger"
      />
    </div>
  )
}
