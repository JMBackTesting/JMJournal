import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

const PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'HYPE/USDT', 'Other']

const emptyForm = {
  pair: 'BTC/USDT', side: 'LONG', entry_price: '', exit_price: '', stop_price: '',
  pnl_r: '', pnl_usd: '', risk_usd: '', notes: '', emotion: '', setup: '', mistake: '',
  trade_time: '', exit_time: '', exit_date: '',
  date: new Date().toISOString().split('T')[0]
}

function calcRFromDollars(pnlUsd, riskUsd) {
  const p = parseFloat(pnlUsd), r = parseFloat(riskUsd)
  if (!p || !r || r <= 0) return null
  return (p / r).toFixed(2)
}

function TradeLog() {
  const [trades, setTrades] = useState([])
  const [journalEntries, setJournalEntries] = useState([])
  const [showing, setShowing] = useState(false)
  const [expandedTrade, setExpandedTrade] = useState(null)
  const [editingTrade, setEditingTrade] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [partialForms, setPartialForms] = useState({})
  const [showPartialForm, setShowPartialForm] = useState({})
  const [form, setForm] = useState(emptyForm)
  const [linkingId, setLinkingId] = useState(null)

  useEffect(() => {
    fetchTrades()
    supabase.from('journal_entries').select('*').order('created_at', { ascending: false }).then(({ data }) => data && setJournalEntries(data))
  }, [])

  const fetchTrades = async () => {
    const { data } = await supabase.from('trades').select('*').order('date', { ascending: false })
    if (data) setTrades(data)
  }

  const updateForm = (field, value) => {
    const updated = { ...form, [field]: value }
    const autoR = calcRFromDollars(
      field === 'pnl_usd' ? value : updated.pnl_usd,
      field === 'risk_usd' ? value : updated.risk_usd
    )
    if (autoR !== null) updated.pnl_r = autoR
    setForm(updated)
  }

  const getTotalPnlUsd = (trade) => {
    const partials = trade.partials || []
    const partialTotal = partials.reduce((sum, p) => sum + (parseFloat(p.pnl_usd) || 0), 0)
    const mainPnl = parseFloat(trade.pnl_usd) || 0
    return partialTotal > 0 ? partialTotal + mainPnl : mainPnl
  }

  const recalcR = async (trade, newPartials) => {
    const partialTotal = newPartials.reduce((sum, p) => sum + (parseFloat(p.pnl_usd) || 0), 0)
    const mainPnl = parseFloat(trade.pnl_usd) || 0
    const totalPnl = partialTotal + mainPnl
    const risk = parseFloat(trade.risk_usd)
    if (risk > 0 && (partialTotal > 0 || mainPnl !== 0)) {
      const newR = (totalPnl / risk).toFixed(2)
      await supabase.from('trades').update({ partials: newPartials, pnl_r: parseFloat(newR) }).eq('id', trade.id)
    } else {
      await supabase.from('trades').update({ partials: newPartials }).eq('id', trade.id)
    }
  }

  const saveTrade = async () => {
    if (!form.pair || !form.side) return
    const riskUsd = parseFloat(form.risk_usd) || null
    const pnlUsd = parseFloat(form.pnl_usd) || null
    let pnlR = parseFloat(form.pnl_r) || 0
    if (riskUsd && pnlUsd) pnlR = parseFloat((pnlUsd / riskUsd).toFixed(2))
    await supabase.from('trades').insert([{
      pair: form.pair, side: form.side,
      entry_price: parseFloat(form.entry_price) || null,
      exit_price: parseFloat(form.exit_price) || null,
      stop_price: parseFloat(form.stop_price) || null,
      pnl_r: pnlR,
      pnl_usd: pnlUsd,
      risk_usd: riskUsd,
      notes: form.notes,
      emotion: form.emotion || null,
      setup: form.setup || null,
      mistake: form.mistake || null,
      trade_time: form.trade_time || null,
      exit_time: form.exit_time || null,
      exit_date: form.exit_date || null,
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
      risk_usd: t.risk_usd ?? '',
      entry_price: t.entry_price ?? '',
      stop_price: t.stop_price ?? '',
      exit_price: t.exit_price ?? '',
      notes: t.notes ?? '',
      emotion: t.emotion ?? '',
      setup: t.setup ?? '',
      mistake: t.mistake ?? '',
      trade_time: t.trade_time ?? '',
      exit_time: t.exit_time ?? '',
      exit_date: t.exit_date ?? '',
    })
  }

  const saveEdit = async (trade) => {
    const riskUsd = parseFloat(editForm.risk_usd) || null
    const pnlUsd = parseFloat(editForm.pnl_usd) || null
    let pnlR = parseFloat(editForm.pnl_r) || 0
    if (riskUsd && pnlUsd) pnlR = parseFloat((pnlUsd / riskUsd).toFixed(2))
    await supabase.from('trades').update({
      pnl_r: pnlR,
      pnl_usd: pnlUsd,
      risk_usd: riskUsd,
      entry_price: parseFloat(editForm.entry_price) || null,
      stop_price: parseFloat(editForm.stop_price) || null,
      exit_price: parseFloat(editForm.exit_price) || null,
      notes: editForm.notes,
      emotion: editForm.emotion || null,
      setup: editForm.setup || null,
      mistake: editForm.mistake || null,
      trade_time: editForm.trade_time || null,
      exit_time: editForm.exit_time || null,
      exit_date: editForm.exit_date || null,
    }).eq('id', trade.id)
    setEditingTrade(null)
    fetchTrades()
  }

  const deleteTrade = async (id) => {
    await supabase.from('trades').delete().eq('id', id)
    setTrades(trades.filter(t => t.id !== id))
  }

  const linkToJournal = async (tradeId, journalEntryId) => {
    await supabase.from('trades').update({ journal_entry_id: journalEntryId || null }).eq('id', tradeId)
    setLinkingId(null)
    fetchTrades()
  }

  const addPartial = async (trade) => {
    const pForm = partialForms[trade.id] || {}
    if (!pForm.pnl_usd) return
    const existing = trade.partials || []
    const newPartials = [...existing, {
      pnl_usd: parseFloat(pForm.pnl_usd),
      note: pForm.note || '',
      date: new Date().toISOString().split('T')[0]
    }]
    await recalcR(trade, newPartials)
    setPartialForms(prev => ({ ...prev, [trade.id]: {} }))
    setShowPartialForm(prev => ({ ...prev, [trade.id]: false }))
    fetchTrades()
  }

  const deletePartial = async (trade, index) => {
    const newPartials = (trade.partials || []).filter((_, i) => i !== index)
    await recalcR(trade, newPartials)
    fetchTrades()
  }

  const input = { background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#2B2318', width: '100%', outline: 'none', fontFamily: 'DM Sans, sans-serif' }
  const label = { fontSize: '11px', fontWeight: 600, color: '#9C856A', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '5px', display: 'block' }
  const autoR = calcRFromDollars(form.pnl_usd, form.risk_usd)

  const getLinkedEntry = (trade) => {
    if (!trade.journal_entry_id) return null
    return journalEntries.find(j => j.id === trade.journal_entry_id)
  }

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
              <div><label style={label}>Entry Date</label><input type="date" value={form.date} onChange={e => updateForm('date', e.target.value)} style={input} /></div>
              <div><label style={label}>Entry Price</label><input type="number" placeholder="0.00" value={form.entry_price} onChange={e => updateForm('entry_price', e.target.value)} style={input} /></div>
              <div><label style={label}>Stop Loss</label><input type="number" placeholder="0.00" value={form.stop_price} onChange={e => updateForm('stop_price', e.target.value)} style={input} /></div>
              <div><label style={label}>Exit Price</label><input type="number" placeholder="0.00" value={form.exit_price} onChange={e => updateForm('exit_price', e.target.value)} style={input} /></div>
            </div>

            <div style={{ background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>P&L</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={label}>$ Risk (max you could lose)</label>
                  <input type="number" placeholder="e.g. 100" value={form.risk_usd} onChange={e => updateForm('risk_usd', e.target.value)} style={input} />
                </div>
                <div>
                  <label style={label}>$ P&L (net after cuts/fees)</label>
                  <input type="number" placeholder="e.g. 250 or -100" value={form.pnl_usd} onChange={e => updateForm('pnl_usd', e.target.value)} style={input} />
                </div>
              </div>
              <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#9C856A', fontWeight: 600 }}>CALCULATED R</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '20px', fontWeight: 700, color: autoR !== null ? (parseFloat(autoR) >= 0 ? '#3D7A52' : '#9B3A28') : '#C8B89A' }}>
                  {autoR !== null ? (parseFloat(autoR) > 0 ? '+' : '') + autoR + 'R' : '— enter $ risk and $ P&L above'}
                </span>
              </div>
            </div>

            <div style={{ background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>Entry</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><label style={label}>Entry Date</label><input type="date" value={form.date} onChange={e => updateForm('date', e.target.value)} style={input} /></div>
                <div><label style={label}>Entry Time</label><input type="time" value={form.trade_time} onChange={e => updateForm('trade_time', e.target.value)} style={input} /></div>
              </div>
            </div>

            <div style={{ background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>Exit</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><label style={label}>Exit Date</label><input type="date" value={form.exit_date} onChange={e => updateForm('exit_date', e.target.value)} style={input} /></div>
                <div><label style={label}>Exit Time</label><input type="time" value={form.exit_time} onChange={e => updateForm('exit_time', e.target.value)} style={input} /></div>
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={label}>Notes</label>
              <textarea placeholder="What happened?" value={form.notes} onChange={e => updateForm('notes', e.target.value)} style={{ ...input, height: '38px', resize: 'none' }} />
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
            const linkedEntry = getLinkedEntry(t)
            const isLinking = linkingId === t.id
            const totalPnlUsd = getTotalPnlUsd(t)
            const partialTotal = partials.reduce((sum, p) => sum + (parseFloat(p.pnl_usd) || 0), 0)

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
                    {linkedEntry && <span style={{ fontSize: '10px', background: '#E6D4F0', border: '1px solid #9A6AC8', borderRadius: '99px', padding: '1px 7px', color: '#5A1A7A' }}>📋 {JSON.parse(linkedEntry.content || '{}').pair || linkedEntry.title}</span>}
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#9C856A' }}>{t.date}</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 700, color: t.pnl_r >= 0 ? '#3D7A52' : '#9B3A28', minWidth: '45px', textAlign: 'right' }}>{t.pnl_r > 0 ? '+' : ''}{t.pnl_r}R</div>
                  {totalPnlUsd !== 0 && <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 700, color: totalPnlUsd >= 0 ? '#3D7A52' : '#9B3A28', minWidth: '60px', textAlign: 'right' }}>{totalPnlUsd > 0 ? '+$' : '-$'}{Math.abs(totalPnlUsd).toFixed(0)}</div>}
                  <button onClick={e => { e.stopPropagation(); deleteTrade(t.id) }} style={{ background: 'transparent', border: 'none', color: '#C8B89A', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}>x</button>
                </div>

                {isExpanded && !isEditing && (
                  <div style={{ background: '#F5EFE4', borderTop: '1px solid #C8B89A', padding: '16px 18px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
                      {[
                        { label: 'Entry', value: t.entry_price },
                        { label: 'Stop', value: t.stop_price },
                        { label: 'Exit', value: t.exit_price },
                        { label: '$ Risk', value: t.risk_usd ? '$' + t.risk_usd : '—', color: '#9B3A28' },
                      ].map(s => (
                        <div key={s.label} style={{ background: '#EDE4D3', borderRadius: '8px', padding: '10px 12px', border: '1px solid #C8B89A' }}>
                          <div style={{ fontSize: '10px', color: '#9C856A', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>{s.label}</div>
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 700, color: s.color || '#2B2318' }}>{s.value || '—'}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                      <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '8px', padding: '10px 12px' }}>
                        <div style={{ fontSize: '10px', color: '#9C856A', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>R</div>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '18px', fontWeight: 700, color: t.pnl_r >= 0 ? '#3D7A52' : '#9B3A28' }}>{t.pnl_r > 0 ? '+' : ''}{t.pnl_r}R</div>
                        {t.risk_usd && <div style={{ fontSize: '10px', color: '#9C856A', marginTop: '2px' }}>based on ${t.risk_usd} risk</div>}
                      </div>
                      <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '8px', padding: '10px 12px' }}>
                        <div style={{ fontSize: '10px', color: '#9C856A', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Total $ P&L</div>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '18px', fontWeight: 700, color: totalPnlUsd >= 0 ? '#3D7A52' : '#9B3A28' }}>{totalPnlUsd > 0 ? '+$' : '-$'}{Math.abs(totalPnlUsd).toFixed(2)}</div>
                        {partialTotal > 0 && <div style={{ fontSize: '10px', color: '#9C856A', marginTop: '2px' }}>${partialTotal.toFixed(2)} from partials</div>}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                      <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '8px', padding: '10px 12px' }}>
                        <div style={{ fontSize: '10px', color: '#9C856A', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Entry</div>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: '#2B2318' }}>
                          {t.date}{t.trade_time && <span style={{ color: '#9C856A', marginLeft: '8px' }}>{t.trade_time.slice(0, 5)}</span>}
                        </div>
                      </div>
                      <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '8px', padding: '10px 12px' }}>
                        <div style={{ fontSize: '10px', color: '#9C856A', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Exit</div>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: '#2B2318' }}>
                          {t.exit_date || t.date}{t.exit_time && <span style={{ color: '#9C856A', marginLeft: '8px' }}>{t.exit_time.slice(0, 5)}</span>}
                        </div>
                      </div>
                    </div>

                    {(t.emotion || t.setup || t.mistake) && (
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                        {t.emotion && <div style={{ background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: '#5A4535' }}><span style={{ fontWeight: 700, color: '#9C856A', fontSize: '10px', textTransform: 'uppercase', marginRight: '6px' }}>Emotion</span>{t.emotion}</div>}
                        {t.setup && <div style={{ background: '#F5E6C8', border: '1px solid #C8903A', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: '#7A4F1A' }}><span style={{ fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', marginRight: '6px' }}>Setup</span>{t.setup}</div>}
                        {t.mistake && <div style={{ background: '#F5DACE', border: '1px solid #C87055', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: '#7A2E18' }}><span style={{ fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', marginRight: '6px' }}>Mistake</span>{t.mistake}</div>}
                      </div>
                    )}

                    {linkedEntry && (
                      <div style={{ background: '#E6D4F0', border: '1px solid #9A6AC8', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#5A1A7A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Linked Journal Entry</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 700, color: '#2B2318' }}>{JSON.parse(linkedEntry.content || '{}').pair}</div>
                          <div style={{ fontSize: '12px', color: '#5A1A7A' }}>{JSON.parse(linkedEntry.content || '{}').reasoning?.slice(0, 60) || '—'}</div>
                          <button onClick={() => linkToJournal(t.id, null)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', fontSize: '11px', color: '#9A6AC8', cursor: 'pointer', textDecoration: 'underline' }}>Unlink</button>
                        </div>
                      </div>
                    )}

                    {isLinking && (
                      <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Link to Journal Entry</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                          {journalEntries.map(j => {
                            const jd = JSON.parse(j.content || '{}')
                            return (
                              <div key={j.id} onClick={() => linkToJournal(t.id, j.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: t.journal_entry_id === j.id ? '#E6D4F0' : '#F5EFE4', border: t.journal_entry_id === j.id ? '1px solid #9A6AC8' : '1px solid #C8B89A', borderRadius: '8px', cursor: 'pointer' }}>
                                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '5px', background: jd.side === 'LONG' ? '#D4EAD8' : '#F5DACE', color: jd.side === 'LONG' ? '#2A5E38' : '#7A2E18' }}>{jd.side}</span>
                                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: 600, color: '#2B2318' }}>{jd.pair}</div>
                                <div style={{ fontSize: '11px', color: '#9C856A', flex: 1 }}>{jd.reasoning?.slice(0, 50) || '—'}</div>
                                <div style={{ fontSize: '10px', color: '#9C856A' }}>{j.date ? new Date(j.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}</div>
                              </div>
                            )
                          })}
                        </div>
                        <button onClick={() => setLinkingId(null)} style={{ marginTop: '10px', background: 'transparent', border: 'none', fontSize: '11px', color: '#9C856A', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    )}

                    {partials.length > 0 && (
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Partials</div>
                        {partials.map((p, pi) => (
                          <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', background: '#EDE4D3', borderRadius: '8px', border: '1px solid #C8B89A', marginBottom: '6px' }}>
                            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: 700, color: parseFloat(p.pnl_usd) >= 0 ? '#3D7A52' : '#9B3A28' }}>{parseFloat(p.pnl_usd) > 0 ? '+$' : '-$'}{Math.abs(parseFloat(p.pnl_usd)).toFixed(2)}</span>
                            {p.note && <span style={{ fontSize: '12px', color: '#9C856A', flex: 1 }}>{p.note}</span>}
                            <span style={{ fontSize: '10px', color: '#9C856A' }}>{p.date}</span>
                            <button onClick={() => deletePartial(t, pi)} style={{ background: 'transparent', border: 'none', color: '#C8B89A', cursor: 'pointer', fontSize: '13px' }}>x</button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', marginBottom: showPForm ? '14px' : '0', flexWrap: 'wrap' }}>
                      <button onClick={() => startEdit(t)} style={{ background: 'transparent', border: '1px solid #C8B89A', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: 600, color: '#5A4535', cursor: 'pointer' }}>✏️ Edit Trade</button>
                      {!showPForm && <button onClick={() => setShowPartialForm(prev => ({ ...prev, [t.id]: true }))} style={{ background: 'transparent', border: '1px solid #C8903A', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: 600, color: '#C8903A', cursor: 'pointer' }}>+ Add Partial</button>}
                      <button onClick={() => setLinkingId(isLinking ? null : t.id)} style={{ background: 'transparent', border: '1px solid #9A6AC8', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: 600, color: '#9A6AC8', cursor: 'pointer' }}>📋 {linkedEntry ? 'Change Link' : 'Link to Journal'}</button>
                    </div>

                    {showPForm && (
                      <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '10px', padding: '14px', marginTop: '10px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Add Partial Exit</div>
                        <div style={{ fontSize: '11px', color: '#9C856A', marginBottom: '10px' }}>Enter the net $ profit from this partial after cuts/fees</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                          <div><label style={label}>$ Profit from this partial</label><input type="number" placeholder="e.g. 45.50 or -20" value={pForm.pnl_usd || ''} onChange={e => setPartialForms(prev => ({ ...prev, [t.id]: { ...pForm, pnl_usd: e.target.value } }))} style={input} /></div>
                          <div><label style={label}>Note (optional)</label><input type="text" placeholder="e.g. took 10% at resistance" value={pForm.note || ''} onChange={e => setPartialForms(prev => ({ ...prev, [t.id]: { ...pForm, note: e.target.value } }))} style={input} /></div>
                        </div>
                        {t.risk_usd && pForm.pnl_usd && (
                          <div style={{ fontSize: '12px', color: '#9C856A', marginBottom: '10px', background: '#F5EFE4', padding: '8px 12px', borderRadius: '6px' }}>
                            This partial = <strong style={{ color: parseFloat(pForm.pnl_usd) >= 0 ? '#3D7A52' : '#9B3A28' }}>{(parseFloat(pForm.pnl_usd) / parseFloat(t.risk_usd)).toFixed(2)}R</strong> on its own
                          </div>
                        )}
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px' }}>
                      <div><label style={label}>Entry Price</label><input type="number" value={editForm.entry_price} onChange={e => setEditForm({ ...editForm, entry_price: e.target.value })} style={input} /></div>
                      <div><label style={label}>Stop Loss</label><input type="number" value={editForm.stop_price} onChange={e => setEditForm({ ...editForm, stop_price: e.target.value })} style={input} /></div>
                      <div><label style={label}>Exit Price</label><input type="number" value={editForm.exit_price} onChange={e => setEditForm({ ...editForm, exit_price: e.target.value })} style={input} /></div>
                      <div><label style={label}>Notes</label><input type="text" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} style={input} /></div>
                      <div><label style={label}>$ Risk</label><input type="number" value={editForm.risk_usd} onChange={e => setEditForm({ ...editForm, risk_usd: e.target.value })} style={input} /></div>
                      <div><label style={label}>$ P&L</label><input type="number" value={editForm.pnl_usd} onChange={e => setEditForm({ ...editForm, pnl_usd: e.target.value })} style={input} /></div>
                      <div><label style={label}>Entry Time</label><input type="time" value={editForm.trade_time} onChange={e => setEditForm({ ...editForm, trade_time: e.target.value })} style={input} /></div>
                      <div><label style={label}>Exit Time</label><input type="time" value={editForm.exit_time} onChange={e => setEditForm({ ...editForm, exit_time: e.target.value })} style={input} /></div>
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