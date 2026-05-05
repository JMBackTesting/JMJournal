import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase'

function WeeklyReview() {
  const [trades, setTrades] = useState([])
  const [positions, setPositions] = useState([])
  const [selected, setSelected] = useState(null)
  const [selectedType, setSelectedType] = useState(null)
  const [review, setReview] = useState('')
  const [savedReview, setSavedReview] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('trades')
  const [chartFile, setChartFile] = useState(null)
  const [chartPreview, setChartPreview] = useState(null)
  const fileRef = useRef()
  const pasteRef = useRef()

  useEffect(() => {
    supabase.from('trades').select('*').order('date', { ascending: false }).then(({ data }) => data && setTrades(data))
    supabase.from('journal_entries').select('*').order('created_at', { ascending: false }).then(({ data }) => data && setPositions(data))
  }, [])

  const selectItem = (item, type) => {
    setSelected(item)
    setSelectedType(type)
    setReview('')
    setSavedReview('')
    setChartFile(null)
    setChartPreview(null)
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

  const saveReview = async () => {
    if (!selected) return
    setSaving(true)
    let review_chart_url = null
    if (chartFile) {
      const fileName = Date.now() + '_review.png'
      const { error } = await supabase.storage.from('charts').upload(fileName, chartFile)
      if (!error) {
        const { data: urlData } = supabase.storage.from('charts').getPublicUrl(fileName)
        review_chart_url = urlData.publicUrl
      }
    }
    if (selectedType === 'trade') {
      const newNotes = (selected.notes ? selected.notes + '\n\nREVIEW: ' : 'REVIEW: ') + review
      await supabase.from('trades').update({ notes: newNotes }).eq('id', selected.id)
      const updated = { ...selected, notes: newNotes }
      setSelected(updated)
      setTrades(trades.map(t => t.id === selected.id ? updated : t))
    } else {
      const data = JSON.parse(selected.content || '{}')
      const newContent = JSON.stringify({ ...data, review, review_chart_url })
      await supabase.from('journal_entries').update({ content: newContent }).eq('id', selected.id)
      const updated = { ...selected, content: newContent }
      setSelected(updated)
      setPositions(positions.map(p => p.id === selected.id ? updated : p))
    }
    setSavedReview(review)
    setSaving(false)
  }

  const removeReview = async () => {
    if (!selected) return
    if (selectedType === 'trade') {
      const newNotes = selected.notes ? selected.notes.replace(/\n\nREVIEW:.*$/s, '').replace(/^REVIEW:.*$/s, '') : ''
      await supabase.from('trades').update({ notes: newNotes }).eq('id', selected.id)
      const updated = { ...selected, notes: newNotes }
      setSelected(updated)
      setTrades(trades.map(t => t.id === selected.id ? updated : t))
    } else {
      const data = JSON.parse(selected.content || '{}')
      delete data.review
      delete data.review_chart_url
      const newContent = JSON.stringify(data)
      await supabase.from('journal_entries').update({ content: newContent }).eq('id', selected.id)
      const updated = { ...selected, content: newContent }
      setSelected(updated)
      setPositions(positions.map(p => p.id === selected.id ? updated : p))
    }
    setReview('')
    setSavedReview('')
    setChartFile(null)
    setChartPreview(null)
  }

  const hasReview = () => {
    if (!selected) return false
    if (selectedType === 'trade') return selected.notes?.includes('REVIEW:')
    const data = JSON.parse(selected.content || '{}')
    return !!data.review
  }

  const tradeIsReviewed = (t) => t.notes?.includes('REVIEW:')
  const positionIsReviewed = (p) => {
    try { return !!JSON.parse(p.content || '{}').review } catch { return false }
  }

  const input = { background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#2B2318', width: '100%', outline: 'none', fontFamily: 'DM Sans, sans-serif' }

  const renderTradeRow = (t) => {
    const reviewed = tradeIsReviewed(t)
    return (
      <div key={t.id} onClick={() => selectItem(t, 'trade')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', background: selected?.id === t.id ? '#E8DEC8' : '#F5EFE4', border: selected?.id === t.id ? '1px solid #C8903A' : '1px solid #C8B89A', marginBottom: '6px' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '5px', flexShrink: 0, background: t.side === 'LONG' ? '#D4EAD8' : '#F5DACE', color: t.side === 'LONG' ? '#2A5E38' : '#7A2E18' }}>{t.side}</span>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 600, color: '#2B2318', flexShrink: 0 }}>{t.pair}</div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
          {reviewed && <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '99px', background: '#D4EAD8', color: '#2A5E38', border: '1px solid #5DA070', whiteSpace: 'nowrap' }}>Reviewed</span>}
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 700, color: t.pnl_r >= 0 ? '#3D7A52' : '#9B3A28', whiteSpace: 'nowrap' }}>{t.pnl_r > 0 ? '+' : ''}{t.pnl_r}R</div>
        </div>
      </div>
    )
  }

  const renderPositionRow = (p) => {
    const data = JSON.parse(p.content || '{}')
    const reviewed = positionIsReviewed(p)
    const statusColor = (s) => {
      if (s === 'In Trade') return { bg: '#D4EAD8', color: '#2A5E38', border: '#5DA070' }
      if (s === 'Active Bids' || s === 'Active') return { bg: '#F5E6C8', color: '#7A4F1A', border: '#C8903A' }
      if (s === 'Watching / POI' || s === 'Watching') return { bg: '#E6D4F0', color: '#5A1A7A', border: '#9A6AC8' }
      if (s === 'Rough Drawing' || s === 'Partial') return { bg: '#D4E8F0', color: '#1A4F6A', border: '#5A90B0' }
      if (s === 'Closed') return { bg: '#F1EFE8', color: '#5F5E5A', border: '#B4B2A9' }
      return { bg: '#F1EFE8', color: '#5F5E5A', border: '#B4B2A9' }
    }
    const sc = statusColor(data.status || p.mood)
    return (
      <div key={p.id} onClick={() => selectItem(p, 'position')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', background: selected?.id === p.id ? '#E8DEC8' : '#F5EFE4', border: selected?.id === p.id ? '1px solid #C8903A' : '1px solid #C8B89A', marginBottom: '6px' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '5px', flexShrink: 0, background: data.side === 'LONG' ? '#D4EAD8' : '#F5DACE', color: data.side === 'LONG' ? '#2A5E38' : '#7A2E18' }}>{data.side}</span>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 600, color: '#2B2318', flexShrink: 0 }}>{data.pair}</div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
          {reviewed && <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '99px', background: '#D4EAD8', color: '#2A5E38', border: '1px solid #5DA070', whiteSpace: 'nowrap' }}>Reviewed</span>}
          <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 7px', borderRadius: '99px', background: sc.bg, color: sc.color, border: '1px solid ' + sc.border, whiteSpace: 'nowrap' }}>{data.status || p.mood}</span>
        </div>
      </div>
    )
  }

  const renderDetail = () => {
    if (!selected) return null
    if (selectedType === 'trade') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div style={{ background: '#F5EFE4', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '10px', color: '#9C856A', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Pair</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '15px', fontWeight: 700, color: '#2B2318' }}>{selected.pair}</div>
            </div>
            <div style={{ background: '#F5EFE4', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '10px', color: '#9C856A', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>P&L</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '15px', fontWeight: 700, color: selected.pnl_r >= 0 ? '#3D7A52' : '#9B3A28' }}>{selected.pnl_r > 0 ? '+' : ''}{selected.pnl_r}R</div>
            </div>
            <div style={{ background: '#F5EFE4', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '10px', color: '#9C856A', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Date</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '15px', fontWeight: 700, color: '#2B2318' }}>{selected.date}</div>
            </div>
          </div>
          {selected.notes && <div><div style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Notes</div><div style={{ fontSize: '13px', color: '#2B2318', lineHeight: 1.6, background: '#F5EFE4', padding: '12px', borderRadius: '8px' }}>{selected.notes}</div></div>}
        </div>
      )
    } else {
      const data = JSON.parse(selected.content || '{}')
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
            <div style={{ background: '#F5EFE4', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '10px', color: '#9C856A', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Pair</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '15px', fontWeight: 700, color: '#2B2318' }}>{data.pair}</div>
            </div>
            <div style={{ background: '#F5EFE4', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '10px', color: '#9C856A', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Entry</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '15px', fontWeight: 700, color: '#2B2318' }}>{data.entry_price}</div>
            </div>
            <div style={{ background: '#F5EFE4', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '10px', color: '#9C856A', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Stop</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '15px', fontWeight: 700, color: '#9B3A28' }}>{data.stop_price || '-'}</div>
            </div>
            <div style={{ background: '#F5EFE4', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '10px', color: '#9C856A', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Leverage</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '15px', fontWeight: 700, color: '#2B2318' }}>{data.leverage || '1x'}</div>
            </div>
          </div>
          {data.reasoning && <div><div style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Why did you take this trade?</div><div style={{ fontSize: '13px', color: '#2B2318', lineHeight: 1.6, background: '#F5EFE4', padding: '12px', borderRadius: '8px' }}>{data.reasoning}</div></div>}
          {data.trend && <div><div style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Trend / market condition</div><div style={{ fontSize: '13px', color: '#2B2318', lineHeight: 1.6, background: '#F5EFE4', padding: '12px', borderRadius: '8px' }}>{data.trend}</div></div>}
          {data.conditions && <div><div style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Conditions</div><div style={{ fontSize: '13px', color: '#2B2318', lineHeight: 1.6, background: '#F5EFE4', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #C8903A' }}>{data.conditions}</div></div>}
          {data.chart_url && <div><div style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Original chart</div><img src={data.chart_url} style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid #C8B89A' }} /></div>}
          {data.review && <div><div style={{ fontSize: '11px', fontWeight: 700, color: '#3D7A52', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Previous review</div><div style={{ fontSize: '13px', color: '#2B2318', lineHeight: 1.6, background: '#D4EAD8', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #5DA070' }}>{data.review}</div></div>}
          {data.review_chart_url && <div><div style={{ fontSize: '11px', fontWeight: 700, color: '#3D7A52', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Review chart</div><img src={data.review_chart_url} style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid #5DA070' }} /></div>}
        </div>
      )
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
      <div style={{ background: '#EDE4D3', borderBottom: '1px solid #C8B89A', padding: '14px 24px' }}>
        <div style={{ fontFamily: 'Lora, serif', fontSize: '16px', fontWeight: 600, color: '#2B2318' }}>Old Positions</div>
        <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '2px' }}>Select a trade or position to review</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr', flex: 1, overflow: 'hidden' }}>
        <div style={{ borderRight: '1px solid #C8B89A', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', background: '#EDE4D3', borderBottom: '1px solid #C8B89A', padding: '8px', gap: '4px' }}>
            <div onClick={() => setActiveTab('trades')} style={{ flex: 1, textAlign: 'center', padding: '6px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: activeTab === 'trades' ? '#F5EFE4' : 'transparent', color: activeTab === 'trades' ? '#2B2318' : '#9C856A', border: activeTab === 'trades' ? '1px solid #C8B89A' : '1px solid transparent' }}>Trade Log ({trades.length})</div>
            <div onClick={() => setActiveTab('positions')} style={{ flex: 1, textAlign: 'center', padding: '6px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: activeTab === 'positions' ? '#F5EFE4' : 'transparent', color: activeTab === 'positions' ? '#2B2318' : '#9C856A', border: activeTab === 'positions' ? '1px solid #C8B89A' : '1px solid transparent' }}>Journal ({positions.length})</div>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '10px' }}>
            {activeTab === 'trades' && (trades.length === 0 ? <div style={{ fontSize: '13px', color: '#9C856A' }}>No trades logged yet.</div> : trades.map(renderTradeRow))}
            {activeTab === 'positions' && (positions.length === 0 ? <div style={{ fontSize: '13px', color: '#9C856A' }}>No positions logged yet.</div> : positions.map(renderPositionRow))}
          </div>
        </div>
        <div style={{ overflow: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!selected && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', fontSize: '13px', color: '#9C856A' }}>Select a trade or position from the left to review it</div>}
          {selected && (
            <>
              {renderDetail()}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Your review</div>
                <textarea placeholder="What did you do well? What would you do differently? What did this teach you?" value={review} onChange={e => setReview(e.target.value)} style={{ ...input, height: '120px', resize: 'vertical' }} />
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Review chart screenshot</div>
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
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button onClick={saveReview} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>{saving ? 'Saving...' : 'Save Review'}</button>
                {hasReview() && <button onClick={removeReview} style={{ background: 'transparent', border: '1px solid #9B3A28', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, color: '#9B3A28', cursor: 'pointer' }}>Remove Review</button>}
                {savedReview && <span style={{ fontSize: '12px', color: '#3D7A52', fontWeight: 600 }}>Saved!</span>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
export default WeeklyReview