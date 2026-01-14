'use client'

import { useState, useEffect } from 'react'
import { getAppSettings, updateAppSettings, getActiveGameweek, forceOpenActiveGameweek } from '@/lib/admin'
import { Save, Loader2, AlertTriangle } from 'lucide-react'

interface SettingsProps {
  onUpdate?: () => void
}

export function Settings({ onUpdate }: SettingsProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [deadlineOffsetMinutes, setDeadlineOffsetMinutes] = useState<number>(5)
  const [forceOpenActive, setForceOpenActive] = useState<boolean>(false)
  const [activeGameweekName, setActiveGameweekName] = useState<string | null>(null)
  const [hasActiveGameweek, setHasActiveGameweek] = useState<boolean>(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      setError(null)
      const settings = await getAppSettings()
      if (settings?.gameweekDeadlineOffsetMinutes !== undefined) {
        setDeadlineOffsetMinutes(settings.gameweekDeadlineOffsetMinutes)
      }
      
      // Load active gameweek force-open status
      const activeGameweek = await getActiveGameweek()
      if (activeGameweek) {
        setHasActiveGameweek(true)
        setActiveGameweekName(activeGameweek.name)
        setForceOpenActive(activeGameweek.forceOpenForTesting === true)
      } else {
        setHasActiveGameweek(false)
        setActiveGameweekName(null)
        setForceOpenActive(false)
      }
    } catch (err: any) {
      console.error('Error loading settings:', err)
      setError(err.message || 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      if (deadlineOffsetMinutes < 0) {
        setError('Deadline offset cannot be negative')
        return
      }

      await updateAppSettings({
        gameweekDeadlineOffsetMinutes: deadlineOffsetMinutes,
      })

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

      if (onUpdate) {
        onUpdate()
      }
    } catch (err: any) {
      console.error('Error saving settings:', err)
      setError(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleForceOpenToggle = async () => {
    if (!hasActiveGameweek) {
      setError('No active gameweek found')
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const newValue = !forceOpenActive
      await forceOpenActiveGameweek(newValue)
      setForceOpenActive(newValue)

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

      if (onUpdate) {
        onUpdate()
      }
    } catch (err: any) {
      console.error('Error toggling force open:', err)
      setError(err.message || 'Failed to update force open setting')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-[10px] p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-lime-yellow" size={24} />
          <span className="ml-3 text-ivory">Loading settings...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-[10px] p-6">
      <h2 className="text-2xl font-bold text-ivory mb-6">Gameweek Settings</h2>

      {error && (
        <div className="mb-4 p-3 bg-cinnabar bg-opacity-20 border border-cinnabar rounded-[10px]">
          <p className="text-sm text-cinnabar">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-lime-yellow bg-opacity-20 border border-lime-yellow rounded-[10px]">
          <p className="text-sm text-lime-yellow">Settings saved successfully!</p>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-ivory mb-2">
            Gameweek Deadline Offset (minutes)
          </label>
          <p className="text-sm text-ivory opacity-70 mb-3">
            Set how many minutes after the first game starts that the gameweek closes for predictions.
            Default is 5 minutes.
          </p>
          <div className="flex items-center gap-4">
            <input
              type="number"
              min="0"
              step="1"
              value={deadlineOffsetMinutes}
              onChange={(e) => setDeadlineOffsetMinutes(parseInt(e.target.value) || 0)}
              className="w-32 px-3 py-2 bg-gray-800 border border-gray-700 rounded-[10px] text-ivory focus:outline-none focus:border-lime-yellow"
              disabled={saving}
            />
            <span className="text-ivory">minutes after first game starts</span>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-700">
          <div className="mb-4">
            <label className="block text-sm font-medium text-ivory mb-2">
              Force Open Active Gameweek for Testing
            </label>
            {!hasActiveGameweek ? (
              <p className="text-sm text-ivory opacity-70 mb-3">
                No active gameweek found. Create and activate a gameweek to use this feature.
              </p>
            ) : (
              <>
                <div className="mb-3 p-3 bg-amber-500 bg-opacity-20 border border-amber-500 rounded-[10px] flex items-start gap-2">
                  <AlertTriangle className="text-amber-500 mt-0.5 flex-shrink-0" size={18} />
                  <p className="text-sm text-amber-500">
                    <strong>Warning:</strong> This setting allows users to change predictions even during live matches. 
                    Use only for testing the scoring system.
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-ivory opacity-70 mb-1">
                      Active Gameweek: <span className="font-medium">{activeGameweekName}</span>
                    </p>
                    <p className="text-sm text-ivory opacity-70">
                      {forceOpenActive 
                        ? 'Gameweek is currently forced open for testing'
                        : 'Gameweek follows normal deadline rules'}
                    </p>
                  </div>
                  <button
                    onClick={handleForceOpenToggle}
                    disabled={saving || !hasActiveGameweek}
                    className={`
                      px-4 py-2 rounded-[10px] font-medium transition-colors 
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${forceOpenActive
                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-ivory'
                      }
                    `}
                  >
                    {forceOpenActive ? 'Disable Force Open' : 'Enable Force Open'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-700">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-lime-yellow hover:bg-yellow-400 text-midnight-violet rounded-[10px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
