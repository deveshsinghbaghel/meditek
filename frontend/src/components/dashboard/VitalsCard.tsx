import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface VitalsCardProps {
  label: string;
  sublabel: string;
  value: string;
  unit?: string;
  accent: string;
  valueColor?: string;
  icon?: ReactNode;
  series: number[];
  min: number;
  max: number;
  normalMin?: number;
  normalMax?: number;
  className?: string;
}

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

function buildSparklinePath(series: number[], width: number, height: number, min: number, max: number) {
  if (!series.length) return '';
  const range = max - min || 1;
  const points = smoothSeries(series)
    .map((point, index) => {
      const x = (index / Math.max(series.length - 1, 1)) * width;
      const y = height - ((clamp(point, min, max) - min) / range) * height;
      return { x, y };
    });
  return buildSmoothPath(points);
}

export function VitalsCard({ label, sublabel, value, unit, accent, valueColor, icon, series, min, max, normalMin, normalMax, className = '' }: VitalsCardProps) {
  const sparkline = buildSparklinePath(series, 220, 64, min, max);
  const numColor = valueColor || accent;
  const normalTop = normalMax === undefined ? 0 : ((max - normalMax) / (max - min)) * 64;
  const normalHeight = normalMin === undefined || normalMax === undefined ? 0 : ((normalMax - normalMin) / (max - min)) * 64;

  return (
    <motion.article
      className={`replica-card vital-card ${className}`.trim()}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="vital-card__top">
        <div>
          <h3>{label}</h3>
          <p className="vital-card__sub">{sublabel}</p>
        </div>
        {icon ? <span className="vital-card__icon">{icon}</span> : null}
      </div>
      <div className="vital-card__big-num">
        <strong style={{ color: numColor }}>{value}</strong>
        {unit ? <span>{unit}</span> : null}
      </div>
      <div className="vital-card__chart">
        <svg viewBox="0 0 220 64" aria-hidden="true" preserveAspectRatio="none">
          <line x1="0" y1="8" x2="220" y2="8" className="vital-card__grid" />
          <line x1="0" y1="32" x2="220" y2="32" className="vital-card__grid" />
          <line x1="0" y1="56" x2="220" y2="56" className="vital-card__grid" />
          {normalHeight > 0 ? <rect x="0" y={normalTop} width="220" height={normalHeight} className="vital-card__normal-band" /> : null}
          <path d={sparkline} stroke={accent} />
        </svg>
        <div className="vital-card__scale"><span>{max}</span><span>{min}</span></div>
      </div>
    </motion.article>
  );
}
