import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Activity, Droplets, Thermometer, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchReport } from '../services/api';
import { ReportSummary } from '../types/health';

export function ReportViewPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchReport(id)
      .then((data) => setReport(data))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="report-view-loading">Loading...</div>;
  }

  if (!report) {
    return (
      <main className="reports-shell">
        <div className="reports-surface">
          <Link to="/reports" className="report-view-back">
            <ArrowLeft size={16} /> Back to Reports
          </Link>
          <p className="reports-empty__text">Report not found.</p>
        </div>
      </main>
    );
  }

  const date = new Date(report.generated_at ?? Date.now());
  const scoreColor = report.risk_level === 'High' ? '#D85A30' : report.risk_level === 'Moderate' ? '#BA7517' : '#1D9E75';
  const riskBadgeClass = report.risk_level === 'High' ? 'risk-badge--high' : report.risk_level === 'Moderate' ? 'risk-badge--moderate' : 'risk-badge--low';
  const m = report.metrics_summary ?? {};

  return (
    <main className="reports-shell">
      <div className="reports-surface">
        <Link to="/reports" className="report-view-back">
          <ArrowLeft size={16} /> Back to Reports
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="report-view">
            <div className="report-view__header">
              <div className="report-view__meta">
                <span className="report-view__date">
                  {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className={`risk-badge ${riskBadgeClass}`}>{report.risk_level} Risk</span>
              </div>
              <div className="report-view__score" style={{ borderColor: scoreColor }}>
                <span className="report-view__score-num" style={{ color: scoreColor }}>{report.health_score}</span>
                <span className="report-view__score-label">Health Score</span>
              </div>
            </div>

            <div className="report-view__summary">
              <p>{report.text_summary ?? ''}</p>
            </div>

            <div className="report-view__metrics">
              <div className="metric-tile">
                <span className="metric-tile__icon"><Activity size={16} /></span>
                <span className="metric-tile__label">Heart Rate</span>
                <span className="metric-tile__avg" style={{ color: scoreColor }}>{m.hr?.avg ?? '—'} bpm</span>
                <span className="metric-tile__range">{m.hr?.min ?? '—'} – {m.hr?.max ?? '—'} bpm</span>
              </div>
              <div className="metric-tile">
                <span className="metric-tile__icon"><Droplets size={16} /></span>
                <span className="metric-tile__label">SpO2</span>
                <span className="metric-tile__avg" style={{ color: scoreColor }}>{m.spo2?.avg ?? '—'}%</span>
                <span className="metric-tile__range">{m.spo2?.min ?? '—'} – {m.spo2?.max ?? '—'}%</span>
              </div>
              <div className="metric-tile">
                <span className="metric-tile__icon"><Thermometer size={16} /></span>
                <span className="metric-tile__label">Temperature</span>
                <span className="metric-tile__avg" style={{ color: scoreColor }}>{m.temp?.avg ?? '—'}°C</span>
                <span className="metric-tile__range">{m.temp?.min ?? '—'} – {m.temp?.max ?? '—'}°C</span>
              </div>
              <div className="metric-tile">
                <span className="metric-tile__icon"><AlertTriangle size={16} /></span>
                <span className="metric-tile__label">Fall Events</span>
                <span className="metric-tile__avg" style={{ color: (m.fall_count ?? 0) > 0 ? '#D85A30' : scoreColor }}>{m.fall_count ?? 0}</span>
                <span className="metric-tile__range">Detected</span>
              </div>
            </div>

            {(report.recommendations ?? []).length > 0 && (
              <div className="report-view__recs">
                <h3 className="report-view__recs-title">Recommendations</h3>
                <ul className="report-view__recs-list">
                  {(report.recommendations ?? []).map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </main>
  );
}
