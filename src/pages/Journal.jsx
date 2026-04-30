import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase'

const PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'HYPE/USDT', 'Other']
const STATUSES = ['Active Bids', 'In Trade', 'Watching / POI', 'Rough Drawing']
const LEVERAGES = ['1x', '2x', '3x', '4x', '5x']
const TIMEFRAMES = ['Daily', 'Weekly', 'Monthly']

function getElapsed(createdAt) {
  const now = new Date()
  const start = new Date(createdAt)
  const diff = Math.max(0, now - start)
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return { days, hours, minutes }
}

function ElapsedBadge({ createdAt, expanded }) {
  const [elapsed, setElapsed] = useState(getElapsed(createdAt))
  useEffect(() => {
    const interval = setInterval(() => setElapsed(getElapsed(createdAt)), 60000)
    return () => clearInterval(interval)
  }, [createdAt])
  if (expanded) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '8px', padding: '8px 14px' }}>
        <span style={{ fontSize: '18px' }}>⏱</span>
        <div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '16px', fontWeight: 700, color: '#2B2318' }}>
            {elapsed.days > 0 ? `${elapsed.days}d ` : ''}{elapsed.hours}h {elapsed.minutes}m
          </div>
          <div style={{ fontSize: '10px', color: '#9C856A', marginTop: '1px' }}>in trade</div>
        </div>
      </div>
    )
  }
  return (
    <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: '#9C856A', background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '99px', padding: '2px 8px' }}>
      {elapsed.days > 0 ? `${elapsed.days}d ` : ''}{elapsed.hours}h
    </span>
  )
}

function Journal() {
  const [entries, setEntries] = useState([])
  const [showing, setShowing] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [expandedChart, setExpandedChart] = useState(null)
  const [chartFile, setChartFile] = useState(null)
  const [chartPreview, setChartPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ pair: 'BTC/USDT', customPair: '', side: 'LONG', entry_price: '', stop_price: '', size: '', leverage: '1x', status: 'Active Bids', reasoning: '', trend: '', conditions: '', chart_rank: '5', chart_rank_tf: 'Daily', date: new Date().toISOString().split('T')[0] })
  const fileRef = useRef()
  const pasteRef = useRef()

  useEffect(() => { fetchEntries() }, [])

  const fetchEntries = async () => {
    const { data } = await supabase.from('journal_entries').select('*').order('created_at', { ascending: false })
    if (data) setEntries(data)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setChartFile(file)
    setChartPreview(URL.createObjectURL(file))
  }

  const handlePaste = (e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image')) {
        const file = items[i].getAsFile()
        setChartFile(file)
        setChartPreview(URL.createObjectURL(file))
        break
      }
    }
  }

  const saveEntry = async () => {
    const finalPair = form.pair === 'Other' ? form.customPair : form.pair
    if (!finalPair || !form.entry_price) return
    setUploading(true)
    let chart_url = null
    if (chartFile) {
      const fileName = Date.now() + '_journal.png'
      const { error } = await supabase.storage.from('charts').upload(fileName, chartFile)
      if (!error) {
        const { data: urlData } = supabase.storage.from('charts').getPublicUrl(fileName)
        chart_url = urlData.publicUrl
      }
    }
    await supabase.from('journal_entries').insert([{
      title: finalPair + ' ' + form.side,
      content: JSON.stringify({ pair: finalPair, side: form.side, entry_price: form.entry_price, stop_price: form.stop_price, size: form.size, leverage: form.leverage, status: form.status, reasoning: form.reasoning, trend: form.trend, conditions: form.conditions, chart_rank: form.chart_rank, chart_rank_tf: form.chart_rank_tf, chart_url }),
      date: form.date,
      mood: form.status,
      tags: [finalPair, form.side, form.status]
    }])
    setForm({ pair: 'BTC/USDT', customPair: '', side: 'LONG', entry_price: '', stop_price: '', size: '', leverage: '1x', status: 'Active Bids', reasoning: '', trend: '', conditions: '', chart_rank: '5', chart_rank_tf: 'Daily', date: new Date().toISOString().split('T')[0] })
    setChartFile(null)
    setChartPreview(null)
    setUploading(false)
    setShowing(false)
    fetchEntries()
  }

  const updateStatus = async (entry, newStatus) => {
    const data = JSON.parse(entry.content || '{}')
    await supabase.from('journal_entries').update({
      content: JSON.stringify({ ...data, status: newStatus }),
      mood: newStatus,
      tags: [...(entry.tags || []).filter(t => !STATUSES.includes(t) && t !== 'Closed' && t !== 'Active' && t !== 'Watching' && t !== 'Partial'), newStatus]
    }).eq('id', entry.id)
    fetchEntries()
  }

  const closePosition = async (entry) => {
    const data = JSON.parse(entry.content || '{}')
    await supabase.from('journal_entries').update({
      content: JSON.stringify({ ...data, status: 'Closed' }),
      mood: 'Closed',
      tags: [...(entry.tags || []).filter(t => !STATUSES.includes(t) && t !== 'Closed' && t !== 'Active' && t !== 'Watching' && t !== 'Partial'), 'Closed']
    }).eq('id', entry.id)
    fetchEntries()
  }

  const reopenPosition = async (entry) => {
    const data = JSON.parse(entry.content || '{}')
    await supabase.from('journal_entries').update({
      content: JSON.stringify({ ...data, status: 'Active Bids' }),
      mood: 'Active Bids',
      tags: [...(entry.tags || []).filter(t => t !== 'Closed' && t !== 'Active' && t !== 'Watching' && t !== 'Partial'), 'Active Bids']
    }).eq('id', entry.id)
    fetchEntries()
  }

  const deleteEntry = async (id, content) => {
    const data = JSON.parse(content || '{}')
    if (data.chart_url) {
      const fileName = data.chart_url.split('/').pop()
      await supabase.storage.from('charts').remove([fileName])
    }
    await supabase.from('journal_entries').delete().eq('id', id)
    setEntries(entries.filter(e => e.id !== id))
  }

  const active = entries.filter(e => e.mood !== 'Closed')
  const closed = entries.filter(e => e.mood === 'Closed')

  const input = { background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#2B2318', width: '100%', outline: 'none', fontFamily: 'DM Sans, sans-serif' }
  const label = { fontSize: '11px', fontWeight: 600, color: '#9C856A', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '5px', display: 'block' }

  const statusColor = (s) => {
    if (s === 'In Trade') return { bg: '#D4EAD8', color: '#2A5E38', border: '#5DA070' }
    if (s === 'Active Bids' || s === 'Active') return { bg: '#F5E6C8', color: '#7A4F1A', border: '#C8903A' }
    if (s === 'Watching / POI' || s === 'Watching') return { bg: '#E6D4F0', color: '#5A1A7A', border: '#9A6AC8' }
    if (s === 'Rough Drawing' || s === 'Partial') return { bg: '#D4E8F0', color: '#1A4F6A', border: '#5A90B0' }
    if (s === 'Closed') return { bg: '#F1EFE8', color: '#5F5E5A', border: '#B4B2A9' }
    return { bg: '#F1EFE8', color: '#5F5E5A', border: '#B4B2A9' }
  }

  const StatusDropdown = ({ entry, currentStatus }) => {
    const sc = statusColor(currentStatus)
    const [open, setOpen] = useState(false)
    return (
      <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
        <div
          onClick={e => { e.stopPropagation(); setOpen(!open) }}
          style={{ fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', background: sc.bg, color: sc.color, border: '1.5px solid ' + sc.border, cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}
        >
          {currentStatus}
        </div>
        {open && (
          <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 100, minWidth: '140px', overflow: 'hidden' }}>
            {STATUSES.map(s => {
              const sc2 = statusColor(s)
              return (
                <div key={s} onClick={() => { updateStatus(entry, s); setOpen(false) }} style={{ padding: '8px 14px', fontSize: '11px', fontWeight: 600, color: sc2.color, background: currentStatus === s ? sc2.bg : 'transparent', cursor: 'pointer', borderBottom: '1px solid #EDE4D3' }}>
                  {s}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const renderEntry = (entry) => {
    const data = JSON.parse(entry.content || '{}')
    const currentStatus = data.status || entry.mood
    const sc = statusColor(currentStatus)
    const isExpanded = expanded === entry.id
    const isActive = entry.mood !== 'Closed'
    return (
      <div key={entry.id} style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', overflow: 'hidden' }}>
        <div onClick={() => setExpanded(isExpanded ? null : entry.id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', cursor: 'pointer' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '5px', background: data.side === 'LONG' ? '#D4EAD8' : '#F5DACE', color: data.side === 'LONG' ? '#2A5E38' : '#7A2E18' }}>{data.side}</span>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 700, color: '#2B2318' }}>{data.pair}</div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#9C856A' }}>@ {data.entry_price}</div>
          {data.leverage && data.leverage !== '1x' && <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '99px', background: '#F5DACE', color: '#7A2E18', border: '1px solid #C87055' }}>{data.leverage}</span>}
          <div style={{ flex: 1 }} />
          {isActive && entry.created_at && <ElapsedBadge createdAt={entry.created_at} expanded={false} />}
          {data.chart_url && <img src={data.chart_url} style={{ width: '48px', height: '32px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #C8B89A', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); setExpandedChart(data.chart_url) }} />}
          {data.chart_rank && <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: '#9C856A' }}>{data.chart_rank_tf} rank: <strong style={{ color: '#2B2318' }}>{data.chart_rank}/10</strong></span>}
          {isActive
            ? <StatusDropdown entry={entry} currentStatus={currentStatus} />
            : <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '99px', background: sc.bg, color: sc.color, border: '1px solid ' + sc.border }}>Closed</span>
          }
          <div style={{ fontSize: '11px', color: '#9C856A', fontFamily: 'JetBrains Mono, monospace' }}>{entry.date ? new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}</div>
          <span style={{ fontSize: '14px', color: '#9C856A' }}>{isExpanded ? '▲' : '▼'}</span>
        </div>

        {isExpanded && (
          <div style={{ borderTop: '1px solid #C8B89A', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {isActive && entry.created_at && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Time in trade</div>
                <ElapsedBadge createdAt={entry.created_at} expanded={true} />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {[
                { label: 'Entry', value: data.entry_price, color: '#2B2318' },
                { label: 'Stop', value: data.stop_price || '-', color: '#9B3A28' },
                { label: 'Size', value: data.size || '-', color: '#2B2318' },
                { label: 'Leverage', value: data.leverage || '1x', color: '#2B2318' },
              ].map(s => (
                <div key={s.label} style={{ background: '#F5EFE4', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '10px', color: '#9C856A', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>{s.label}</div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '16px', fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {data.reasoning && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Why are you taking this trade?</div>
                <div style={{ fontSize: '13px', color: '#2B2318', lineHeight: 1.6, background: '#F5EFE4', padding: '12px', borderRadius: '8px' }}>{data.reasoning}</div>
              </div>
            )}

            {data.trend && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Current trend / market condition</div>
                <div style={{ fontSize: '13px', color: '#2B2318', lineHeight: 1.6, background: '#F5EFE4', padding: '12px', borderRadius: '8px' }}>{data.trend}</div>
              </div>
            )}

            {data.conditions && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Conditions</div>
                <div style={{ fontSize: '13px', color: '#2B2318', lineHeight: 1.6, background: '#F5EFE4', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #C8903A' }}>{data.conditions}</div>
              </div>
            )}

            {data.chart_rank && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Comparison chart rank</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#F5EFE4', padding: '10px 14px', borderRadius: '8px' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '20px', fontWeight: 700, color: '#2B2318' }}>{data.chart_rank}/10</span>
                  <span style={{ fontSize: '12px', color: '#9C856A' }}>{data.chart_rank_tf}</span>
                </div>
              </div>
            )}

            {data.chart_url && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Chart</div>
                <img onClick={() => setExpandedChart(data.chart_url)} src={data.chart_url} style={{ maxWidth: '100%', borderRadius: '8px', cursor: 'pointer', border: '1px solid #C8B89A' }} />
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
              {entry.mood !== 'Closed' && (
                <button onClick={() => closePosition(entry)} style={{ background: '#3D7A52', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>Mark as Closed</button>
              )}
              {entry.mood === 'Closed' && (
                <button onClick={() => reopenPosition(entry)} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>Reopen Position</button>
              )}
              <button onClick={() => deleteEntry(entry.id, entry.content)} style={{ background: 'transparent', border: '1px solid #C8B89A', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 600, color: '#9C856A', cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {expandedChart && (
        <div onClick={() => setExpandedChart(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <img src={expandedChart} style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '8px' }} />
        </div>
      )}

      <div style={{ background: '#EDE4D3', borderBottom: '1px solid #C8B89A', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'Lora, serif', fontSize: '16px', fontWeight: 600, color: '#2B2318' }}>Journal</div>
          <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '2px' }}>{active.length} active positions</div>
        </div>
        <button onClick={() => setShowing(!showing)} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>+ New Position</button>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {showing && (
          <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontFamily: 'Lora, serif', fontSize: '14px', fontWeight: 600, color: '#2B2318', marginBottom: '16px' }}>New Position</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={label}>Pair</label>
                <select value={form.pair} onChange={e => setForm({ ...form, pair: e.target.value })} style={input}>
                  {PAIRS.map(p => <option key={p}>{p}</option>)}
                </select>
                {form.pair === 'Other' && <input type="text" placeholder="e.g. PEPE/USDT" value={form.customPair} onChange={e => setForm({ ...form, customPair: e.target.value.toUpperCase() })} style={{ ...input, marginTop: '8px' }} />}
              </div>
              <div><label style={label}>Side</label><select value={form.side} onChange={e => setForm({ ...form, side: e.target.value })} style={input}><option>LONG</option><option>SHORT</option></select></div>
              <div><label style={label}>Entry Price</label><input type="number" placeholder="0.00" value={form.entry_price} onChange={e => setForm({ ...form, entry_price: e.target.value })} style={input} /></div>
              <div><label style={label}>Stop Loss</label><input type="number" placeholder="0.00" value={form.stop_price} onChange={e => setForm({ ...form, stop_price: e.target.value })} style={input} /></div>
              <div><label style={label}>Size</label><input type="text" placeholder="e.g. 0.1 BTC" value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} style={input} /></div>
              <div><label style={label}>Leverage</label><select value={form.leverage} onChange={e => setForm({ ...form, leverage: e.target.value })} style={input}>{LEVERAGES.map(l => <option key={l}>{l}</option>)}</select></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div><label style={label}>Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={input}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
              <div><label style={label}>Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={input} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div><label style={label}>Comparison chart rank</label><div style={{ display: 'flex', gap: '8px' }}><select value={form.chart_rank} onChange={e => setForm({ ...form, chart_rank: e.target.value })} style={{ ...input, width: '80px' }}>{[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n}>{n}</option>)}</select><select value={form.chart_rank_tf} onChange={e => setForm({ ...form, chart_rank_tf: e.target.value })} style={input}>{TIMEFRAMES.map(tf => <option key={tf}>{tf}</option>)}</select></div></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
              <div><label style={label}>Why are you taking this trade?</label><textarea placeholder="e.g. Strong breakout retest on the daily, confluence with weekly level, market structure bullish..." value={form.reasoning} onChange={e => setForm({ ...form, reasoning: e.target.value })} style={{ ...input, height: '80px', resize: 'vertical' }} /></div>
              <div><label style={label}>Current trend / market condition</label><textarea placeholder="e.g. Overall bullish on BTC, USDT.D showing weakness, altcoins following..." value={form.trend} onChange={e => setForm({ ...form, trend: e.target.value })} style={{ ...input, height: '60px', resize: 'vertical' }} /></div>
              <div><label style={label}>Are there any conditions?</label><textarea placeholder="e.g. If price breaks below 81k stop is hit, watching for NY open reaction..." value={form.conditions} onChange={e => setForm({ ...form, conditions: e.target.value })} style={{ ...input, height: '60px', resize: 'vertical' }} /></div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={label}>Chart Screenshot</label>
              <div ref={pasteRef} onPaste={handlePaste} tabIndex={0} style={{ border: '2px dashed #C8B89A', borderRadius: '8px', padding: '16px', textAlign: 'center', background: '#F5EFE4', outline: 'none' }}>
                {chartPreview ? (
                  <img src={chartPreview} style={{ maxHeight: '160px', borderRadius: '6px', objectFit: 'contain' }} />
                ) : (
                  <div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '8px' }}>
                      <button type="button" onClick={() => fileRef.current.click()} style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', color: '#5A4535', cursor: 'pointer', fontWeight: 600 }}>Browse file</button>
                      <button type="button" onClick={() => pasteRef.current.focus()} style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', color: '#5A4535', cursor: 'pointer', fontWeight: 600 }}>Click then Ctrl+V to paste</button>
                    </div>
                    <div style={{ fontSize: '11px', color: '#C8B89A' }}>Copy chart in TradingView then press Ctrl+V</div>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
              </div>
              {chartPreview && <button onClick={() => { setChartFile(null); setChartPreview(null) }} style={{ marginTop: '6px', background: 'transparent', border: 'none', fontSize: '11px', color: '#9C856A', cursor: 'pointer' }}>Remove image</button>}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={saveEntry} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>{uploading ? 'Saving...' : 'Save Position'}</button>
              <button onClick={() => { setShowing(false); setChartFile(null); setChartPreview(null) }} style={{ background: 'transparent', border: '1px solid #C8B89A', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, color: '#9C856A', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        {active.length === 0 && !showing && (
          <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', padding: '24px', fontSize: '13px', color: '#9C856A' }}>No active positions. Hit New Position to log one.</div>
        )}

        {active.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Active Positions</div>
            {active.map(renderEntry)}
          </div>
        )}

        {closed.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '8px' }}>Closed</div>
            {closed.map(renderEntry)}
          </div>
        )}
      </div>
    </div>
  )
}
export default Journal