import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase'

const PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'HYPE/USDT', 'USDT.D', 'Other']
const TIMEFRAMES = ['Daily', 'Weekly', 'Monthly']

function KeyLevels() {
  const [levels, setLevels] = useState([])
  const [showing, setShowing] = useState(false)
  const [activeTab, setActiveTab] = useState('Daily')
  const [form, setForm] = useState({ pair: 'BTC/USDT', customPair: '', price: '', type: 'RES', notes: '', change_since: '', actionable: false, action_notes: '', date: new Date().toISOString().split('T')[0] })
  const [chartFile, setChartFile] = useState(null)
  const [chartPreview, setChartPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [expandedChart, setExpandedChart] = useState(null)
  const fileRef = useRef()
  const pasteRef = useRef()

  useEffect(() => { fetchLevels() }, [])

  const fetchLevels = async () => {
    const { data } = await supabase.from('key_levels').select('*').order('pair').order('price', { ascending: false })
    if (data) setLevels(data)
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

  const saveLevel = async () => {
    const finalPair = form.pair === 'Other' ? form.customPair : form.pair
    if (!finalPair || !form.price) return
    setUploading(true)
    let chart_url = null
    if (chartFile) {
      const fileName = Date.now() + '_image.png'
      const { error } = await supabase.storage.from('charts').upload(fileName, chartFile)
      if (!error) {
        const { data: urlData } = supabase.storage.from('charts').getPublicUrl(fileName)
        chart_url = urlData.publicUrl
      }
    }
    const fullNotes = [
      form.notes,
      form.change_since ? 'Change: ' + form.change_since : '',
      form.actionable && form.action_notes ? 'ActionNotes: ' + form.action_notes : '',
      '[' + activeTab + ']',
      form.actionable ? '[ACTIONABLE]' : '',
    ].filter(Boolean).join(' | ')
    await supabase.from('key_levels').insert([{ pair: finalPair, price: parseFloat(form.price), type: form.type, notes: fullNotes, chart_url, updated_at: new Date().toISOString(), date: form.date }])
    setForm({ pair: 'BTC/USDT', customPair: '', price: '', type: 'RES', notes: '', change_since: '', actionable: false, action_notes: '', date: new Date().toISOString().split('T')[0] })
    setChartFile(null)
    setChartPreview(null)
    setUploading(false)
    setShowing(false)
    fetchLevels()
  }

  const deleteLevel = async (id, chart_url) => {
    if (chart_url) {
      const fileName = chart_url.split('/').pop()
      await supabase.storage.from('charts').remove([fileName])
    }
    await supabase.from('key_levels').delete().eq('id', id)
    setLevels(levels.filter(l => l.id !== id))
  }

  const daysSince = (date) => {
    const diff = Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24))
    if (diff === 0) return 'today'
    if (diff === 1) return '1d ago'
    return diff + 'd ago'
  }

  const parseNotes = (raw) => {
    if (!raw) return { notes: '', change_since: '', action_notes: '', actionable: false }
    const actionable = raw.includes('[ACTIONABLE]')
    const change_since = raw.match(/Change: ([^|]+)/)?.[1]?.trim() || ''
    const action_notes = raw.match(/ActionNotes: ([^|]+)/)?.[1]?.trim() || ''
    const notes = raw
      .replace(/Change: [^|]+\|?/g, '')
      .replace(/ActionNotes: [^|]+\|?/g, '')
      .replace(/\[(Daily|Weekly|Monthly|ACTIONABLE)\]/g, '')
      .replace(/\|/g, '')
      .trim()
    return { notes, change_since, action_notes, actionable }
  }

  const filteredLevels = levels.filter(l => {
    if (activeTab === 'Daily') return !l.notes?.includes('[Weekly]') && !l.notes?.includes('[Monthly]')
    if (activeTab === 'Weekly') return l.notes?.includes('[Weekly]')
    if (activeTab === 'Monthly') return l.notes?.includes('[Monthly]')
    return true
  })

  const allPairs = [...new Set([...PAIRS.filter(p => p !== 'Other' && p !== 'USDT.D'), ...levels.map(l => l.pair).filter(p => !PAIRS.includes(p))])]
  const DISPLAY_PAIRS = activeTab === 'Daily' ? allPairs.filter(p => p !== 'USDT.D') : [...allPairs, 'USDT.D']
  const grouped = DISPLAY_PAIRS.reduce((acc, pair) => {
    const pl = filteredLevels.filter(l => l.pair === pair)
    if (pl.length > 0) acc[pair] = pl
    return acc
  }, {})

  const input = { background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#2B2318', width: '100%', outline: 'none', fontFamily: 'DM Sans, sans-serif' }
  const label = { fontSize: '11px', fontWeight: 600, color: '#9C856A', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '5px', display: 'block' }

  return (
    <div>
      {expandedChart && (
        <div onClick={() => setExpandedChart(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <img src={expandedChart} style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '8px' }} />
        </div>
      )}

      <div style={{ background: '#EDE4D3', borderBottom: '1px solid #C8B89A', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'Lora, serif', fontSize: '16px', fontWeight: 600, color: '#2B2318' }}>Key Levels</div>
          <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '2px' }}>{filteredLevels.length} levels on {activeTab} view</div>
        </div>
        <button onClick={() => setShowing(!showing)} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>+ Add Level</button>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '10px', padding: '3px', width: 'fit-content' }}>
          {TIMEFRAMES.map(tf => (
            <div key={tf} onClick={() => setActiveTab(tf)} style={{ padding: '6px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: activeTab === tf ? '#F5EFE4' : 'transparent', color: activeTab === tf ? '#2B2318' : '#9C856A', border: activeTab === tf ? '1px solid #C8B89A' : '1px solid transparent' }}>{tf}</div>
          ))}
        </div>

        {showing && (
          <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontFamily: 'Lora, serif', fontSize: '14px', fontWeight: 600, color: '#2B2318', marginBottom: '4px' }}>Add {activeTab} Level</div>
            <div style={{ fontSize: '11px', color: '#9C856A', marginBottom: '16px' }}>Saving to {activeTab} tab</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={label}>Pair</label>
                <select value={form.pair} onChange={e => setForm({ ...form, pair: e.target.value, customPair: '' })} style={input}>
                  {activeTab === 'Daily' ? PAIRS.filter(p => p !== 'USDT.D').map(p => <option key={p}>{p}</option>) : PAIRS.map(p => <option key={p}>{p}</option>)}
                </select>
                {form.pair === 'Other' && (
                  <input type="text" placeholder="e.g. PEPE/USDT" value={form.customPair} onChange={e => setForm({ ...form, customPair: e.target.value.toUpperCase() })} style={{ ...input, marginTop: '8px' }} autoFocus />
                )}
              </div>
              <div><label style={label}>{form.pair === 'USDT.D' ? 'Level (%)' : 'Price'}</label><input type="number" placeholder={form.pair === 'USDT.D' ? 'e.g. 6.5' : '0.00'} value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} style={input} /></div>
              <div><label style={label}>Type</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={input}><option value="RES">Resistance</option><option value="SUP">Support</option></select></div>
              <div><label style={label}>Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={input} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div><label style={label}>Notes</label><input type="text" placeholder="e.g. Weekly high, HTF structure..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={input} /></div>
              <div><label style={label}>Change since previous levels</label><input type="text" placeholder="e.g. +2.3%, broke previous high..." value={form.change_since} onChange={e => setForm({ ...form, change_since: e.target.value })} style={input} /></div>
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
                      <button type="button" onClick={() => pasteRef.current.focus()} style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', color: '#5A4535', cursor: 'pointer', fontWeight: 600 }}>Click then Cmd+V to paste</button>
                    </div>
                    <div style={{ fontSize: '11px', color: '#C8B89A' }}>Copy chart in TradingView then press Cmd+V</div>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
              </div>
              {chartPreview && <button onClick={() => { setChartFile(null); setChartPreview(null) }} style={{ marginTop: '6px', background: 'transparent', border: 'none', fontSize: '11px', color: '#9C856A', cursor: 'pointer' }}>Remove image</button>}
            </div>

            {activeTab === 'Daily' && (
              <div style={{ marginBottom: '16px' }}>
                <div onClick={() => setForm({ ...form, actionable: !form.actionable })} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: '#F5EFE4', borderRadius: '8px', border: '1px solid #C8B89A', cursor: 'pointer' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: form.actionable ? '1.5px solid #3D7A52' : '1.5px solid #C8B89A', background: form.actionable ? '#3D7A52' : '#F5EFE4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {form.actionable && <span style={{ color: 'white', fontSize: '12px' }}>✓</span>}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#2B2318' }}>Can I action this?</div>
                    <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '2px' }}>Mark this level as something you can trade off directly</div>
                  </div>
                </div>
                {form.actionable && (
                  <div style={{ marginTop: '10px' }}>
                    <label style={label}>What has changed since the last update?</label>
                    <textarea placeholder="e.g. Price has come back to retest this level, structure looks clean, confluence with EMA..." value={form.action_notes} onChange={e => setForm({ ...form, action_notes: e.target.value })} style={{ ...input, height: '80px', resize: 'vertical' }} />
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={saveLevel} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>{uploading ? 'Saving...' : 'Save Level'}</button>
              <button onClick={() => { setShowing(false); setChartFile(null); setChartPreview(null) }} style={{ background: 'transparent', border: '1px solid #C8B89A', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, color: '#9C856A', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        {filteredLevels.length === 0 && !showing && (
          <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', padding: '24px', fontSize: '13px', color: '#9C856A' }}>No {activeTab.toLowerCase()} levels added yet.</div>
        )}

        {Object.entries(grouped).map(([pair, pairLevels]) => (
          <div key={pair} style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '10px 18px', borderBottom: '1px solid #C8B89A', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: 600, color: '#5A4535', background: '#E8DEC8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {pair}
              {pair === 'USDT.D' && <span style={{ fontSize: '10px', background: '#F5E6C8', color: '#7A4F1A', padding: '2px 8px', borderRadius: '99px', border: '1px solid #C8903A', fontWeight: 700 }}>% based</span>}
            </div>
            {pairLevels.map((l, i) => {
              const parsed = parseNotes(l.notes)
              return (
                <div key={l.id} style={{ padding: '12px 18px', borderBottom: i < pairLevels.length - 1 ? '1px solid #C8B89A' : 'none', background: parsed.actionable ? 'rgba(61,122,82,0.05)' : 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '99px', background: l.type === 'RES' ? '#F5DACE' : '#D4EAD8', color: l.type === 'RES' ? '#7A2E18' : '#2A5E38', border: l.type === 'RES' ? '1px solid #C87055' : '1px solid #5DA070' }}>{l.type}</span>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '15px', fontWeight: 700, color: '#2B2318', minWidth: '100px' }}>{l.price}{pair === 'USDT.D' ? '%' : ''}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', color: '#9C856A' }}>{parsed.notes || '—'}</div>
                      {parsed.change_since && <div style={{ fontSize: '11px', color: '#C8903A', marginTop: '2px', fontWeight: 600 }}>Change: {parsed.change_since}</div>}
                    </div>
                    {l.chart_url && (
                      <img onClick={() => setExpandedChart(l.chart_url)} src={l.chart_url} style={{ width: '48px', height: '36px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer', border: '1px solid #C8B89A' }} />
                    )}
                    {parsed.actionable && <span style={{ fontSize: '10px', background: '#D4EAD8', color: '#2A5E38', padding: '2px 8px', borderRadius: '99px', border: '1px solid #5DA070', fontWeight: 700, whiteSpace: 'nowrap' }}>Actionable</span>}
                    <div style={{ fontSize: '11px', color: '#9C856A', fontFamily: 'JetBrains Mono, monospace' }}>{l.date ? new Date(l.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : daysSince(l.updated_at)}</div>
                    <button onClick={() => deleteLevel(l.id, l.chart_url)} style={{ background: 'transparent', border: 'none', color: '#C8B89A', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}>x</button>
                  </div>
                  {parsed.action_notes && (
                    <div style={{ marginTop: '8px', padding: '8px 12px', background: '#D4EAD8', borderRadius: '6px', fontSize: '12px', color: '#2A5E38', borderLeft: '3px solid #5DA070' }}>
                      <span style={{ fontWeight: 600 }}>What changed: </span>{parsed.action_notes}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
export default KeyLevels