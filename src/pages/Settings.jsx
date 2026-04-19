import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

function Settings() {
  const [form, setForm] = useState({
    account_size: '', daily_drawdown: '', max_drawdown: '',
    goal_daily: '', goal_weekly: '', goal_monthly: '', goal_yearly: ''
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.from('settings').select('*').then(({ data }) => {
      if (!data) return
      const map = {}
      data.forEach(row => { map[row.key] = row.value })
      setForm({
        account_size: map.account_size || '',
        daily_drawdown: map.daily_drawdown || '',
        max_drawdown: map.max_drawdown || '',
        goal_daily: map.goal_daily || '',
        goal_weekly: map.goal_weekly || '',
        goal_monthly: map.goal_monthly || '',
        goal_yearly: map.goal_yearly || '',
      })
    })
  }, [])

  const save = async () => {
    setSaving(true)
    await Promise.all(
      Object.entries(form).map(([key, value]) =>
        supabase.from('settings').upsert({ key, value: String(value) }, { onConflict: 'key' })
      )
    )
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const input = { background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#2B2318', width: '100%', outline: 'none', fontFamily: 'DM Sans, sans-serif' }
  const label = { fontSize: '11px', fontWeight: 600, color: '#9C856A', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '5px', display: 'block' }

  return (
    <div>
      <div style={{ background: '#EDE4D3', borderBottom: '1px solid #C8B89A', padding: '14px 24px' }}>
        <div style={{ fontFamily: 'Lora, serif', fontSize: '16px', fontWeight: 600, color: '#2B2318' }}>Settings</div>
        <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '2px' }}>Risk guardrails, goals and account configuration</div>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
        <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontFamily: 'Lora, serif', fontSize: '14px', fontWeight: 600, color: '#2B2318', marginBottom: '4px' }}>Account</div>
          <div style={{ fontSize: '11px', color: '#9C856A', marginBottom: '16px' }}>Used to calculate drawdown percentages</div>
          <div>
            <label style={label}>Account Size ($)</label>
            <input type="number" placeholder="e.g. 10000" value={form.account_size} onChange={e => setForm({ ...form, account_size: e.target.value })} style={input} />
          </div>
        </div>

        <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontFamily: 'Lora, serif', fontSize: '14px', fontWeight: 600, color: '#2B2318', marginBottom: '4px' }}>$ Goals</div>
          <div style={{ fontSize: '11px', color: '#9C856A', marginBottom: '16px' }}>Set profit targets — progress bars will appear on your Dashboard</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label style={label}>Daily Goal ($)</label><input type="number" placeholder="e.g. 200" value={form.goal_daily} onChange={e => setForm({ ...form, goal_daily: e.target.value })} style={input} /></div>
            <div><label style={label}>Weekly Goal ($)</label><input type="number" placeholder="e.g. 1000" value={form.goal_weekly} onChange={e => setForm({ ...form, goal_weekly: e.target.value })} style={input} /></div>
            <div><label style={label}>Monthly Goal ($)</label><input type="number" placeholder="e.g. 4000" value={form.goal_monthly} onChange={e => setForm({ ...form, goal_monthly: e.target.value })} style={input} /></div>
            <div><label style={label}>Yearly Goal ($)</label><input type="number" placeholder="e.g. 50000" value={form.goal_yearly} onChange={e => setForm({ ...form, goal_yearly: e.target.value })} style={input} /></div>
          </div>
        </div>

        <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontFamily: 'Lora, serif', fontSize: '14px', fontWeight: 600, color: '#2B2318', marginBottom: '4px' }}>Risk Guardrails</div>
          <div style={{ fontSize: '11px', color: '#9C856A', marginBottom: '16px' }}>Warnings appear on Dashboard when breached</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={label}>Daily Drawdown Limit (%)</label>
              <input type="number" placeholder="e.g. 3" value={form.daily_drawdown} onChange={e => setForm({ ...form, daily_drawdown: e.target.value })} style={input} />
              <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '4px' }}>Warning fires if you lose more than this % of your account in a single day</div>
            </div>
            <div>
              <label style={label}>Max Drawdown Limit (%)</label>
              <input type="number" placeholder="e.g. 10" value={form.max_drawdown} onChange={e => setForm({ ...form, max_drawdown: e.target.value })} style={input} />
              <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '4px' }}>Warning fires if your all-time peak-to-trough drawdown exceeds this %</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={save} disabled={saving} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saved && <span style={{ fontSize: '12px', color: '#3D7A52', fontWeight: 600 }}>✓ Saved!</span>}
        </div>
      </div>
    </div>
  )
}
export default Settings