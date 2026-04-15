import { useState } from 'react'
import { supabase } from '../supabase'

function toCSV(data) {
  if (!data || data.length === 0) return ''
  const headers = Object.keys(data[0])
  const rows = data.map(row => headers.map(h => {
    const val = row[h] === null || row[h] === undefined ? '' : row[h]
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val)
    return '"' + str.replace(/"/g, '""') + '"'
  }).join(','))
  return [headers.join(','), ...rows].join('\n')
}

function downloadCSV(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const EXPORTS = [
  { id: 'trades', label: 'Trades', description: 'All logged trades with P&L, entry, exit, notes', table: 'trades' },
  { id: 'journal', label: 'Journal Entries', description: 'All active and closed positions from Journal', table: 'journal_entries' },
  { id: 'key_levels', label: 'Key Levels', description: 'All daily, weekly and monthly key levels', table: 'key_levels' },
  { id: 'tasks', label: 'Tasks', description: 'All tasks including recurring ones', table: 'tasks' },
  { id: 'education_authors', label: 'Education — People', description: 'All people added to Education', table: 'education_authors' },
  { id: 'education_articles', label: 'Education — Articles', description: 'All articles saved under Education', table: 'education_articles' },
]

function Export() {
  const [loading, setLoading] = useState({})
  const [exported, setExported] = useState({})
  const [exportingAll, setExportingAll] = useState(false)

  const exportTable = async (table, label) => {
    setLoading(prev => ({ ...prev, [table]: true }))
    const { data, error } = await supabase.from(table).select('*')
    if (!error && data) {
      const csv = toCSV(data)
      downloadCSV(label.toLowerCase().replace(/\s/g, '_') + '_export.csv', csv)
      setExported(prev => ({ ...prev, [table]: data.length }))
    }
    setLoading(prev => ({ ...prev, [table]: false }))
  }

  const exportAll = async () => {
    setExportingAll(true)
    for (const item of EXPORTS) {
      const { data, error } = await supabase.from(item.table).select('*')
      if (!error && data) {
        const csv = toCSV(data)
        downloadCSV(item.table + '_export.csv', csv)
        setExported(prev => ({ ...prev, [item.table]: data.length }))
        await new Promise(r => setTimeout(r, 400))
      }
    }
    setExportingAll(false)
  }

  return (
    <div>
      <div style={{ background: '#EDE4D3', borderBottom: '1px solid #C8B89A', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'Lora, serif', fontSize: '16px', fontWeight: 600, color: '#2B2318' }}>Export Data</div>
          <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '2px' }}>Download your data as CSV — opens in Google Sheets or Excel</div>
        </div>
        <button onClick={exportAll} disabled={exportingAll} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: exportingAll ? 'not-allowed' : 'pointer', opacity: exportingAll ? 0.7 : 1 }}>
          {exportingAll ? 'Exporting...' : '⬇ Export Everything'}
        </button>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '10px', padding: '14px 18px', marginBottom: '6px' }}>
          <div style={{ fontSize: '12px', color: '#5A4535', lineHeight: 1.6 }}>
            Each export downloads as a <strong>.csv file</strong>. To import into Google Sheets: open Google Sheets → File → Import → Upload the CSV file → click Import.
          </div>
        </div>

        {EXPORTS.map(item => (
          <div key={item.id} style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#2B2318', marginBottom: '3px' }}>{item.label}</div>
              <div style={{ fontSize: '12px', color: '#9C856A' }}>{item.description}</div>
              {exported[item.table] !== undefined && (
                <div style={{ fontSize: '11px', color: '#3D7A52', fontWeight: 600, marginTop: '4px' }}>✓ Exported {exported[item.table]} rows</div>
              )}
            </div>
            <button onClick={() => exportTable(item.table, item.label)} disabled={loading[item.table]} style={{ background: loading[item.table] ? '#E8DEC8' : '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '8px', padding: '8px 18px', fontSize: '13px', fontWeight: 600, color: loading[item.table] ? '#9C856A' : '#2B2318', cursor: loading[item.table] ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', minWidth: '100px' }}>
              {loading[item.table] ? 'Downloading...' : '⬇ Download'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
export default Export