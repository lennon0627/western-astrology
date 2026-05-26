'use client'

import { useEffect, useRef, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Copy, Check, Printer } from 'lucide-react'
import BlurFade from '@/components/ui/blur-fade'
import BirthForm from '@/components/BirthForm'
import ChartWheel from '@/components/ChartWheel'
import PlanetTable from '@/components/PlanetTable'
import ScoreCard from '@/components/ScoreCard'
import TransitCalendar from '@/components/TransitCalendar'
import SynastryView from '@/components/SynastryView'
import ProgressionView from '@/components/ProgressionView'
import SolarArcView from '@/components/SolarArcView'
import SolarReturnView from '@/components/SolarReturnView'
import DailyHoroscope from '@/components/DailyHoroscope'
import AiReadingTab from '@/components/AiReadingTab'
import ProfilePins from '@/components/ProfilePins'
import { fetchReading, fetchSynastry } from '@/lib/api'
import type { BirthRequest, ReadingResponse, SynastryResponse } from '@/lib/types'

function EmptyHint() {
  return (
    <p className="text-center text-muted-foreground text-sm py-12">
      先に生年月日を入力して計算してください
    </p>
  )
}

export default function Home() {
  // 全データ: 1回の fetchReading で取得
  const [reading, setReading]       = useState<ReadingResponse | null>(null)
  const [personReq, setPersonReq]   = useState<BirthRequest | null>(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  // プログレッション・ソーラーアーク・ソーラーリターン用パラメータ
  const [currentDt, setCurrentDt] = useState(() => {
    const d = new Date()
    return d.toISOString().slice(0, 16)  // "YYYY-MM-DDTHH:MM"
  })
  const [srYear, setSrYear] = useState(new Date().getFullYear())

  // シナストリー
  const [synastry, setSynastry]   = useState<SynastryResponse | null>(null)
  const [synLoading, setSynLoading] = useState(false)

  // URLコピー
  const [copied, setCopied] = useState(false)

  // BirthForm のリマウント用キー（ピン読み込み時に URL 経由で値を反映）
  const [formKey, setFormKey] = useState(0)

  // アクティブタブ（URL ?tab= と同期）
  const [activeTab, setActiveTab] = useState('natal')

  // ── URL params 自動計算（マウント時1回のみ） ──────────────────────────
  const autoRunDone = useRef(false)
  useEffect(() => {
    if (autoRunDone.current) return
    autoRunDone.current = true
    const p = new URLSearchParams(window.location.search)
    const tab = p.get('tab')
    if (tab) setActiveTab(tab)
    const y = p.get('y'), m = p.get('m'), d = p.get('d')
    if (!y || !m || !d) return
    handleSubmit({
      year: Number(y), month: Number(m), day: Number(d),
      hour: Number(p.get('h') ?? '12'), minute: Number(p.get('min') ?? '0'),
      city: p.get('city') || undefined,
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── ハンドラー ──────────────────────────────────────────────────────────

  async function handleSubmit(req: BirthRequest) {
    setLoading(true)
    setError('')
    try {
      const data = await fetchReading(req, currentDt + ':00', srYear)
      setReading(data)
      setPersonReq(req)
      // 計算後に URL を更新（共有・ブックマーク用）
      const params = new URLSearchParams({
        y: String(req.year), m: String(req.month), d: String(req.day),
        h: String(req.hour), min: String(req.minute),
      })
      if (req.city) params.set('city', req.city)
      if (activeTab !== 'natal') params.set('tab', activeTab)
      window.history.replaceState(null, '', `?${params}`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleTabChange(tab: string) {
    setActiveTab(tab)
    const params = new URLSearchParams(window.location.search)
    if (tab === 'natal') params.delete('tab')
    else params.set('tab', tab)
    window.history.replaceState(null, '', `?${params}`)
  }

  function handlePinLoad(req: BirthRequest) {
    // URL を先に更新 → BirthForm がリマウント時に読み込む
    const params = new URLSearchParams({
      y: String(req.year), m: String(req.month), d: String(req.day),
      h: String(req.hour), min: String(req.minute),
    })
    if (req.city) params.set('city', req.city)
    if (activeTab !== 'natal') params.set('tab', activeTab)
    window.history.replaceState(null, '', `?${params}`)
    setFormKey(k => k + 1)
    handleSubmit(req)
  }

  function handleCopyUrl() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handlePrint() {
    window.print()
  }

  async function handleSynastryB(req: BirthRequest) {
    if (!personReq) return
    setSynLoading(true)
    try {
      const data = await fetchSynastry(personReq, req)
      setSynastry(data)
    } catch (e: any) { console.error(e) }
    finally { setSynLoading(false) }
  }

  // ── UI ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <BlurFade delay={0}>
        <h1 className="text-2xl font-bold mb-6 text-center">✦ 西洋占星術チャート</h1>
      </BlurFade>

      {/* ── 入力フォーム（全タブ共通） ────────────────────────────────── */}
      <Card className="w-full max-w-5xl mx-auto mb-6 print:hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">生年月日・出生地を入力</CardTitle>
            {personReq && (
              <div className="flex items-center gap-1 print:hidden">
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={handleCopyUrl}>
                  {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                  {copied ? 'コピーしました' : 'URLをコピー'}
                </Button>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={handlePrint}>
                  <Printer className="size-3" /> PDF
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <BirthForm key={formKey} onSubmit={handleSubmit} loading={loading} />
          <ProfilePins currentReq={personReq} onLoad={handlePinLoad} />

          {/* プログレッション・ソーラーアーク・ソーラーリターン用パラメータ */}
          <div className="flex flex-wrap gap-4 pt-2 border-t border-border">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">基準日時（プログレッション・SA）</Label>
              <Input
                type="datetime-local"
                value={currentDt}
                onChange={e => setCurrentDt(e.target.value)}
                className="w-52"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">SR対象年</Label>
              <Input
                type="number"
                value={srYear}
                onChange={e => setSrYear(Number(e.target.value))}
                className="w-24"
                min={1900} max={2100}
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </CardContent>
      </Card>

      {reading && (
        <div className="print:hidden">
          <DailyHoroscope events={reading.transit.events} />
        </div>
      )}

      {/* 印刷専用ヘッダー（スクリーンでは非表示） */}
      {personReq && reading && (
        <div className="hidden print:block w-full max-w-5xl mx-auto mb-6 pb-4 border-b border-border">
          <p className="font-semibold text-sm">
            {personReq.year}年{personReq.month}月{personReq.day}日
            &nbsp;{String(personReq.hour).padStart(2, '0')}:{String(personReq.minute).padStart(2, '0')}
            {personReq.city && <span> · {personReq.city}</span>}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            総合スコア {reading.chart.total_score}/100 · {reading.chart.score_label}
          </p>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full max-w-5xl mx-auto">
        <TabsList className="flex overflow-x-auto h-auto gap-1 p-1 mb-6 w-full justify-start print:hidden">
          <TabsTrigger value="natal"       className="shrink-0">🪐 私の性格・素質</TabsTrigger>
          <TabsTrigger value="transit"     className="shrink-0">📅 今の運気</TabsTrigger>
          <TabsTrigger value="progression" className="shrink-0">🌱 成長の流れ</TabsTrigger>
          <TabsTrigger value="solar-arc"   className="shrink-0">🔮 人生の転機</TabsTrigger>
          <TabsTrigger value="solar-return" className="shrink-0">☀️ 今年の運勢</TabsTrigger>
          <TabsTrigger value="synastry"    className="shrink-0">💑 相性を見る</TabsTrigger>
          <TabsTrigger value="ai"          className="shrink-0">✦ AI鑑定</TabsTrigger>
        </TabsList>

        {/* ── ネイタル ─────────────────────────────────────────────────── */}
        <TabsContent value="natal">
          {reading ? (
            <BlurFade delay={100}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-4 flex justify-center">
                    <ChartWheel chart={reading.chart} size={440} />
                  </CardContent>
                </Card>
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">総合スコア</CardTitle></CardHeader>
                    <CardContent><ScoreCard chart={reading.chart} /></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">天体配置</CardTitle></CardHeader>
                    <CardContent><PlanetTable chart={reading.chart} /></CardContent>
                  </Card>
                </div>
              </div>
            </BlurFade>
          ) : <EmptyHint />}
        </TabsContent>

        {/* ── トランジット ──────────────────────────────────────────────── */}
        <TabsContent value="transit">
          {reading ? (
            <BlurFade delay={100}>
              <Card>
                <CardContent className="p-4">
                  <TransitCalendar
                    events={reading.transit.events}
                    natal={reading.chart}
                    currentPlanets={reading.transit.current_planets}
                  />
                </CardContent>
              </Card>
            </BlurFade>
          ) : <EmptyHint />}
        </TabsContent>

        {/* ── プログレッション ──────────────────────────────────────────── */}
        <TabsContent value="progression">
          {reading ? (
            <BlurFade delay={100}>
              <Card>
                <CardContent className="p-4">
                  <ProgressionView data={reading.progression} />
                </CardContent>
              </Card>
            </BlurFade>
          ) : <EmptyHint />}
        </TabsContent>

        {/* ── ソーラーアーク ────────────────────────────────────────────── */}
        <TabsContent value="solar-arc">
          {reading ? (
            <BlurFade delay={100}>
              <Card>
                <CardContent className="p-4">
                  <SolarArcView data={reading.solar_arc} />
                </CardContent>
              </Card>
            </BlurFade>
          ) : <EmptyHint />}
        </TabsContent>

        {/* ── ソーラーリターン ──────────────────────────────────────────── */}
        <TabsContent value="solar-return">
          {reading ? (
            <BlurFade delay={100}>
              <Card>
                <CardContent className="p-4">
                  <SolarReturnView data={reading.solar_return} />
                </CardContent>
              </Card>
            </BlurFade>
          ) : <EmptyHint />}
        </TabsContent>

        {/* ── AI鑑定 ───────────────────────────────────────────────────── */}
        <TabsContent value="ai">
          {reading ? (
            <BlurFade delay={100}>
              <AiReadingTab chart={reading.chart} />
            </BlurFade>
          ) : <EmptyHint />}
        </TabsContent>

        {/* ── シナストリー ──────────────────────────────────────────────── */}
        <TabsContent value="synastry">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Person A</CardTitle></CardHeader>
              <CardContent>
                <BirthForm onSubmit={handleSubmit} loading={loading} label="A を設定" />
                {personReq && <p className="text-xs text-green-400 mt-2">✓ Person A 設定済み</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Person B</CardTitle></CardHeader>
              <CardContent>
                {personReq
                  ? <BirthForm onSubmit={handleSynastryB} loading={synLoading} label="相性を計算" />
                  : <p className="text-sm text-muted-foreground">先に Person A を設定してください</p>
                }
              </CardContent>
            </Card>
          </div>
          {synastry && (
            <BlurFade delay={100}>
              <Card><CardContent className="p-4"><SynastryView data={synastry} /></CardContent></Card>
            </BlurFade>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
