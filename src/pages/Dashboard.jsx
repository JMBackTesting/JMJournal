import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

function SessionCountdown() {
  const [times, setTimes] = useState([])

  const getSessions = () => {
    const now = new Date()
    const sessions = [
      { name: 'London Open', hour: 8, minute: 0 },
      { name: 'NY Open', hour: 13, minute: 30 },
      { name: 'Asia Open', hour: 0, minute: 0 },
    ]
    return sessions.map(s => {
      const next = new Date()
      next.setUTCHours(s.hour, s.minute, 0, 0)
      if (next <= now) next.setUTCDate(next.getUTCDate() + 1)
      const diff = next - now
      const h = Math.floor(diff / (1000 * 60 * 60))
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const isActive = Math.abs(now.getUTCHours() * 60 + now.getUTCMinutes() - (s.hour * 60 + s.minute)) < 60
      return { ...s, h, m, isActive }
    })
  }

  useEffect(() => {
    setTimes(getSessions())
    const interval = setInterval(() => setTimes(getSessions()), 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', padding: '14px 18px' }}>
      <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9C856A', marginBottom: '12px' }}>Session Countdown (UTC)</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        {times.map(s => (
          <div key={s.name} style={{ background: s.isActive ? '#D4EAD8' : '#F5EFE4', border: s.isActive ? '1px solid #5DA070' : '1px solid #C8B89A', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: s.isActive ? '#2A5E38' : '#9C856A', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{s.name}</div>
            {s.isActive ? (
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 700, color: '#2A5E38' }}>OPEN NOW</div>
            ) : (
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '16px', fontWeight: 700, color: '#2B2318' }}>{s.h}h {s.m}m</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function Dashboard() {
  const [trades, setTrades] = useState([])
  const [allTrades, setAllTrades] = useState([])
  const [levels, setLevels] = useState([])
  const [settings, setSettings] = useState({})

  useEffect(() => {
    supabase.from('trades').select('*').order('date', { ascending: false }).then(({ data }) => data && setTrades(data))
    supabase.from('trades').select('*').order('date', { ascending: true }).then(({ data }) => data && setAllTrades(data))
    supabase.from('key_levels').select('*').order('created_at', { ascending: false }).then(({ data }) => data && setLevels(data))
    supabase.from('settings').select('*').then(({ data }) => {
      if (!data) return
      const map = {}
      data.forEach(row => { map[row.key] = row.value })
      setSettings(map)
    })
  }, [])

  const card = { background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', padding: '16px 18px' }
  const winRate = trades.length ? Math.round((trades.filter(t => t.pnl_r > 0).length / trades.length) * 100) : 0
  const netPnl = trades.reduce((sum, t) => sum + (t.pnl_r || 0), 0).toFixed(1)

  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const accountSize = parseFloat(settings.account_size) || 0
  const dailyLimit = parseFloat(settings.daily_drawdown) || 0
  const maxDrawdownLimit = parseFloat(settings.max_drawdown) || 0
  const todayTrades = allTrades.filter(t => t.date === today)
  const todayPnlR = todayTrades.reduce((sum, t) => sum + (t.pnl_r || 0), 0)
  const todayPnlUsd = todayTrades.reduce((sum, t) => sum + (t.pnl_usd || 0), 0)
  let peakR = 0, runningR = 0, maxDrawdownR = 0
  allTrades.forEach(t => {
    runningR += t.pnl_r || 0
    if (runningR > peakR) peakR = runningR
    const dd = peakR - runningR
    if (dd > maxDrawdownR) maxDrawdownR = dd
  })
  const todayPnlPct = accountSize > 0 ? (todayPnlR / accountSize) * 100 : 0
  const maxDrawdownPct = accountSize > 0 ? (maxDrawdownR / accountSize) * 100 : 0
  const dailyBreached = dailyLimit > 0 && accountSize > 0 && todayPnlPct <= -dailyLimit
  const maxBreached = maxDrawdownLimit > 0 && accountSize > 0 && maxDrawdownPct >= maxDrawdownLimit
  const dailyWarning = dailyLimit > 0 && accountSize > 0 && todayPnlPct <= -(dailyLimit * 0.75) && !dailyBreached
  const maxWarning = maxDrawdownLimit > 0 && accountSize > 0 && maxDrawdownPct >= maxDrawdownLimit * 0.75 && !maxBreached

  const allTimeAvgR = trades.length ? (trades.reduce((s, t) => s + (t.pnl_r || 0), 0) / trades.length).toFixed(2) : null
  const last30Trades = trades.filter(t => t.date >= thirtyDaysAgo)
  const last30AvgR = last30Trades.length ? (last30Trades.reduce((s, t) => s + (t.pnl_r || 0), 0) / last30Trades.length).toFixed(2) : null

  const goalDaily = parseFloat(settings.goal_daily) || 0
  const goalWeekly = parseFloat(settings.goal_weekly) || 0
  const goalMonthly = parseFloat(settings.goal_monthly) || 0
  const goalYearly = parseFloat(settings.goal_yearly) || 0

  const getWeekStart = () => {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff)).toISOString().split('T')[0]
  }
  const weekStart = getWeekStart()
  const currentMonth = today.slice(0, 7)
  const currentYear = today.slice(0, 4)

  const weeklyPnlUsd = allTrades.filter(t => t.date >= weekStart).reduce((sum, t) => sum + (t.pnl_usd || 0), 0)
  const monthlyPnlUsd = allTrades.filter(t => t.date?.startsWith(currentMonth)).reduce((sum, t) => sum + (t.pnl_usd || 0), 0)
  const yearlyPnlUsd = allTrades.filter(t => t.date?.startsWith(currentYear)).reduce((sum, t) => sum + (t.pnl_usd || 0), 0)
  const hasGoals = goalDaily > 0 || goalWeekly > 0 || goalMonthly > 0 || goalYearly > 0

  const GoalBar = ({ label, current, goal }) => {
    if (!goal) return null
    const pct = Math.min(Math.max((current / goal) * 100, 0), 100)
    const color = current < 0 ? '#9B3A28' : current >= goal ? '#1A5C34' : '#3D7A52'
    return (
      <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '10px', padding: '12px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '10px', color: '#9C856A', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
          <span style={{ fontSize: '10px', color: '#9C856A' }}>goal: ${goal.toLocaleString()}</span>
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '18px', fontWeight: 700, color, marginBottom: '8px' }}>
          {current >= 0 ? '+$' : '-$'}{Math.abs(current).toFixed(0)}
        </div>
        <div style={{ height: '6px', background: '#F5EFE4', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: '99px', transition: 'width 0.3s' }} />
        </div>
        <div style={{ fontSize: '10px', color: '#9C856A', marginTop: '4px', textAlign: 'right' }}>{Math.round(pct)}%</div>
      </div>
    )
  }

  const recentTrades = trades.slice(0, 5)

  return (
    <div>
      <div style={{ background: '#EDE4D3', borderBottom: '1px solid #C8B89A', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'Lora, serif', fontSize: '16px', fontWeight: 600, color: '#2B2318' }}>Dashboard</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#9C856A', marginTop: '2px' }}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {dailyBreached && <div style={{ background: '#F5DACE', border: '2px solid #9B3A28', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}><div style={{ fontSize: '20px' }}>🚨</div><div><div style={{ fontSize: '13px', fontWeight: 700, color: '#6B1E12' }}>Daily Drawdown Limit Breached</div><div style={{ fontSize: '12px', color: '#9B3A28', marginTop: '2px' }}>You are down {Math.abs(todayPnlPct).toFixed(1)}% today — your limit is {dailyLimit}%. Consider stopping trading for the day.</div></div></div>}
        {dailyWarning && <div style={{ background: '#F5E6C8', border: '2px solid #C8903A', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}><div style={{ fontSize: '20px' }}>⚠️</div><div><div style={{ fontSize: '13px', fontWeight: 700, color: '#7A4F1A' }}>Approaching Daily Drawdown Limit</div><div style={{ fontSize: '12px', color: '#C8903A', marginTop: '2px' }}>You are down {Math.abs(todayPnlPct).toFixed(1)}% today — your limit is {dailyLimit}%. Trade carefully.</div></div></div>}
        {maxBreached && <div style={{ background: '#F5DACE', border: '2px solid #9B3A28', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}><div style={{ fontSize: '20px' }}>🚨</div><div><div style={{ fontSize: '13px', fontWeight: 700, color: '#6B1E12' }}>Max Drawdown Limit Breached</div><div style={{ fontSize: '12px', color: '#9B3A28', marginTop: '2px' }}>Your all-time drawdown is {maxDrawdownPct.toFixed(1)}% — your limit is {maxDrawdownLimit}%.</div></div></div>}
        {maxWarning && <div style={{ background: '#F5E6C8', border: '2px solid #C8903A', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}><div style={{ fontSize: '20px' }}>⚠️</div><div><div style={{ fontSize: '13px', fontWeight: 700, color: '#7A4F1A' }}>Approaching Max Drawdown Limit</div><div style={{ fontSize: '12px', color: '#C8903A', marginTop: '2px' }}>Your all-time drawdown is {maxDrawdownPct.toFixed(1)}% — your limit is {maxDrawdownLimit}%. Be cautious.</div></div></div>}

        <SessionCountdown />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {[
            { label: 'Win Rate', value: winRate + '%', sub: trades.length + ' trades logged', color: '#3D7A52' },
            { label: 'Net R', value: netPnl + 'R', sub: 'all time', color: parseFloat(netPnl) >= 0 ? '#3D7A52' : '#9B3A28' },
            { label: 'Key Levels', value: levels.length, sub: 'tracked', color: '#2B2318' },
          ].map(s => (
            <div key={s.label} style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '10px', color: '#9C856A', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>{s.label}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '22px', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '3px' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {(allTimeAvgR !== null || last30AvgR !== null) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {allTimeAvgR !== null && (
              <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '10px', padding: '14px 16px' }}>
                <div style={{ fontSize: '10px', color: '#9C856A', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Avg R — All Time</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '22px', fontWeight: 700, color: parseFloat(allTimeAvgR) >= 0 ? '#3D7A52' : '#9B3A28' }}>{parseFloat(allTimeAvgR) > 0 ? '+' : ''}{allTimeAvgR}R</div>
                <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '3px' }}>per trade average</div>
              </div>
            )}
            {last30AvgR !== null && (
              <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '10px', padding: '14px 16px' }}>
                <div style={{ fontSize: '10px', color: '#9C856A', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Avg R — Last 30 Days</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '22px', fontWeight: 700, color: parseFloat(last30AvgR) >= 0 ? '#3D7A52' : '#9B3A28' }}>{parseFloat(last30AvgR) > 0 ? '+' : ''}{last30AvgR}R</div>
                <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '3px' }}>{last30Trades.length} trades in period</div>
              </div>
            )}
          </div>
        )}

        {hasGoals && (
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9C856A', marginBottom: '10px' }}>Goal Progress</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              <GoalBar label="Daily" current={todayPnlUsd} goal={goalDaily} />
              <GoalBar label="Weekly" current={weeklyPnlUsd} goal={goalWeekly} />
              <GoalBar label="Monthly" current={monthlyPnlUsd} goal={goalMonthly} />
              <GoalBar label="Yearly" current={yearlyPnlUsd} goal={goalYearly} />
            </div>
          </div>
        )}

        <div style={card}>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9C856A', marginBottom: '14px' }}>Key Levels</div>
          {levels.length === 0 && <div style={{ fontSize: '13px', color: '#9C856A' }}>No key levels added yet.</div>}
          {levels.slice(0, 4).map((l, i) => (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', background: '#F5EFE4', borderRadius: '8px', border: '1px solid #C8B89A', marginBottom: i < 3 ? '7px' : '0' }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#5A4535', minWidth: '78px' }}>{l.pair}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 600, flex: 1, color: '#2B2318' }}>{l.price}</div>
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: l.type === 'RES' ? '#F5DACE' : '#D4EAD8', color: l.type === 'RES' ? '#7A2E18' : '#2A5E38', border: l.type === 'RES' ? '1px solid #C87055' : '1px solid #5DA070' }}>{l.type}</span>
            </div>
          ))}
        </div>

        <div style={card}>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9C856A', marginBottom: '14px' }}>Recent Trades</div>
          {recentTrades.length === 0 && <div style={{ fontSize: '13px', color: '#9C856A' }}>No trades logged yet.</div>}
          {recentTrades.map((t, i) => (
            <div key={t.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto', gap: '10px', alignItems: 'center', padding: '9px 0', borderBottom: i < recentTrades.length - 1 ? '1px solid #C8B89A' : 'none' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '5px', background: t.side === 'LONG' ? '#D4EAD8' : '#F5DACE', color: t.side === 'LONG' ? '#2A5E38' : '#7A2E18' }}>{t.side}</span>
              <div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: 600, color: '#2B2318' }}>{t.pair}</div>
                <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '2px' }}>{t.notes}</div>
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#9C856A' }}>{t.date}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 700, color: t.pnl_r >= 0 ? '#3D7A52' : '#9B3A28', minWidth: '45px', textAlign: 'right' }}>{t.pnl_r > 0 ? '+' : ''}{t.pnl_r}R</div>
              {t.pnl_usd != null && <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 700, color: t.pnl_usd >= 0 ? '#3D7A52' : '#9B3A28', minWidth: '55px', textAlign: 'right' }}>{t.pnl_usd > 0 ? '+$' : '-$'}{Math.abs(t.pnl_usd).toFixed(0)}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
export default Dashboard