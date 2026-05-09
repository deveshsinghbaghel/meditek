import { motion } from 'framer-motion';
import { AlertTriangle, Footprints } from 'lucide-react';

export type PatientStatus = 'Walking' | 'Idle' | 'Fallen' | 'Emergency' | 'Recovery';

interface PatientStatusCardProps {
  status: PatientStatus;
  motion: string;
  fall: number;
}

const STATUS_COLORS: Record<PatientStatus, string> = {
  Walking:   '#1A3A6B',
  Idle:      '#888780',
  Fallen:    '#D85A30',
  Emergency: '#D85A30',
  Recovery:  '#BA7517',
};

const STATUS_SUB: Record<PatientStatus, string> = {
  Walking:   'Active movement detected',
  Idle:      'No significant movement',
  Fallen:    'Fall event detected',
  Emergency: 'Abnormal vitals — check patient',
  Recovery:  'Post-activity rest phase',
};

export function PatientStatusCard({ status, motion: motionVal, fall }: PatientStatusCardProps) {
  const alertVisible = status === 'Fallen' || status === 'Emergency';
  const accentColor = STATUS_COLORS[status];

  return (
    <motion.section
      className={`replica-card patient-status-card${alertVisible ? ' patient-status-card--alert' : ''}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="ps-top">
        <span className="ps-label">Patient activity</span>
        <span className="ps-badge" style={{ color: accentColor }}>{status}</span>
        <span className="ps-sub">{STATUS_SUB[status]}</span>
      </div>
      <div className="ps-pills">
        <div className="ps-pill">
          {status === 'Fallen' || status === 'Emergency'
            ? <AlertTriangle size={14} />
            : <Footprints size={14} />
          }
          <span className="ps-pill-label">MOTION</span>
          <span className="ps-pill-value">{motionVal}</span>
        </div>
        <div className="ps-pill">
          <AlertTriangle size={14} />
          <span className="ps-pill-label">FALL</span>
          <span className="ps-pill-value" style={{ color: fall ? '#D85A30' : '#1D9E75' }}>
            {fall ? 'Detected' : 'None'}
          </span>
        </div>
      </div>
      {alertVisible && (
        <div className="ps-alert-strip">
          <AlertTriangle size={16} />
          <span>Immediate attention required</span>
        </div>
      )}
    </motion.section>
  );
}
