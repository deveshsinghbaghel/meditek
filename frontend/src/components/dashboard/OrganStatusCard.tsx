import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface OrganStatusCardProps {
  label: string;
  status: string;
  tone: 'normal' | 'warning' | 'critical';
  illustration: ReactNode;
  className?: string;
}

export function OrganStatusCard({ label, status, tone, illustration, className = '' }: OrganStatusCardProps) {
  return (
    <motion.section
      className={`replica-card organ-card organ-card--${tone} ${className}`.trim()}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="organ-card__art">{illustration}</div>
      <div
        className="organ-card__footer"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span className="organ-card__name">{label}</span>
        <span className="organ-card__status">
          <span className="organ-card__dot" />
          {status}
        </span>
      </div>
    </motion.section>
  );
}