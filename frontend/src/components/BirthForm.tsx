'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { BirthRequest } from '@/lib/types'

const STORAGE_KEY = 'western_astrology_last_birth'

interface FormState { year: number; month: number; day: number; hour: number; minute: number; city: string }
const defaultForm: FormState = { year: 1990, month: 1, day: 1, hour: 12, minute: 0, city: '' }

interface Props {
  onSubmit: (req: BirthRequest) => void
  loading?: boolean
  label?: string
}

export default function BirthForm({ onSubmit, loading, label = '計算' }: Props) {
  const [form, setForm] = useState<FormState>(() => {
    if (typeof window === 'undefined') return defaultForm
    // 優先順位: URL params > localStorage > default
    const p = new URLSearchParams(window.location.search)
    const y = p.get('y'), m = p.get('m'), d = p.get('d')
    if (y && m && d) {
      return {
        year: Number(y), month: Number(m), day: Number(d),
        hour: Number(p.get('h') ?? '12'), minute: Number(p.get('min') ?? '0'),
        city: p.get('city') ?? '',
      }
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? { ...defaultForm, ...JSON.parse(saved) } : defaultForm
    } catch { return defaultForm }
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f: FormState) => ({ ...f, [k]: k === 'city' ? e.target.value : Number(e.target.value) }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(form)) } catch {}
    onSubmit({
      year: form.year, month: form.month, day: form.day,
      hour: form.hour, minute: form.minute,
      city: form.city || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {/* 日付・時刻行: 375px以上なら1行に収まる */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">生年</Label>
          <Input type="number" value={form.year} onChange={set('year')} className="w-20" min={1900} max={2100} />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">月</Label>
          <Input type="number" value={form.month} onChange={set('month')} className="w-14" min={1} max={12} />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">日</Label>
          <Input type="number" value={form.day} onChange={set('day')} className="w-14" min={1} max={31} />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">時</Label>
          <Input type="number" value={form.hour} onChange={set('hour')} className="w-14" min={0} max={23} />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">分</Label>
          <Input type="number" value={form.minute} onChange={set('minute')} className="w-14" min={0} max={59} />
        </div>
      </div>
      {/* 都市・ボタン行: 常に1行 */}
      <div className="flex gap-2 items-end">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <Label className="text-xs text-muted-foreground">都市名</Label>
          <Input placeholder="例: Tokyo" value={form.city} onChange={set('city')} />
        </div>
        <Button type="submit" disabled={loading} className="shrink-0">
          {loading ? '計算中...' : label}
        </Button>
      </div>
    </form>
  )
}
