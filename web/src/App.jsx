import React, { useState, useEffect } from 'react';
import HeaderBar from './components/HeaderBar';
import MapView from './components/MapView';
import TimelineScrubber from './components/TimelineScrubber';
import NpuDetailPanel from './components/NpuDetailPanel';
import SitesPanel from './components/SitesPanel';

// Import local static fallback mock data (Rule F6: Never show blank screen)
import mockNpus from '../../mocks/npus.json';
import mockExposure from '../../mocks/exposure.json';
import mockSites from '../../mocks/sites.json';
import mockStats from '../../mocks/stats.json';

export default function App() {
  const [npusData, setNpusData] = useState(mockNpus);
  const [exposureSeries, setExposureSeries] = useState(mockExposure);
  const [sitesData, setSitesData] = useState(mockSites);
  const [statsData, setStatsData] = useState(mockStats);

  const [hour, setHour] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedNpu, setSelectedNpu] = useState(null);
  const [dispatchActive, setDispatchActive] = useState(false);

  // Fetch API endpoints on mount with fallback
  useEffect(() => {
    fetch('/api/npus')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setNpusData(data); })
      .catch(() => console.log('API /api/npus offline, using fallback mock data'));

    fetch('/api/sites')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setSitesData(data); })
      .catch(() => console.log('API /api/sites offline, using fallback mock data'));

    fetch('/api/stats')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setStatsData(data); })
      .catch(() => console.log('API /api/stats offline, using fallback mock data'));
  }, []);

  // Autoplay step timer (~600ms per hour)
  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setHour((prevHour) => {
          if (prevHour >= 24) {
            setIsPlaying(false);
            return 24;
          }
          return prevHour + 1;
        });
      }, 600);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  // Current hour exposure list
  const currentExposure = exposureSeries[str(hour)]?.npus || exposureSeries[hour]?.npus || [];

  function str(val) {
    return String(val);
  }

  return (
    <div className="app-container">
      {/* Header Bar */}
      <HeaderBar stats={statsData} />

      {/* Main Map Content Area */}
      <div className="main-content">
        <MapView
          npuGeojson={npusData}
          exposureData={currentExposure}
          sitesData={sitesData}
          hour={hour}
          dispatchActive={dispatchActive}
          selectedNpu={selectedNpu}
          onSelectNpu={setSelectedNpu}
        />

        {/* Floating Left: Emergency Charging Sites Panel */}
        <SitesPanel
          sites={sitesData}
          dispatchActive={dispatchActive}
          setDispatchActive={setDispatchActive}
          onSelectSite={(site) => console.log('Selected site:', site)}
        />

        {/* Floating Right: NPU Detail Panel */}
        <NpuDetailPanel
          selectedNpu={selectedNpu}
          exposureData={currentExposure}
          onSelectNpu={setSelectedNpu}
          onClose={() => setSelectedNpu(null)}
        />

        {/* Floating Bottom: Timeline Scrubber & Autoplay */}
        <TimelineScrubber
          hour={hour}
          setHour={setHour}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
        />
      </div>
    </div>
  );
}
