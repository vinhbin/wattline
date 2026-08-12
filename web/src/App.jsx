import { useEffect, useState } from 'react'
import { fetchNpus, fetchStats, fetchExposureSeries, isUsingMock } from './api.js'
import Header from './components/Header.jsx'
import Sidebar from './components/Sidebar.jsx'
import MapView from './components/MapView.jsx'
import Scrubber from './components/Scrubber.jsx'

const HOURS = 25 // hour 0–24 inclusive (frozen contract)
const PLAY_STEP_MS = 600

export default function App() {
  const [npus, setNpus] = useState(null)
  const [stats, setStats] = useState(null)
  const [mock, setMock] = useState(false)
  // All 25 hours prefetched on mount — the scrub must never be network-bound.
  const [series, setSeries] = useState(null)
  const [hour, setHour] = useState(0)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetchNpus(),
      fetchStats(),
      fetchExposureSeries(HOURS),
    ]).then(([n, s, hours]) => {
      if (!alive) return
      setNpus(n)
      setStats(s)
      setSeries(hours)
      setMock(isUsingMock())
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!playing || !series) return
    const t = setInterval(
      () => setHour((h) => Math.min(h + 1, HOURS - 1)),
      PLAY_STEP_MS,
    )
    return () => clearInterval(t)
  }, [playing, series])

  useEffect(() => {
    if (hour >= HOURS - 1) setPlaying(false)
  }, [hour])

  const exposure = series?.[hour] ?? null

  const togglePlay = () => {
    if (!series) return
    if (!playing && hour >= HOURS - 1) setHour(0) // replay from the top
    setPlaying((p) => !p)
  }

  return (
    <div className="app">
      <Header stats={stats} mock={mock} exposure={exposure} />
      <div className="main">
        <Sidebar npus={npus} exposure={exposure} />
        <MapView npus={npus} exposure={exposure} />
      </div>
      <Scrubber
        hour={hour}
        maxHour={HOURS - 1}
        setHour={setHour}
        playing={playing}
        onPlay={togglePlay}
        ready={!!series}
      />
    </div>
  )
}
