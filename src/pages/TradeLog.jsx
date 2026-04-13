import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

const PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT', 'Other']

function calcR(side, entry, exit, stop) {
  const e = parseFloat(entry), x = parseFloat(exit), s = parseFloat(stop)
  if (!e || !x || !s) return ''
  const risk = side === 'LONG' ? e - s : s - e
  const reward = side === 'LONG' ? x - e : e - x
  if (risk <= 0) return ''
  return (reward / risk).toFixed(2)
}

function TradeLog() {
  const [trades, setTrades] = useState([])
  const [showing, setShowing] = useState(false)
  const [form, setForm] = useState({ pair: 'BTC/USDT', side: 'LONG', entry_price: '', exit_price: '', stop_price: '', pnl_r: '', notes: '', date: new Date().toISOString().split('T')[0] })

  useEffect(() => { fetchTrades() }, [])

  const fetchTrades = async () => {
    const { data } = await supabase.from('trades').select('*').order('date', { ascending: false })
    if (data) setTrades(data)
  }

  const updateForm = (field, value) => {
    const updated = { ...form, [field]: value }
    const auto = calcR(updated.side, updated.entry_price, updated.exit_price, updated.stop_price)
    if (auto !== '') updated.pnl_r = auto
    setForm(updated)
  }

  const saveTrade = async () => {
    if (!form.pair || !form.side || !form.pnl_r) return
    await supabase.from('trades').insert([{ pair: form.pair, side: form.side, entry_price: parseFloat(form.entry_price) || null, exit_price: parseFloat(form.exit_price) || null, pnl_r: parseFloat(form.pnl_r), notes: form.notes, date: form.date }])
    setForm({ pair: 'BTC/USDT', side: 'LONG', entry_price: '', exit_price: '', stop_price: '', pnl_r: '', notes: '', date: new Date().toISOString().split('T')[0] })
    setShowing(false)
    fetchTrades()
  }

  const deleteTrade = async (id) => {
    await supabase.from('trades').delete().eq('id', id)
    setTrades(trades.filter(t => t.id !== id))
  }

  const input = { background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#2B2318', width: '100%', outline: 'none', fontFamily: 'DM Sans, sans-serif' }
  const label = { fontSize: '11px', fontWeight: 600, color: '#9C856A', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '5px', display: 'block' }
  const autoR = calcR(form.side, form.entry_price, form.exit_price, form.stop_price)

  return (
    <div>
      <div style={{ background: '#EDE4D3', borderBottom: '1px solid #C8B89A', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'Lora, serif', fontSize: '16px', fontWeight: 600, color: '#2B2318' }}>Trade Log</div>
          <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '2px' }}>{trades.length} trades logged</div>
        </div>
        <button onClick={() => setShowing(!showing)} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>+ New Trade</button>
      </div>
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {showing && (
          <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontFamily: 'Lora, serif', fontSize: '14px', fontWeight: 600, color: '#2B2318', marginBottom: '16px' }}>Log a Trade</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div><label style={label}>Pair</label><select value={form.pair} onChange={e => updateForm('pair', e.target.value)} style={input}>{PAIRS.map(p => <option key={p}>{p}</option>)}</select></div>
              <div><label style={label}>Side</label><select value={form.side} onChange={e => updateForm('side', e.target.value)} style={input}><option>LONG</option><option>SHORT</option></select></div>
              <div><label style={label}>Date</label><input type="date" value={form.date} onChange={e => updateForm('date', e.target.value)} style={input} /></div>
              <div><label style={label}>Entry Price</label><input type="number" placeholder="0.00" value={form.entry_price} onChange={e => updateForm('entry_price', e.target.value)} style={input} /></div>
              <div><label style={label}>Stop Loss</label><input type="number" placeholder="0.00" value={form.stop_price} onChange={e => updateForm('stop_price', e.target.value)} style={input} /></div>
              <div><label style={label}>Exit Price</label><input type="number" placeholder="0.00" value={form.exit_price} onChange={e => updateForm('exit_price', e.target.value)} style={input} /></div>
            </div>
            <div style={{ background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '8px', padding: '12px 16px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#9C856A', fontWeight: 600 }}>CALCULATED R</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '20px', fontWeight: 700, color: autoR >= 0 ? '#3D7A52' : '#9B3A28' }}>{autoR !== '' ? (autoR > 0 ? '+' : '') + autoR + 'R' : '— fill in prices above'}</span>
            </div>
            <div style={{ marginBottom: '12px' }}><label style={label}>Notes</label><textarea placeholder="What happened? Why did you take this trade?" value={form.notes} onChange={e => updateForm('notes', e.target.value)} style={{ ...input, height: '80px', resize: 'vertical' }} /></div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={saveTrade} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>Save Trade</button>
              <button onClick={() => setShowing(false)} style={{ background: 'transparent', border: '1px solid #C8B89A', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, color: '#9C856A', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}
        <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', overflow: 'hidden' }}>
          {trades.length === 0 && <div style={{ padding: '24px', fontSize: '13px', color: '#9C856A' }}>No trades logged yet.</div>}
          {trades.map((t, i) => (
            <div key={t.id} style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr auto auto auto', gap: '12px', alignItems: 'center', padding: '12px 18px', borderBottom: i < trades.length - 1 ? '1px solid #C8B89A' : 'none', background: i % 2 === 0 ? '#EDE4D3' : '#E8DEC8' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '5px', background: t.side === 'LONG' ? '#D4EAD8' : '#F5DACE', color: t.side === 'LONG' ? '#2A5E38' : '#7A2E18' }}>{t.side}</span>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: 600, color: '#2B2318', minWidth: '80px' }}>{t.pair}</div>
              <div style={{ fontSize: '12px', color: '#9C856A' }}>{t.notes || '—'}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#9C856A' }}>{t.date}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 700, color: t.pnl_r >= 0 ? '#3D7A52' : '#9B3A28', minWidth: '52px', textAlign: 'right' }}>{t.pnl_r > 0 ? '+' : ''}{t.pnl_r}R</div>
              <button onClick={() => deleteTrade(t.id)} style={{ background: 'transparent', border: 'none', color: '#C8B89A', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}>x</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
export default TradeLog
