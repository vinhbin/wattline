// Fetch layer for the four frozen endpoints (BUILD-PLAN §3).
// Tries the real API first (proxied to FastAPI in dev), falls back to the
// bundled mocks so the frontend never renders a blank screen (F6 rule).
// mocks/ stays the single source of truth — imported, not copied.
import mockNpus from '../../mocks/npus.json'
import mockExposure from '../../mocks/exposure.json'
import mockSites from '../../mocks/sites.json'
import mockStats from '../../mocks/stats.json'

let usedMock = false
export const isUsingMock = () => usedMock

async function tryApi(path) {
  const res = await fetch(path, { signal: AbortSignal.timeout(2500) })
  if (!res.ok) throw new Error(`${path} -> ${res.status}`)
  return res.json()
}

async function withFallback(path, mock) {
  try {
    return await tryApi(path)
  } catch {
    usedMock = true
    return mock
  }
}

export const fetchNpus = () => withFallback('/api/npus', mockNpus)
export const fetchStats = () => withFallback('/api/stats', mockStats)
export const fetchSites = () => withFallback('/api/sites', mockSites)
export const fetchExposure = (hour) =>
  withFallback(`/api/exposure?hour=${hour}`, mockExposure[String(hour)])

// F3 prefetch: try Guttu's one-payload /api/exposure/all (keyed "0".."24"),
// fall back to 25 per-hour fetches, which themselves fall back to the mock.
export async function fetchExposureSeries(hours) {
  try {
    const all = await tryApi('/api/exposure/all')
    const series = Array.from({ length: hours }, (_, h) => all[String(h)])
    if (series.every(Boolean)) return series
    throw new Error('unexpected /api/exposure/all shape')
  } catch {
    return Promise.all(Array.from({ length: hours }, (_, h) => fetchExposure(h)))
  }
}
