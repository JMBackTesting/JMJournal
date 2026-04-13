import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

function Dashboard() {
  const [trades, setTrades] = useState([])
  const [levels, setLevels] = useState([])
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    supabase.from('trades').select('*').order('date', { ascending: false }).limit(5).then(({ data }) => data && setTrades(data))
    supabase.from('key_levels').select('*').order('created_at', { ascending: false }).then(({ data }) => data && setLevels(data))
    supabase.from('tasks').select('*').eq('date', new Date().toISOString().split('T')[0]).then(({ data }) => data && setTasks(data))
  }, [])

  const toggleTask = async (task) => {
    await supabase.from('tasks').update({ done: !task.done }).eq('id', task.id)
    setTasks(tasks.map(t => t.id === task.id ? { ...t, done: !t.done } : t))
  }

  const card = { background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', padding: '16px 18px' }
  const winRate = trades.length ? Math.round((trades.filter(t => t.pnl_r > 0).length / trades.length) * 100) : 0
  const netPnl = trades.reduce((sum, t) => sum + (t.pnl_r || 0), 0).toFixed(1)

  return (
    <div>
      <div style={{ background: '#EDE4D3', borderBottom: '1px solid #C8B89A', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'Lora, serif', fontSize: '16px', fontWeight: 600, color: '#2B2318' }}>Dashboard</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#9C856A', marginTop: '2px' }}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', background: '#F5E6C8', color: '#7A4F1A', fontSize: '11px', fontWeight: 600, padding: '6px 12px', borderRadius: '99px', border: '1px solid #C8903A' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C8903A' }} />
          {tasks.filter(t => !t.done).length} tasks remaining
        </div>
      </div>
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {[
            { label: 'Win Rate', value: winRate + '%', sub: trades.length + ' trades logged', color: '#3D7A52' },
{ label: 'Risk:Reward', value: netPnl + 'R', sub: 'all time', color: parseFloat(netPnl) >= 0 ? '#3D7A52' : '#9B3A28' },            { label: 'Key Levels', value: levels.length, sub: 'tracked', color: '#2B2318' },
            { label: 'Tasks Today', value: tasks.filter(t => t.done).length + '/' + tasks.length, sub: 'completed', color: '#C8903A' },
          ].map(s => (
            <div key={s.label} style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '10px', color: '#9C856A', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>{s.label}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '22px', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '3px' }}>{s.sub}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={card}>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9C856A', marginBottom: '14px' }}>Today Tasks</div>
            {tasks.length === 0 && <div style={{ fontSize: '13px', color: '#9C856A' }}>No tasks for today yet.</div>}
            {tasks.map((t, i) => (
              <div key={t.id} onClick={() => toggleTask(t)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < tasks.length - 1 ? '1px solid #C8B89A' : 'none', cursor: 'pointer' }}>
                <div style={{ width: '15px', height: '15px', borderRadius: '4px', flexShrink: 0, background: t.done ? '#3D7A52' : '#F5EFE4', border: t.done ? '1.5px solid #3D7A52' : '1.5px solid #C8B89A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {t.done && <span style={{ color: 'white', fontSize: '9px' }}>✓</span>}
                </div>
                <div style={{ flex: 1, fontSize: '13px', color: t.done ? '#9C856A' : '#2B2318', textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</div>
                {t.scheduled_time && <span style={{ fontSize: '11px', color: '#9C856A', fontFamily: 'JetBrains Mono, monospace' }}>{t.scheduled_time}</span>}
              </div>
            ))}
          </div>
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
        </div>
        <div style={card}>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9C856A', marginBottom: '14px' }}>Recent Trades</div>
          {trades.length === 0 && <div style={{ fontSize: '13px', color: '#9C856A' }}>No trades logged yet.</div>}
          {trades.map((t, i) => (
            <div key={t.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: '10px', alignItems: 'center', padding: '9px 0', borderBottom: i < trades.length - 1 ? '1px solid #C8B89A' : 'none' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '5px', background: t.side === 'LONG' ? '#D4EAD8' : '#F5DACE', color: t.side === 'LONG' ? '#2A5E38' : '#7A2E18' }}>{t.side}</span>
              <div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: 600, color: '#2B2318' }}>{t.pair}</div>
                <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '2px' }}>{t.notes}</div>
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#9C856A' }}>{t.date}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 700, color: t.pnl_r >= 0 ? '#3D7A52' : '#9B3A28', minWidth: '52px', textAlign: 'right' }}>{t.pnl_r > 0 ? '+' : ''}{t.pnl_r}R</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
export default Dashboard
