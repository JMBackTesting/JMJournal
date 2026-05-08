import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

function Backups() {
  const [sources, setSources] = useState([])
  const [entries, setEntries] = useState([])
  const [activeSource, setActiveSource] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [showAddSource, setShowAddSource] = useState(false)
  const [showAddEntry, setShowAddEntry] = useState(false)
  const [search, setSearch] = useState('')
  const [searchMode, setSearchMode] = useState(false)
  const [sourceForm, setSourceForm] = useState({ name: '' })
  const [entryForm, setEntryForm] = useState({ title: '', content: '', tags: '', date: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchSources() }, [])
  useEffect(() => { if (activeSource) fetchEntries(activeSource.id) }, [activeSource])

  const fetchSources = async () => {
    const { data } = await supabase.from('backup_sources').select('*').order('created_at')
    if (data) {
      setSources(data)
      if (data.length > 0 && !activeSource) setActiveSource(data[0])
    }
  }

  const fetchEntries = async (sourceId) => {
    const { data } = await supabase.from('backup_entries').select('*').eq('source_id', sourceId).order('date', { ascending: false })
    if (data) setEntries(data)
  }

  const fetchAllEntries = async () => {
    const { data } = await supabase.from('backup_entries').select('*, backup_sources(name, color)').order('date', { ascending: false })
    if (data) setEntries(data)
  }

  const saveSource = async () => {
    if (!sourceForm.name) return
    const colors = ['#C8903A', '#3D7A52', '#5A90CA', '#9B3A28', '#7A4F9A', '#C87055']
    const color = colors[sources.length % colors.length]
    const { data } = await supabase.from('backup_sources').insert([{ name: sourceForm.name, color }]).select()
    if (data) {
      setSourceForm({ name: '' })
      setShowAddSource(false)
      await fetchSources()
      setActiveSource(data[0])
    }
  }

  const saveEntry = async () => {
    if (!entryForm.title || !activeSource) return
    setSaving(true)
    await supabase.from('backup_entries').insert([{
      source_id: activeSource.id,
      title: entryForm.title,
      content: entryForm.content,
      tags: entryForm.tags ? entryForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      date: entryForm.date
    }])
    setEntryForm({ title: '', content: '', tags: '', date: new Date().toISOString().split('T')[0] })
    setShowAddEntry(false)
    setSaving(false)
    fetchEntries(activeSource.id)
  }

  const deleteEntry = async (id) => {
    await supabase.from('backup_entries').delete().eq('id', id)
    if (searchMode) fetchAllEntries()
    else fetchEntries(activeSource.id)
  }

  const deleteSource = async (id) => {
    await supabase.from('backup_sources').delete().eq('id', id)
    if (activeSource?.id === id) {
      setActiveSource(null)
      setEntries([])
    }
    fetchSources()
  }

  const handleSearch = async (val) => {
    setSearch(val)
    if (val.trim().length > 1) {
      setSearchMode(true)
      const { data } = await supabase.from('backup_entries').select('*, backup_sources(name, color)').or(`title.ilike.%${val}%,content.ilike.%${val}%`).order('date', { ascending: false })
      if (data) setEntries(data)
    } else {
      setSearchMode(false)
      if (activeSource) fetchEntries(activeSource.id)
    }
  }

  const highlight = (text, query) => {
    if (!query || query.length < 2) return text
    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={i} style={{ background: '#F5E6C8', color: '#7A4F1A', borderRadius: '2px', padding: '0 2px' }}>{part}</mark>
        : part
    )
  }

  const input = { background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#2B2318', width: '100%', outline: 'none', fontFamily: 'DM Sans, sans-serif' }
  const label = { fontSize: '11px', fontWeight: 600, color: '#9C856A', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '5px', display: 'block' }

  const displayedEntries = entries

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ background: '#EDE4D3', borderBottom: '1px solid #C8B89A', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'Lora, serif', fontSize: '16px', fontWeight: 600, color: '#2B2318' }}>Backups</div>
          <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '2px' }}>Chat and thread archives — never lose a good idea</div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <input
              placeholder="Search all backups..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              style={{ ...input, width: '220px', paddingLeft: '32px' }}
            />
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#9C856A' }}>🔍</span>
            {search && <button onClick={() => { setSearch(''); setSearchMode(false); if (activeSource) fetchEntries(activeSource.id) }} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9C856A', fontSize: '14px' }}>✕</button>}
          </div>
          {!searchMode && activeSource && <button onClick={() => setShowAddEntry(!showAddEntry)} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>+ Add Entry</button>}
        </div>
      </div>

      {sources.length === 0 && !showAddSource && (
        <div style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '13px', color: '#9C856A' }}>No sources yet. Add your first one — e.g. "Mentor", "Discord", "Twitter".</div>
          <button onClick={() => setShowAddSource(true)} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '8px 18px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>+ Add Source</button>
        </div>
      )}

      {(sources.length > 0 || showAddSource) && (
        <>
          <div style={{ background: '#EDE4D3', borderBottom: '1px solid #C8B89A', padding: '0 24px', display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto' }}>
            {sources.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', borderBottom: activeSource?.id === s.id && !searchMode ? `2px solid ${s.color}` : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => { setActiveSource(s); setSearchMode(false); setSearch(''); setExpanded(null); setShowAddEntry(false) }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
                <span style={{ fontSize: '13px', fontWeight: activeSource?.id === s.id && !searchMode ? 700 : 500, color: activeSource?.id === s.id && !searchMode ? '#2B2318' : '#9C856A' }}>{s.name}</span>
                <button onClick={e => { e.stopPropagation(); deleteSource(s.id) }} style={{ background: 'none', border: 'none', color: '#C8B89A', cursor: 'pointer', fontSize: '12px', padding: '0 2px', marginLeft: '2px' }}>✕</button>
              </div>
            ))}
            <button onClick={() => setShowAddSource(!showAddSource)} style={{ padding: '10px 14px', background: 'none', border: 'none', fontSize: '13px', color: '#C8903A', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add Source</button>
          </div>

          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'auto' }}>

            {showAddSource && (
              <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', padding: '16px 18px' }}>
                <div style={{ fontFamily: 'Lora, serif', fontSize: '13px', fontWeight: 600, color: '#2B2318', marginBottom: '12px' }}>New Source</div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={label}>Name</label>
                    <input placeholder="e.g. Mentor, Discord, Twitter" value={sourceForm.name} onChange={e => setSourceForm({ name: e.target.value })} onKeyDown={e => e.key === 'Enter' && saveSource()} style={input} />
                  </div>
                  <button onClick={saveSource} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '8px 18px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>Save</button>
                  <button onClick={() => setShowAddSource(false)} style={{ background: 'transparent', border: '1px solid #C8B89A', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', color: '#9C856A', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}

            {showAddEntry && !searchMode && (
              <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', padding: '18px' }}>
                <div style={{ fontFamily: 'Lora, serif', fontSize: '13px', fontWeight: 600, color: '#2B2318', marginBottom: '14px' }}>New Entry — {activeSource?.name}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div><label style={label}>Title</label><input placeholder="e.g. BTC outlook week of May 5th" value={entryForm.title} onChange={e => setEntryForm({ ...entryForm, title: e.target.value })} style={input} /></div>
                  <div><label style={label}>Date</label><input type="date" value={entryForm.date} onChange={e => setEntryForm({ ...entryForm, date: e.target.value })} style={input} /></div>
                  <div><label style={label}>Tags (comma separated)</label><input placeholder="e.g. BTC, macro, risk" value={entryForm.tags} onChange={e => setEntryForm({ ...entryForm, tags: e.target.value })} style={input} /></div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={label}>Content — paste the full chat, thread or notes here</label>
                  <textarea placeholder="Paste the full conversation, thread, or write your notes..." value={entryForm.content} onChange={e => setEntryForm({ ...entryForm, content: e.target.value })} style={{ ...input, height: '160px', resize: 'vertical', lineHeight: 1.6 }} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={saveEntry} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>{saving ? 'Saving...' : 'Save Entry'}</button>
                  <button onClick={() => setShowAddEntry(false)} style={{ background: 'transparent', border: '1px solid #C8B89A', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, color: '#9C856A', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}

            {searchMode && (
              <div style={{ background: '#F5E6C8', border: '1px solid #C8903A', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#7A4F1A', fontWeight: 600 }}>
                🔍 Searching all sources for "{search}" — {displayedEntries.length} result{displayedEntries.length !== 1 ? 's' : ''} found
              </div>
            )}

            {!searchMode && !showAddEntry && displayedEntries.length === 0 && activeSource && (
              <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', padding: '24px', fontSize: '13px', color: '#9C856A' }}>
                No entries yet for {activeSource.name}. Hit + Add Entry to save your first backup.
              </div>
            )}

            {displayedEntries.map(entry => {
              const isExpanded = expanded === entry.id
              const source = entry.backup_sources || sources.find(s => s.id === entry.source_id)
              return (
                <div key={entry.id} style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', overflow: 'hidden' }}>
                  <div onClick={() => setExpanded(isExpanded ? null : entry.id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        {searchMode && source && (
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: source.color + '22', color: source.color, border: `1px solid ${source.color}` }}>{source.name}</span>
                        )}
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#2B2318' }}>{searchMode ? highlight(entry.title, search) : entry.title}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', color: '#9C856A', fontFamily: 'JetBrains Mono, monospace' }}>{entry.date}</span>
                        {entry.content && <span style={{ fontSize: '11px', color: '#9C856A' }}>{entry.content.length > 100 ? Math.round(entry.content.length / 5) + ' words' : 'short entry'}</span>}
                        {entry.tags?.map(tag => (
                          <span key={tag} style={{ fontSize: '10px', fontWeight: 600, padding: '1px 7px', borderRadius: '99px', background: '#F5E6C8', color: '#7A4F1A', border: '1px solid #C8903A' }}>{tag}</span>
                        ))}
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); deleteEntry(entry.id) }} style={{ background: 'transparent', border: 'none', color: '#C8B89A', cursor: 'pointer', fontSize: '14px', padding: '2px 6px', flexShrink: 0 }}>✕</button>
                    <span style={{ fontSize: '13px', color: '#9C856A', flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>
                  {isExpanded && entry.content && (
                    <div style={{ borderTop: '1px solid #C8B89A', padding: '16px', background: '#F5EFE4' }}>
                      <div style={{ fontSize: '13px', color: '#2B2318', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontFamily: 'DM Sans, sans-serif' }}>
                        {searchMode ? highlight(entry.content, search) : entry.content}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
export default Backups