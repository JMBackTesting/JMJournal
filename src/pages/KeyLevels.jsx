import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase'

const PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'HYPE/USDT', 'USDT.D', 'Other']
const TIMEFRAMES = ['Daily', 'Weekly', 'Monthly', 'Comparison W1', 'Comparison M1']

const defaultForm = {
  pair: 'BTC/USDT', customPair: '', date: new Date().toISOString().split('T')[0],
  poi: '', notes: '', change_since: '',
  d1_support: '', d1_resistance: '', actionable: false,
  bias: '', prev_open: '', support: '', resistance: '',
  comparison_notes: '',
}

function KeyLevels() {
  const [levels, setLevels] = useState([])
  const [showing, setShowing] = useState(false)
  const [activeTab, setActiveTab] = useState('Daily')
  const [form, setForm] = useState(defaultForm)
  const [chartFile, setChartFile] = useState(null)
  const [chartPreview, setChartPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [expandedChart, setExpandedChart] = useState(null)
  const fileRef = useRef()
  const pasteRef = useRef()

  useEffect(() => { fetchLevels() }, [])

  const fetchLevels = async () => {
    const { data } = await supabase.from('key_levels').select('*').order('created_at', { ascending: false })
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
    if (!finalPair) return
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

    let payload = { tab: activeTab }

    if (activeTab === 'Comparison W1' || activeTab === 'Comparison M1') {
      payload.comparison_notes = form.comparison_notes
    } else if (activeTab === 'Daily') {
      payload.poi = form.poi
      payload.notes = form.notes
      payload.change_since = form.change_since
      payload.d1_support = form.d1_support
      payload.d1_resistance = form.d1_resistance
      payload.actionable = form.actionable
    } else if (activeTab === 'Weekly') {
      payload.bias = form.bias
      payload.poi = form.poi
      payload.prev_wo = form.prev_open
      payload.w1_support = form.support
      payload.w1_resistance = form.resistance
      payload.notes = form.notes
      payload.change_since = form.change_since
    } else {
      payload.bias = form.bias
      payload.poi = form.poi
      payload.prev_mo = form.prev_open
      payload.m1_support = form.support
      payload.m1_resistance = form.resistance
      payload.notes = form.notes
      payload.change_since = form.change_since
    }

    await supabase.from('key_levels').insert([{
      pair: finalPair,
      price: parseFloat(form.support || form.d1_support || 0) || 0,
      type: activeTab === 'Daily' ? 'D' : activeTab === 'Weekly' ? 'W' : activeTab === 'Monthly' ? 'M' : 'C',
      notes: JSON.stringify(payload),
      chart_url,
      updated_at: new Date().toISOString(),
      date: form.date
    }])
    setForm(defaultForm)
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

  const parseData = (raw) => {
    try { return JSON.parse(raw) } catch { return { notes: raw || '' } }
  }

  const filteredLevels = levels.filter(l => {
    const d = parseData(l.notes)
    return d.tab === activeTab
  })

  const input = { background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#2B2318', width: '100%', outline: 'none', fontFamily: 'DM Sans, sans-serif' }
  const label = { fontSize: '11px', fontWeight: 600, color: '#9C856A', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '5px', display: 'block' }
  const field = (lbl, child) => <div><label style={label}>{lbl}</label>{child}</div>

  const renderScreenshotBox = () => (
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
  )

  const renderForm = () => (
    <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', padding: '20px', marginBottom: '4px' }}>
      <div style={{ fontFamily: 'Lora, serif', fontSize: '14px', fontWeight: 600, color: '#2B2318', marginBottom: '4px' }}>Add {activeTab}</div>
      <div style={{ fontSize: '11px', color: '#9C856A', marginBottom: '16px' }}>Saving to {activeTab} tab</div>

      {(activeTab === 'Comparison W1' || activeTab === 'Comparison M1') ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              {field('Pair',
                <select value={form.pair} onChange={e => setForm({ ...form, pair: e.target.value, customPair: '' })} style={input}>
                  {PAIRS.map(p => <option key={p}>{p}</option>)}
                </select>
              )}
              {form.pair === 'Other' && <input type="text" placeholder="e.g. PEPE/USDT" value={form.customPair} onChange={e => setForm({ ...form, customPair: e.target.value.toUpperCase() })} style={{ ...input, marginTop: '8px' }} />}
            </div>
            {field('Date', <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={input} />)}
          </div>
          <div style={{ marginBottom: '12px' }}>
            {field('Notes', <textarea placeholder="Add your comparison notes here..." value={form.comparison_notes} onChange={e => setForm({ ...form, comparison_notes: e.target.value })} style={{ ...input, height: '100px', resize: 'vertical' }} />)}
          </div>
          {renderScreenshotBox()}
        </>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              {field('Pair',
                <select value={form.pair} onChange={e => setForm({ ...form, pair: e.target.value, customPair: '' })} style={input}>
                  {PAIRS.map(p => <option key={p}>{p}</option>)}
                </select>
              )}
              {form.pair === 'Other' && <input type="text" placeholder="e.g. PEPE/USDT" value={form.customPair} onChange={e => setForm({ ...form, customPair: e.target.value.toUpperCase() })} style={{ ...input, marginTop: '8px' }} />}
            </div>
            {field('Date', <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={input} />)}
          </div>

          {activeTab === 'Daily' && (
            <>
              <div style={{ background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>— Daily Levels</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  {field('POI', <input type="text" placeholder="Point of Interest" value={form.poi} onChange={e => setForm({ ...form, poi: e.target.value })} style={input} />)}
                  {field('D1 Support', <input type="number" placeholder="0.00" value={form.d1_support} onChange={e => setForm({ ...form, d1_support: e.target.value })} style={input} />)}
                  {field('D1 Resistance', <input type="number" placeholder="0.00" value={form.d1_resistance} onChange={e => setForm({ ...form, d1_resistance: e.target.value })} style={input} />)}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                {field('Notes', <input type="text" placeholder="Key observations..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={input} />)}
                {field('Change Since Last Post', <input type="text" placeholder="e.g. +2.3%, broke previous high..." value={form.change_since} onChange={e => setForm({ ...form, change_since: e.target.value })} style={input} />)}
              </div>
            </>
          )}

          {activeTab === 'Weekly' && (
            <>
              <div style={{ background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>— Weekly Levels</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  {field('Bias', <select value={form.bias} onChange={e => setForm({ ...form, bias: e.target.value })} style={input}><option value="">Select...</option><option>Bullish</option><option>Bearish</option><option>Neutral</option></select>)}
                  {field('POI', <input type="text" placeholder="Point of Interest" value={form.poi} onChange={e => setForm({ ...form, poi: e.target.value })} style={input} />)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  {field('Prev WO', <input type="number" placeholder="0.00" value={form.prev_open} onChange={e => setForm({ ...form, prev_open: e.target.value })} style={input} />)}
                  {field('W1 Support', <input type="number" placeholder="0.00" value={form.support} onChange={e => setForm({ ...form, support: e.target.value })} style={input} />)}
                  {field('W1 Resistance', <input type="number" placeholder="0.00" value={form.resistance} onChange={e => setForm({ ...form, resistance: e.target.value })} style={input} />)}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                {field('Notes', <input type="text" placeholder="Key observations..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={input} />)}
                {field('Change Since Last Post', <input type="text" placeholder="e.g. +2.3%, broke previous high..." value={form.change_since} onChange={e => setForm({ ...form, change_since: e.target.value })} style={input} />)}
              </div>
            </>
          )}

          {activeTab === 'Monthly' && (
            <>
              <div style={{ background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>— Monthly Levels</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  {field('Bias', <select value={form.bias} onChange={e => setForm({ ...form, bias: e.target.value })} style={input}><option value="">Select...</option><option>Bullish</option><option>Bearish</option><option>Neutral</option></select>)}
                  {field('POI', <input type="text" placeholder="Point of Interest" value={form.poi} onChange={e => setForm({ ...form, poi: e.target.value })} style={input} />)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  {field('Prev MO', <input type="number" placeholder="0.00" value={form.prev_open} onChange={e => setForm({ ...form, prev_open: e.target.value })} style={input} />)}
                  {field('M1 Support', <input type="number" placeholder="0.00" value={form.support} onChange={e => setForm({ ...form, support: e.target.value })} style={input} />)}
                  {field('M1 Resistance', <input type="number" placeholder="0.00" value={form.resistance} onChange={e => setForm({ ...form, resistance: e.target.value })} style={input} />)}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                {field('Notes', <input type="text" placeholder="Key observations..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={input} />)}
                {field('Change Since Last Post', <input type="text" placeholder="e.g. +2.3%, broke previous high..." value={form.change_since} onChange={e => setForm({ ...form, change_since: e.target.value })} style={input} />)}
              </div>
            </>
          )}

          {renderScreenshotBox()}

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
            </div>
          )}
        </>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={saveLevel} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>{uploading ? 'Saving...' : 'Save'}</button>
        <button onClick={() => { setShowing(false); setChartFile(null); setChartPreview(null); setForm(defaultForm) }} style={{ background: 'transparent', border: '1px solid #C8B89A', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, color: '#9C856A', cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  )

  const renderLevel = (l) => {
    const d = parseData(l.notes)
    const biasColor = d.bias === 'Bullish' ? '#3D7A52' : d.bias === 'Bearish' ? '#9B3A28' : '#9C856A'
    const isComparison = activeTab === 'Comparison W1' || activeTab === 'Comparison M1'
    return (
      <div key={l.id} style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', overflow: 'hidden', marginBottom: '10px' }}>
        <div style={{ background: '#E8DEC8', borderBottom: '1px solid #C8B89A', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 700, color: '#2B2318' }}>{l.pair}</div>
            {d.bias && <span style={{ fontSize: '11px', fontWeight: 700, color: biasColor, background: d.bias === 'Bullish' ? '#D4EAD8' : d.bias === 'Bearish' ? '#F5DACE' : '#F5EFE4', padding: '2px 8px', borderRadius: '99px', border: `1px solid ${biasColor}` }}>{d.bias}</span>}
            {d.actionable && <span style={{ fontSize: '10px', background: '#D4EAD8', color: '#2A5E38', padding: '2px 8px', borderRadius: '99px', border: '1px solid #5DA070', fontWeight: 700 }}>Actionable</span>}
            <div style={{ fontSize: '11px', color: '#9C856A', fontFamily: 'JetBrains Mono, monospace' }}>{l.date ? new Date(l.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {l.chart_url && <img onClick={() => setExpandedChart(l.chart_url)} src={l.chart_url} style={{ width: '48px', height: '36px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer', border: '1px solid #C8B89A' }} />}
            <button onClick={() => deleteLevel(l.id, l.chart_url)} style={{ background: 'transparent', border: 'none', color: '#C8B89A', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}>x</button>
          </div>
        </div>

        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {isComparison ? (
            <>
              {d.comparison_notes && <div style={{ fontSize: '13px', color: '#2B2318', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{d.comparison_notes}</div>}
              {l.chart_url && <img onClick={() => setExpandedChart(l.chart_url)} src={l.chart_url} style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid #C8B89A', cursor: 'pointer', marginTop: '4px' }} />}
            </>
          ) : (
            <>
              {d.poi && <div style={{ display: 'flex', gap: '8px' }}><span style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', minWidth: '110px', textTransform: 'uppercase' }}>POI</span><span style={{ fontSize: '13px', color: '#2B2318' }}>{d.poi}</span></div>}
              {activeTab === 'Daily' && <>
                {d.d1_support && <div style={{ display: 'flex', gap: '8px' }}><span style={{ fontSize: '11px', fontWeight: 700, color: '#2A5E38', minWidth: '110px', textTransform: 'uppercase' }}>D1 Support</span><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 600, color: '#2B2318' }}>{d.d1_support}</span></div>}
                {d.d1_resistance && <div style={{ display: 'flex', gap: '8px' }}><span style={{ fontSize: '11px', fontWeight: 700, color: '#7A2E18', minWidth: '110px', textTransform: 'uppercase' }}>D1 Resistance</span><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 600, color: '#2B2318' }}>{d.d1_resistance}</span></div>}
              </>}
              {activeTab === 'Weekly' && <>
                {d.prev_wo && <div style={{ display: 'flex', gap: '8px' }}><span style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', minWidth: '110px', textTransform: 'uppercase' }}>Prev WO</span><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 600, color: '#2B2318' }}>{d.prev_wo}</span></div>}
                {d.w1_support && <div style={{ display: 'flex', gap: '8px' }}><span style={{ fontSize: '11px', fontWeight: 700, color: '#2A5E38', minWidth: '110px', textTransform: 'uppercase' }}>W1 Support</span><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 600, color: '#2B2318' }}>{d.w1_support}</span></div>}
                {d.w1_resistance && <div style={{ display: 'flex', gap: '8px' }}><span style={{ fontSize: '11px', fontWeight: 700, color: '#7A2E18', minWidth: '110px', textTransform: 'uppercase' }}>W1 Resistance</span><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 600, color: '#2B2318' }}>{d.w1_resistance}</span></div>}
              </>}
              {activeTab === 'Monthly' && <>
                {d.prev_mo && <div style={{ display: 'flex', gap: '8px' }}><span style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', minWidth: '110px', textTransform: 'uppercase' }}>Prev MO</span><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 600, color: '#2B2318' }}>{d.prev_mo}</span></div>}
                {d.m1_support && <div style={{ display: 'flex', gap: '8px' }}><span style={{ fontSize: '11px', fontWeight: 700, color: '#2A5E38', minWidth: '110px', textTransform: 'uppercase' }}>M1 Support</span><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 600, color: '#2B2318' }}>{d.m1_support}</span></div>}
                {d.m1_resistance && <div style={{ display: 'flex', gap: '8px' }}><span style={{ fontSize: '11px', fontWeight: 700, color: '#7A2E18', minWidth: '110px', textTransform: 'uppercase' }}>M1 Resistance</span><span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 600, color: '#2B2318' }}>{d.m1_resistance}</span></div>}
              </>}
              {d.notes && <div style={{ display: 'flex', gap: '8px' }}><span style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', minWidth: '110px', textTransform: 'uppercase' }}>Notes</span><span style={{ fontSize: '13px', color: '#2B2318' }}>{d.notes}</span></div>}
              {d.change_since && <div style={{ display: 'flex', gap: '8px' }}><span style={{ fontSize: '11px', fontWeight: 700, color: '#C8903A', minWidth: '110px', textTransform: 'uppercase' }}>Change</span><span style={{ fontSize: '13px', color: '#C8903A', fontWeight: 600 }}>{d.change_since}</span></div>}
            </>
          )}
        </div>
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
          <div style={{ fontFamily: 'Lora, serif', fontSize: '16px', fontWeight: 600, color: '#2B2318' }}>Key Levels</div>
          <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '2px' }}>{filteredLevels.length} levels on {activeTab} view</div>
        </div>
        <button onClick={() => setShowing(!showing)} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>+ Add Level</button>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '10px', padding: '3px', width: 'fit-content', flexWrap: 'wrap', gap: '2px' }}>
          {TIMEFRAMES.map(tf => (
            <div key={tf} onClick={() => { setActiveTab(tf); setShowing(false); setForm(defaultForm) }} style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: activeTab === tf ? '#F5EFE4' : 'transparent', color: activeTab === tf ? '#2B2318' : '#9C856A', border: activeTab === tf ? '1px solid #C8B89A' : '1px solid transparent', whiteSpace: 'nowrap' }}>{tf}</div>
          ))}
        </div>

        {showing && renderForm()}

        {filteredLevels.length === 0 && !showing && (
          <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', padding: '24px', fontSize: '13px', color: '#9C856A' }}>No {activeTab.toLowerCase()} entries added yet.</div>
        )}

        {filteredLevels.map(renderLevel)}
      </div>
    </div>
  )
}
export default KeyLevels