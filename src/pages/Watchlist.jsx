import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

const PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'HYPE/USDT', 'Other']
const STATUSES = ['Watching', 'Entered', 'Passed', 'Invalidated']

const statusColor = (s) => {
  if (s === 'Watching') return { bg: '#F5E6C8', color: '#7A4F1A', border: '#C8903A' }
  if (s === 'Entered') return { bg: '#D4EAD8', color: '#2A5E38', border: '#5DA070' }
  if (s === 'Passed') return { bg: '#F1EFE8', color: '#5F5E5A', border: '#B4B2A9' }
  if (s === 'Invalidated') return { bg: '#F5DACE', color: '#7A2E18', border: '#C87055' }
  return { bg: '#F5EFE4', color: '#9C856A', border: '#C8B89A' }
}

const emptyForm = { pair: 'BTC/USDT', customPair: '', price: '', notes: '', status: 'Watching' }

function Watchlist() {
  const [items, setItems] = useState([])
  const [showing, setShowing] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})

  useEffect(() => { fetchItems() }, [])

  const fetchItems = async () => {
    const { data } = await supabase.from('watchlist').select('*').order('created_at', { ascending: false })
    if (data) setItems(data)
  }

  const saveItem = async () => {
    const finalPair = form.pair === 'Other' ? form.customPair : form.pair
    if (!finalPair) return
    await supabase.from('watchlist').insert([{
      pair: finalPair,
      price: parseFloat(form.price) || null,
      notes: form.notes,
      status: form.status
    }])
    setForm(emptyForm)
    setShowing(false)
    fetchItems()
  }

  const updateStatus = async (id, status) => {
    await supabase.from('watchlist').update({ status }).eq('id', id)
    setItems(items.map(i => i.id === id ? { ...i, status } : i))
  }

  const saveEdit = async (id) => {
    await supabase.from('watchlist').update({
      price: parseFloat(editForm.price) || null,
      notes: editForm.notes,
      status: editForm.status
    }).eq('id', id)
    setEditingId(null)
    fetchItems()
  }

  const deleteItem = async (id) => {
    await supabase.from('watchlist').delete().eq('id', id)
    setItems(items.filter(i => i.id !== id))
  }

  const watching = items.filter(i => i.status === 'Watching')
  const entered = items.filter(i => i.status === 'Entered')
  const other = items.filter(i => i.status === 'Passed' || i.status === 'Invalidated')

  const input = { background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#2B2318', width: '100%', outline: 'none', fontFamily: 'DM Sans, sans-serif' }
  const label = { fontSize: '11px', fontWeight: 600, color: '#9C856A', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '5px', display: 'block' }

  const renderItem = (item) => {
    const sc = statusColor(item.status)
    const isEditing = editingId === item.id
    return (
      <div key={item.id} style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '10px', padding: '14px 16px', marginBottom: '8px' }}>
        {!isEditing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: 700, color: '#2B2318', minWidth: '100px' }}>{item.pair}</div>
            {item.price && <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: '#5A4535' }}>@ {item.price}</div>}
            <div style={{ flex: 1, fontSize: '12px', color: '#9C856A' }}>{item.notes || '—'}</div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <select value={item.status} onChange={e => updateStatus(item.id, e.target.value)} onClick={e => e.stopPropagation()} style={{ ...input, width: 'auto', fontSize: '11px', padding: '4px 8px', background: sc.bg, color: sc.color, border: '1px solid ' + sc.border, fontWeight: 700 }}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
              <button onClick={() => { setEditingId(item.id); setEditForm({ price: item.price || '', notes: item.notes || '', status: item.status }) }} style={{ background: 'transparent', border: '1px solid #C8B89A', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', color: '#5A4535', cursor: 'pointer' }}>Edit</button>
              <button onClick={() => deleteItem(item.id)} style={{ background: 'transparent', border: 'none', color: '#C8B89A', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}>x</button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div><label style={label}>Price Level</label><input type="number" placeholder="0.00" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} style={input} /></div>
              <div><label style={label}>Status</label><select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} style={input}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
              <div><label style={label}>Notes</label><input type="text" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} style={input} /></div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => saveEdit(item.id)} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>Save</button>
              <button onClick={() => setEditingId(null)} style={{ background: 'transparent', border: '1px solid #C8B89A', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', color: '#9C856A', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={{ background: '#EDE4D3', borderBottom: '1px solid #C8B89A', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'Lora, serif', fontSize: '16px', fontWeight: 600, color: '#2B2318' }}>Watchlist</div>
          <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '2px' }}>{watching.length} watching · {entered.length} entered</div>
        </div>
        <button onClick={() => setShowing(!showing)} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>+ Add to Watchlist</button>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {showing && (
          <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontFamily: 'Lora, serif', fontSize: '14px', fontWeight: 600, color: '#2B2318', marginBottom: '16px' }}>Add to Watchlist</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={label}>Pair</label>
                <select value={form.pair} onChange={e => setForm({ ...form, pair: e.target.value })} style={input}>
                  {PAIRS.map(p => <option key={p}>{p}</option>)}
                </select>
                {form.pair === 'Other' && <input type="text" placeholder="e.g. PEPE/USDT" value={form.customPair} onChange={e => setForm({ ...form, customPair: e.target.value.toUpperCase() })} style={{ ...input, marginTop: '6px' }} />}
              </div>
              <div><label style={label}>Price Level</label><input type="number" placeholder="0.00" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} style={input} /></div>
              <div><label style={label}>Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={input}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
              <div><label style={label}>Notes</label><input type="text" placeholder="Why are you watching this?" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={input} /></div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={saveItem} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>Save</button>
              <button onClick={() => setShowing(false)} style={{ background: 'transparent', border: '1px solid #C8B89A', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, color: '#9C856A', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        {items.length === 0 && !showing && (
          <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', padding: '24px', fontSize: '13px', color: '#9C856A' }}>Nothing on your watchlist yet.</div>
        )}

        {watching.length > 0 && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Watching ({watching.length})</div>
            {watching.map(renderItem)}
          </div>
        )}

        {entered.length > 0 && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#3D7A52', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Entered ({entered.length})</div>
            {entered.map(renderItem)}
          </div>
        )}

        {other.length > 0 && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9C856A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Passed / Invalidated ({other.length})</div>
            {other.map(renderItem)}
          </div>
        )}
      </div>
    </div>
  )
}
export default Watchlist