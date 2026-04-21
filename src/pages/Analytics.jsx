import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

function Analytics() {
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

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
      </div>
      <div style={{ padding: '40px 24px', fontSize: '13px', color: '#9C856A' }}>No trades logged yet.</div>
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

  const grossWins = winners.reduce((s, t) => s + (t.pnl_usd || t.pnl_r || 0), 0)
  const grossLosses = Math.abs(losers.reduce((s, t) => s + (t.pnl_usd || t.pnl_r || 0), 0))
  const profitFactor = grossLosses > 0 ? (grossWins / grossLosses).toFixed(2) : grossWins > 0 ? '∞' : '—'

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

  const emotionStats = Object.values(trades.filter(t => t.emotion).reduce((acc, t) => {
    if (!acc[t.emotion]) acc[t.emotion] = { label: t.emotion, trades: 0, pnl: 0, wins: 0 }
    acc[t.emotion].trades++
    acc[t.emotion].pnl += t.pnl_r || 0
    if (t.pnl_r > 0) acc[t.emotion].wins++
    return acc
  }, {})).sort((a, b) => b.pnl - a.pnl)

  const setupStats = Object.values(trades.filter(t => t.setup).reduce((acc, t) => {
    if (!acc[t.setup]) acc[t.setup] = { label: t.setup, trades: 0, pnl: 0, wins: 0 }
    acc[t.setup].trades++
    acc[t.setup].pnl += t.pnl_r || 0
    if (t.pnl_r > 0) acc[t.setup].wins++
    return acc
  }, {})).sort((a, b) => b.pnl - a.pnl)

  const mistakeStats = Object.values(trades.filter(t => t.mistake).reduce((acc, t) => {
    if (!acc[t.mistake]) acc[t.mistake] = { label: t.mistake, trades: 0, pnl: 0, wins: 0 }
    acc[t.mistake].trades++
    acc[t.mistake].pnl += t.pnl_r || 0
    if (t.pnl_r > 0) acc[t.mistake].wins++
    return acc
  }, {})).sort((a, b) => a.pnl - b.pnl)

  // Streak calculations
  let currentStreak = 0, currentStreakType = null
  let maxWinStreak = 0, maxLossStreak = 0
  let tempStreak = 0, tempType = null
  const reversedTrades = [...trades].reverse()
  reversedTrades.forEach((t, i) => {
    const type = t.pnl_r > 0 ? 'win' : 'loss'
    if (i === 0) { tempStreak = 1; tempType = type }
    else if (type === tempType) { tempStreak++ }
    else { tempStreak = 1; tempType = type }
    if (type === 'win') maxWinStreak = Math.max(maxWinStreak, tempStreak)
    else maxLossStreak = Math.max(maxLossStreak, tempStreak)
  })
  const lastTrades = [...trades].reverse()
  let cs = 0, csType = null
  for (const t of lastTrades) {
    const type = t.pnl_r > 0 ? 'win' : 'loss'
    if (csType === null) { csType = type; cs = 1 }
    else if (type === csType) cs++
    else break
  }
  currentStreak = cs
  currentStreakType = csType

  // Day of week stats
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayStats = DAYS.map((day, di) => {
    const dayTrades = trades.filter(t => t.date && new Date(t.date).getDay() === di)
    const pnl = dayTrades.reduce((s, t) => s + (t.pnl_r || 0), 0)
    const wins = dayTrades.filter(t => t.pnl_r > 0).length
    return { day, trades: dayTrades.length, pnl, wins, wr: dayTrades.length ? Math.round((wins / dayTrades.length) * 100) : 0 }
  }).filter(d => d.trades > 0)

  // Time of day stats
  const timeStats = Object.values(trades.filter(t => t.trade_time).reduce((acc, t) => {
    const hour = t.trade_time.slice(0, 2) + ':00'
    if (!acc[hour]) acc[hour] = { hour, trades: 0, pnl: 0, wins: 0 }
    acc[hour].trades++
    acc[hour].pnl += t.pnl_r || 0
    if (t.pnl_r > 0) acc[hour].wins++
    return acc
  }, {})).sort((a, b) => a.hour.localeCompare(b.hour))

  // Drawdown chart
  let runningPnl = 0
  const curve = trades.map((t, i) => {
    runningPnl += t.pnl_r || 0
    return { i, pnl: parseFloat(runningPnl.toFixed(2)), date: t.date }
  })
  let peak = 0, ddCurve = []
  curve.forEach(p => {
    if (p.pnl > peak) peak = p.pnl
    const dd = peak > 0 ? ((peak - p.pnl) / peak) * 100 : 0
    ddCurve.push({ i: p.i, dd: parseFloat(dd.toFixed(2)), date: p.date })
  })
  const maxDd = Math.max(...ddCurve.map(p => p.dd), 0)
  const chartW = 600, chartH = 140, pad = 20
  const ddPoints = ddCurve.map(p => {
    const x = pad + ((p.i / Math.max(ddCurve.length - 1, 1)) * (chartW - pad * 2))
    const y = pad + ((p.dd / (maxDd || 1)) * (chartH - pad * 2))
    return `${x},${y}`
  }).join(' ')

  // P&L curve
  const maxPnl = Math.max(...curve.map(p => p.pnl), 0)
  const minPnl = Math.min(...curve.map(p => p.pnl), 0)
  const range = maxPnl - minPnl || 1
  const points = curve.map(p => {
    const x = pad + ((p.i / Math.max(curve.length - 1, 1)) * (chartW - pad * 2))
    const y = pad + ((1 - (p.pnl - minPnl) / range) * (chartH - pad * 2))
    return `${x},${y}`
  }).join(' ')
  const zeroY = pad + ((1 - (0 - minPnl) / range) * (chartH - pad * 2))
  const finalPnl = curve[curve.length - 1]?.pnl || 0

  const card = { background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', padding: '16px 18px' }
  const TABS = ['overview', 'calendar', 'streaks', 'days', 'time', 'drawdown', 'tags']

  const renderTagStats = (stats, label, emptyMsg) => (
    <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', padding: '16px 18px' }}>
      <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9C856A', marginBottom: '14px' }}>{label}</div>
      {stats.length === 0 ? <div style={{ fontSize: '12px', color: '#9C856A' }}>{emptyMsg}</div> : stats.map((s, i) => (
        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < stats.length - 1 ? '1px solid #C8B89A' : 'none' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#2B2318', minWidth: '120px' }}>{s.label}</div>
          <div style={{ fontSize: '11px', color: '#9C856A', minWidth: '50px' }}>{s.trades} trade{s.trades > 1 ? 's' : ''}</div>
          <div style={{ flex: 1 }}>
            <div style={{ height: '6px', background: '#F5EFE4', borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: Math.round((s.wins / s.trades) * 100) + '%', background: '#3D7A52', borderRadius: '99px' }} />
            </div>
          </div>
          <div style={{ fontSize: '11px', color: '#9C856A', minWidth: '30px' }}>{Math.round((s.wins / s.trades) * 100)}%</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 700, color: s.pnl >= 0 ? '#3D7A52' : '#9B3A28', minWidth: '52px', textAlign: 'right' }}>{s.pnl > 0 ? '+' : ''}{s.pnl.toFixed(1)}R</div>
        </div>
      ))}
    </div>
  )

  // Calendar heatmap
  const calendarTrades = trades.reduce((acc, t) => {
    if (!t.date) return acc
    if (!acc[t.date]) acc[t.date] = { pnl: 0, count: 0 }
    acc[t.date].pnl += t.pnl_r || 0
    acc[t.date].count++
    return acc
  }, {})
  const allDates = Object.keys(calendarTrades).sort()
  const calendarMonths = [...new Set(allDates.map(d => d.slice(0, 7)))].sort()
  const getDayColor = (pnl) => {
    if (pnl === undefined) return 'transparent'
    if (pnl === 0) return '#E8DEC8'
    if (pnl > 3) return '#1A5C34'
    if (pnl > 1) return '#2A7A48'
    if (pnl > 0) return '#5DA070'
    if (pnl > -1) return '#C87055'
    if (pnl > -3) return '#9B3A28'
    return '#6B1E12'
  }

  return (
    <div>
      <div style={{ background: '#EDE4D3', borderBottom: '1px solid #C8B89A', padding: '14px 24px' }}>
        <div style={{ fontFamily: 'Lora, serif', fontSize: '16px', fontWeight: 600, color: '#2B2318' }}>Analytics</div>
        <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '2px' }}>{totalTrades} trades analysed</div>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '10px', padding: '3px', width: 'fit-content', flexWrap: 'wrap', gap: '2px' }}>
          {TABS.map(tab => (
            <div key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: activeTab === tab ? '#F5EFE4' : 'transparent', color: activeTab === tab ? '#2B2318' : '#9C856A', border: activeTab === tab ? '1px solid #C8B89A' : '1px solid transparent', textTransform: 'capitalize' }}>{tab}</div>
          ))}
        </div>

        {activeTab === 'overview' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {[
                { label: 'Win Rate', value: winRate + '%', sub: winners.length + 'W / ' + losers.length + 'L', color: winRate >= 50 ? '#3D7A52' : '#9B3A28' },
                { label: 'Net P&L', value: (netPnl > 0 ? '+' : '') + netPnl.toFixed(1) + 'R', sub: 'all time', color: netPnl >= 0 ? '#3D7A52' : '#9B3A28' },
                { label: 'Expectancy', value: (expectancy > 0 ? '+' : '') + expectancy + 'R', sub: 'per trade avg', color: parseFloat(expectancy) >= 0 ? '#3D7A52' : '#9B3A28' },
                { label: 'Profit Factor', value: profitFactor, sub: 'gross win / loss', color: parseFloat(profitFactor) >= 1 ? '#3D7A52' : '#9B3A28' },
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
          </>
        )}

        {activeTab === 'calendar' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {calendarMonths.map(month => {
              const [year, mon] = month.split('-').map(Number)
              const firstDay = new Date(year, mon - 1, 1).getDay()
              const daysInMonth = new Date(year, mon, 0).getDate()
              const days = []
              for (let i = 0; i < firstDay; i++) days.push(null)
              for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${year}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                days.push({ date: dateStr, data: calendarTrades[dateStr] })
              }
              const monthPnl = allDates.filter(d => d.startsWith(month)).reduce((sum, d) => sum + calendarTrades[d].pnl, 0)
              return (
                <div key={month} style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontFamily: 'Lora, serif', fontSize: '14px', fontWeight: 600, color: '#2B2318' }}>{new Date(year, mon - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 700, color: monthPnl >= 0 ? '#3D7A52' : '#9B3A28' }}>{monthPnl > 0 ? '+' : ''}{monthPnl.toFixed(1)}R</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                      <div key={d} style={{ textAlign: 'center', fontSize: '10px', color: '#9C856A', fontWeight: 600, padding: '2px' }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                    {days.map((day, i) => (
                      <div key={i} title={day?.data ? `${day.date}: ${day.data.pnl > 0 ? '+' : ''}${day.data.pnl.toFixed(1)}R (${day.data.count} trade${day.data.count > 1 ? 's' : ''})` : ''} style={{ aspectRatio: '1', borderRadius: '4px', background: day?.data ? getDayColor(day.data.pnl) : day ? '#F5EFE4' : 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: day?.data ? '1px solid rgba(0,0,0,0.1)' : '1px solid transparent' }}>
                        {day && <span style={{ fontSize: '10px', color: day?.data ? 'white' : '#9C856A', fontWeight: day?.data ? 700 : 400 }}>{parseInt(day.date.split('-')[2])}</span>}
                        {day?.data && <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.9)', fontFamily: 'JetBrains Mono, monospace' }}>{day.data.pnl > 0 ? '+' : ''}{day.data.pnl.toFixed(1)}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {activeTab === 'streaks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '10px', padding: '14px 16px' }}>
                <div style={{ fontSize: '10px', color: '#9C856A', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Current Streak</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '28px', fontWeight: 700, color: currentStreakType === 'win' ? '#3D7A52' : '#9B3A28' }}>{currentStreak}{currentStreakType === 'win' ? 'W' : 'L'}</div>
                <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '3px' }}>{currentStreakType === 'win' ? 'winning' : 'losing'} streak</div>
              </div>
              <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '10px', padding: '14px 16px' }}>
                <div style={{ fontSize: '10px', color: '#9C856A', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Best Win Streak</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '28px', fontWeight: 700, color: '#3D7A52' }}>{maxWinStreak}W</div>
                <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '3px' }}>consecutive wins</div>
              </div>
              <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '10px', padding: '14px 16px' }}>
                <div style={{ fontSize: '10px', color: '#9C856A', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Worst Loss Streak</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '28px', fontWeight: 700, color: '#9B3A28' }}>{maxLossStreak}L</div>
                <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '3px' }}>consecutive losses</div>
              </div>
            </div>
            <div style={card}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9C856A', marginBottom: '14px' }}>Trade History (W/L)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {[...trades].reverse().map((t, i) => (
                  <div key={i} title={`${t.pair} ${t.pnl_r > 0 ? '+' : ''}${t.pnl_r}R — ${t.date}`} style={{ width: '24px', height: '24px', borderRadius: '4px', background: t.pnl_r > 0 ? '#3D7A52' : t.pnl_r < 0 ? '#9B3A28' : '#C8B89A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: 'white', cursor: 'default' }}>
                    {t.pnl_r > 0 ? 'W' : t.pnl_r < 0 ? 'L' : 'B'}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '11px', color: '#9C856A' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#3D7A52' }} /> Win</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#9B3A28' }} /> Loss</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#C8B89A' }} /> Break even</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'days' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={card}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9C856A', marginBottom: '14px' }}>Performance by Day of Week</div>
              {dayStats.length === 0 ? <div style={{ fontSize: '13px', color: '#9C856A' }}>No trades with dates yet.</div> : dayStats.sort((a, b) => b.pnl - a.pnl).map((d, i) => (
                <div key={d.day} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: i < dayStats.length - 1 ? '1px solid #C8B89A' : 'none' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#2B2318', minWidth: '90px' }}>{d.day}</div>
                  <div style={{ fontSize: '11px', color: '#9C856A', minWidth: '60px' }}>{d.trades} trade{d.trades > 1 ? 's' : ''}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ height: '8px', background: '#F5EFE4', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: d.wr + '%', background: d.pnl >= 0 ? '#3D7A52' : '#9B3A28', borderRadius: '99px' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#9C856A', minWidth: '35px' }}>{d.wr}% wr</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 700, color: d.pnl >= 0 ? '#3D7A52' : '#9B3A28', minWidth: '60px', textAlign: 'right' }}>{d.pnl > 0 ? '+' : ''}{d.pnl.toFixed(1)}R</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'time' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={card}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9C856A', marginBottom: '14px' }}>Performance by Time of Day</div>
              {timeStats.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#9C856A' }}>No trades with times logged yet. Add a trade time when logging trades to see this breakdown.</div>
              ) : timeStats.sort((a, b) => b.pnl - a.pnl).map((t, i) => (
                <div key={t.hour} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: i < timeStats.length - 1 ? '1px solid #C8B89A' : 'none' }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 600, color: '#2B2318', minWidth: '60px' }}>{t.hour}</div>
                  <div style={{ fontSize: '11px', color: '#9C856A', minWidth: '60px' }}>{t.trades} trade{t.trades > 1 ? 's' : ''}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ height: '8px', background: '#F5EFE4', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: Math.round((t.wins / t.trades) * 100) + '%', background: t.pnl >= 0 ? '#3D7A52' : '#9B3A28', borderRadius: '99px' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#9C856A', minWidth: '35px' }}>{Math.round((t.wins / t.trades) * 100)}% wr</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 700, color: t.pnl >= 0 ? '#3D7A52' : '#9B3A28', minWidth: '60px', textAlign: 'right' }}>{t.pnl > 0 ? '+' : ''}{t.pnl.toFixed(1)}R</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'drawdown' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '10px', padding: '14px 16px' }}>
                <div style={{ fontSize: '10px', color: '#9C856A', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Max Drawdown</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '28px', fontWeight: 700, color: '#9B3A28' }}>{maxDd.toFixed(1)}%</div>
                <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '3px' }}>peak to trough</div>
              </div>
              <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '10px', padding: '14px 16px' }}>
                <div style={{ fontSize: '10px', color: '#9C856A', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Peak R</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '28px', fontWeight: 700, color: '#3D7A52' }}>+{Math.max(...curve.map(p => p.pnl)).toFixed(1)}R</div>
                <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '3px' }}>highest point</div>
              </div>
            </div>
            <div style={card}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9C856A', marginBottom: '14px' }}>Drawdown Over Time</div>
              <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: '100%', height: '140px' }}>
                <line x1={pad} y1={pad} x2={chartW - pad} y2={pad} stroke="#C8B89A" strokeWidth="1" strokeDasharray="4,4" />
                <polyline points={ddPoints} fill="none" stroke="#9B3A28" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                {ddCurve.map((p, i) => {
                  const x = pad + ((i / Math.max(ddCurve.length - 1, 1)) * (chartW - pad * 2))
                  const y = pad + ((p.dd / (maxDd || 1)) * (chartH - pad * 2))
                  return <circle key={i} cx={x} cy={y} r="2.5" fill="#9B3A28" />
                })}
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9C856A', fontFamily: 'JetBrains Mono, monospace', marginTop: '4px' }}>
                <span>{ddCurve[0]?.date}</span>
                <span style={{ color: '#9B3A28', fontWeight: 700 }}>Max: {maxDd.toFixed(1)}%</span>
                <span>{ddCurve[ddCurve.length - 1]?.date}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tags' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#F5E6C8', border: '1px solid #C8903A', borderRadius: '10px', padding: '12px 16px', fontSize: '12px', color: '#7A4F1A' }}>
              Tag your trades with emotion, setup and mistake in the Trade Log to see breakdowns here.
            </div>
            {renderTagStats(setupStats, 'By Setup', 'No setup tags yet')}
            {renderTagStats(emotionStats, 'By Emotion', 'No emotion tags yet')}
            {renderTagStats(mistakeStats, 'By Mistake', 'No mistake tags yet')}
          </div>
        )}
      </div>
    </div>
  )
}
export default Analytics