import Anthropic from '@anthropic-ai/sdk'
import type { ChartResponse } from '@/lib/types'

const SIGNS_JP = ['牡羊座','牡牛座','双子座','蟹座','獅子座','乙女座','天秤座','蠍座','射手座','山羊座','水瓶座','魚座']
const PLANET_ORDER = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto']

function lonToSign(lon: number) {
  return SIGNS_JP[Math.floor(((lon % 360) + 360) % 360 / 30)]
}
function lonToDeg(lon: number) {
  return Math.floor(((lon % 360) + 360) % 360 % 30)
}

function buildPrompt(chart: ChartResponse): string {
  const planetLines = PLANET_ORDER.map(name => {
    const p = chart.planets[name]
    if (!p) return null
    const retro = p.retrograde ? ' (逆行)' : ''
    const dig = p.dignity ? ` [${p.dignity}]` : ''
    return `${p.name}: ${p.sign_jp} ${p.degree_str} ${p.house}ハウス${retro}${dig}`
  }).filter(Boolean).join('\n')

  const topAspects = [...chart.aspects]
    .sort((a, b) => a.orb - b.orb)
    .slice(0, 10)
    .map(a => `・${a.planet1_jp} ${a.aspect_jp} ${a.planet2_jp} (オーブ${a.orb.toFixed(1)}° / ${a.type})`)
    .join('\n')

  const strongLines = chart.strong_points
    .map(p => `・${p.planet_jp}: ${p.detail} (+${p.pts}pt)`)
    .join('\n')

  const challengeLines = chart.challenging_points
    .map(p => `・${p.planet_jp}: ${p.detail} (${p.pts}pt)`)
    .join('\n')

  const ascSign = lonToSign(chart.houses.asc)
  const ascDeg = lonToDeg(chart.houses.asc)
  const mcSign = lonToSign(chart.houses.mc)
  const mcDeg = lonToDeg(chart.houses.mc)

  return `あなたは西洋占星術の権威ある鑑定師です。以下のネイタルチャートデータをもとに、日本語で詳細かつ温かみのある個人鑑定書を作成してください。

## チャートデータ

出生日時: ${chart.birth_dt}
出生地: 緯度${chart.lat.toFixed(2)}° / 経度${chart.lon.toFixed(2)}° (${chart.tz})
ASC（上昇宮）: ${ascSign} ${ascDeg}°
MC（中天）: ${mcSign} ${mcDeg}°

### 天体配置
${planetLines}

### 主要アスペクト（精度順）
${topAspects}

### スコア分析
総合スコア: ${chart.total_score}/100（${chart.score_label}）
${chart.score_message}

強みのポイント:
${strongLines}

課題のポイント:
${challengeLines}

---

上記のデータをもとに、以下の6つのセクションで構成された3000字以上の個人鑑定書を日本語で執筆してください。
各セクションの見出しは「## 」で始めてください。占星術の専門用語は必ず平易な言葉で補足説明を加えてください。

## 全体的な人物像と基本気質
（太陽・月・ASCを中心に、基本的な性格・気質・外見的印象・反応パターンを詳述する）

## 才能・強みとなる天体配置
（強みのポイントと、才能を活かせる分野・状況を具体的に）

## 人間関係とコミュニケーションスタイル
（金星・水星・月の配置から、愛情表現・対話スタイル・人との接し方を分析）

## 仕事・社会的使命（MCから読む）
（MC・土星・太陽の配置から、理想のキャリア・社会での役割・成功パターンを）

## 課題と魂の成長テーマ
（チャレンジングな配置が示す試練と、それを乗り越えることで得られる成長を前向きに）

## あなたへの実践的アドバイス
（この命式の特性を日常生活・仕事・人間関係で活かすための具体的な提言を5点以上）
`
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response('ANTHROPIC_API_KEY が設定されていません', { status: 500 })
  }

  let chart: ChartResponse
  try {
    const body = await req.json()
    chart = body.chart
  } catch {
    return new Response('Invalid request body', { status: 400 })
  }

  const client = new Anthropic({ apiKey })
  const prompt = buildPrompt(chart)
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        })
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
        controller.close()
      } catch (e) {
        controller.error(e)
      }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
