import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

function SpotBuys() {
  const [buys, setBuys] = useState([])
  const [showing, setShowing] = useState(false)
  const [sellModal, setSellModal] = useState(null)
  const [activeTab, setActiveTab] = useState('holding')
  const [form, setForm] = useState({ asset: '', buy_date: new Date().toISOString().split('T')[0], quantity: '', buy_price: '', fees: '', exchange: '', notes: '' })
  const [sellForm, setSellForm] = useState({ sell_date: new Date().toISOString().split('T')[0], sell_price: '', sell_quantity: '', sell_fees: '' })

  useEffect(() => { fetchBuys() }, [])

  const fetchBuys = async () => {
    const { data } = await supabase.from('spot_buys').select('*').order('buy_date', { ascending: false })
    if (data) setBuys(data)
  }

  const saveBuy = async () => {
    if (!form.asset || !form.quantity || !form.buy_price) return
    const total_cost = parseFloat(form.quantity) * parseFloat(form.buy_price) + parseFloat(form.fees || 0)
    await supabase.from('spot_buys').insert([{
      asset: form.asset.toUpperCase(),
      buy_date: form.buy_date,
      quantity: parseFloat(form.quantity),
      buy_price: parseFloat(form.buy_price),
      total_cost,
      fees: parseFloat(form.fees || 0),
      exchange: form.exchange,
      notes: form.notes,
      status: 'Holding'
    }])
    setForm({ asset: '', buy_date: new Date().toISOString().split('T')[0], quantity: '', buy_price: '', fees: '', exchange: '', notes: '' })
    setShowing(false)
    fetchBuys()
  }

  const markSold = async () => {
    if (!sellForm.sell_price || !sellForm.sell_quantity) return
    const sellQty = parseFloat(sellForm.sell_quantity)
    const proceeds = sellQty * parseFloat(sellForm.sell_price) - parseFloat(sellForm.sell_fees || 0)
    const costBasis = (sellQty / sellModal.quantity) * sellModal.total_cost
    const realized_pnl = proceeds - costBasis
    const realized_pnl_percent = ((proceeds - costBasis) / costBasis) * 100
    const status = sellQty >= sellModal.quantity ? 'Sold' : 'Partial'
    await supabase.from('spot_buys').update({
      status,
      sell_date: sellForm.sell_date,
      sell_price: parseFloat(sellForm.sell_price),
      sell_quantity: sellQty,
      sell_fees: parseFloat(sellForm.sell_fees || 0),
      realized_pnl: parseFloat(realized_pnl.toFixed(2)),
      realized_pnl_percent: parseFloat(realized_pnl_percent.toFixed(2))
    }).eq('id', sellModal.id)
    setSellModal(null)
    setSellForm({ sell_date: new Date().toISOString().split('T')[0], sell_price: '', sell_quantity: '', sell_fees: '' })
    fetchBuys()
  }

  const deleteBuy = async (id) => {
    await supabase.from('spot_buys').delete().eq('id', id)
    fetchBuys()
  }

  const input = { background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#2B2318', width: '100%', outline: 'none', fontFamily: 'DM Sans, sans-serif' }
  const label = { fontSize: '11px', fontWeight: 600, color: '#9C856A', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '5px', display: 'block' }

  const filtered = buys.filter(b => {
    if (activeTab === 'holding') return b.status === 'Holding' || b.status === 'Partial'
    if (activeTab === 'sold') return b.status === 'Sold' || b.status === 'Partial'
    return true
  })

  const totalInvested = buys.filter(b => b.status === 'Holding' || b.status === 'Partial').reduce((s, b) => s + (b.total_cost || 0), 0)
  const totalRealizedPnl = buys.filter(b => b.realized_pnl).reduce((s, b) => s + (b.realized_pnl || 0), 0)
  const totalFees = buys.reduce((s, b) => s + (b.fees || 0) + (b.sell_fees || 0), 0)

  const assetSummary = Object.values(buys.reduce((acc, b) => {
    if (!acc[b.asset]) acc[b.asset] = { asset: b.asset, invested: 0, realized: 0, trades: 0 }
    acc[b.asset].invested += b.status !== 'Sold' ? (b.total_cost || 0) : 0
    acc[b.asset].realized += b.realized_pnl || 0
    acc[b.asset].trades++
    return acc
  }, {}))

  const card = { background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', padding: '16px 18px' }

  return (
    <div>
      <div style={{ background: '#EDE4D3', borderBottom: '1px solid #C8B89A', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'Lora, serif', fontSize: '16px', fontWeight: 600, color: '#2B2318' }}>Spot Buys</div>
          <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '2px' }}>Full audit trail for tax purposes</div>
        </div>
        <button onClick={() => setShowing(!showing)} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>+ Log Buy</button>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {[
            { label: 'Currently Held', value: totalInvested.toFixed(2), sub: 'total cost basis', color: '#2B2318' },
            { label: 'Realized Gains', value: (totalRealizedPnl >= 0 ? '+' : '') + (totalInvested > 0 ? ((totalRealizedPnl / totalInvested) * 100).toFixed(1) : '0.0') + '%', sub: 'return on closed positions', color: totalRealizedPnl >= 0 ? '#3D7A52' : '#9B3A28' },
            { label: 'Total Fees Paid', value: '$' + totalFees.toFixed(2), sub: 'buy + sell fees', color: '#9B3A28' },
            { label: 'Total Positions', value: buys.length, sub: 'all time', color: '#2B2318' },
          ].map(s => (
            <div key={s.label} style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ fontSize: '10px', color: '#9C856A', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>{s.label}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '20px', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#9C856A', marginTop: '3px' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {showing && (
          <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontFamily: 'Lora, serif', fontSize: '14px', fontWeight: 600, color: '#2B2318', marginBottom: '16px' }}>Log a Spot Buy</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div><label style={label}>Asset</label><input placeholder="e.g. BTC" value={form.asset} onChange={e => setForm({ ...form, asset: e.target.value })} style={input} /></div>
              <div><label style={label}>Buy Date</label><input type="date" value={form.buy_date} onChange={e => setForm({ ...form, buy_date: e.target.value })} style={input} /></div>
              <div><label style={label}>Quantity</label><input type="number" placeholder="0.00" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} style={input} /></div>
              <div><label style={label}>Buy Price ($)</label><input type="number" placeholder="0.00" value={form.buy_price} onChange={e => setForm({ ...form, buy_price: e.target.value })} style={input} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div><label style={label}>Fees ($)</label><input type="number" placeholder="0.00" value={form.fees} onChange={e => setForm({ ...form, fees: e.target.value })} style={input} /></div>
              <div><label style={label}>Exchange</label><input placeholder="e.g. Coinbase, Binance" value={form.exchange} onChange={e => setForm({ ...form, exchange: e.target.value })} style={input} /></div>
              <div><label style={label}>Notes</label><input placeholder="Optional notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={input} /></div>
            </div>
            {form.quantity && form.buy_price && (
              <div style={{ background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '12px', color: '#5A4535' }}>
                Total cost basis: <strong>${(parseFloat(form.quantity || 0) * parseFloat(form.buy_price || 0) + parseFloat(form.fees || 0)).toFixed(2)}</strong>
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={saveBuy} style={{ background: '#C8903A', border: 'none', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>Save Buy</button>
              <button onClick={() => setShowing(false)} style={{ background: 'transparent', border: '1px solid #C8B89A', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, color: '#9C856A', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '10px', padding: '3px', width: 'fit-content', gap: '4px' }}>
          {['holding', 'sold', 'all'].map(tab => (
            <div key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '6px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: activeTab === tab ? '#F5EFE4' : 'transparent', color: activeTab === tab ? '#2B2318' : '#9C856A', border: activeTab === tab ? '1px solid #C8B89A' : '1px solid transparent', textTransform: 'capitalize' }}>{tab === 'holding' ? 'Holding' : tab === 'sold' ? 'Sold / Partial' : 'All'}</div>
          ))}
        </div>

        {filtered.length === 0 && <div style={{ ...card, fontSize: '13px', color: '#9C856A' }}>No {activeTab} positions yet.</div>}

        {filtered.length > 0 && (
          <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 90px 1fr 1fr 1fr 1fr 1fr 120px', gap: '8px', padding: '10px 18px', borderBottom: '1px solid #C8B89A', background: '#E8DEC8' }}>
              {['Asset', 'Date', 'Qty', 'Buy Price', 'Cost Basis', 'Fees', 'P&L', 'Actions'].map(h => (
                <div key={h} style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9C856A' }}>{h}</div>
              ))}
            </div>
            {filtered.map((b, i) => (
              <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '80px 90px 1fr 1fr 1fr 1fr 1fr 120px', gap: '8px', padding: '12px 18px', borderBottom: i < filtered.length - 1 ? '1px solid #C8B89A' : 'none', alignItems: 'center' }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 700, color: '#2B2318' }}>{b.asset}</div>
                <div style={{ fontSize: '11px', color: '#9C856A', fontFamily: 'JetBrains Mono, monospace' }}>{b.buy_date}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#2B2318' }}>{b.quantity}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#2B2318' }}>${parseFloat(b.buy_price).toFixed(2)}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#2B2318' }}>${parseFloat(b.total_cost).toFixed(2)}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#9B3A28' }}>${parseFloat(b.fees || 0).toFixed(2)}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: 700, color: b.realized_pnl ? (b.realized_pnl >= 0 ? '#3D7A52' : '#9B3A28') : '#9C856A' }}>
                  {b.realized_pnl ? (b.realized_pnl >= 0 ? '+' : '') + '$' + Math.abs(b.realized_pnl).toFixed(2) + ' (' + b.realized_pnl_percent.toFixed(1) + '%)' : '—'}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(b.status === 'Holding' || b.status === 'Partial') && (
                    <button onClick={() => { setSellModal(b); setSellForm({ ...sellForm, sell_quantity: b.quantity }) }} style={{ background: '#3D7A52', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>Sell</button>
                  )}
                  <button onClick={() => deleteBuy(b.id)} style={{ background: 'transparent', border: '1px solid #C8B89A', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', color: '#9C856A', cursor: 'pointer' }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {assetSummary.length > 0 && (
          <div style={card}>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9C856A', marginBottom: '14px' }}>By Asset — Tax Summary</div>
            {assetSummary.map((a, i) => (
              <div key={a.asset} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '10px 0', borderBottom: i < assetSummary.length - 1 ? '1px solid #C8B89A' : 'none' }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 700, color: '#2B2318', minWidth: '60px' }}>{a.asset}</div>
                <div style={{ fontSize: '12px', color: '#9C856A' }}>{a.trades} position{a.trades > 1 ? 's' : ''}</div>
                <div style={{ fontSize: '12px', color: '#5A4535' }}>Held: <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>${a.invested.toFixed(2)}</span></div>
                <div style={{ flex: 1 }} />
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 700, color: a.realized >= 0 ? '#3D7A52' : '#9B3A28' }}>
                  {a.realized !== 0 ? (a.realized >= 0 ? '+$' : '-$') + Math.abs(a.realized).toFixed(2) + ' realized' : '—'}
                </div>
              </div>
            ))}
            <div style={{ marginTop: '14px', padding: '12px', background: '#F5EFE4', borderRadius: '8px', border: '1px solid #C8B89A', fontSize: '12px', color: '#5A4535' }}>
              <strong>For tax purposes:</strong> All buy dates, quantities, prices, fees and sell details are recorded above. Total realized gains: <strong style={{ color: totalRealizedPnl >= 0 ? '#3D7A52' : '#9B3A28' }}>{totalRealizedPnl >= 0 ? '+' : ''}${totalRealizedPnl.toFixed(2)}</strong>. Total fees deductible: <strong>${totalFees.toFixed(2)}</strong>.
            </div>
          </div>
        )}
      </div>

      {sellModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#EDE4D3', border: '1px solid #C8B89A', borderRadius: '16px', padding: '24px', width: '480px' }}>
            <div style={{ fontFamily: 'Lora, serif', fontSize: '15px', fontWeight: 600, color: '#2B2318', marginBottom: '4px' }}>Record Sale — {sellModal.asset}</div>
            <div style={{ fontSize: '12px', color: '#9C856A', marginBottom: '18px' }}>Original buy: {sellModal.quantity} @ ${sellModal.buy_price} on {sellModal.buy_date}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div><label style={label}>Sell Date</label><input type="date" value={sellForm.sell_date} onChange={e => setSellForm({ ...sellForm, sell_date: e.target.value })} style={input} /></div>
              <div><label style={label}>Sell Price ($)</label><input type="number" placeholder="0.00" value={sellForm.sell_price} onChange={e => setSellForm({ ...sellForm, sell_price: e.target.value })} style={input} /></div>
              <div><label style={label}>Quantity Sold</label><input type="number" placeholder={sellModal.quantity} value={sellForm.sell_quantity} onChange={e => setSellForm({ ...sellForm, sell_quantity: e.target.value })} style={input} /></div>
              <div><label style={label}>Sell Fees ($)</label><input type="number" placeholder="0.00" value={sellForm.sell_fees} onChange={e => setSellForm({ ...sellForm, sell_fees: e.target.value })} style={input} /></div>
            </div>
            {sellForm.sell_price && sellForm.sell_quantity && (
              <div style={{ background: '#F5EFE4', border: '1px solid #C8B89A', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '12px', color: '#5A4535' }}>
                {(() => {
                  const proceeds = parseFloat(sellForm.sell_quantity) * parseFloat(sellForm.sell_price) - parseFloat(sellForm.sell_fees || 0)
                  const costBasis = (parseFloat(sellForm.sell_quantity) / sellModal.quantity) * sellModal.total_cost
                  const pnl = proceeds - costBasis
                  return <span>Proceeds: <strong>${proceeds.toFixed(2)}</strong> — Cost basis: <strong>${costBasis.toFixed(2)}</strong> — Gain/Loss: <strong style={{ color: pnl >= 0 ? '#3D7A52' : '#9B3A28' }}>{pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}</strong></span>
                })()}
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={markSold} style={{ background: '#3D7A52', border: 'none', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>Confirm Sale</button>
              <button onClick={() => setSellModal(null)} style={{ background: 'transparent', border: '1px solid #C8B89A', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 600, color: '#9C856A', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default SpotBuys