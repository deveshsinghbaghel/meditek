import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Droplets, Thermometer } from 'lucide-react';
import { HeartIllustration, LungsIllustration } from '../components/dashboard/MedicalIllustrations';
import { OrganStatusCard } from '../components/dashboard/OrganStatusCard';
import { TimelineCard } from '../components/dashboard/TimelineCard';
import { VitalsCard } from '../components/dashboard/VitalsCard';
import { PatientStatusCard, PatientStatus } from '../components/dashboard/PatientStatusCard';
import { useHealthStore } from '../store';
import { VitalReading } from '../types/health';

const EMPTY_VITALS: VitalReading = {
  HR: 0,
  SpO2: 0,
  Temp: 0,
  Fall: 0,
  Motion: 'Waiting',
};

const STALE_READING_MS = 3000;
const GRAPH_WINDOW_MS = 30000;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function smoothSeries(series: number[]) {
  return series.map((point, index) => {
    if (index === 0 || index === series.length - 1) return point;
    return (series[index - 1] + point * 2 + series[index + 1]) / 4;
  });
}

function buildSmoothPath(points: { x: number; y: number }[]) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const midX = (current.x + next.x) / 2;
    path += ` Q ${current.x.toFixed(2)} ${current.y.toFixed(2)} ${midX.toFixed(2)} ${((current.y + next.y) / 2).toFixed(2)}`;
    path += ` T ${next.x.toFixed(2)} ${next.y.toFixed(2)}`;
  }
  return path;
}

function buildTrendPath(series: number[], width: number, height: number, min: number, max: number) {
  if (!series.length) return '';
  const range = max - min || 1;
  const points = smoothSeries(series).map((point, index) => {
      const x = (index / Math.max(series.length - 1, 1)) * width;
      const y = height - ((clamp(point, min, max) - min) / range) * height;
      return { x, y };
    });
  return buildSmoothPath(points);
}

function computeStatus(d: VitalReading): PatientStatus {
  if (d.Motion === 'Waiting') return 'Idle';
  if (d.Fall === 1 || d.Motion === 'Impact') return 'Fallen';
  if (d.HR > 110 || d.SpO2 < 95 || d.Temp > 37.5) return 'Emergency';
  if (d.Motion === 'Walking') return 'Walking';
  if (d.Motion === 'Idle' && d.HR < 80) return 'Idle';
  if (d.Motion === 'Idle' && d.HR >= 80) return 'Recovery';
  return 'Idle';
}

function spo2Color(v: number) {
  if (v >= 97) return '#1D9E75';
  if (v >= 94) return '#BA7517';
  return '#D85A30';
}

function tempColor(v: number) {
  if (v <= 37.2) return '#1D9E75';
  if (v <= 37.9) return '#BA7517';
  return '#D85A30';
}

export function DashboardPage() {
  const currentVitals = useHealthStore((state) => state.currentVitals);
  const historicalData = useHealthStore((state) => state.historicalData);
  const connectionState = useHealthStore((state) => state.connectionState);

  const [clock, setClock] = useState('');
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const tick = () => {
      setClock(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setNow(Date.now());
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const latestTimestamp = currentVitals ? Date.parse(currentVitals.timestamp) : 0;
  const hasFreshReading = latestTimestamp > 0 && now - latestTimestamp <= STALE_READING_MS;
  const current = hasFreshReading ? currentVitals?.data ?? EMPTY_VITALS : EMPTY_VITALS;
  const graphHistory = historicalData.filter((item) => now - Date.parse(item.timestamp) <= GRAPH_WINDOW_MS);
  const graphReadings = hasFreshReading ? graphHistory : [...graphHistory, { timestamp: new Date(now).toISOString(), data: EMPTY_VITALS }];
  const hrHistory = graphReadings.map((item) => item.data.HR).slice(-30);
  const spo2History = graphReadings.map((item) => item.data.SpO2).slice(-30);
  const tempHistory = graphReadings.map((item) => item.data.Temp).slice(-30);

  const heartRate = current.HR;
  const spo2 = current.SpO2;
  const temp = current.Temp;
  const patientStatus = computeStatus(current);
  const hrTrend = buildTrendPath(hrHistory.length ? hrHistory : [0], 520, 110, 40, 140);

  return (
    <main className="replica-shell">
      <div className="replica-surface">
        <header className="replica-topbar">
          <div className="topbar-patient">
            <span className="topbar-avatar">AM</span>
            <span className="topbar-name">Arjun Mehta</span>
          </div>
          <div className="topbar-title">
            <span className="topbar-brand">MediTrack+</span>
          </div>
          <div className="topbar-status">
            <span className="live-dot" />
            <span className="live-label">{connectionState === 'live' ? 'Live' : connectionState}</span>
            {clock && <span className="live-time">{clock}</span>}
          </div>
        </header>

        <section className="replica-grid">
          <PatientStatusCard
            status={patientStatus}
            motion={current.Motion}
            fall={current.Fall}
          />

          <motion.section
            className="replica-card hero-heart-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="hero-heart-card__art">
              <HeartIllustration tone="#ef6954" />
            </div>
            <div className="hero-heart-card__ecg">
              <div className="ecg-labels">
                <span className="ecg-title">Heart Rate</span>
                <div className="ecg-hr-row">
                  <span className="ecg-hr-num">{heartRate}</span>
                  <span className="ecg-hr-unit">bpm</span>
                </div>
                <span className="ecg-range">live trend, 40-140 bpm</span>
              </div>
              <div className="ecg-wave-wrap">
                <svg viewBox="0 0 520 110" className="ecg-wave" preserveAspectRatio="none" aria-label="Heart rate trend">
                  <rect x="0" y="22" width="520" height="44" className="ecg-normal-band" />
                  <line x1="0" y1="22" x2="520" y2="22" className="ecg-grid" />
                  <line x1="0" y1="55" x2="520" y2="55" className="ecg-grid" />
                  <line x1="0" y1="88" x2="520" y2="88" className="ecg-grid" />
                  <path d={hrTrend} className="ecg-trend" />
                </svg>
              </div>
            </div>
          </motion.section>

          <div className="bottom-organs-row">
            <OrganStatusCard
              label="Heart"
              status={patientStatus === 'Fallen' || patientStatus === 'Emergency' ? 'Alert' : 'Normal'}
              tone={patientStatus === 'Fallen' || patientStatus === 'Emergency' ? 'critical' : 'normal'}
              illustration={<HeartIllustration tone="#ef6954" />}
            />
            <OrganStatusCard
              label="Lungs"
              status="Normal"
              tone="normal"
              illustration={<LungsIllustration tone="#b5cadf" />}
            />
          </div>

          <div className="bottom-stats-row">
            <VitalsCard
              label="SpO2"
              sublabel={`${spo2}%`}
              value={String(spo2)}
              unit="%"
              accent={spo2Color(spo2)}
              icon={<Droplets size={16} />}
              series={spo2History.length ? spo2History : [0]}
              min={85}
              max={100}
              normalMin={95}
              normalMax={100}
            />
            <VitalsCard
              label="Temperature"
              sublabel={current.Motion}
              value={temp.toFixed(1)}
              unit="°C"
              accent={tempColor(temp)}
              icon={<Thermometer size={16} />}
              series={tempHistory.length ? tempHistory : [0]}
              min={34}
              max={40}
              normalMin={36.1}
              normalMax={37.2}
            />
          </div>

          <TimelineCard start="23:30" end="07:00" duration="7:30h" />
        </section>
      </div>
    </main>
  );
}
