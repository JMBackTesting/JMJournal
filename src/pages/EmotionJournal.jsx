import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase'

const CATEGORIES = ['Emotion', 'Setup Observation', 'Market Note', 'Lesson', 'Mistake', 'General']
const MOODS = ['Great', 'Good', 'Neutral', 'Anxious', 'Frustrated', 'Tired', 'Overconfident', 'Fearful']
const PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'HYPE/USDT', 'USDT.D', 'General', 'Other']

const categoryColor = (c) => {
  if (c === 'Emotion') return { bg: '#E6D4F0', color: '#5A1A7A', border: '#9A6AC8' }
  if (c === 'Setup Observation') return { bg: '#D4E8F0', color: '#1A4F6A', border: '#5A90B0' }
  if (c === 'Market Note') return { bg: '#D4EAD8', color: '#2A5E38', border: '#5DA070' }
  if (c === 'Lesson') return { bg: '#F5E6C8', color: '#7A4F1A', border: '#C8903A' }
  if (c === 'Mistake') return { bg: '#F5DACE', color: '#7A2E18', border: '#C87055' }
  if (c === 'General') return { bg: '#F5EFE4', color: '#9C856A', border: '#C8B89A' }
  return { bg: '#F5EFE4', color: '#9C856A', border: '#C8B89A' }
}

const moodColor = (m) => {
  if (m === 'Great') return { bg: '#D4EAD8', color: '#2A5E38', border: '#5DA070' }
  if (m === 'Good') return { bg: '#E8F5E8', color: '#3D7A52', border: '#8DC898' }
  if (m === 'Neutral') return { bg: '#F5EFE4', color: '#9C856A', border: '#C8B89A' }
  if (m === 'Anxious') return { bg: '#F5E6C8', color: '#7A4F1A', border: '#C8903A' }
  if (m === 'Frustrated') return { bg: '#F5DACE', color: '#7A2E18', border: '#C87055' }
  if (m === 'Tired') return { bg: '#E8E4F0', color: '#5A4A7A', border: '#9A8AC8' }
  if (m === 'Overconfident') return { bg: '#F0E6D4', color: '#7A5A1A', border: '#C8A855' }
  if (m === 'Fearful') return { bg: '#F0D4D4', color: '#7A1A1A', border: '#C85555' }
  return { bg: '#F5EFE4', color: '#9C856A', border: '#C8B89A' }
}

const emptyForm = {
  date: new Date().toISOString().split('T')[0],
  title: '',
  category: 'General',
  pair: 'General',
  pre_mood: '',
  notes: '',
  lessons: '',
}

function TradingNotes() {
  const [entries, setEntries] = useState([])
  const [showing, setShowing] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [expandedChart, setExpandedChart] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [form, setForm] = useState(emptyForm)
  const [filterCategory, setFilterCategory] = useState('All')
  const [chartFile, setChartFile] = useState(null)
  const [chartPreview, setChartPreview] = useState(null)
  const [editChartFile, setEditChartFile] = useState(null)
  const [editChartPreview, setEditChartPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()
  const pasteRef = useRef()
  const editFileRef = useRef()
  const editPasteRef = useRef()

  useEffect(() => { fetchEntries() }, [])

  const fetchEntries = async () => {
    const { data } = await supabase.from('emotion_journal').select('*').order('created_at', { ascending: false })
    if (data) setEntries(data)
  }

  const uploadChart = async (file) => {
    if (!file) return null
    const fileName = Date.now() + '_note.png'
    const { error } = await supabase.storage.from('charts').upload(fileName, file)
    if (error) return null
    const { data: urlData } = supabase.storage.from('charts').getPublicUrl(fileName)
    return urlData.publicUrl
  }

  const handlePaste = (e, setFile, setPreview) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image')) {
        const file = items[i].getAsFile()
        setFile(file)
        setPreview(URL.createObjectURL(file))
        break
      }
    }
  }

  const saveEntry = async () => {
    if (!form.notes && !form.title) return
    setUploading(true)
    const chart_url = await uploadChart(chartFile)
    await supabase.from('emotion_journal').insert([{
      date: form.date,
      title: form.title || null,
      category: form.category || 'General',
      pair: form.pair || 'General',
      pre_mood: form.pre_mood || null,
      notes: form.notes || null,
      lessons: form.lessons || null,
      energy: chart_url || null,
    }])
    setForm(emptyForm)
    setChartFile(null)
    setChartPreview(null)
    setShowing(false)
    setUploading(false)
    fetchEntries()
  }

  const saveEdit = async (id) => {
    setUploading(true)
    let chart_url = editForm.energy || null
    if (editChartFile) {
      const uploaded = await uploadChart(editChartFile)
      if (uploaded) chart_url = uploaded
    }
    await supabase.from('emotion_journal').update({
      title: editForm.title || null,
      category: editForm.category || 'General',
      pair: editForm.pair || 'General',
      pre_mood: editForm.pre_mood || null,
      notes: editForm.notes || null,
      lessons: editForm.lessons || null,
      energy: chart_url || null,
    }).eq('id', id)
    setEditingId(null)
    setEditChartFile(null)
    setEditChartPreview(null)
    setUploading(false)
    fetchEntries()
  }

  const deleteEntry = async (id) => {
    await supabase.from('emotion_journal').delete().eq('id', id)
    setEntries(entries.filter(e => e.id !== id))
  }

  const filtered = filterCategory === 'All' ? entries : entries.filter(e => e.category === filterCategory)

  const input = { background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#2B2318', width: '100%', outline: 'none', fontFamily: 'DM Sans, sans-serif' }
  const label = { fontSize: '11px', fontWeight: 600, color: '#9C856A', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '5px', display: 'block' }

  const CategoryBadge = ({ cat }) => {
    if (!cat) return null
    const cc = categoryColor(cat)
    return <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: cc.bg, color: cc.color, border: '1px solid ' + cc.border }}>{cat}</span>
  }

  const MoodBadge = ({ mood }) => {
    if (!mood) return null
    const mc = moodColor(mood)
    return <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: mc.bg, color: mc.color, border: '1px solid ' + mc.border }}>{mood}</span>
  }

  const renderScreenshotUpload = (preview, setFile, setPreview, fRef, pRef) => (
    <div>
      <label style={label}>Screenshot (optional)</label>
      <div ref={pRef} onPaste={e => handlePaste(e, setFile, setPreview)} tabIndex={0} style={{ border: '2px dashed #C8B89A', borderRadius: '8px', padding: '14px', textAlign: 'center', background: '#F5EFE4', outline: 'none' }}>
        {preview ? (
          <img src={preview} style={{ maxHeight: '160px', borderRadius: '6px', objectFit: 'contain' }} />
        ) : (
          <div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '6px' }}>
              <button type="button" onClick={() => fRef.current.click()} style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', color: '#5A4535', cursor: 'pointer', fontWeight: 600 }}>Browse file</button>
              <button type="button" onClick={() => pRef.current.focus()} style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', color: '#5A4535', cursor: 'pointer', fontWeight: 600 }}>Click then Ctrl+V</button>
            </div>
            <div style={{ fontSize: '11px', color: '#C8B89A' }}>Paste or upload a chart screenshot</div>
          </div>
        )}
        <input ref={fRef} type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if (f) { setFile(f); setPreview(URL.createObjectURL(f)) } }} style={{ display: 'none' }} />
      </div>
      {preview && <button onClick={() => { setFile(null); setPreview(null) }} style={{ marginTop: '4px', background: 'transparent', border: 'none', fontSize: '11px', color: '#9C856A', cursor: 'pointer' }}>Remove image</button>}
    </div>
  )

  const renderForm = (f, setF, onSave, onCancel, isEdit = false) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        <div>
          <label style={label}>Date</label>
          <input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} style={input} />
        </div>
        <div>
          <label style={label}>Category</label>
          <select value={f.category} onChange={e => setF({ ...f, category: e.target.value })} style={input}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={label}>Pair</label>
          <select value={f.pair} onChange={e => setF({ ...f, pair: e.target.value })} style={input}>
            {PAIRS.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label style={label}>Title (optional)</label>
        <input type="text" placeholder="e.g. BTC support rejection, FOMO trade, missed entry..." value={f.title} onChange={e => setF({ ...f, title: e.target.value })} style={input} />
      </div>

      {f.category === 'Emotion' && (
        <div>
          <label style={label}>Mood</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {MOODS.map(m => {
              const mc = moodColor(m)
              const active = f.pre_mood === m
              return (
                <div key={m} onClick={() => setF({ ...f, pre_mood: active ? '' : m })} style={{ padding: '5px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: active ? mc.bg : '#F5EFE4', color: active ? mc.color : '#9C856A', border: active ? '1.5px solid ' + mc.border : '1px solid #C8B89A' }}>
                  {m}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <label style={label}>{f.category === 'Emotion' ? 'What\'s on your mind?' : f.category === 'Setup Observation' ? 'What did you observe?' : f.category === 'Lesson' ? 'What did you learn?' : f.category === 'Mistake' ? 'What went wrong?' : f.category === 'Market Note' ? 'Market observation' : 'Notes'}</label>
        <textarea
          placeholder={
            f.category === 'Emotion' ? 'How are you feeling? Any external stress, mindset concerns...' :
            f.category === 'Setup Observation' ? 'e.g. BTC rejecting from weekly resistance, clean structure, good risk...' :
            f.category === 'Lesson' ? 'e.g. Patience paid off waiting for the retest rather than chasing...' :
            f.category === 'Mistake' ? 'e.g. Entered early before confirmation, sized too large...' :
            f.category === 'Market Note' ? 'e.g. USDT.D showing strength, alts weakening, BTC dominance rising...' :
            'Write your note here...'
          }
          value={f.notes}
          onChange={e => setF({ ...f, notes: e.target.value })}
          style={{ ...input, height: '100px', resize: 'vertical' }}
        />
      </div>

      {(f.category === 'Lesson' || f.category === 'Mistake' || f.category === 'Emotion') && (
        <div>
          <label style={label}>What will you do differently?</label>
          <textarea placeholder="Action or intention going forward..." value={f.lessons} onChange={e => setF({ ...f, lessons: e.target.value })} style={{ ...input, height: '70px', resize: 'vertical' }} />
        </div>
      )}

      {isEdit
        ? renderScreenshotUpload(editChartPreview || f.energy, setEditChartFile, setEditChartPreview, editFileRef, editPasteRef)
        : renderScreenshotUpload(chartPreview, setChartFile, setChartPreview, fileRef, pasteRef)
      }

      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={onSave} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>{uploading ? 'Saving...' : 'Save'}</button>
        <button onClick={onCancel} style={{ background: 'transparent', border: '1px solid #C8B89A', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, color: '#9C856A', cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  )

  return (
    <div>
      {expandedChart && (
        <div onClick={() => setExpandedChart(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <img src={expandedChart} style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '8px' }} />
        </div>
      )}

      <div style={{ background: '#EDE4D3', borderBottom: '1px solid #C8B89A', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'Lora, serif', fontSize: '16px', fontWeight: 600, color: '#2B2318' }}>Trading Notes</div>
          <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '2px' }}>{entries.length} notes logged</div>
        </div>
        <button onClick={() => setShowing(!showing)} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>+ Quick Note</button>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {showing && (
          <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontFamily: 'Lora, serif', fontSize: '14px', fontWeight: 600, color: '#2B2318', marginBottom: '16px' }}>New Note</div>
            {renderForm(form, setForm, saveEntry, () => { setShowing(false); setForm(emptyForm); setChartFile(null); setChartPreview(null) })}
          </div>
        )}

        <div style={{ display: 'flex', background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '10px', padding: '3px', width: 'fit-content', flexWrap: 'wrap', gap: '2px' }}>
          {['All', ...CATEGORIES].map(c => {
            const cc = c !== 'All' ? categoryColor(c) : null
            const active = filterCategory === c
            return (
              <div key={c} onClick={() => setFilterCategory(c)} style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', background: active ? (cc ? cc.bg : '#F5EFE4') : 'transparent', color: active ? (cc ? cc.color : '#2B2318') : '#9C856A', border: active ? '1px solid ' + (cc ? cc.border : '#C8B89A') : '1px solid transparent', whiteSpace: 'nowrap' }}>
                {c}
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && !showing && (
          <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', padding: '24px', fontSize: '13px', color: '#9C856A' }}>
            No notes yet{filterCategory !== 'All' ? ' in ' + filterCategory : ''}. Hit Quick Note to log something.
          </div>
        )}

        {filtered.map(entry => {
          const isExpanded = expanded === entry.id
          const isEditing = editingId === entry.id
          const cc = categoryColor(entry.category)
          return (
            <div key={entry.id} style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', overflow: 'hidden' }}>
              <div onClick={() => { if (!isEditing) setExpanded(isExpanded ? null : entry.id) }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', cursor: 'pointer' }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#9C856A', minWidth: '70px' }}>
                  {new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </div>
                <CategoryBadge cat={entry.category} />
                {entry.pair && entry.pair !== 'General' && (
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 600, color: '#5A4535' }}>{entry.pair}</span>
                )}
                {entry.pre_mood && <MoodBadge mood={entry.pre_mood} />}
                <div style={{ flex: 1, fontSize: '13px', color: '#2B2318', fontWeight: entry.title ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.title || entry.notes}
                </div>
                {entry.energy && <span style={{ fontSize: '11px', color: '#9C856A' }}>📸</span>}
                <span style={{ fontSize: '14px', color: '#9C856A' }}>{isExpanded ? '▲' : '▼'}</span>
              </div>

              {isExpanded && !isEditing && (
                <div style={{ borderTop: '1px solid #C8B89A', padding: '16px 18px', background: '#F5EFE4', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <CategoryBadge cat={entry.category} />
                    {entry.pair && entry.pair !== 'General' && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', fontWeight: 600, color: '#5A4535', background: '#EDE4D3', padding: '2px 8px', borderRadius: '99px', border: '1px solid #C8B89A' }}>{entry.pair}</span>}
                    {entry.pre_mood && <MoodBadge mood={entry.pre_mood} />}
                  </div>
                  {entry.title && <div style={{ fontSize: '14px', fontWeight: 700, color: '#2B2318' }}>{entry.title}</div>}
                  {entry.notes && (
                    <div style={{ fontSize: '13px', color: '#2B2318', lineHeight: 1.7, background: '#EDE4D3', padding: '12px', borderRadius: '8px', whiteSpace: 'pre-wrap' }}>{entry.notes}</div>
                  )}
                  {entry.lessons && (
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#9C856A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '5px' }}>Going forward</div>
                      <div style={{ fontSize: '13px', color: '#2B2318', lineHeight: 1.7, background: '#EDE4D3', padding: '12px', borderRadius: '8px', borderLeft: '3px solid #C8903A', whiteSpace: 'pre-wrap' }}>{entry.lessons}</div>
                    </div>
                  )}
                  {entry.energy && (
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#9C856A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Screenshot</div>
                      <img onClick={() => setExpandedChart(entry.energy)} src={entry.energy} style={{ maxWidth: '100%', borderRadius: '8px', cursor: 'pointer', border: '1px solid #C8B89A' }} />
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => { setEditingId(entry.id); setEditForm({ date: entry.date, title: entry.title || '', category: entry.category || 'General', pair: entry.pair || 'General', pre_mood: entry.pre_mood || '', notes: entry.notes || '', lessons: entry.lessons || '', energy: entry.energy || null }); setEditChartPreview(entry.energy || null); setEditChartFile(null) }} style={{ background: 'transparent', border: '1px solid #C8B89A', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: 600, color: '#5A4535', cursor: 'pointer' }}>✏️ Edit</button>
                    <button onClick={() => deleteEntry(entry.id)} style={{ background: 'transparent', border: '1px solid #C8B89A', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: 600, color: '#9C856A', cursor: 'pointer' }}>Delete</button>
                  </div>
                </div>
              )}

              {isEditing && (
                <div style={{ borderTop: '1px solid #C8B89A', padding: '16px 18px', background: '#F5EFE4' }}>
                  {renderForm(editForm, setEditForm, () => saveEdit(entry.id), () => { setEditingId(null); setEditChartFile(null); setEditChartPreview(null) }, true)}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
export default TradingNotes