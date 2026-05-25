'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { fetchReading, fetchSynastry } from '@/lib/api'
import type { BirthRequest, ReadingResponse, SynastryResponse } from '@/lib/types'

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

  // ── ハンドラー ──────────────────────────────────────────────────────────

  async function handleSubmit(req: BirthRequest) {
    setLoading(true)
    setError('')
    try {
      const data = await fetchReading(req, currentDt + ':00', srYear)
      setReading(data)
      setPersonReq(req)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
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
      <Card className="w-full max-w-5xl mx-auto mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">生年月日・出生地を入力</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <BirthForm onSubmit={handleSubmit} loading={loading} />

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

      <Tabs defaultValue="natal" className="w-full max-w-5xl mx-auto">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1 mb-6">
          <TabsTrigger value="natal">ネイタル</TabsTrigger>
          <TabsTrigger value="transit">トランジット</TabsTrigger>
          <TabsTrigger value="progression">プログレッション</TabsTrigger>
          <TabsTrigger value="solar-arc">ソーラーアーク</TabsTrigger>
          <TabsTrigger value="solar-return">ソーラーリターン</TabsTrigger>
          <TabsTrigger value="synastry">シナストリー</TabsTrigger>
        </TabsList>

        {/* ── ネイタル ─────────────────────────────────────────────────── */}
        <TabsContent value="natal">
          {reading && (
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
          )}
        </TabsContent>

        {/* ── トランジット ──────────────────────────────────────────────── */}
        <TabsContent value="transit">
          {reading && (
            <BlurFade delay={100}>
              <Card>
                <CardContent className="p-4">
                  <TransitCalendar events={reading.transit.events} />
                </CardContent>
              </Card>
            </BlurFade>
          )}
        </TabsContent>

        {/* ── プログレッション ──────────────────────────────────────────── */}
        <TabsContent value="progression">
          {reading && (
            <BlurFade delay={100}>
              <Card>
                <CardContent className="p-4">
                  <ProgressionView data={reading.progression} />
                </CardContent>
              </Card>
            </BlurFade>
          )}
        </TabsContent>

        {/* ── ソーラーアーク ────────────────────────────────────────────── */}
        <TabsContent value="solar-arc">
          {reading && (
            <BlurFade delay={100}>
              <Card>
                <CardContent className="p-4">
                  <SolarArcView data={reading.solar_arc} />
                </CardContent>
              </Card>
            </BlurFade>
          )}
        </TabsContent>

        {/* ── ソーラーリターン ──────────────────────────────────────────── */}
        <TabsContent value="solar-return">
          {reading && (
            <BlurFade delay={100}>
              <Card>
                <CardContent className="p-4">
                  <SolarReturnView data={reading.solar_return} />
                </CardContent>
              </Card>
            </BlurFade>
          )}
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
