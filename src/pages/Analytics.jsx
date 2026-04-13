import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

function Analytics() {
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('trades').select('*').order('date', { ascending: true }).then(({ data }) => {
      if (data) setTrades(data)
      setLoading(false)
    })
  }, [])

  if (loading) return <div style={{ padding: '40px', fontSize: '13px', color: '#9C856A' }}>Loading...</div>
  if (trades.length === 0) return (
    <div>
      <div style={{ background: '#EDE4D3', borderBottom: '1px solid #C8B89A', padding: '14px 24px' }}>
        <div style={{ fontFamily: 'Lora, serif', fontSize: '16px', fontWeight: 600, color: '#2B2318' }}>Analytics</div>
        <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '2px' }}>Your trading performance</div>
      </div>
      <div style={{ padding: '40px 24px', fontSize: '13px', color: '#9C856A' }}>No trades logged yet. Head to Trade Log to add your first trade.</div>
    </div>
  )

  const totalTrades = trades.length
  const winners = trades.filter(t => t.pnl_r > 0)
  const losers = trades.filter(t => t.pnl_r < 0)
  const winRate = Math.round((winners.length / totalTrades) * 100)
  const netPnl = trades.reduce((sum, t) => sum + (t.pnl_r || 0), 0)
  const avgWin = winners.length ? (winners.reduce((s, t) => s + t.pnl_r, 0) / winners.length).toFixed(2) : 0
  const avgLoss = losers.length ? (losers.reduce((s, t) => s + t.pnl_r, 0) / losers.length).toFixed(2) : 0
  const bestTrade = trades.reduce((best, t) => t.pnl_r > best.pnl_r ? t : best, trades[0])
  const worstTrade = trades.reduce((worst, t) => t.pnl_r < worst.pnl_r ? t : worst, trades[0])
  const expectancy = ((winRate / 100) * parseFloat(avgWin) + (1 - winRate / 100) * parseFloat(avgLoss)).toFixed(2)

  const pairStats = Object.values(trades.reduce((acc, t) => {
    if (!acc[t.pair]) acc[t.pair] = { pair: t.pair, trades: 0, pnl: 0, wins: 0 }
    acc[t.pair].trades++
    acc[t.pair].pnl += t.pnl_r || 0
    if (t.pnl_r > 0) acc[t.pair].wins++
    return acc
  }, {})).sort((a, b) => b.pnl - a.pnl)

  const monthlyStats = Object.values(trades.reduce((acc, t) => {
    const month = t.date?.slice(0, 7) || 'Unknown'
    if (!acc[month]) acc[month] = { month, trades: 0, pnl: 0, wins: 0 }
    acc[month].trades++
    acc[month].pnl += t.pnl_r || 0
    if (t.pnl_r > 0) acc[month].wins++
    return acc
  }, {})).sort((a, b) => a.month.localeCompare(b.month))

  let streak = 0, maxWinStreak = 0, maxLossStreak = 0, currentStreak = 0
  let lastType = null
  trades.slice().reverse().forEach(t => {
    const type = t.pnl_r > 0 ? 'win' : 'loss'
    if (type === lastType) { currentStreak++ } else { currentStreak = 1; lastType = type }
    if (type === 'win') maxWinStreak = Math.max(maxWinStreak, currentStreak)
    else maxLossStreak = Math.max(maxLossStreak, currentStreak)
  })

  let runningPnl = 0
  const curve = trades.map((t, i) => {
    runningPnl += t.pnl_r || 0
    return { i, pnl: parseFloat(runningPnl.toFixed(2)), date: t.date }
  })

  const maxPnl = Math.max(...curve.map(p => p.pnl), 0)
  const minPnl = Math.min(...curve.map(p => p.pnl), 0)
  const range = maxPnl - minPnl || 1
  const chartW = 600, chartH = 140, pad = 20
  const points = curve.map(p => {
    const x = pad + ((p.i / Math.max(curve.length - 1, 1)) * (chartW - pad * 2))
    const y = pad + ((1 - (p.pnl - minPnl) / range) * (chartH - pad * 2))
    return `${x},${y}`
  }).join(' ')
  const zeroY = pad + ((1 - (0 - minPnl) / range) * (chartH - pad * 2))
  const finalPnl = curve[curve.length - 1]?.pnl || 0

  const card = { background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', padding: '16px 18px' }

  return (
    <div>
      <div style={{ background: '#EDE4D3', borderBottom: '1px solid #C8B89A', padding: '14px 24px' }}>
        <div style={{ fontFamily: 'Lora, serif', fontSize: '16px', fontWeight: 600, color: '#2B2318' }}>Analytics</div>
        <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '2px' }}>{totalTrades} trades analysed</div>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {[
            { label: 'Win Rate', value: winRate + '%', sub: winners.length + 'W / ' + losers.length + 'L', color: winRate >= 50 ? '#3D7A52' : '#9B3A28' },
            { label: 'Net P&L', value: (netPnl > 0 ? '+' : '') + netPnl.toFixed(1) + 'R', sub: 'all time', color: netPnl >= 0 ? '#3D7A52' : '#9B3A28' },
            { label: 'Expectancy', value: (expectancy > 0 ? '+' : '') + expectancy + 'R', sub: 'per trade avg', color: parseFloat(expectancy) >= 0 ? '#3D7A52' : '#9B3A28' },
            { label: 'Total Trades', value: totalTrades, sub: 'logged', color: '#2B2318' },
          ].map(s => (
            <div key={s.label} style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '10px', color: '#9C856A', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>{s.label}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '22px', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '3px' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        <div style={card}>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9C856A', marginBottom: '14px' }}>P&L Curve</div>
          <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: '100%', height: '140px' }}>
            <line x1={pad} y1={zeroY} x2={chartW - pad} y2={zeroY} stroke="#C8B89A" strokeWidth="1" strokeDasharray="4,4" />
            <polyline points={points} fill="none" stroke={finalPnl >= 0 ? '#3D7A52' : '#9B3A28'} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {curve.map((p, i) => {
              const x = pad + ((i / Math.max(curve.length - 1, 1)) * (chartW - pad * 2))
              const y = pad + ((1 - (p.pnl - minPnl) / range) * (chartH - pad * 2))
              return <circle key={i} cx={x} cy={y} r="3" fill={p.pnl >= 0 ? '#3D7A52' : '#9B3A28'} />
            })}
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9C856A', fontFamily: 'JetBrains Mono, monospace', marginTop: '4px' }}>
            <span>{curve[0]?.date}</span>
            <span style={{ color: finalPnl >= 0 ? '#3D7A52' : '#9B3A28', fontWeight: 700 }}>{finalPnl >= 0 ? '+' : ''}{finalPnl}R total</span>
            <span>{curve[curve.length - 1]?.date}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={card}>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9C856A', marginBottom: '14px' }}>By Pair</div>
            {pairStats.map((p, i) => (
              <div key={p.pair} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < pairStats.length - 1 ? '1px solid #C8B89A' : 'none' }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: 600, color: '#2B2318', minWidth: '90px' }}>{p.pair}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ height: '6px', background: '#F5EFE4', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: Math.round((p.wins / p.trades) * 100) + '%', background: '#3D7A52', borderRadius: '99px' }} />
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#9C856A' }}>{Math.round((p.wins / p.trades) * 100)}%</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 700, color: p.pnl >= 0 ? '#3D7A52' : '#9B3A28', minWidth: '52px', textAlign: 'right' }}>{p.pnl > 0 ? '+' : ''}{p.pnl.toFixed(1)}R</div>
              </div>
            ))}
          </div>

          <div style={card}>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9C856A', marginBottom: '14px' }}>By Month</div>
            {monthlyStats.map((m, i) => (
              <div key={m.month} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < monthlyStats.length - 1 ? '1px solid #C8B89A' : 'none' }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#5A4535', minWidth: '70px' }}>{m.month}</div>
                <div style={{ fontSize: '11px', color: '#9C856A' }}>{m.trades} trades</div>
                <div style={{ flex: 1 }} />
                <div style={{ fontSize: '11px', color: '#9C856A' }}>{Math.round((m.wins / m.trades) * 100)}% wr</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 700, color: m.pnl >= 0 ? '#3D7A52' : '#9B3A28', minWidth: '52px', textAlign: 'right' }}>{m.pnl > 0 ? '+' : ''}{m.pnl.toFixed(1)}R</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {[
            { label: 'Avg Win', value: '+' + avgWin + 'R', color: '#3D7A52' },
            { label: 'Avg Loss', value: avgLoss + 'R', color: '#9B3A28' },
            { label: 'Best Trade', value: '+' + bestTrade.pnl_r + 'R', sub: bestTrade.pair, color: '#3D7A52' },
            { label: 'Worst Trade', value: worstTrade.pnl_r + 'R', sub: worstTrade.pair, color: '#9B3A28' },
          ].map(s => (
            <div key={s.label} style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '10px', color: '#9C856A', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>{s.label}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '20px', fontWeight: 700, color: s.color }}>{s.value}</div>
              {s.sub && <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '3px' }}>{s.sub}</div>}
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
export default Analytics
