'use client'

import { useEffect, useState } from 'react'
import { Pin, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { BirthRequest } from '@/lib/types'

const STORAGE_KEY = 'western_astrology_profiles'
const MAX_PINS = 10

interface SavedProfile {
  id: string
  name: string
  year: number
  month: number
  day: number
  hour: number
  minute: number
  city?: string
}

function loadProfiles(): SavedProfile[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch { return [] }
}

function saveProfiles(profiles: SavedProfile[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles))
}

interface Props {
  currentReq: BirthRequest | null
  onLoad: (req: BirthRequest) => void
}

export default function ProfilePins({ currentReq, onLoad }: Props) {
  const [profiles, setProfiles] = useState<SavedProfile[]>([])
  const [saving, setSaving] = useState(false)
  const [nameInput, setNameInput] = useState('')

  useEffect(() => {
    setProfiles(loadProfiles())
  }, [])

  function handleSave() {
    if (!currentReq || !nameInput.trim()) return
    const profile: SavedProfile = {
      id: Date.now().toString(),
      name: nameInput.trim(),
      year: currentReq.year,
      month: currentReq.month,
      day: currentReq.day,
      hour: currentReq.hour,
      minute: currentReq.minute,
      city: currentReq.city,
    }
    const updated = [...profiles, profile]
    setProfiles(updated)
    saveProfiles(updated)
    setSaving(false)
    setNameInput('')
  }

  function handleDelete(id: string) {
    const updated = profiles.filter(p => p.id !== id)
    setProfiles(updated)
    saveProfiles(updated)
  }

  function handleLoad(p: SavedProfile) {
    onLoad({
      year: p.year, month: p.month, day: p.day,
      hour: p.hour, minute: p.minute, city: p.city,
    })
  }

  const canPin = !!currentReq && profiles.length < MAX_PINS

  if (profiles.length === 0 && !currentReq) return null

  return (
    <div className="space-y-2 pt-3 border-t border-border">

      {/* ── ピン済みプロフィール一覧 ──────────────────────────── */}
      {profiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {profiles.map(p => (
            <div
              key={p.id}
              className="flex items-center gap-0.5 rounded-full pl-2.5 pr-1 py-1 text-xs
                bg-secondary border border-border
                hover:border-primary/50 transition-colors"
            >
              <button
                className="flex items-center gap-1 cursor-pointer"
                onClick={() => handleLoad(p)}
              >
                <Pin className="size-2.5 opacity-50" />
                <span>{p.name}</span>
                <span className="text-muted-foreground opacity-70">
                  {p.year}/{p.month}/{p.day}
                </span>
              </button>
              <button
                className="ml-1 p-0.5 rounded-full opacity-40 hover:opacity-100
                  hover:text-destructive transition-opacity cursor-pointer"
                onClick={() => handleDelete(p.id)}
                aria-label={`${p.name} を削除`}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── ピン留めボタン / 名前入力 ─────────────────────────── */}
      {currentReq && (
        saving ? (
          <div className="flex gap-2 items-center">
            <Input
              autoFocus
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') { setSaving(false); setNameInput('') }
              }}
              placeholder="プロフィール名（例: 自分・田中）"
              className="h-7 text-xs"
            />
            <Button
              size="sm"
              className="h-7 text-xs px-3 shrink-0"
              onClick={handleSave}
              disabled={!nameInput.trim()}
            >
              保存
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs px-2 shrink-0"
              onClick={() => { setSaving(false); setNameInput('') }}
            >
              <X className="size-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs gap-1 text-muted-foreground px-1.5"
              onClick={() => setSaving(true)}
              disabled={!canPin}
            >
              <Pin className="size-3" /> ピン留め
            </Button>
            {profiles.length >= MAX_PINS && (
              <span className="text-xs text-muted-foreground">
                上限（{MAX_PINS}件）に達しました
              </span>
            )}
          </div>
        )
      )}
    </div>
  )
}
