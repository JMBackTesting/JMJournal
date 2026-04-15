function Sidebar({ activePage, setActivePage }) {
  const nav = [
    { id: 'dashboard', label: 'Dashboard', section: 'overview' },
    { id: 'tradelog', label: 'Trade Log', section: 'trading' },
    { id: 'journal', label: 'Journal', section: 'trading' },
    { id: 'keylevels', label: 'Key Levels', section: 'trading' },
    { id: 'spotbuys', label: 'Spot Buys', section: 'trading' },
    { id: 'tasks', label: 'Tasks', section: 'trading' },
    { id: 'weekly', label: 'Old Positions', section: 'review' },
    { id: 'analytics', label: 'Analytics', section: 'review' },
    { id: 'education', label: 'Education', section: 'review' },
    { id: 'export', label: 'Export Data', section: 'review' },
  ]
  const sections = ['overview', 'trading', 'review']
  return (
    <div style={{ width: '210px', minHeight: '100vh', background: '#2B2318', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ fontFamily: 'Lora, serif', fontSize: '18px', fontWeight: 600, color: '#C8903A', padding: '20px 18px 18px', borderBottom: '1px solid #3D3025' }}>JM</div>
      <div style={{ flex: 1, paddingTop: '8px' }}>
        {sections.map(section => (
          <div key={section}>
            <div style={{ fontSize: '10px', letterSpacing: '0.12em', color: '#6B5A45', padding: '12px 18px 4px', fontWeight: 600, textTransform: 'uppercase' }}>{section}</div>
            {nav.filter(n => n.section === section).map(item => (
              <div key={item.id} onClick={() => setActivePage(item.id)} style={{ display: 'flex', alignItems: 'center', padding: '9px 18px', fontSize: '13px', fontWeight: 500, color: activePage === item.id ? '#E8D5B0' : '#9C856A', background: activePage === item.id ? '#332820' : 'transparent', borderLeft: activePage === item.id ? '2px solid #C8903A' : '2px solid transparent', cursor: 'pointer' }}>
                {item.label}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ padding: '16px 18px', borderTop: '1px solid #3D3025', display: 'flex', alignItems: 'center', gap: '9px' }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#C8903A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#2B2318' }}>J</div>
        <div style={{ fontSize: '12px', color: '#9C856A' }}>JM Trading</div>
      </div>
    </div>
  )
}
export default Sidebar