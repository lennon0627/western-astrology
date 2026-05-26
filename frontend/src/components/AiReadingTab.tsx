'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkles, StopCircle, RefreshCw, Loader2 } from 'lucide-react'
import type { ChartResponse } from '@/lib/types'

interface Props {
  chart: ChartResponse
}

function AiReadingText({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div className="flex flex-col gap-2 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('## '))
          return (
            <h3 key={i} className="text-base font-bold mt-5 first:mt-0 border-b border-border pb-1">
              {line.slice(3)}
            </h3>
          )
        if (line.trim() === '') return <div key={i} className="h-1" />
        return <p key={i} className="text-muted-foreground">{line}</p>
      })}
    </div>
  )
}

export default function AiReadingTab({ chart }: Props) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const handleGenerate = async () => {
    setText('')
    setError('')
    setLoading(true)
    abortRef.current = new AbortController()
    try {
      const res = await fetch('/api/ai-reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chart }),
        signal: abortRef.current.signal,
      })
      if (!res.ok) {
        const msg = await res.text().catch(() => `HTTP ${res.status}`)
        throw new Error(msg)
      }
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setText(prev => prev + decoder.decode(value, { stream: true }))
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message)
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }

  const handleStop = () => abortRef.current?.abort()

  return (
    <div className="space-y-4">
      {/* 未生成：呼び出しボタン */}
      {!text && !loading && (
        <Card>
          <CardContent className="p-8 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="size-7 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">AI 個人鑑定を生成</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Claude AI がネイタルチャートを深く読み解き、<br />
                3000字以上の詳細な鑑定書を生成します。
              </p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={handleGenerate} size="lg">
              <Sparkles className="size-4 mr-2" />
              鑑定書を生成する
            </Button>
            <p className="text-xs text-muted-foreground">生成には30〜60秒かかります</p>
          </CardContent>
        </Card>
      )}

      {/* ストリーミング中 / 生成完了後 */}
      {(loading || text) && (
        <Card>
          <CardContent className="p-5 flex flex-col gap-4">
            {/* ヘッダー */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="size-4 text-primary" />
                <span>AI 個人鑑定書</span>
                {loading && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" /> 生成中...
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {loading ? (
                  <Button variant="outline" size="sm" onClick={handleStop}>
                    <StopCircle className="size-4 mr-1" /> 停止
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleGenerate}>
                    <RefreshCw className="size-4 mr-1" /> 再生成
                  </Button>
                )}
              </div>
            </div>

            {/* 本文 */}
            <div className="border-t border-border pt-4">
              <AiReadingText text={text} />
              {loading && (
                <span className="inline-block w-2 h-4 bg-foreground/60 animate-pulse ml-0.5 align-middle" />
              )}
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
