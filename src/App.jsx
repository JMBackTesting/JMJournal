import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import TradeLog from './pages/TradeLog'
import KeyLevels from './pages/KeyLevels'
import Journal from './pages/Journal'
import WeeklyReview from './pages/WeeklyReview'
import Analytics from './pages/Analytics'
import SpotBuys from './pages/SpotBuys'
import Education from './pages/Education'
import Export from './pages/Export'
import Settings from './pages/Settings'
import EmotionJournal from './pages/EmotionJournal'

function App() {
  const [activePage, setActivePage] = useState('dashboard')
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <main style={{ flex: 1, overflow: 'auto', background: '#F5EFE4' }}>
        {activePage === 'dashboard' && <Dashboard />}
        {activePage === 'tradelog' && <TradeLog />}
        {activePage === 'keylevels' && <KeyLevels />}
        {activePage === 'journal' && <Journal />}
        {activePage === 'weekly' && <WeeklyReview />}
        {activePage === 'analytics' && <Analytics />}
        {activePage === 'spotbuys' && <SpotBuys />}
        {activePage === 'education' && <Education />}
        {activePage === 'export' && <Export />}
        {activePage === 'settings' && <Settings />}
        {activePage === 'emotionjournal' && <EmotionJournal />}
      </main>
    </div>
  )
}
export default App