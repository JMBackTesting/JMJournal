import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

const PRESETS = [
  { id: 'monthly', label: 'Monthly levels + review', description: 'Fires on the 1st of every month', recurrence: 'Monthly', scheduled_time: '09:00', icon: 'M' },
  { id: 'weekly', label: 'Weekly review + update weekly levels', description: 'Fires every Sunday', recurrence: 'Weekly', scheduled_time: '18:00', icon: 'W' },
  { id: 'eod', label: 'Update daily levels', description: 'Fires every other day', recurrence: 'Every other day', scheduled_time: '08:00', icon: 'D' },
]

const RECURRENCE = ['Once', 'Every day', 'Every other day', 'Weekly', 'Monthly']

function shouldShowToday(task) {
  const recurrence = task.tags?.[0] || 'Once'
  const start = new Date(task.date)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const diffDays = Math.floor((today - startDay) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return false
  if (recurrence === 'Once') return true
  if (recurrence === 'Every day') return true
  if (recurrence === 'Every other day') return diffDays % 2 === 0
  if (recurrence === 'Weekly') return diffDays % 7 === 0
  if (recurrence === 'Monthly') return start.getDate() === today.getDate()
  return false
}

function isDoneToday(task) {
  if (!task.last_completed_date) return false
  const today = new Date().toISOString().split('T')[0]
  return task.last_completed_date === today
}

function Tasks() {
  const [tasks, setTasks] = useState([])
  const [showing, setShowing] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const [activeTab, setActiveTab] = useState('today')
  const [form, setForm] = useState({ text: '', scheduled_time: '08:00', recurrence: 'Every day', date: new Date().toISOString().split('T')[0] })

  useEffect(() => { fetchTasks() }, [activeTab])

  const fetchTasks = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('tasks').select('*').order('scheduled_time')
    if (!data) return
    if (activeTab === 'today') {
      setTasks(data.filter(t => shouldShowToday(t)))
    } else {
      setTasks(data)
    }
  }

  const addPreset = async (preset) => {
    const today = new Date()
    let startDate = new Date().toISOString().split('T')[0]
    if (preset.recurrence === 'Weekly') {
      const day = today.getDay()
      const daysUntilSunday = day === 0 ? 0 : 7 - day
      const sunday = new Date(today)
      sunday.setDate(today.getDate() + daysUntilSunday)
      startDate = sunday.toISOString().split('T')[0]
    }
    if (preset.recurrence === 'Monthly') {
      const firstOfNext = new Date(today.getFullYear(), today.getMonth() + (today.getDate() === 1 ? 0 : 1), 1)
      startDate = firstOfNext.toISOString().split('T')[0]
    }
    await supabase.from('tasks').insert([{
      text: preset.label,
      scheduled_time: preset.scheduled_time,
      done: false,
      is_recurring: true,
      urgent: false,
      date: startDate,
      tags: [preset.recurrence]
    }])
    setShowing(false)
    fetchTasks()
  }

  const saveCustomTask = async () => {
    if (!form.text) return
    const isRecurring = form.recurrence !== 'Once'
    await supabase.from('tasks').insert([{
      text: form.text,
      scheduled_time: form.scheduled_time,
      done: false,
      is_recurring: isRecurring,
      urgent: false,
      date: form.date,
      tags: [form.recurrence]
    }])
    setForm({ text: '', scheduled_time: '08:00', recurrence: 'Every day', date: new Date().toISOString().split('T')[0] })
    setShowCustom(false)
    setShowing(false)
    fetchTasks()
  }

  const toggleTask = async (task) => {
    const today = new Date().toISOString().split('T')[0]
    const currentlyDone = isDoneToday(task)
    if (task.is_recurring) {
      await supabase.from('tasks').update({
        last_completed_date: currentlyDone ? null : today,
        done: false
      }).eq('id', task.id)
    } else {
      await supabase.from('tasks').update({ done: !task.done }).eq('id', task.id)
    }
    fetchTasks()
  }

  const deleteTask = async (id) => {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(tasks.filter(t => t.id !== id))
  }

  const getRecurrence = (task) => task.tags?.[0] || 'Once'

  const recurrenceColor = (r) => {
    if (r === 'Every day') return { bg: '#D4EAD8', color: '#2A5E38', border: '#5DA070' }
    if (r === 'Every other day') return { bg: '#E6F0FA', color: '#1A4F7A', border: '#5A90CA' }
    if (r === 'Weekly') return { bg: '#F5E6C8', color: '#7A4F1A', border: '#C8903A' }
    if (r === 'Monthly') return { bg: '#F5DACE', color: '#7A2E18', border: '#C87055' }
    return { bg: '#F1EFE8', color: '#5F5E5A', border: '#B4B2A9' }
  }

  const input = { background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#2B2318', width: '100%', outline: 'none', fontFamily: 'DM Sans, sans-serif' }
  const label = { fontSize: '11px', fontWeight: 600, color: '#9C856A', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '5px', display: 'block' }

  const pending = tasks.filter(t => t.is_recurring ? !isDoneToday(t) : !t.done)
  const done = tasks.filter(t => t.is_recurring ? isDoneToday(t) : t.done)

  return (
    <div>
      <div style={{ background: '#EDE4D3', borderBottom: '1px solid #C8B89A', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'Lora, serif', fontSize: '16px', fontWeight: 600, color: '#2B2318' }}>Tasks</div>
          <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '2px' }}>{pending.length} remaining today</div>
        </div>
        <button onClick={() => setShowing(!showing)} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>+ Add Task</button>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '10px', padding: '3px', width: 'fit-content' }}>
          {['today', 'all'].map(tab => (
            <div key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '6px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: activeTab === tab ? '#F5EFE4' : 'transparent', color: activeTab === tab ? '#2B2318' : '#9C856A', border: activeTab === tab ? '1px solid #C8B89A' : '1px solid transparent' }}>{tab === 'today' ? 'Today' : 'All Tasks'}</div>
          ))}
        </div>

        {showing && (
          <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontFamily: 'Lora, serif', fontSize: '14px', fontWeight: 600, color: '#2B2318', marginBottom: '4px' }}>Add Task</div>
            <div style={{ fontSize: '12px', color: '#9C856A', marginBottom: '16px' }}>Choose a preset or create a custom task</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {PRESETS.map(preset => (
                <div key={preset.id} onClick={() => addPreset(preset)} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '10px', cursor: 'pointer' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#EDE4D3', border: '1px solid #C8B89A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 700, color: '#C8903A', flexShrink: 0 }}>{preset.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#2B2318', marginBottom: '2px' }}>{preset.label}</div>
                    <div style={{ fontSize: '11px', color: '#9C856A' }}>{preset.description} at {preset.scheduled_time} — resets automatically</div>
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', ...(() => { const rc = recurrenceColor(preset.recurrence); return { background: rc.bg, color: rc.color, border: '1px solid ' + rc.border } })() }}>{preset.recurrence}</div>
                </div>
              ))}
            </div>

            <div onClick={() => setShowCustom(!showCustom)} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: '#9C856A', cursor: 'pointer', marginBottom: showCustom ? '12px' : '0' }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: '1px solid #C8B89A', background: showCustom ? '#C8903A' : '#F5EFE4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {showCustom && <span style={{ color: 'white', fontSize: '11px' }}>✓</span>}
              </div>
              Add a custom task instead
            </div>

            {showCustom && (
              <div style={{ background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '10px', padding: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div><label style={label}>Task</label><input type="text" placeholder="e.g. Check open positions" value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} style={input} /></div>
                  <div><label style={label}>Time</label><input type="time" value={form.scheduled_time} onChange={e => setForm({ ...form, scheduled_time: e.target.value })} style={input} /></div>
                  <div><label style={label}>Recurrence</label><select value={form.recurrence} onChange={e => setForm({ ...form, recurrence: e.target.value })} style={input}>{RECURRENCE.map(r => <option key={r}>{r}</option>)}</select></div>
                  <div><label style={label}>Start date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={input} /></div>
                </div>
                <button onClick={saveCustomTask} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>Save Task</button>
              </div>
            )}

            <div style={{ marginTop: '14px' }}>
              <button onClick={() => { setShowing(false); setShowCustom(false) }} style={{ background: 'transparent', border: '1px solid #C8B89A', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, color: '#9C856A', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        {pending.length > 0 && (
          <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '10px 18px', borderBottom: '1px solid #C8B89A', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9C856A', background: '#E8DEC8' }}>Pending</div>
            {pending.map((t, i) => {
              const r = getRecurrence(t)
              const rc = recurrenceColor(r)
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px', borderBottom: i < pending.length - 1 ? '1px solid #C8B89A' : 'none' }}>
                  <div onClick={() => toggleTask(t)} style={{ width: '18px', height: '18px', borderRadius: '4px', border: '1.5px solid #C8B89A', flexShrink: 0, background: '#F5EFE4', cursor: 'pointer' }} />
                  <div style={{ flex: 1, fontSize: '13px', color: '#2B2318' }}>{t.text}</div>
                  {t.is_recurring && <span style={{ fontSize: '10px', color: '#9C856A', fontStyle: 'italic' }}>auto-resets</span>}
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: rc.bg, color: rc.color, border: '1px solid ' + rc.border, whiteSpace: 'nowrap' }}>{r}</span>
                  {t.scheduled_time && <span style={{ fontSize: '11px', color: '#9C856A', fontFamily: 'JetBrains Mono, monospace' }}>{t.scheduled_time}</span>}
                  <button onClick={() => deleteTask(t.id)} style={{ background: 'transparent', border: 'none', color: '#C8B89A', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}>x</button>
                </div>
              )
            })}
          </div>
        )}

        {done.length > 0 && (
          <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '10px 18px', borderBottom: '1px solid #C8B89A', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9C856A', background: '#E8DEC8' }}>Done</div>
            {done.map((t, i) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 18px', borderBottom: i < done.length - 1 ? '1px solid #C8B89A' : 'none' }}>
                <div onClick={() => toggleTask(t)} style={{ width: '18px', height: '18px', borderRadius: '4px', border: '1.5px solid #3D7A52', flexShrink: 0, background: '#3D7A52', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'white', fontSize: '11px' }}>✓</span>
                </div>
                <div style={{ flex: 1, fontSize: '13px', color: '#9C856A', textDecoration: 'line-through' }}>{t.text}</div>
                {t.is_recurring && <span style={{ fontSize: '10px', color: '#9C856A', fontStyle: 'italic' }}>resets next due date</span>}
                <button onClick={() => deleteTask(t.id)} style={{ background: 'transparent', border: 'none', color: '#C8B89A', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}>x</button>
              </div>
            ))}
          </div>
        )}

        {tasks.length === 0 && !showing && (
          <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', padding: '24px', fontSize: '13px', color: '#9C856A' }}>No tasks yet. Hit Add Task to set up your recurring reminders.</div>
        )}
      </div>
    </div>
  )
}
export default Tasks
