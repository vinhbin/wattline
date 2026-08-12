import { useEffect, useState } from 'react'
import { fetchNpus, fetchStats, isUsingMock } from './api.js'
import Header from './components/Header.jsx'
import Sidebar from './components/Sidebar.jsx'
import MapView from './components/MapView.jsx'

export default function App() {
  const [npus, setNpus] = useState(null)
  const [stats, setStats] = useState(null)
  const [mock, setMock] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.all([fetchNpus(), fetchStats()]).then(([n, s]) => {
      if (!alive) return
      setNpus(n)
      setStats(s)
      setMock(isUsingMock())
    })
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="app">
      <Header stats={stats} mock={mock} />
      <div className="main">
        <Sidebar npus={npus} />
        <MapView npus={npus} />
      </div>
    </div>
  )
}
