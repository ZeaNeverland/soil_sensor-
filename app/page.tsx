'use client';

import { useCallback, useEffect, useState } from 'react';

const DEVICE_ID = process.env.NEXT_PUBLIC_DEVICE_ID || 'esp32-demo-12345';
const POLL_MS = 4000;
const ONLINE_WINDOW_MS = 20000;

type Reading = { value: number; created_at: string };
type Activity = { id: number; title: string; detail: string; time: string };

const DEMO_READINGS: Reading[] = [
  { value: 38, created_at: '2026-11-21T14:00:00.000Z' },
  { value: 41, created_at: '2026-11-21T14:15:00.000Z' },
  { value: 44, created_at: '2026-11-21T14:30:00.000Z' },
  { value: 42, created_at: '2026-11-21T14:45:00.000Z' },
  { value: 39, created_at: '2026-11-21T15:00:00.000Z' },
  { value: 36, created_at: '2026-11-21T15:15:00.000Z' },
  { value: 33, created_at: '2026-11-21T15:30:00.000Z' },
  { value: 31, created_at: '2026-11-21T15:45:00.000Z' },
  { value: 28, created_at: '2026-11-21T16:00:00.000Z' },
  { value: 26, created_at: '2026-11-21T16:15:00.000Z' },
  { value: 24, created_at: '2026-11-21T16:30:00.000Z' },
  { value: 27, created_at: '2026-11-21T16:45:00.000Z' },
];

function levelOf(value: number | null) {
  if (value === null) {
    return { label: 'Menunggu data', color: '#94a3b8', text: 'Belum ada pembacaan dari sensor.' };
  }
  if (value < 30) {
    return { label: 'Kering', color: '#f59e0b', text: 'Tanah mulai kering, segera siram manual.' };
  }
  if (value <= 70) {
    return { label: 'Ideal', color: '#10b981', text: 'Kelembapan ideal. Tidak perlu disiram sekarang.' };
  }
  return { label: 'Basah', color: '#3b82f6', text: 'Tanah cukup basah. Tahan penyiraman sementara.' };
}

function LeafIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20.8 3.2C13.5 3 7.2 5.7 5.1 10.4c-1.7 3.8.1 7.5 3.3 8.8 3.8 1.6 8.1-.6 9.8-5.1 1.4-3.7 1.8-7.5 2.6-10.9Z" fill="currentColor" opacity=".95" />
      <path d="M4.1 21c2.7-5.7 6.7-9.6 12.6-12.7" stroke="#d1fae5" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function Gauge({ value }: { value: number | null }) {
  const size = 240;
  const radius = 86;
  const circumference = 2 * Math.PI * radius;
  const percentage = value === null ? 0 : Math.min(100, Math.max(0, value));
  const level = levelOf(value);

  return (
    <div className="gauge" style={{ '--gauge-color': level.color } as React.CSSProperties}>
      <svg viewBox={`0 0 ${size} ${size}`} aria-label={`Kelembapan ${percentage}%`}>
        <circle cx={size / 2} cy={size / 2} r={radius} className="gauge-track" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="gauge-progress"
          strokeDasharray={`${(percentage / 100) * circumference} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="gauge-center">
        <div className="gauge-leaf"><LeafIcon size={28} /></div>
        <strong>{value === null ? '--' : Math.round(value)}<span>%</span></strong>
        <b style={{ color: level.color }}>{level.label}</b>
      </div>
    </div>
  );
}

function AreaChart({ data }: { data: Reading[] }) {
  const width = 640;
  const height = 210;
  const padding = 18;
  const chartHeight = height - padding * 2;

  const points = data.map((reading, index) => {
    const x = data.length === 1 ? width / 2 : (index / (data.length - 1)) * width;
    const y = padding + (1 - reading.value / 100) * chartHeight;
    return [x, y] as const;
  });

  const line = points.map(([x, y], index) =>
    `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  ).join(' ');
  const area = points.length
    ? `${line} L${points[points.length - 1][0]},${height - padding} L${points[0][0]},${height - padding} Z`
    : '';

  return (
    <svg className="area-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Grafik riwayat kelembapan">
      {[20, 60, 100, 140, 180].map((y) => (
        <line key={y} x1="0" y1={y} x2={width} y2={y} className="chart-grid" />
      ))}
      {area && (
        <>
          <defs>
            <linearGradient id="soilArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity=".38" />
              <stop offset="100%" stopColor="#10b981" stopOpacity=".02" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#soilArea)" />
          <path d={line} fill="none" stroke="#34d399" strokeWidth="3" vectorEffect="non-scaling-stroke" />
          {points.map(([x, y], index) => (
            <circle key={index} cx={x} cy={y} r="3" fill="#10b981" />
          ))}
        </>
      )}
    </svg>
  );
}

export default function Home() {
  const [key, setKey] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [readings, setReadings] = useState<Reading[]>([]);
  const [simulation, setSimulation] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [threshold, setThreshold] = useState(30);
  const [profile, setProfile] = useState('Monstera');
  const [manualLogs, setManualLogs] = useState<Activity[]>([]);
  const [error, setError] = useState('');
  const [now, setNow] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setKey(localStorage.getItem('dashKey') || '');
        setNotifications(localStorage.getItem('soilNotifications') !== 'false');
        setProfile(localStorage.getItem('soilProfile') || 'Monstera');
        setThreshold(Number(localStorage.getItem('soilThreshold') || 30));
        setSimulation(localStorage.getItem('soilSimulation') === 'true');
        const savedLogs = localStorage.getItem('soilManualLogs');
        if (savedLogs) setManualLogs(JSON.parse(savedLogs) as Activity[]);
      } catch {
        setKey('');
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const load = useCallback(async () => {
    if (!key || simulation) return;
    try {
      const response = await fetch(
        `/api/soil?deviceId=${encodeURIComponent(DEVICE_ID)}&limit=40`,
        { headers: { 'x-dash-key': key }, cache: 'no-store' }
      );
      if (response.status === 401) {
        localStorage.removeItem('dashKey');
        setKey('');
        setError('Kunci dashboard salah');
        return;
      }
      if (response.status === 500) {
        setError('Database belum dikonfigurasi. Periksa SUPABASE_SERVICE_ROLE_KEY.');
        return;
      }
      if (!response.ok) {
        setError(`Server mengembalikan status ${response.status}`);
        return;
      }
      setReadings((await response.json()).readings);
      setError('');
      setNow(Date.now());
    } catch {
      setError('Gagal menghubungi server');
    }
  }, [key, simulation]);

  useEffect(() => {
    if (!key) return;
    const initialLoad = window.setTimeout(() => { void load(); }, 0);
    const timer = window.setInterval(load, POLL_MS);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [key, load]);

  const displayedReadings = simulation ? DEMO_READINGS : readings;
  const last = displayedReadings[displayedReadings.length - 1];
  const value = last?.value ?? null;
  const level = levelOf(value);
  const age = last && now > 0
    ? now - new Date(last.created_at).getTime()
    : Infinity;
  const online = simulation ? true : age < ONLINE_WINDOW_MS;

  const values = displayedReadings.map((reading) => reading.value);
  const minimum = values.length ? Math.round(Math.min(...values)) : null;
  const maximum = values.length ? Math.round(Math.max(...values)) : null;
  const average = values.length
    ? Math.round(values.reduce((sum, item) => sum + item, 0) / values.length)
    : null;

  function saveManualLog() {
    const activity: Activity = {
      id: Date.now(),
      title: 'Penyiraman manual dicatat',
      detail: `Pada kelembapan ${value === null ? '--' : Math.round(value)}%`,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };
    const nextLogs = [activity, ...manualLogs].slice(0, 5);
    setManualLogs(nextLogs);
    try { localStorage.setItem('soilManualLogs', JSON.stringify(nextLogs)); } catch {}
  }

  if (key === null) {
    return <main className="loading-screen"><div className="loader" /></main>;
  }

  if (key === '') {
    return (
      <main className="login-screen">
        <section className="login-card">
          <div className="brand-mark"><LeafIcon size={34} /></div>
          <h1>Smart Soil</h1>
          <p>Masukkan kunci untuk membuka dashboard.</p>
          <form onSubmit={(event) => {
            event.preventDefault();
            if (!input) return;
            try { localStorage.setItem('dashKey', input); } catch {}
            setKey(input);
          }}>
            <input type="password" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Kunci dashboard" />
            <button type="submit">Masuk Dashboard</button>
          </form>
          {error && <div className="error-message">{error}</div>}
        </section>
      </main>
    );
  }

  const activityItems: Activity[] = [
    ...manualLogs,
    ...(last ? [{
      id: -1,
      title: 'Pembacaan sensor',
      detail: `Kelembapan ${Math.round(last.value)}% tercatat`,
      time: new Date(last.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    }] : []),
  ].slice(0, 5);

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><LeafIcon size={28} /></div>
          <div>
            <h1>Smart Soil</h1>
            <p>Pot Monstera - Teras Depan</p>
          </div>
        </div>
        <div className="header-actions">
          <div className="update-time">
            <span>Terakhir update</span>
            <strong>{last ? new Date(last.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '--'}</strong>
          </div>
          <div className={`connection ${online ? 'online' : 'offline'}`}>
            <i />
            ESP32 {online ? 'Online' : 'Offline'}
          </div>
          <button
            className={`demo-toggle ${simulation ? 'active' : ''}`}
            onClick={() => setSimulation((current) => {
              const next = !current;
              try { localStorage.setItem('soilSimulation', String(next)); } catch {}
              return next;
            })}
          >
            <span />
            Mode Simulasi
          </button>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <div className="dashboard-grid">
        <div className="left-column">
          <section className="panel moisture-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Pemantauan Tanah</span>
                <h2>Kelembapan Tanah</h2>
              </div>
              <span className="live-pill" style={{ color: level.color, borderColor: `${level.color}55` }}>
                <i style={{ background: level.color }} />
                {level.label}
              </span>
            </div>
            <Gauge value={value} />
          </section>

          <section className="panel recommendation-panel">
            <div className="recommendation-icon" style={{ color: level.color }}>
              <LeafIcon size={26} />
            </div>
            <div className="recommendation-copy">
              <span className="eyebrow">Rekomendasi Perawatan</span>
              <h3>{level.text}</h3>
              <p>{value !== null && value < threshold
                ? `Lebih rendah dari batas kering ${threshold}%`
                : 'Monitoring sensor berjalan setiap beberapa detik.'}</p>
            </div>
            <button className="primary-button" onClick={saveManualLog}>
              <span>✓</span> Catat Sudah Disiram
            </button>
          </section>
        </div>

        <div className="right-column">
          <section className="panel stats-panel">
            <div className="panel-heading compact">
              <h2>Statistik Hari Ini</h2>
              <span className="eyebrow">12 pembacaan</span>
            </div>
            <div className="stat-grid">
              <article><span>Minimum</span><strong>{minimum ?? '--'}<b>%</b></strong><i className="stat-dry" /></article>
              <article><span>Rata-rata</span><strong>{average ?? '--'}<b>%</b></strong><i className="stat-average" /></article>
              <article><span>Maksimum</span><strong>{maximum ?? '--'}<b>%</b></strong><i className="stat-wet" /></article>
            </div>
          </section>

          <section className="panel chart-panel">
            <div className="panel-heading compact">
              <div>
                <span className="eyebrow">12 jam terakhir</span>
                <h2>Grafik Riwayat</h2>
              </div>
              <div className="chart-legend"><i /> Kelembapan</div>
            </div>
            <AreaChart data={displayedReadings} />
          </section>

          <section className="panel settings-panel">
            <div className="panel-heading compact">
              <h2>Pengaturan</h2>
            </div>
            <div className="setting-row">
              <div>
                <strong>Notifikasi Peringatan Kering</strong>
                <span>Peringatan saat kelembapan rendah</span>
              </div>
              <button
                className={`switch ${notifications ? 'on' : ''}`}
                onClick={() => {
                  const next = !notifications;
                  setNotifications(next);
                  try { localStorage.setItem('soilNotifications', String(next)); } catch {}
                }}
                aria-label="Toggle notifikasi"
                aria-pressed={notifications}
              ><span /></button>
            </div>
            <div className="setting-columns">
              <label>
                <span>Profil Tanaman</span>
                <select value={profile} onChange={(event) => {
                  const next = event.target.value;
                  setProfile(next);
                  try { localStorage.setItem('soilProfile', next); } catch {}
                }}>
                  <option>Cabai</option>
                  <option>Monstera</option>
                  <option>Sukulen</option>
                  <option>Custom</option>
                </select>
              </label>
              <label className="threshold-setting">
                <div><span>Batas Minimal</span><strong>{threshold}%</strong></div>
                <input type="range" min="0" max="100" value={threshold} onChange={(event) => {
                  const next = Number(event.target.value);
                  setThreshold(next);
                  try { localStorage.setItem('soilThreshold', String(next)); } catch {}
                }} />
              </label>
            </div>
          </section>

          <section className="panel activity-panel">
            <div className="panel-heading compact">
              <h2>Log Aktivitas Terakhir</h2>
            </div>
            <div className="activity-list">
              {activityItems.length ? activityItems.map((activity) => (
                <article key={`${activity.id}-${activity.time}`}>
                  <div className={`activity-dot ${activity.title.includes('Penyiraman') ? 'manual' : ''}`}>
                    {activity.title.includes('Penyiraman') ? '✓' : '•'}
                  </div>
                  <div><strong>{activity.title}</strong><span>{activity.detail}</span></div>
                  <time>{activity.time}</time>
                </article>
              )) : <p className="muted">Belum ada aktivitas.</p>}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
