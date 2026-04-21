import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

const TIMEFRAMES = ['Daily', 'Weekly', 'Monthly']

function LevelPoster() {
  const [levels, setLevels] = useState([])
  const [selectedPair, setSelectedPair] = useState('')
  const [selectedTf, setSelectedTf] = useState('Daily')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [copied, setCopied] = useState(false)
  const [expandedChart, setExpandedChart] = useState(null)

  useEffect(() => {
    supabase.from('key_levels').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setLevels(data)
    })
  }, [])

  useEffect(() => {
    setCurrentIndex(0)
  }, [selectedPair, selectedTf])

  const parseData = (raw) => {
    try { return JSON.parse(raw) } catch { return { notes: raw || '' } }
  }

  const pairs = [...new Set(levels.map(l => l.pair))].sort()

  const filteredLevels = levels.filter(l => {
    const d = parseData(l.notes)
    return d.tab === selectedTf && l.pair === selectedPair
  })

  const total = filteredLevels.length
  const current = filteredLevels[currentIndex]

  const generatePost = (l) => {
    if (!l) return ''
    const d = parseData(l.notes)
    const date = l.date ? new Date(l.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
    const lines = []
    lines.push(`${selectedPair} - ${selectedTf} Levels (${date})`)
    lines.push('')
    if (d.bias) lines.push(`Bias: ${d.bias}`)
    if (d.poi) lines.push(`POI: ${d.poi}`)
    if (d.prev_wo) lines.push(`Prev WO: ${d.prev_wo}`)
    if (d.prev_mo) lines.push(`Prev MO: ${d.prev_mo}`)
    if (d.d1_support) lines.push(`D1 Support: ${d.d1_support}`)
    if (d.d1_resistance) lines.push(`D1 Resistance: ${d.d1_resistance}`)
    if (d.w1_support) lines.push(`W1 Support: ${d.w1_support}`)
    if (d.w1_resistance) lines.push(`W1 Resistance: ${d.w1_resistance}`)
    if (d.m1_support) lines.push(`M1 Support: ${d.m1_support}`)
    if (d.m1_resistance) lines.push(`M1 Resistance: ${d.m1_resistance}`)
    if (d.notes) lines.push(`\nNotes: ${d.notes}`)
    if (d.change_since) lines.push(`Change since last post: ${d.change_since}`)
    if (d.actionable) lines.push(`Can I action this: Yes`)
    return lines.join('\n').trim()
  }

  const post = generatePost(current)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(post)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const input = { background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#2B2318', width: '100%', outline: 'none', fontFamily: 'DM Sans, sans-serif' }
  const label = { fontSize: '11px', fontWeight: 600, color: '#9C856A', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '5px', display: 'block' }

  return (
    <div>
      {expandedChart && (
        <div onClick={() => setExpandedChart(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <img src={expandedChart} style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '8px' }} />
        </div>
      )}

      <div style={{ background: '#EDE4D3', borderBottom: '1px solid #C8B89A', padding: '14px 24px' }}>
        <div style={{ fontFamily: 'Lora, serif', fontSize: '16px', fontWeight: 600, color: '#2B2318' }}>Level Poster</div>
        <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '2px' }}>Format your key levels into a clean post ready to share</div>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '700px' }}>
        <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={label}>Pair</label>
              <select value={selectedPair} onChange={e => setSelectedPair(e.target.value)} style={input}>
                <option value="">Select pair...</option>
                {pairs.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Timeframe</label>
              <select value={selectedTf} onChange={e => setSelectedTf(e.target.value)} style={input}>
                {TIMEFRAMES.map(tf => <option key={tf}>{tf}</option>)}
              </select>
            </div>
          </div>

          {selectedPair && total === 0 && (
            <div style={{ fontSize: '13px', color: '#9C856A', padding: '12px', background: '#F5EFE4', borderRadius: '8px' }}>
              No {selectedTf.toLowerCase()} levels found for {selectedPair}. Add some in Key Levels first.
            </div>
          )}

          {total > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <button
                  onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                  style={{ background: currentIndex === 0 ? '#E8DEC8' : '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '8px', padding: '7px 14px', fontSize: '16px', color: currentIndex === 0 ? '#C8B89A' : '#2B2318', cursor: currentIndex === 0 ? 'not-allowed' : 'pointer' }}
                >
                  ←
                </button>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 700, color: '#2B2318' }}>
                  {currentIndex + 1} / {total}
                </div>
                <button
                  onClick={() => setCurrentIndex(i => Math.min(total - 1, i + 1))}
                  disabled={currentIndex === total - 1}
                  style={{ background: currentIndex === total - 1 ? '#E8DEC8' : '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '8px', padding: '7px 14px', fontSize: '16px', color: currentIndex === total - 1 ? '#C8B89A' : '#2B2318', cursor: currentIndex === total - 1 ? 'not-allowed' : 'pointer' }}
                >
                  →
                </button>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={label}>Generated Post</label>
                <textarea
                  value={post}
                  readOnly
                  style={{ ...input, height: '240px', resize: 'vertical', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', lineHeight: 1.7 }}
                />
              </div>

              {current?.chart_url && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={label}>Chart Screenshot</label>
                  <img
                    src={current.chart_url}
                    onClick={() => setExpandedChart(current.chart_url)}
                    style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid #C8B89A', cursor: 'pointer', display: 'block' }}
                  />
                  <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '4px' }}>Click to expand</div>
                </div>
              )}

              <button onClick={copyToClipboard} style={{ background: copied ? '#3D7A52' : '#C8903A', border: 'none', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer', transition: 'background 0.2s' }}>
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
export default LevelPoster