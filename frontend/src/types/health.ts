export type Severity = 'Info' | 'Warning' | 'Critical';
export type Status = 'Stable' | 'Warning' | 'Critical';

export interface VitalReading {
  HR: number;
  SpO2: number;
  Temp: number;
  Fall: number;
  Motion: string;
}

export interface AlertItem {
  id: string;
  type: string;
  severity: Severity;
  message: string;
  timestamp: string;
  resolved: boolean;
}

export interface Insight {
  generated_at: string;
  summary: string;
  recommendations: string[];
  anomaly_detected: boolean;
  confidence: number;
}

export interface VitalEnvelope {
  type: 'vital_update';
  timestamp: string;
  data: VitalReading;
  alerts: AlertItem[];
  status: Status;
  insight?: Insight | null;
}
