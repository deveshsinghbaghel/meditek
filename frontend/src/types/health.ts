export type Severity = 'Info' | 'Warning' | 'Critical';
export type Status = 'Stable' | 'Warning' | 'Critical';

export interface VitalReading {
  HR: number;
  SpO2: number;
  Temp: number;
  Steps: number;
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

export interface ReportSummary {
  id: string;
  generated_at: string;
  text_summary: string;
  health_score: number;
  risk_level: string;
  recommendations: string[];
  metrics_summary?: {
    hr?: { avg: number; min: number; max: number };
    spo2?: { avg: number; min: number; max: number };
    temp?: { avg: number; min: number; max: number };
    fall_count?: number;
    motion_distribution?: Record<string, number>;
  };
}

export interface ReportChatResponse {
  answer: string;
  report_ids: string[];
}
