import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

const PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'HYPE/USDT', 'Other']

function calcR(side, entry, exit, stop) {
  const e = parseFloat(entry), x = parseFloat(exit), s = parseFloat(stop)
  if (!e || !x || !s) return ''
  const risk = side === 'LONG' ? e - s : s - e
  const reward = side === 'LONG' ? x - e : e - x
  if (risk <= 0) return ''
  return (reward / risk).toFixed(2)
}

function calcWeightedR(side, entry, stop, partials) {
  if (!partials || partials.length === 0) return null
  const e = parseFloat(entry), s = parseFloat(stop)
  if (!e || !s) return null
  const risk = side === 'LONG' ? e - s : s - e
  if (risk <= 0) return null
  let totalSize = 0, weightedR = 0
  for (const p of partials) {
    const size = parseFloat(p.size), exit = parseFloat(p.exit_price)
    if (!size || !exit) continue
    const reward = side === 'LONG' ? exit - e : e - exit
    weightedR += (size / 100) * (reward / risk)
    totalSize += size
  }
  if (totalSize === 0) return null
  return weightedR.toFixed(2)
}

const emptyForm = {
  pair: 'BTC/USDT', side: 'LONG', entry_price: '', exit_price: '', stop_price: '',
  pnl_r: '', pnl_usd: '', notes: '', emotion: '', setup: '', mistake: '',
  trade_time: '',
  date: new Date().toISOString().split('T')[0]
}

function TradeLog() {
  const [trades, setTrades] = useState([])
  const [showing, setShowing] = useState(false)
  const [expandedTrade, setExpandedTrade] = useState(null)
  const [editingTrade, setEditingTrade] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [partialForms, setPartialForms] = useState({})
  const [showPartialForm, setShowPartialForm] = useState({})
  const [form, setForm] = useState(emptyForm)

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
    if (!form.pair || !form.side) return
    await supabase.from('trades').insert([{
      pair: form.pair, side: form.side,
      entry_price: parseFloat(form.entry_price) || null,
      exit_price: parseFloat(form.exit_price) || null,
      stop_price: parseFloat(form.stop_price) || null,
      pnl_r: parseFloat(form.pnl_r) || 0,
      pnl_usd: parseFloat(form.pnl_usd) || null,
      notes: form.notes,
      emotion: form.emotion || null,
      setup: form.setup || null,
      mistake: form.mistake || null,
      trade_time: form.trade_time || null,
      date: form.date,
      partials: []
    }])
    setForm(emptyForm)
    setShowing(false)
    fetchTrades()
  }

  const startEdit = (t) => {
    setEditingTrade(t.id)
    setEditForm({
      pnl_r: t.pnl_r ?? '',
      pnl_usd: t.pnl_usd ?? '',
      entry_price: t.entry_price ?? '',
      stop_price: t.stop_price ?? '',
      exit_price: t.exit_price ?? '',
      notes: t.notes ?? '',
      emotion: t.emotion ?? '',
      setup: t.setup ?? '',
      mistake: t.mistake ?? '',
      trade_time: t.trade_time ?? '',
    })
  }

  const saveEdit = async (trade) => {
    await supabase.from('trades').update({
      pnl_r: parseFloat(editForm.pnl_r) || 0,
      pnl_usd: parseFloat(editForm.pnl_usd) || null,
      entry_price: parseFloat(editForm.entry_price) || null,
      stop_price: parseFloat(editForm.stop_price) || null,
      exit_price: parseFloat(editForm.exit_price) || null,
      notes: editForm.notes,
      emotion: editForm.emotion || null,
      setup: editForm.setup || null,
      mistake: editForm.mistake || null,
      trade_time: editForm.trade_time || null,
    }).eq('id', trade.id)
    setEditingTrade(null)
    fetchTrades()
  }

  const deleteTrade = async (id) => {
    await supabase.from('trades').delete().eq('id', id)
    setTrades(trades.filter(t => t.id !== id))
  }

  const addPartial = async (trade) => {
    const pForm = partialForms[trade.id] || {}
    if (!pForm.size || !pForm.exit_price) return
    const existing = trade.partials || []
    const newPartials = [...existing, { size: parseFloat(pForm.size), exit_price: parseFloat(pForm.exit_price), note: pForm.note || '', date: new Date().toISOString().split('T')[0] }]
    const weighted = calcWeightedR(trade.side, trade.entry_price, trade.stop_price, newPartials)
    const updates = { partials: newPartials }
    if (weighted !== null) updates.pnl_r = parseFloat(weighted)
    await supabase.from('trades').update(updates).eq('id', trade.id)
    setPartialForms(prev => ({ ...prev, [trade.id]: {} }))
    setShowPartialForm(prev => ({ ...prev, [trade.id]: false }))
    fetchTrades()
  }

  const deletePartial = async (trade, index) => {
    const newPartials = (trade.partials || []).filter((_, i) => i !== index)
    const weighted = calcWeightedR(trade.side, trade.entry_price, trade.stop_price, newPartials)
    const updates = { partials: newPartials }
    if (weighted !== null) updates.pnl_r = parseFloat(weighted)
    await supabase.from('trades').update(updates).eq('id', trade.id)
    fetchTrades()
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
              <div>
                <label style={label}>Pair</label>
                <select value={PAIRS.includes(form.pair) ? form.pair : 'Other'} onChange={e => updateForm('pair', e.target.value === 'Other' ? '' : e.target.value)} style={input}>
                  {PAIRS.map(p => <option key={p}>{p}</option>)}
                </select>
                {(!PAIRS.includes(form.pair) || form.pair === '') && <input type="text" placeholder="Type ticker e.g. PEPE/USDT" value={form.pair} onChange={e => updateForm('pair', e.target.value)} style={{ ...input, marginTop: '6px' }} />}
              </div>
              <div><label style={label}>Side</label><select value={form.side} onChange={e => updateForm('side', e.target.value)} style={input}><option>LONG</option><option>SHORT</option></select></div>
              <div><label style={label}>Date</label><input type="date" value={form.date} onChange={e => updateForm('date', e.target.value)} style={input} /></div>
              <div><label style={label}>Entry Price</label><input type="number" placeholder="0.00" value={form.entry_price} onChange={e => updateForm('entry_price', e.target.value)} style={input} /></div>
              <div><label style={label}>Stop Loss</label><input type="number" placeholder="0.00" value={form.stop_price} onChange={e => updateForm('stop_price', e.target.value)} style={input} /></div>
              <div><label style={label}>Exit Price</label><input type="number" placeholder="0.00" value={form.exit_price} onChange={e => updateForm('exit_price', e.target.value)} style={input} /></div>
            </div>

            <div style={{ background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '8px', padding: '12px 16px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#9C856A', fontWeight: 600 }}>CALCULATED R</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '20px', fontWeight: 700, color: parseFloat(autoR) >= 0 ? '#3D7A52' : '#9B3A28' }}>
                {autoR !== '' ? (parseFloat(autoR) > 0 ? '+' : '') + autoR + 'R' : '— fill in prices above'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={label}>$ P&L</label>
                <input type="number" placeholder="e.g. 250 or -120" value={form.pnl_usd} onChange={e => updateForm('pnl_usd', e.target.value)} style={input} />
              </div>
              <div>
                <label style={label}>Trade Time</label>
                <input type="time" value={form.trade_time} onChange={e => updateForm('trade_time', e.target.value)} style={input} />
              </div>
              <div>
                <label style={label}>Notes</label>
                <textarea placeholder="What happened?" value={form.notes} onChange={e => updateForm('notes', e.target.value)} style={{ ...input, height: '38px', resize: 'none' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={label}>Emotion</label>
                <select value={form.emotion} onChange={e => updateForm('emotion', e.target.value)} style={input}>
                  <option value="">Select...</option>
                  <option>Calm</option><option>Confident</option><option>Anxious</option>
                  <option>FOMO</option><option>Revenge</option><option>Bored</option>
                  <option>Frustrated</option><option>Overconfident</option>
                </select>
              </div>
              <div>
                <label style={label}>Setup</label>
                <select value={form.setup} onChange={e => updateForm('setup', e.target.value)} style={input}>
                  <option value="">Select...</option>
                  <option>Breakout</option><option>Retest</option><option>Reversal</option>
                  <option>Range</option><option>Trend Follow</option><option>Liquidity Grab</option>
                  <option>News</option><option>Other</option>
                </select>
              </div>
              <div>
                <label style={label}>Mistake</label>
                <select value={form.mistake} onChange={e => updateForm('mistake', e.target.value)} style={input}>
                  <option value="">None</option>
                  <option>Early Entry</option><option>Late Entry</option><option>Wrong Size</option>
                  <option>Moved Stop</option><option>No Plan</option><option>Overtraded</option>
                  <option>Chased</option><option>Ignored Signal</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={saveTrade} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>Save Trade</button>
              <button onClick={() => setShowing(false)} style={{ background: 'transparent', border: '1px solid #C8B89A', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, color: '#9C856A', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', overflow: 'hidden' }}>
          {trades.length === 0 && <div style={{ padding: '24px', fontSize: '13px', color: '#9C856A' }}>No trades logged yet.</div>}
          {trades.map((t, i) => {
            const isExpanded = expandedTrade === t.id
            const isEditing = editingTrade === t.id
            const partials = t.partials || []
            const pForm = partialForms[t.id] || {}
            const showPForm = showPartialForm[t.id] || false
            return (
              <div key={t.id} style={{ borderBottom: i < trades.length - 1 ? '1px solid #C8B89A' : 'none' }}>
                <div onClick={() => { if (!isEditing) setExpandedTrade(isExpanded ? null : t.id) }} style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr auto auto auto auto', gap: '12px', alignItems: 'center', padding: '12px 18px', background: i % 2 === 0 ? '#EDE4D3' : '#E8DEC8', cursor: 'pointer' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '5px', background: t.side === 'LONG' ? '#D4EAD8' : '#F5DACE', color: t.side === 'LONG' ? '#2A5E38' : '#7A2E18' }}>{t.side}</span>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: 600, color: '#2B2318', minWidth: '80px' }}>{t.pair}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '12px', color: '#9C856A' }}>{t.notes || '—'}</div>
                    {t.emotion && <span style={{ fontSize: '10px', background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '99px', padding: '1px 7px', color: '#5A4535' }}>{t.emotion}</span>}
                    {t.setup && <span style={{ fontSize: '10px', background: '#F5E6C8', border: '1px solid #C8903A', borderRadius: '99px', padding: '1px 7px', color: '#7A4F1A' }}>{t.setup}</span>}
                    {t.mistake && <span style={{ fontSize: '10px', background: '#F5DACE', border: '1px solid #C87055', borderRadius: '99px', padding: '1px 7px', color: '#7A2E18' }}>{t.mistake}</span>}
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#9C856A' }}>{t.trade_time ? t.trade_time.slice(0, 5) : t.date}</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 700, color: t.pnl_r >= 0 ? '#3D7A52' : '#9B3A28', minWidth: '45px', textAlign: 'right' }}>{t.pnl_r > 0 ? '+' : ''}{t.pnl_r}R</div>
                  {t.pnl_usd != null && <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 700, color: t.pnl_usd >= 0 ? '#3D7A52' : '#9B3A28', minWidth: '60px', textAlign: 'right' }}>{t.pnl_usd > 0 ? '+$' : '-$'}{Math.abs(t.pnl_usd).toFixed(0)}</div>}
                  <button onClick={e => { e.stopPropagation(); deleteTrade(t.id) }} style={{ background: 'transparent', border: 'none', color: '#C8B89A', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}>x</button>
                </div>

                {isExpanded && !isEditing && (
                  <div style={{ background: '#F5EFE4', borderTop: '1px solid #C8B89A', padding: '16px 18px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '16px' }}>
                      {[
                        { label: 'Entry', value: t.entry_price },
                        { label: 'Stop', value: t.stop_price },
                        { label: 'Exit', value: t.exit_price },
                        { label: 'R', value: (t.pnl_r > 0 ? '+' : '') + t.pnl_r + 'R', color: t.pnl_r >= 0 ? '#3D7A52' : '#9B3A28' },
                        { label: '$ P&L', value: t.pnl_usd != null ? (t.pnl_usd > 0 ? '+$' : '-$') + Math.abs(t.pnl_usd).toFixed(2) : '—', color: t.pnl_usd != null ? (t.pnl_usd >= 0 ? '#3D7A52' : '#9B3A28') : '#9C856A' },
                      ].map(s => (
                        <div key={s.label} style={{ background: '#EDE4D3', borderRadius: '8px', padding: '10px 12px', border: '1px solid #C8B89A' }}>
                          <div style={{ fontSize: '10px', color: '#9C856A', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>{s.label}</div>
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 700, color: s.color || '#2B2318' }}>{s.value || '—'}</div>
                        </div>
                      ))}
                    </div>

                    {(t.trade_time || t.date) && (
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                        <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: '#5A4535' }}>
                          <span style={{ fontWeight: 700, color: '#9C856A', fontSize: '10px', textTransform: 'uppercase', marginRight: '6px' }}>Date</span>{t.date}
                          {t.trade_time && <span style={{ marginLeft: '10px' }}><span style={{ fontWeight: 700, color: '#9C856A', fontSize: '10px', textTransform: 'uppercase', marginRight: '6px' }}>Time</span>{t.trade_time.slice(0,5)}</span>}
                        </div>
                      </div>
                    )}

                    {(t.emotion || t.setup || t.mistake) && (
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                        {t.emotion && <div style={{ background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: '#5A4535' }}><span style={{ fontWeight: 700, color: '#9C856A', fontSize: '10px', textTransform: 'uppercase', marginRight: '6px' }}>Emotion</span>{t.emotion}</div>}
                        {t.setup && <div style={{ background: '#F5E6C8', border: '1px solid #C8903A', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: '#7A4F1A' }}><span style={{ fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', marginRight: '6px' }}>Setup</span>{t.setup}</div>}
                        {t.mistake && <div style={{ background: '#F5DACE', border: '1px solid #C87055', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: '#7A2E18' }}><span style={{ fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', marginRight: '6px' }}>Mistake</span>{t.mistake}</div>}
                      </div>
                    )}

                    {partials.length > 0 && (
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Partials</div>
                        {partials.map((p, pi) => (
                          <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', background: '#EDE4D3', borderRadius: '8px', border: '1px solid #C8B89A', marginBottom: '6px' }}>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: 700, color: '#C8903A' }}>{p.size}%</span>
                            <span style={{ fontSize: '12px', color: '#9C856A' }}>exited at</span>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: 600, color: '#2B2318' }}>{p.exit_price}</span>
                            {p.note && <span style={{ fontSize: '12px', color: '#9C856A', flex: 1 }}>{p.note}</span>}
                            <button onClick={() => deletePartial(t, pi)} style={{ background: 'transparent', border: 'none', color: '#C8B89A', cursor: 'pointer', fontSize: '13px' }}>x</button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', marginBottom: showPForm ? '14px' : '0' }}>
                      <button onClick={() => startEdit(t)} style={{ background: 'transparent', border: '1px solid #C8B89A', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: 600, color: '#5A4535', cursor: 'pointer' }}>✏️ Edit Trade</button>
                      {!showPForm && <button onClick={() => setShowPartialForm(prev => ({ ...prev, [t.id]: true }))} style={{ background: 'transparent', border: '1px solid #C8903A', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: 600, color: '#C8903A', cursor: 'pointer' }}>+ Add Partial</button>}
                    </div>

                    {showPForm && (
                      <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '10px', padding: '14px', marginTop: '10px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Add Partial Exit</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                          <div><label style={label}>Size %</label><input type="number" placeholder="e.g. 20" value={pForm.size || ''} onChange={e => setPartialForms(prev => ({ ...prev, [t.id]: { ...pForm, size: e.target.value } }))} style={input} /></div>
                          <div><label style={label}>Exit Price</label><input type="number" placeholder="0.00" value={pForm.exit_price || ''} onChange={e => setPartialForms(prev => ({ ...prev, [t.id]: { ...pForm, exit_price: e.target.value } }))} style={input} /></div>
                          <div><label style={label}>Note (optional)</label><input type="text" placeholder="e.g. took profit at S/R" value={pForm.note || ''} onChange={e => setPartialForms(prev => ({ ...prev, [t.id]: { ...pForm, note: e.target.value } }))} style={input} /></div>
                        </div>
                        <div style={{ fontSize: '11px', color: '#9C856A', marginBottom: '10px' }}>Stop loss used for R calc: <strong>{t.stop_price || 'not set'}</strong></div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => addPartial(t)} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>Save Partial</button>
                          <button onClick={() => setShowPartialForm(prev => ({ ...prev, [t.id]: false }))} style={{ background: 'transparent', border: '1px solid #C8B89A', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: '#9C856A', cursor: 'pointer' }}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isEditing && (
                  <div style={{ background: '#F5EFE4', borderTop: '1px solid #C8B89A', padding: '16px 18px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>Edit Trade</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
                      <div><label style={label}>Entry Price</label><input type="number" value={editForm.entry_price} onChange={e => setEditForm({ ...editForm, entry_price: e.target.value })} style={input} /></div>
                      <div><label style={label}>Stop Loss</label><input type="number" value={editForm.stop_price} onChange={e => setEditForm({ ...editForm, stop_price: e.target.value })} style={input} /></div>
                      <div><label style={label}>Exit Price</label><input type="number" value={editForm.exit_price} onChange={e => setEditForm({ ...editForm, exit_price: e.target.value })} style={input} /></div>
                      <div><label style={label}>R P&L</label><input type="number" value={editForm.pnl_r} onChange={e => setEditForm({ ...editForm, pnl_r: e.target.value })} style={input} /></div>
                      <div><label style={label}>$ P&L</label><input type="number" placeholder="e.g. 250 or -120" value={editForm.pnl_usd} onChange={e => setEditForm({ ...editForm, pnl_usd: e.target.value })} style={input} /></div>
                      <div><label style={label}>Trade Time</label><input type="time" value={editForm.trade_time} onChange={e => setEditForm({ ...editForm, trade_time: e.target.value })} style={input} /></div>
                      <div><label style={label}>Notes</label><input type="text" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} style={input} /></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                      <div>
                        <label style={label}>Emotion</label>
                        <select value={editForm.emotion} onChange={e => setEditForm({ ...editForm, emotion: e.target.value })} style={input}>
                          <option value="">Select...</option>
                          <option>Calm</option><option>Confident</option><option>Anxious</option>
                          <option>FOMO</option><option>Revenge</option><option>Bored</option>
                          <option>Frustrated</option><option>Overconfident</option>
                        </select>
                      </div>
                      <div>
                        <label style={label}>Setup</label>
                        <select value={editForm.setup} onChange={e => setEditForm({ ...editForm, setup: e.target.value })} style={input}>
                          <option value="">Select...</option>
                          <option>Breakout</option><option>Retest</option><option>Reversal</option>
                          <option>Range</option><option>Trend Follow</option><option>Liquidity Grab</option>
                          <option>News</option><option>Other</option>
                        </select>
                      </div>
                      <div>
                        <label style={label}>Mistake</label>
                        <select value={editForm.mistake} onChange={e => setEditForm({ ...editForm, mistake: e.target.value })} style={input}>
                          <option value="">None</option>
                          <option>Early Entry</option><option>Late Entry</option><option>Wrong Size</option>
                          <option>Moved Stop</option><option>No Plan</option><option>Overtraded</option>
                          <option>Chased</option><option>Ignored Signal</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => saveEdit(t)} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>Save Changes</button>
                      <button onClick={() => setEditingTrade(null)} style={{ background: 'transparent', border: '1px solid #C8B89A', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: '#9C856A', cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
export default TradeLog