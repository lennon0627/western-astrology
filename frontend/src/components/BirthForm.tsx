'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { BirthRequest } from '@/lib/types'

interface Props {
  onSubmit: (req: BirthRequest) => void
  loading?: boolean
  label?: string
}

export default function BirthForm({ onSubmit, loading, label = '計算' }: Props) {
  const [form, setForm] = useState({
    year: 1990, month: 1, day: 1, hour: 12, minute: 0, city: '',
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: k === 'city' ? e.target.value : Number(e.target.value) }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      year: form.year, month: form.month, day: form.day,
      hour: form.hour, minute: form.minute,
      city: form.city || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
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
      <div className="flex flex-col gap-1 flex-1 min-w-32">
        <Label className="text-xs text-muted-foreground">都市名</Label>
        <Input placeholder="例: Tokyo" value={form.city} onChange={set('city')} />
      </div>
      <Button type="submit" disabled={loading} className="shrink-0">
        {loading ? '計算中...' : label}
      </Button>
    </form>
  )
}
